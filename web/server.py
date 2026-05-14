#!/usr/bin/env python3
"""Xcode/LLM/Apps/System Cleanup web UI — localhost-only server.

Runs on http://127.0.0.1:8765 (override via XCC_UI_PORT env var).
Reads cleanup definitions from cleaners.CATEGORIES.

Endpoints:
    GET  /                              → index.html
    GET  /api/status                    → {free_gb, used_gb, total_gb, used_pct}
    GET  /api/tabs                      → tab structure for the UI
    GET  /api/category/<id>/scan        → {groups, totals} for that category
    GET  /api/category/<id>/actions     → list of {id, label, desc, cost} for that category
    GET  /api/run?category=<>&action=<> → SSE stream of action output
    GET  /api/report                    → CSV history sparkline data
    GET  /api/ai/status                 → {docker_mode, providers}
    GET  /api/habits                    → [{category, growth_gb_per_week, days_to_threshold, …}]
    GET  /api/runs                      → recent run history
    GET  /api/settings/keys             → [list of providers with stored keys (no key values)]
    GET  /api/settings/ollama           → {url, model}
    POST /api/settings/keys             → save API key for a provider
    POST /api/settings/ollama           → save Ollama URL + model
    DELETE /api/settings/keys/<provider>→ remove a key
    POST /api/ai/summary                → AI summary for a category scan

Pure Python stdlib for the base path. psycopg2 + cryptography are loaded
optionally — see web/db.py. No pip install needed for `make ui`.
"""

import csv
import http.server
import itertools
import json
import os
import shutil
import socketserver
import subprocess
import sys
import threading
import webbrowser
import concurrent.futures
import socket
import time
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlparse

# Make sibling module importable
sys.path.insert(0, str(Path(__file__).resolve().parent))
import cleaners  # noqa: E402

# ── Persistence layer (v0.20.4) ────────────────────────────────────────────────
#
# Priority order:
#   1. Postgres via db.py      — when DATABASE_URL is set (Docker mode)
#   2. SQLite via sqlite_store — always available (stdlib), default for make ui
#
# `_store` is the active module; _db_available() checks it.

_store: "Any" = None  # type: ignore

try:
    import sqlite_store as _sqlite  # stdlib sqlite3 — always works
except ImportError:
    _sqlite = None  # type: ignore

try:
    import db as _db  # psycopg2 — only in Docker mode
except ImportError:
    _db = None  # type: ignore

try:
    import ai as _ai
except ImportError:
    _ai = None  # type: ignore

try:
    import agent as _agent
except ImportError:
    _agent = None  # type: ignore

# Plan 0023: conversational tool-calling agent
try:
    import agent_chat as _agent_chat
    import agent_tools as _agent_tools
except ImportError:
    _agent_chat  = None  # type: ignore
    _agent_tools = None  # type: ignore

def _init_store():
    """Pick the best available store. Called once at startup."""
    global _store
    # Postgres takes priority when DATABASE_URL is set
    if _db is not None and os.environ.get("DATABASE_URL"):
        _store = _db
        return
    # SQLite default — always available
    if _sqlite is not None:
        _store = _sqlite
        return
    _store = None

def _db_available() -> bool:
    return _store is not None and _store.is_available()

def _no_db_response() -> dict:
    # This only fires for features that need Postgres (encrypted key vault, etc.)
    return {
        "error": "no_db",
        "message": "Enable Docker mode for this feature (encrypted key vault, AI). Run ./docker/go to start the full stack.",
    }

REPO_DIR = Path(__file__).resolve().parent.parent
WEB_DIR  = REPO_DIR / "web"
# v0.18.0 moved the Vite app from web/app → apps/web to fit a pnpm workspace.
# Try the new location first; fall back to the old one so a non-rebuilt repo
# checked out from a v0.17.x tag still serves.
APPS_DIR = REPO_DIR / "apps"
REACT_DIST_CANDIDATES = [APPS_DIR / "web" / "dist", WEB_DIR / "app" / "dist"]
NEXT_OUT_DIR = APPS_DIR / "web-next" / "out"
PREFERRED_PORT = int(os.environ.get("XCC_UI_PORT", "8765"))

def _react_dist_dir() -> Optional[Path]:
    """Resolve the first React build directory that exists. None if no build."""
    for d in REACT_DIST_CANDIDATES:
        if (d / "index.html").exists():
            return d
    return None

# Pick the React build if it's been compiled (vite build → apps/web/dist/), unless
# XCC_LEGACY_UI=1 forces vanilla. Each request can also opt-back into vanilla
# via ?legacy=1, so users can switch without restarting the server.
def _react_build_available() -> bool:
    return _react_dist_dir() is not None

def _next_build_available() -> bool:
    return (NEXT_OUT_DIR / "index.html").exists()

# Minimal mime mapping for vite's emitted assets (js, css, source maps, fonts).
# We intentionally avoid the heavier mimetypes module — this covers everything
# vite actually produces and stays in line with the rest of the stdlib-only feel.
_CTYPE_MAP = {
    ".js":    "application/javascript; charset=utf-8",
    ".mjs":   "application/javascript; charset=utf-8",
    ".css":   "text/css; charset=utf-8",
    ".map":   "application/json; charset=utf-8",
    ".json":  "application/json; charset=utf-8",
    ".html":  "text/html; charset=utf-8",
    ".txt":   "text/plain; charset=utf-8",
    ".ico":   "image/x-icon",
    ".svg":   "image/svg+xml",
    ".png":   "image/png",
    ".jpg":   "image/jpeg",
    ".jpeg":  "image/jpeg",
    ".webp":  "image/webp",
    ".woff":  "font/woff",
    ".woff2": "font/woff2",
    ".ttf":   "font/ttf",
}

def _guess_ctype(name: str) -> str:
    dot = name.rfind(".")
    if dot < 0: return "application/octet-stream"
    return _CTYPE_MAP.get(name[dot:].lower(), "application/octet-stream")

# ── Running-cleans registry (v0.15.0) ──────────────────────────────────────
# Each in-flight clean stream registers itself here at start and unregisters at
# done. The /api/live SSE stream snapshots this dict on every tick so the UI
# can show "N cleans running" + per-category icons in the header. Protected by
# a lock because ThreadingTCPServer dispatches each request to its own thread.
_RUNNING_LOCK = threading.Lock()
_RUNNING_CLEANS: dict = {}  # token -> {"category", "kind", "started_at"}

# ── Scan result cache (plan 0009) ─────────────────────────────────────────────
# Every successful scan_category() call writes its result here so /api/doctor
# can aggregate across all scanned categories without re-scanning.
_SCAN_CACHE_LOCK = threading.Lock()
_SCAN_CACHE: dict = {}  # category_id -> scan_result dict

def _cache_scan(category_id: str, result: dict) -> None:
    with _SCAN_CACHE_LOCK:
        _SCAN_CACHE[category_id] = result

def _get_scan_cache() -> dict:
    with _SCAN_CACHE_LOCK:
        return dict(_SCAN_CACHE)
_token_counter = itertools.count(1)

def _next_token() -> str:
    return f"t{next(_token_counter)}"

def _register_clean(token: str, category: str, kind: str):
    with _RUNNING_LOCK:
        _RUNNING_CLEANS[token] = {
            "category": category,
            "kind": kind,
            "started_at": time.time(),
        }

def _unregister_clean(token: str):
    with _RUNNING_LOCK:
        _RUNNING_CLEANS.pop(token, None)

def _snapshot_running() -> list:
    with _RUNNING_LOCK:
        return [{"token": t, **info} for t, info in _RUNNING_CLEANS.items()]
PORT_RANGE     = 20      # try preferred .. preferred + 19 before falling back
# HOST can be overridden:
#   XCC_HOST=0.0.0.0 make ui          → listen on all interfaces (network mode)
#   XCC_HOST=127.0.0.1                → localhost only (default, safer)
HOST = os.environ.get("XCC_HOST", "127.0.0.1")


def _local_ip() -> Optional[str]:
    """Return the machine's primary LAN IP, or None on failure.

    Technique: open a UDP socket toward 8.8.8.8 — no packet is actually sent,
    but the OS must pick the outbound interface, which reveals the right LAN IP.
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return None
    finally:
        try:
            s.close()
        except Exception:
            pass


def find_open_port(preferred: int, tries: int = PORT_RANGE) -> int:
    """Try preferred + N consecutive ports. If all busy, let the OS assign one."""
    for offset in range(tries):
        port = preferred + offset
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind((HOST, port))
            return port
        except OSError:
            continue
    # Final fallback: OS-assigned ephemeral port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((HOST, 0))
        return s.getsockname()[1]


def get_version() -> str:
    """Read the most recent version from docs/CHANGELOG.md. Handles both header formats.

    New canonical (since v0.9.0):  ## [0.9.0] — 2026-05-12 11:57:12 Eastern · *tagline*
    Old (pre v0.9.0):              ## v0.8.5 — 2026-05-12
    """
    import re
    try:
        for line in (REPO_DIR / "docs" / "CHANGELOG.md").read_text().splitlines():
            # Match either format and extract the version string
            m = re.match(r"^## \[([0-9.]+)\]", line)  # canonical
            if m: return f"v{m.group(1)}"
            m = re.match(r"^## v([0-9.]+)", line)        # legacy
            if m: return f"v{m.group(1)}"
    except Exception:
        pass
    return "v?.?.?"


def get_status() -> dict:
    total, used, free = shutil.disk_usage("/")
    return {
        "free_gb":  round(free  / 1024**3, 1),
        "used_gb":  round(used  / 1024**3, 1),
        "total_gb": round(total / 1024**3, 1),
        "used_pct": round(used / total * 100, 1),
        "version":  get_version(),
    }


def get_report() -> dict:
    csv_path = Path.home() / "Library/Logs/dustpan-history.csv"
    if not csv_path.exists():
        return {"runs": [], "total_freed_gb": 0, "real_runs": 0, "max_freed_gb": 0}
    runs = []
    with csv_path.open() as f:
        for row in csv.reader(f):
            if len(row) >= 5:
                try:
                    runs.append({
                        "ts": row[0], "mode": row[1],
                        "freed":  float(row[2]),
                        "before": float(row[3]),
                        "after":  float(row[4]),
                    })
                except ValueError:
                    continue
    real = [r for r in runs if r["mode"] in ("real", "real-ssh")]
    return {
        "runs": runs[-30:],
        "real_runs": len(real),
        "total_freed_gb": round(sum(r["freed"] for r in real), 1),
        "max_freed_gb":   round(max((r["freed"] for r in real), default=0), 1),
    }


def _measure_path(args):
    """Worker for parallel scanning.

    Returns (group_name, label, path, size_kb, exists, permission_denied).

    v0.20.3: replaced check_output+DEVNULL with run+capture_output so we can
    distinguish between "path is empty (0 KB)" and "du was denied by macOS TCC".
    Many important directories (~/Downloads, ~/Library/Containers,
    ~/Library/Group Containers, Notes, Safari, device backups) require Full Disk
    Access. Without it du exits non-zero and previously the error was silently
    swallowed, producing false 0 GB readings.
    """
    group_name, label, path = args
    expanded = os.path.expanduser(path)
    exists = os.path.exists(expanded)
    size_kb = 0
    permission_denied = False
    if exists:
        try:
            r = subprocess.run(
                ["du", "-sk", expanded],
                capture_output=True, text=True, timeout=30,
            )
            if r.returncode == 0:
                parts = r.stdout.split()
                if parts:
                    size_kb = int(parts[0])
            elif ("Operation not permitted" in r.stderr
                  or "Permission denied" in r.stderr):
                permission_denied = True
            # Other non-zero exits (e.g. path disappeared mid-scan) → size stays 0
        except (subprocess.TimeoutExpired, ValueError, FileNotFoundError):
            pass
    return (group_name, label, path, size_kb, exists, permission_denied)


def scan_category(category_id: str) -> dict:
    cat = cleaners.CATEGORIES.get(category_id)
    if not cat:
        return None

    # Collect every path-to-scan across all groups
    work = []
    for group_name, items in cat["groups"].items():
        for label, path in items:
            work.append((group_name, label, path))

    # Run du in parallel — du is I/O bound, 6 workers gives a nice speedup
    started_at = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        results = list(ex.map(_measure_path, work))
    elapsed_ms = int((time.time() - started_at) * 1000)

    # Reassemble into groups in the original order.
    # Results now carry a 6th element: permission_denied (bool).
    groups_out = {gname: {"paths": [], "total_gb": 0} for gname in cat["groups"]}
    by_label = {(g, l, p): (size_kb, exists, perm_denied)
                for g, l, p, size_kb, exists, perm_denied in results}
    denied_labels: list = []
    for group_name, items in cat["groups"].items():
        for label, path in items:
            size_kb, exists, perm_denied = by_label.get(
                (group_name, label, path), (0, False, False))
            size_gb = round(size_kb / 1024 / 1024, 2)
            groups_out[group_name]["paths"].append({
                "label": label, "path": path,
                "size_kb": size_kb, "size_gb": size_gb,
                "exists":  exists,
                "permission_denied": perm_denied,
            })
            if perm_denied:
                denied_labels.append(label)
        groups_out[group_name]["total_gb"] = round(
            sum(p["size_gb"] for p in groups_out[group_name]["paths"]), 2
        )

    totals = {g: groups_out[g]["total_gb"] for g in groups_out}

    return {
        "id": category_id,
        "label": cat["label"],
        "icon":  cat.get("icon", ""),
        "tagline": cat.get("tagline", ""),
        "groups": groups_out,
        "totals": totals,
        "total_cleanable_gb": round(
            totals.get("safe", 0) + totals.get("probably_safe", 0), 2
        ),
        "scan_ms": elapsed_ms,
        # v0.20.3: permission-denied count so the UI can prompt for Full Disk Access
        "permission_denied_count": len(denied_labels),
        "permission_denied_paths": denied_labels,
    }


def list_actions(category_id: str):
    cat = cleaners.CATEGORIES.get(category_id)
    if not cat:
        return None
    return [
        {
            "id": aid,
            "label": a["label"],
            "desc":  a["desc"],
            "cost":  a.get("cost", ""),
            "informational": a.get("informational", False),
            "sudo":  a.get("sudo", False),
        }
        for aid, a in cat["actions"].items()
    ]


class Handler(http.server.BaseHTTPRequestHandler):

    def do_GET(self):
        url   = urlparse(self.path)
        path  = url.path
        query = parse_qs(url.query)

        if path == "/":
            # Three frontends ranked by query/env preference:
            #   ?next=1   → Next.js static export (apps/web-next/out)
            #   ?legacy=1 → vanilla web/index.html
            #   default   → Vite React app (apps/web/dist) when built, else vanilla
            want_next   = query.get("next",   ["0"])[0] == "1"
            force_legacy = os.environ.get("XCC_LEGACY_UI") == "1" or query.get("legacy", ["0"])[0] == "1"
            if want_next and _next_build_available():
                self.send_response(302)
                self.send_header("Location", "/next/")
                self.end_headers()
                return
            if _react_build_available() and not force_legacy:
                return self._serve_react_root()
            return self._serve_file("index.html", "text/html; charset=utf-8")

        # Serve hashed assets emitted by `vite build` (apps/web/dist/assets/*).
        if path.startswith("/assets/") and _react_build_available():
            rel = path[len("/assets/"):]
            asset = _react_dist_dir() / "assets" / rel
            if asset.exists() and asset.is_file() and not any(p == ".." for p in asset.parts):
                ctype = _guess_ctype(asset.name)
                return self._serve_path(asset, ctype, cacheable=True)
            return self.send_error(404)

        # Next.js static export — served at /next/ + /next/_next/static/*.
        # `next.config.mjs` sets basePath: "/next" so every emitted asset URL is
        # prefixed correctly; we just have to forward those paths to disk.
        if path == "/next" or path == "/next/":
            if not _next_build_available():
                return self.send_error(404, "Next.js app not built — run `pnpm turbo run build`")
            return self._serve_path(NEXT_OUT_DIR / "index.html", "text/html; charset=utf-8", cacheable=False)
        if path.startswith("/next/") and _next_build_available():
            rel = path[len("/next/"):]
            asset = NEXT_OUT_DIR / rel
            if asset.is_dir():
                asset = asset / "index.html"
            if asset.exists() and asset.is_file() and ".." not in asset.parts:
                ctype = _guess_ctype(asset.name)
                # Hashed chunks under _next/static/* can cache forever; the HTML
                # shell is no-store so a rebuild is picked up on next refresh.
                cacheable = "/_next/static/" in path
                return self._serve_path(asset, ctype, cacheable=cacheable)
            return self.send_error(404)

        # Legacy escape hatch — explicit /legacy URL serves vanilla regardless.
        if path == "/legacy":
            return self._serve_file("index.html", "text/html; charset=utf-8")
        if path == "/api/status":
            return self._serve_json(get_status())
        if path == "/api/tabs":
            return self._serve_json({"tabs": cleaners.TABS})
        if path == "/api/report":
            return self._serve_json(get_report())
        if path == "/api/changelog":
            body = (REPO_DIR / "docs" / "CHANGELOG.md").read_bytes() if (REPO_DIR / "docs" / "CHANGELOG.md").exists() else b"(missing CHANGELOG.md)"
            self.send_response(200)
            self.send_header("Content-Type", "text/markdown; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return

        # /api/category/<id>/scan or /actions
        if path.startswith("/api/category/"):
            parts = path[len("/api/category/"):].split("/")
            if len(parts) == 2:
                cid, sub = parts
                if sub == "scan":
                    result = scan_category(cid)
                    if result:
                        _cache_scan(cid, result)   # plan 0009: power /api/doctor
                        if _db_available():
                            try:
                                _store.record_snapshot(cid, result)
                            except Exception:
                                pass  # never fail a scan because of DB write
                    return self._serve_json(result) if result else self.send_error(404)
                if sub == "actions":
                    actions = list_actions(cid)
                    return self._serve_json({"actions": actions}) if actions is not None else self.send_error(404)

        if path == "/api/run":
            cid    = query.get("category", [""])[0]
            action = query.get("action",   [""])[0]
            return self._stream_action(cid, action)
        if path == "/api/clean-path":
            cid  = query.get("category", [""])[0]
            tgt  = query.get("path",     [""])[0]
            return self._stream_clean_path(cid, tgt)
        if path == "/api/clean-all-safe":
            cid = query.get("category", [""])[0]
            tier = query.get("tier", ["safe"])[0]   # safe | probably_safe
            return self._stream_clean_all(cid, tier)
        if path == "/api/clean-everything":
            tier = query.get("tier", ["safe"])[0]
            return self._stream_clean_everything(tier)
        if path == "/api/live":
            return self._stream_live()

        # ── Plan 0006: AI + DB endpoints ──────────────────────────────────
        # ── /api/ai/diagnose — AI agent diagnosis (plan 0010) ────────────────
        # Streams SSE: thinking → context → analysis → done
        if path == "/api/ai/diagnose":
            return self._stream_diagnose()

        # ── /api/doctor — active disk diagnosis (plan 0009) ──────────────────
        # Returns the top safe-tier paths ranked by size across ALL categories
        # that have been scanned this session, plus disk health thresholds.
        # Works without any AI key — pure rule-based, no extra scanning.
        if path == "/api/doctor":
            return self._serve_json(self._build_doctor_report())

        # ── /api/survey — live-streaming comprehensive disk survey (plan 0022) ─
        # Goes BEYOND predefined categories: dynamically crawls the filesystem
        # for worktrees, stale build artifacts, large node_modules, etc.
        # Streams SSE: {event:"target", data:{...}} per target found,
        #              {event:"done",   data:{targets, total_gb}} at end.
        if path == "/api/survey":
            return self._stream_survey()

        if path == "/api/ai/status":
            providers = _store.list_key_providers() if _db_available() else []
            return self._serve_json({
                "docker_mode": _db_available(),
                "providers": providers,
            })

        if path == "/api/settings/keys":
            if not _db_available():
                return self._serve_json_status(501, _no_db_response())
            return self._serve_json({"providers": _store.list_key_providers()})

        if path.startswith("/api/settings/keys/"):
            provider = path[len("/api/settings/keys/"):]
            if not _db_available():
                return self._serve_json_status(501, _no_db_response())
            return self._serve_json({"has_key": provider in _store.list_key_providers()})

        if path == "/api/settings/ollama":
            if not _db_available():
                import os as _os
                return self._serve_json({
                    "url":   _os.environ.get("OLLAMA_URL", "http://localhost:11434"),
                    "model": _os.environ.get("OLLAMA_MODEL", "llama3.2"),
                })
            return self._serve_json(_store.get_ollama_settings())

        # ── Plan 0023: GET /api/settings/agent — read auto-approve toggle ─────
        if path == "/api/settings/agent":
            return self._serve_json(self._read_agent_settings())

        if path == "/api/habits":
            if not _db_available():
                return self._serve_json_status(501, _no_db_response())
            return self._serve_json({"habits": _store.compute_habits()})

        if path == "/api/runs":
            if not _db_available():
                return self._serve_json_status(501, _no_db_response())
            limit = int(query.get("limit", ["50"])[0])
            rows = _store.fetchall(
                "SELECT id, ts, mode, category, tier, freed_gb, duration_ms, "
                "disk_before_gb, disk_after_gb FROM runs ORDER BY ts DESC LIMIT %s",
                (limit,),
            )
            return self._serve_json({"runs": rows})

        self.send_error(404)

    # ── Plan 0006: POST + DELETE handlers ─────────────────────────────────────

    def do_DELETE(self):
        url  = urlparse(self.path)
        path = url.path

        if path.startswith("/api/settings/keys/"):
            provider = path[len("/api/settings/keys/"):]
            if not _db_available():
                return self._serve_json_status(501, _no_db_response())
            _store.delete_api_key(provider)
            return self._serve_json({"ok": True, "provider": provider})

        self.send_error(404)

    def do_POST(self):
        url  = urlparse(self.path)
        path = url.path

        # Read request body
        try:
            length = int(self.headers.get("Content-Length", 0))
            body   = json.loads(self.rfile.read(length)) if length else {}
        except (json.JSONDecodeError, ValueError):
            return self._serve_json_status(400, {"error": "invalid_json"})

        if path == "/api/settings/keys":
            provider = (body.get("provider") or "").strip().lower()
            key      = (body.get("key")      or "").strip()
            if not provider or not key:
                return self._serve_json_status(400, {"error": "provider and key required"})
            if not _db_available():
                return self._serve_json_status(501, _no_db_response())
            _store.save_api_key(provider, key)
            return self._serve_json({"ok": True, "provider": provider})

        if path == "/api/settings/ollama":
            ollama_url   = (body.get("url")   or "").strip()
            ollama_model = (body.get("model") or "").strip()
            if not ollama_url:
                return self._serve_json_status(400, {"error": "url required"})
            if not _db_available():
                return self._serve_json_status(501, _no_db_response())
            _store.save_ollama_settings(ollama_url, ollama_model or "llama3.2")
            return self._serve_json({"ok": True})

        if path == "/api/ai/summary":
            category  = (body.get("category") or "").strip()
            if not category:
                return self._serve_json_status(400, {"error": "category required"})
            if _ai is None:
                return self._serve_json_status(501, {"error": "ai module not available"})

            # Resolve provider + key
            if _db_available():
                providers = _store.list_key_providers()
                provider  = body.get("provider") or (providers[0] if providers else None)
                if not provider:
                    return self._serve_json_status(400, {"error": "no AI provider configured"})
                api_key = _store.get_api_key(provider) or ""
                if provider == "ollama":
                    ollama = _store.get_ollama_settings()
                    base_url = ollama["url"]
                    model    = ollama["model"]
                else:
                    base_url = None
                    model    = None
            else:
                # No DB: accept provider+key in the request body (less secure)
                provider = (body.get("provider") or "").strip()
                api_key  = (body.get("key")      or "").strip()
                base_url = body.get("base_url")
                model    = body.get("model")
                if not provider or not api_key:
                    return self._serve_json_status(400, {"error": "provider and key required without Docker mode"})

            # Get scan data if not provided
            scan_result = body.get("scan_result") or {}
            if not scan_result and category in cleaners.CATEGORIES:
                scan_result = scan_category(category) or {}

            # Optionally include habit data
            habit = None
            if _db_available():
                habits = _store.compute_habits()
                habit  = next((h for h in habits if h["category"] == category), None)

            prompt = _ai.build_scan_prompt(category, scan_result, habit)
            try:
                text = _ai.complete(
                    provider=provider,
                    api_key=api_key,
                    prompt=prompt,
                    model=model,
                    base_url=base_url,
                )
                # Persist recommendation
                if _db_available():
                    _store.execute(
                        "INSERT INTO habits (category, recommendation, computed_at) "
                        "VALUES (%s, %s, now()) "
                        "ON CONFLICT (category) DO UPDATE "
                        "SET recommendation = EXCLUDED.recommendation, computed_at = now()",
                        (category, text),
                    )
                return self._serve_json({"ok": True, "recommendation": text})
            except Exception as e:
                return self._serve_json_status(500, {"error": str(e)})

        # ── Plan 0023: POST /api/ai/chat — conversational tool-calling agent ──
        if path == "/api/ai/chat":
            return self._stream_chat(body)

        # ── Plan 0023: POST /api/settings/agent — auto-approve toggle ─────────
        if path == "/api/settings/agent":
            return self._save_agent_settings(body)

        self.send_error(404)

    # ── /api/live — long-lived SSE that pushes disk + running-cleans deltas ───
    # Replaces the client's 15s poll. Emits two named events:
    #   {event:"status",  data: <get_status() payload>}
    #   {event:"running", data: [{token,category,kind,started_at}, ...]}
    # Only sends when the signature changes (so quiet periods are quiet). Also
    # writes a `:keepalive` SSE comment every ~25s so proxies/middleboxes don't
    # idle-close the connection.
    def _stream_live(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        last_status_sig = None
        last_running_sig = None
        last_keepalive = time.time()
        # Send initial snapshots immediately so the client doesn't sit on
        # placeholder data until the first tick.
        try:
            status = get_status()
            self._send_sse({"event": "status", "data": status})
            last_status_sig = json.dumps(status, sort_keys=True)
            running = _snapshot_running()
            self._send_sse({"event": "running", "data": running})
            last_running_sig = json.dumps(running, sort_keys=True)
            while True:
                time.sleep(2.0)
                status = get_status()
                sig = json.dumps(status, sort_keys=True)
                if sig != last_status_sig:
                    self._send_sse({"event": "status", "data": status})
                    last_status_sig = sig
                running = _snapshot_running()
                r_sig = json.dumps(running, sort_keys=True)
                if r_sig != last_running_sig:
                    self._send_sse({"event": "running", "data": running})
                    last_running_sig = r_sig
                if time.time() - last_keepalive > 25:
                    try:
                        self.wfile.write(b":keepalive\n\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    last_keepalive = time.time()
        except (BrokenPipeError, ConnectionResetError):
            return

    def _serve_file(self, name: str, ctype: str):
        path = WEB_DIR / name
        if not path.exists():
            return self.send_error(404)
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _serve_react_root(self):
        # Serve apps/web/dist/index.html as the canonical UI when available.
        # Marked no-store so a rebuild during `make ui` is reflected immediately.
        d = _react_dist_dir()
        if not d:
            return self.send_error(404, "React build missing")
        return self._serve_path(d / "index.html", "text/html; charset=utf-8", cacheable=False)

    def _serve_path(self, p: Path, ctype: str, cacheable: bool):
        body = p.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        # vite emits hashed filenames, so served assets can cache for a year.
        # The HTML shell is no-store so a rebuild is picked up on next refresh.
        self.send_header(
            "Cache-Control",
            "public, max-age=31536000, immutable" if cacheable else "no-store",
        )
        self.end_headers()
        self.wfile.write(body)

    def _serve_json(self, data):
        body = json.dumps(data, default=str).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _stream_diagnose(self):
        """
        POST /api/ai/diagnose — plan 0010.
        Streams the agent's thinking, context measurements, and final analysis
        as SSE frames. Works with or without a configured LLM key.
        """
        if _agent is None:
            return self._serve_json_status(501, {"error": "agent_unavailable",
                "message": "web/agent.py not found."})

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        # Use AI module only when a key/provider is actually configured.
        # Falls back to rule-based analysis gracefully when no key is set.
        ai_module = _ai if (_ai is not None and _ai.has_configured_provider()) else None

        status = get_status()
        cache  = _get_scan_cache()

        try:
            for frame in _agent.diagnose(cache, status, ai_module):
                event_name = frame.get("event", "message")
                data_str   = json.dumps(frame.get("data", {}))
                msg = f"event: {event_name}\ndata: {data_str}\n\n"
                self.wfile.write(msg.encode())
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _build_doctor_report(self) -> dict:
        """
        Aggregate all safe-tier scan results and rank by size.
        Returns a DoctorReport consumed by the frontend's QuickWins + RescueBanner.
        No extra scanning — reads from the in-memory scan cache only.
        """
        status = get_status()
        free_gb   = status.get("free_gb", 0)
        total_gb  = status.get("total_gb", 1)
        free_pct  = round(free_gb / total_gb * 100, 1) if total_gb > 0 else 100

        # Collect every safe-tier path entry across all scanned categories.
        quick_wins = []
        cache = _get_scan_cache()
        for cat_id, scan in cache.items():
            safe_group = scan.get("groups", {}).get("safe", {})
            for path_entry in safe_group.get("paths", []):
                size_gb = path_entry.get("size_gb", 0) or 0
                if size_gb < 0.01:
                    continue  # skip empty / permission-denied paths
                if path_entry.get("permission_denied"):
                    continue
                quick_wins.append({
                    "category":  cat_id,
                    "label":     path_entry["label"],
                    "path":      path_entry["path"],
                    "size_gb":   size_gb,
                    "size_kb":   path_entry.get("size_kb", 0),
                    "tier":      "safe",
                })

        # Sort by size descending — biggest wins first.
        quick_wins.sort(key=lambda x: x["size_gb"], reverse=True)

        return {
            "free_gb":     round(free_gb, 1),
            "total_gb":    round(total_gb, 1),
            "free_pct":    free_pct,
            "rescue_mode": free_pct < 5 or free_gb < 10,
            "warning_mode": free_pct < 15 or free_gb < 20,
            "quick_wins":  quick_wins[:20],   # top 20 items
            "total_cleanable_gb": round(sum(w["size_gb"] for w in quick_wins), 1),
            "categories_scanned": len(cache),
        }

    # ── /api/survey — plan 0022 ───────────────────────────────────────────────
    # Comprehensive live-streaming disk survey. Goes beyond predefined categories:
    # dynamically discovers worktrees, stale build artifacts, large node_modules,
    # git worktrees, and any other filesystem-level large items.
    #
    # Streams SSE so the frontend can show targets as they're found rather than
    # waiting for a 30-second full crawl to complete:
    #   {event:"progress", data:{phase, msg}}
    #   {event:"target",   data:{SurveyTarget}}
    #   {event:"done",     data:{targets:[], total_gb, elapsed_s}}
    def _stream_survey(self):
        import threading
        import queue as _queue

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        home   = Path.home()
        t0     = time.time()
        result_q: _queue.Queue = _queue.Queue()

        # ── Helper: measure a path ────────────────────────────────────────────
        def _du(p: Path, timeout: int = 8) -> float:
            """Return on-disk size in GB, or 0 on error / timeout."""
            try:
                r = subprocess.run(
                    ["du", "-sh", str(p)],
                    capture_output=True, text=True, timeout=timeout,
                )
                s = r.stdout.split("\t")[0].strip()
                if not s or s in ("-", "0"):
                    return 0.0
                mult = {"K": 1/1024/1024, "M": 1/1024, "G": 1.0, "T": 1024.0}
                for suffix, factor in mult.items():
                    if s.endswith(suffix):
                        return round(float(s[:-1]) * factor, 2)
                return round(int(s) / 1024**3, 2)
            except Exception:
                return 0.0

        def _emit_target(t: dict):
            result_q.put(("target", t))

        def _emit_progress(phase: str, msg: str):
            result_q.put(("progress", {"phase": phase, "msg": msg}))

        # ── Phase 1: Known high-value paths ───────────────────────────────────
        KNOWN = [
            {
                "id": "docker-raw",
                "label": "Docker disk image (Docker.raw)",
                "category": "docker",
                "confidence": "caution",
                "confidence_label": "Use Docker Desktop or prune — do not delete directly",
                "notes": (
                    "Docker.raw is a sparse virtual disk that holds all your images, "
                    "containers, and volumes. The file may appear 200+ GB but only uses "
                    "what's allocated inside it. Use `docker system prune -a` or "
                    "'Reset disk image' in Docker Desktop to reclaim space safely."
                ),
                "action": "docker system prune -a --volumes",
                "action_id": "emergency-docker-prune",
                "rebuild": "Re-pull images as needed (1–5 min each)",
                "paths": [
                    home / "Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw",
                    home / "Library/Containers/com.docker.docker/Data/vms/0/Docker.raw",
                ],
            },
            {
                "id": "xcode-deriveddata",
                "label": "Xcode Build Cache (DerivedData)",
                "category": "xcode",
                "confidence": "easy",
                "confidence_label": "Safe — rebuilds automatically",
                "notes": "Xcode's scratch pad. Completely safe to delete. One slightly slower build after.",
                "action": "rm -rf ~/Library/Developer/Xcode/DerivedData/*",
                "action_id": "emergency-deriveddata",
                "rebuild": "~30s slower next Xcode build",
                "paths": [home / "Library/Developer/Xcode/DerivedData"],
            },
            {
                "id": "ios-devicesupport",
                "label": "Xcode iOS Device Debug Files (iOS DeviceSupport)",
                "category": "xcode",
                "confidence": "easy",
                "confidence_label": "Safe — re-downloads when you plug in a device",
                "notes": "One folder per iPhone model per iOS version you've ever debugged on. Piles up for years.",
                "action": "rm -rf ~/Library/Developer/Xcode/'iOS DeviceSupport'/*",
                "action_id": "emergency-devicesupport",
                "rebuild": "1–2 min re-download on next device connect",
                "paths": [home / "Library/Developer/Xcode/iOS DeviceSupport"],
            },
            {
                "id": "xcode-docindex",
                "label": "Xcode Documentation Index",
                "category": "xcode",
                "confidence": "easy",
                "confidence_label": "Safe — rebuilds on demand",
                "notes": "Xcode's searchable copy of Apple developer docs. Rebuilds in seconds.",
                "action_id": "emergency-documentationindex",
                "action": "rm -rf ~/Library/Developer/Xcode/DocumentationIndex/*",
                "rebuild": "Seconds on next docs open",
                "paths": [home / "Library/Developer/Xcode/DocumentationIndex"],
            },
            {
                "id": "cursor-caches",
                "label": "Cursor IDE Caches",
                "category": "apps",
                "confidence": "easy",
                "confidence_label": "Safe — IDE rebuilds on next launch",
                "notes": "Code Cache, GPU Cache, CachedData, CachedExtensions. Your settings and extensions stay installed.",
                "action": "rm -rf ~/Library/'Application Support'/Cursor/'Code Cache'/* ~/Library/'Application Support'/Cursor/GPUCache/* ~/Library/'Application Support'/Cursor/CachedData/*",
                "rebuild": "~10s slower Cursor launch once",
                "paths": [
                    home / "Library/Application Support/Cursor/Code Cache",
                    home / "Library/Application Support/Cursor/GPUCache",
                    home / "Library/Application Support/Cursor/CachedData",
                    home / "Library/Application Support/Cursor/CachedExtensions",
                    home / "Library/Application Support/Cursor/CachedExtensionVSIXs",
                    home / "Library/Application Support/Cursor/logs",
                ],
            },
            {
                "id": "cursor-workspace-state",
                "label": "Cursor Workspace State History",
                "category": "apps",
                "confidence": "check_first",
                "confidence_label": "Check first — contains session history",
                "notes": "Workspace state, recent file lists, editor tabs per project. Clearing loses your open-tabs memory across projects.",
                "action": "rm -rf ~/Library/'Application Support'/Cursor/User/workspaceStorage/*",
                "rebuild": "Open tabs and recent file lists reset",
                "paths": [home / "Library/Application Support/Cursor/User/workspaceStorage"],
            },
            {
                "id": "mediaanalysisd",
                "label": "macOS Photo Recognition Cache",
                "category": "system",
                "confidence": "easy",
                "confidence_label": "Safe — macOS rebuilds in background",
                "notes": "AI model macOS builds from your Photos library for face/scene recognition. Your photos are untouched.",
                "action_id": "emergency-mediaanalysisd",
                "action": "rm -rf ~/Library/Containers/com.apple.mediaanalysisd/Data/Library/* ~/Library/Containers/com.apple.mediaanalysisd/Data/tmp/*",
                "rebuild": "Face recognition re-learns over hours in background",
                "paths": [
                    home / "Library/Containers/com.apple.mediaanalysisd/Data/Library",
                    home / "Library/Containers/com.apple.mediaanalysisd/Data/tmp",
                ],
            },
            {
                "id": "pnpm-store",
                "label": "pnpm Content-Addressable Store",
                "category": "temp",
                "confidence": "easy",
                "confidence_label": "Safe — pnpm rebuilds on next install",
                "notes": "Run `pnpm store prune` (removes only unreferenced packages). `rm -rf ~/.pnpm-store` nukes everything.",
                "action": "pnpm store prune",
                "rebuild": "pnpm re-downloads as packages are needed",
                "paths": [
                    home / ".pnpm-store",
                    home / "Library/pnpm",
                ],
            },
            {
                "id": "npm-cache",
                "label": "npm Cache (~/.npm)",
                "category": "temp",
                "confidence": "easy",
                "confidence_label": "Safe — npm rebuilds from registry",
                "notes": "npm's download cache. `npm cache clean --force` is the safe way.",
                "action": "npm cache clean --force",
                "rebuild": "npm re-downloads on next install (slower once)",
                "paths": [home / ".npm"],
            },
            {
                "id": "homebrew-cache",
                "label": "Homebrew Cellar + Downloads Cache",
                "category": "temp",
                "confidence": "easy",
                "confidence_label": "Safe — Homebrew re-downloads if needed",
                "notes": "Old formula versions and downloaded tarballs. Run `brew cleanup -s && brew autoremove`.",
                "action": "brew cleanup -s && brew autoremove",
                "rebuild": "Re-download if you need an old version",
                "paths": [
                    home / "Library/Caches/Homebrew",
                    Path("/opt/homebrew/Cellar"),
                ],
            },
            {
                "id": "generic-cache",
                "label": "~/.cache (generic tool caches)",
                "category": "temp",
                "confidence": "easy",
                "confidence_label": "Safe — tools rebuild on demand",
                "notes": "Puppeteer, pip, various CLI tools. All rebuild automatically.",
                "action": "rm -rf ~/.cache/*",
                "rebuild": "Tools re-download/re-build caches as needed",
                "paths": [home / ".cache"],
            },
        ]

        # ── "Probably not worth touching" — paths that look big but aren't reclaimable ──
        # These are measured and reported separately so the user knows why we're
        # NOT recommending them, rather than silently skipping.
        NOT_WORTH_IT = [
            {
                "id":     "nwi-mediaanalysisd",
                "label":  "macOS Photo Recognition (mediaanalysisd)",
                "paths":  [
                    home / "Library/Containers/com.apple.mediaanalysisd/Data/Library",
                    home / "Library/Containers/com.apple.mediaanalysisd/Data/tmp",
                ],
                "why":    (
                    "macOS rebuilds this automatically within hours of deletion — "
                    "from the same Photos library. You'd get the space back temporarily, "
                    "then lose it again as macOS re-analyzes. Net gain: zero. "
                    "Worth deleting only if you're in a disk emergency and need minutes, "
                    "not days."
                ),
            },
            {
                "id":    "nwi-spotlight",
                "label": "Spotlight / CoreSpotlight index",
                "paths": [
                    Path("/.Spotlight-V100"),
                    home / "Library/Metadata/CoreSpotlight",
                ],
                "why":   (
                    "Spotlight rebuilds its index within 30–60 minutes after deletion. "
                    "You get the space back for under an hour, then it's gone again. "
                    "Search will be broken during the rebuild."
                ),
            },
        ]

        def measure_known():
            _emit_progress("known", "Measuring known cache locations…")
            for spec in KNOWN:
                total = 0.0
                found_path = None
                for p in spec["paths"]:
                    if p.exists():
                        s = _du(p)
                        total += s
                        if s > 0 and found_path is None:
                            found_path = str(p)
                if total >= 0.05:
                    t = {k: v for k, v in spec.items() if k != "paths"}
                    t["size_gb"]   = round(total, 2)
                    t["path"]      = found_path or str(spec["paths"][0])
                    t["source"]    = "known"
                    _emit_target(t)

            # Measure "not worth it" targets and emit separately
            nwi_results = []
            for spec in NOT_WORTH_IT:
                total = 0.0
                found_path = None
                for p in spec["paths"]:
                    if p.exists():
                        s = _du(p)
                        total += s
                        if s > 0 and found_path is None:
                            found_path = str(p)
                if total >= 0.05:
                    nwi_results.append({
                        "id":       spec["id"],
                        "label":    spec["label"],
                        "path":     found_path or str(spec["paths"][0]),
                        "size_gb":  round(total, 2),
                        "why":      spec["why"],
                    })
            if nwi_results:
                result_q.put(("not_worth_it", nwi_results))

        threading.Thread(target=measure_known, daemon=True).start()

        # ── Phase 2: Dynamic discovery ────────────────────────────────────────

        def discover_worktrees():
            """Find all .claude/worktrees/ directories anywhere under ~.

            For each worktrees/ dir:
              1. Measure total size
              2. Break down individual sub-worktrees with per-dir sizes
              3. Cross-reference `git branch -r --merged origin/main` to flag
                 worktrees whose branch is already merged (safe to prune)
            """
            _emit_progress("worktrees", "Scanning for Claude Code worktrees…")
            try:
                r = subprocess.run(
                    ["find", str(home), "-maxdepth", "7", "-type", "d",
                     "-name", "worktrees", "-path", "*/.claude/worktrees"],
                    capture_output=True, text=True, timeout=25,
                )
                for line in r.stdout.strip().splitlines():
                    p = Path(line.strip())
                    if not p.exists():
                        continue
                    size = _du(p, timeout=15)
                    if size < 0.05:
                        continue

                    project_root = p.parent.parent  # project/.claude/worktrees → project

                    # Per-worktree sizes (sorted largest first)
                    sub_sizes: list[tuple[str, float]] = []
                    try:
                        for sub in p.iterdir():
                            if sub.is_dir():
                                s = _du(sub, timeout=6)
                                sub_sizes.append((sub.name, s))
                        sub_sizes.sort(key=lambda x: x[1], reverse=True)
                    except PermissionError:
                        pass

                    # Check which branches are merged into origin/main
                    merged_branches: set[str] = set()
                    try:
                        mr = subprocess.run(
                            ["git", "-C", str(project_root), "branch", "-r", "--merged", "origin/main"],
                            capture_output=True, text=True, timeout=8,
                        )
                        for b in mr.stdout.strip().splitlines():
                            # e.g. "  origin/zen-germain" → "zen-germain"
                            b = b.strip().lstrip("* ")
                            if "/" in b:
                                b = b.split("/", 1)[1]
                            merged_branches.add(b)
                    except Exception:
                        pass

                    # Build per-worktree detail lines
                    breakdown_lines = []
                    merged_count = 0
                    for name, s in sub_sizes[:8]:
                        is_merged = name in merged_branches
                        if is_merged:
                            merged_count += 1
                        tag = " [merged ✓ safe to prune]" if is_merged else ""
                        breakdown_lines.append(f"  {name}  {s:.1f} GB{tag}")

                    project = project_root.name
                    wt_count = len(sub_sizes)
                    notes_parts = [
                        f"{wt_count} worktree(s) found — each carries its own node_modules.",
                    ]
                    if merged_count:
                        notes_parts.append(
                            f"{merged_count} of them are already merged into origin/main — "
                            "dead weight. Safe to remove immediately."
                        )
                    notes_parts.append(
                        "To prune: `git worktree remove <path>` for each merged one, "
                        "or `rm -rf` the sub-folder directly."
                    )
                    if breakdown_lines:
                        notes_parts.append("Largest worktrees:\n" + "\n".join(breakdown_lines))

                    _emit_target({
                        "id":               f"worktrees-{project}",
                        "label":            f"Claude Code worktrees — {project}/",
                        "path":             str(p),
                        "size_gb":          size,
                        "category":         "space-eaters",
                        "confidence":       "easy",
                        "confidence_label": "Safe — worktrees are temporary working copies",
                        "notes":            "\n\n".join(notes_parts),
                        "action": (
                            f"echo 'Worktrees in {project}:'; "
                            f"git -C '{project_root}' worktree list 2>/dev/null; "
                            f"echo ''; echo 'Sizes:'; "
                            f"du -sh '{p}'/*/ 2>/dev/null | sort -rh | head -12; "
                            f"echo ''; echo 'Already merged into origin/main:'; "
                            f"git -C '{project_root}' branch -r --merged origin/main 2>/dev/null | head -20"
                        ),
                        "sub_worktrees":    [{"name": n, "size_gb": s, "merged": n in merged_branches}
                                             for n, s in sub_sizes],
                        "merged_count":     merged_count,
                        "rebuild": "Claude Code recreates worktrees on demand",
                        "source": "dynamic",
                    })
            except Exception:
                pass

        def discover_build_artifacts():
            """Find stale .next, .next-local, dist, build folders > 200 MB in ~/Developer."""
            _emit_progress("builds", "Scanning for stale build artifacts…")
            dev_dirs = [
                home / "Developer",
                home / "Documents",
                home / "Projects",
                home / "Code",
            ]
            ARTIFACT_NAMES = {".next-local", ".next", "dist", ".build", "build"}
            for base in dev_dirs:
                if not base.exists():
                    continue
                try:
                    r = subprocess.run(
                        ["find", str(base), "-maxdepth", "6", "-type", "d",
                         "-not", "-path", "*/node_modules/*",
                         "-not", "-path", "*/.git/*",
                         "-not", "-path", "*/.claude/worktrees/*"],
                        capture_output=True, text=True, timeout=20,
                    )
                    for line in r.stdout.strip().splitlines():
                        p = Path(line.strip())
                        if p.name not in ARTIFACT_NAMES:
                            continue
                        size = _du(p, timeout=6)
                        if size < 0.2:
                            continue
                        project = p.parent.name
                        _emit_target({
                            "id":               f"build-{project}-{p.name}",
                            "label":            f"Build artifact: {project}/{p.name}",
                            "path":             str(p),
                            "size_gb":          size,
                            "category":         "temp",
                            "confidence":       "easy",
                            "confidence_label": "Safe — rebuilt by next build/deploy",
                            "notes": (
                                f"Stale {p.name} output in {project}. "
                                "Rebuild with `pnpm build` / `next build` when needed."
                            ),
                            "action": f"rm -rf '{p}'",
                            "rebuild": "Next `pnpm build` / `next build`",
                            "source": "dynamic",
                        })
                except Exception:
                    pass

        def discover_large_node_modules():
            """Find node_modules > 500 MB outside of predefined categories."""
            _emit_progress("node_modules", "Scanning for large node_modules…")
            SKIP_PARENTS = {"worktrees"}  # already covered by discover_worktrees
            dev_dirs = [home / "Developer", home / "Documents", home / "Projects", home / "Code"]
            for base in dev_dirs:
                if not base.exists():
                    continue
                try:
                    r = subprocess.run(
                        ["find", str(base), "-maxdepth", "6", "-type", "d",
                         "-name", "node_modules",
                         "-not", "-path", "*/node_modules/*/node_modules"],
                        capture_output=True, text=True, timeout=20,
                    )
                    for line in r.stdout.strip().splitlines():
                        p = Path(line.strip())
                        # Skip if parent is a known worktree dir
                        if any(part in SKIP_PARENTS for part in p.parts):
                            continue
                        size = _du(p, timeout=8)
                        if size < 0.5:
                            continue
                        project = p.parent.name
                        _emit_target({
                            "id":               f"nm-{project}",
                            "label":            f"node_modules — {project}/",
                            "path":             str(p),
                            "size_gb":          size,
                            "category":         "temp",
                            "confidence":       "check_first",
                            "confidence_label": "Check first — delete only if project is inactive",
                            "notes": (
                                f"node_modules in {project}. "
                                "If this project is inactive, delete and run `pnpm install` when you return."
                            ),
                            "action": f"rm -rf '{p}' && echo 'Run pnpm install to restore'",
                            "rebuild": "`pnpm install` in the project directory",
                            "source": "dynamic",
                        })
                except Exception:
                    pass

        # ── discover_foreign_ownership (plan 0024) ───────────────────────────
        # Find disk space locked behind another user's UID. Classic case:
        # /opt/homebrew owned by a previous user ("olivia"), /Users/<oldname>
        # still on disk, /Users/Guest, /usr/local owned by Homebrew from 5 years
        # ago. These are GOLDEN reclaim opportunities once the user runs the
        # `sudo chown -R $(whoami) <path>` takeover command.
        def discover_foreign_ownership():
            import pwd as _pwd
            current_user = os.environ.get("USER") or os.environ.get("LOGNAME") or ""
            if not current_user:
                try:
                    current_user = _pwd.getpwuid(os.getuid()).pw_name
                except Exception:
                    return

            _emit_progress("ownership", "Scanning for files locked by previous users…")

            # Candidate roots — known places where multi-user cruft accumulates.
            # Each is either a directory we measure as a whole, OR a parent dir
            # whose immediate children we enumerate (for /Users).
            roots: list[tuple[Path, str]] = [
                (Path("/opt/homebrew"),         "whole"),
                (Path("/opt/local"),            "whole"),   # MacPorts
                (Path("/usr/local/Homebrew"),   "whole"),   # pre-Apple-Silicon brew
                (Path("/usr/local/Cellar"),     "whole"),
                (Path("/Users"),                "enumerate"),
            ]

            def _owner_name(p: Path) -> tuple[str, int, bool]:
                """(name_or_'uid-NNN', uid, user_still_exists)"""
                try:
                    st = p.lstat()
                    uid = st.st_uid
                    try:
                        name = _pwd.getpwuid(uid).pw_name
                        return name, uid, True
                    except KeyError:
                        return f"uid-{uid}", uid, False
                except OSError:
                    return "unknown", -1, False

            for root, mode in roots:
                if not root.exists():
                    continue
                try:
                    if mode == "whole":
                        owner, uid, exists = _owner_name(root)
                        if owner == current_user or uid in (0,):
                            continue   # owned by us or root — not a takeover target
                        size = _du(root, timeout=20)
                        if size < 0.05:
                            continue
                        label = f"{root.name} (locked by '{owner}')"
                        if root == Path("/opt/homebrew"):
                            label = f"Homebrew at /opt/homebrew (installed by '{owner}')"
                        elif root == Path("/usr/local/Homebrew"):
                            label = f"Legacy Homebrew at /usr/local/Homebrew (installed by '{owner}')"
                        takeover = (
                            f"sudo chown -R $(whoami) {root} && "
                            f"echo '✓ {root} is now owned by '$(whoami)"
                        )
                        notes_parts = [
                            f"This directory ({size:.1f} GB) is owned by user '{owner}'"
                            + (" (no longer on the system)" if not exists else "")
                            + ". DustPan and Homebrew can't manage it under your current account "
                            "until ownership is transferred to you.",
                            "**To unlock:** open Terminal and run the command below. You'll be "
                            "prompted for your Mac password — this is the macOS sudo prompt, not "
                            "anything DustPan can do silently.",
                        ]
                        _emit_target({
                            "id":               f"foreign-{root.name}-{owner}",
                            "label":            label,
                            "path":             str(root),
                            "size_gb":          size,
                            "category":         "ownership",
                            "confidence":       "takeover",
                            "confidence_label": "Takeover available — needs sudo password",
                            "notes":            "\n\n".join(notes_parts),
                            "action":           takeover,
                            "rebuild":          "Nothing rebuilds — you keep the data, just gain access to it",
                            "source":           "dynamic",
                            "owner":            owner,
                            "owner_uid":        uid,
                            "owner_exists":     exists,
                            "takeover_command": takeover,
                        })
                    elif mode == "enumerate":
                        # Enumerate /Users/* but skip current user + system entries
                        skip_names = {current_user, "Shared", ".localized", "root"}
                        try:
                            children = list(root.iterdir())
                        except PermissionError:
                            continue
                        for child in children:
                            if child.name in skip_names or child.name.startswith("."):
                                continue
                            if not child.is_dir():
                                continue
                            owner, uid, exists = _owner_name(child)
                            if owner == current_user:
                                continue
                            # Don't measure root-owned (like /Users/Shared) as recoverable
                            if uid == 0:
                                continue
                            size = _du(child, timeout=20)
                            if size < 0.05:
                                continue
                            takeover = (
                                f"# WARNING: This will delete user data. Make sure you don't need it.\n"
                                f"sudo rm -rf {child}\n"
                                f"# OR — keep the data but transfer ownership to you:\n"
                                f"sudo chown -R $(whoami) {child}"
                            )
                            user_status = "no longer on the system" if not exists else "old account"
                            _emit_target({
                                "id":               f"foreign-user-{child.name}",
                                "label":            f"Old user home: /Users/{child.name} (owner '{owner}', {user_status})",
                                "path":             str(child),
                                "size_gb":          size,
                                "category":         "ownership",
                                "confidence":       "takeover",
                                "confidence_label": "Old user home — review before deleting",
                                "notes": (
                                    f"This is the home directory of user '{owner}' "
                                    f"({user_status}). It's {size:.1f} GB of data that's invisible "
                                    f"to your current account but still using disk space.\n\n"
                                    "**Two options:**\n"
                                    "1. **Delete it** if the user is gone and you don't need their files. "
                                    "Frees the full size immediately.\n"
                                    "2. **Take ownership** to keep the files but make them yours. "
                                    "Useful if you want to review what's in there first.\n\n"
                                    "Both options require your sudo password. DustPan cannot run "
                                    "either silently — open Terminal and paste the command."
                                ),
                                "action":           takeover,
                                "rebuild":          "You decide — delete frees the space; chown preserves the data",
                                "source":           "dynamic",
                                "owner":            owner,
                                "owner_uid":        uid,
                                "owner_exists":     exists,
                                "takeover_command": takeover,
                            })
                except Exception:
                    pass

        # Run dynamic discovery in parallel threads, collect via queue
        threads = [
            threading.Thread(target=discover_worktrees,         daemon=True),
            threading.Thread(target=discover_build_artifacts,   daemon=True),
            threading.Thread(target=discover_large_node_modules, daemon=True),
            threading.Thread(target=discover_foreign_ownership, daemon=True),
        ]
        for th in threads:
            th.start()

        # ── Drain queue, stream results, wait for all threads ─────────────────
        all_targets: list[dict] = []
        all_nwi:     list[dict] = []
        deadline = t0 + 60  # max 60s survey

        try:
            while True:
                # Check if all threads are done and queue is empty
                all_done = all(not th.is_alive() for th in threads)
                try:
                    kind, data = result_q.get(timeout=0.5)
                    if kind == "target":
                        all_targets.append(data)
                        self._send_sse({"event": "target", "data": data})
                    elif kind == "progress":
                        self._send_sse({"event": "progress", "data": data})
                    elif kind == "not_worth_it":
                        # Emit separately so the frontend can render a distinct section
                        self._send_sse({"event": "not_worth_it", "data": data})
                        all_nwi.extend(data)
                except _queue.Empty:
                    pass
                if all_done and result_q.empty():
                    break
                if time.time() > deadline:
                    break

            # Sort and emit final summary
            all_targets.sort(key=lambda x: x["size_gb"], reverse=True)
            status = get_status()
            self._send_sse({
                "event": "done",
                "data": {
                    "targets":        all_targets,
                    "not_worth_it":   all_nwi,
                    "total_gb":       round(sum(t["size_gb"] for t in all_targets), 1),
                    "free_gb":        status["free_gb"],
                    "total_gb_disk":  status["total_gb"],
                    "elapsed_s":      round(time.time() - t0, 1),
                    "target_count":   len(all_targets),
                },
            })
        except (BrokenPipeError, ConnectionResetError):
            return

    # ── Plan 0023: conversational tool-calling agent ─────────────────────────

    def _agent_settings_path(self) -> "Path":
        return Path.home() / ".dustpan" / "agent-settings.json"

    def _read_agent_settings(self) -> dict:
        """Read agent settings from ~/.dustpan/agent-settings.json (or Postgres in Docker mode)."""
        # Postgres path: store as a single 'agent_settings' row keyed by user='default'
        if _db_available():
            try:
                rows = _store.fetchall(
                    "SELECT value FROM kv_store WHERE key = %s LIMIT 1",
                    ("agent_settings",),
                )
                if rows:
                    return json.loads(rows[0][0]) if isinstance(rows[0], (list, tuple)) else json.loads(rows[0]["value"])
            except Exception:
                pass
        # File path
        p = self._agent_settings_path()
        if p.exists():
            try:
                return json.loads(p.read_text())
            except Exception:
                pass
        return {"allow_safe_auto": False}

    def _save_agent_settings(self, body: dict):
        allow = bool(body.get("allow_safe_auto", False))
        payload = {"allow_safe_auto": allow}
        # Try DB first, fall back to file
        if _db_available():
            try:
                _store.execute(
                    "INSERT INTO kv_store (key, value) VALUES (%s, %s) "
                    "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                    ("agent_settings", json.dumps(payload)),
                )
                return self._serve_json({"ok": True, **payload})
            except Exception:
                pass
        # File path
        p = self._agent_settings_path()
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(payload, indent=2))
            return self._serve_json({"ok": True, **payload})
        except Exception as e:
            return self._serve_json_status(500, {"error": f"failed to save: {e}"})

    def _stream_chat(self, body: dict):
        """POST /api/ai/chat — multi-turn agent loop streamed via SSE."""
        if _agent_chat is None or _agent_tools is None:
            return self._serve_json_status(501, {"error": "agent_chat module not available"})

        messages         = body.get("messages") or []
        pending_results  = body.get("pending_tool_results")  # optional
        allow_override   = body.get("allow_safe_auto")
        provider_overrid = body.get("provider")

        # Read persisted setting if not in body
        if allow_override is None:
            persisted = self._read_agent_settings()
            allow_safe_auto = bool(persisted.get("allow_safe_auto", False))
        else:
            allow_safe_auto = bool(allow_override)

        if not messages and not pending_results:
            return self._serve_json_status(400, {"error": "messages required"})

        # SSE headers
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        # Build server_helpers dict — bound references the tools can call
        def _build_doctor_report_wrapper():
            return self._build_doctor_report()

        def _run_survey_sync_wrapper():
            # Returning the cached doctor report is the cheap proxy.
            # The full survey is async by nature — we'd need to refactor
            # _stream_survey to provide a true sync version. For Ship 1,
            # we direct the model to scan_category + doctor instead.
            return {
                "note": "Use scan_category(category_id) per category for fresh measurements, "
                        "or call get_doctor_report for cached safe-tier ranking.",
            }

        server_helpers = {
            "get_status":          get_status,
            "build_doctor_report": _build_doctor_report_wrapper,
            "scan_category":       scan_category,
            "run_survey_sync":     _run_survey_sync_wrapper,
            "scan_cache":          _get_scan_cache(),
        }

        def on_event(ev: dict) -> None:
            try:
                self._send_sse(ev)
            except (BrokenPipeError, ConnectionResetError):
                pass

        try:
            _agent_chat.chat_turn(
                messages         = messages,
                on_event         = on_event,
                server_helpers   = server_helpers,
                cleaners_dict    = cleaners.CATEGORIES,
                allow_safe_auto  = allow_safe_auto,
                pending_results  = pending_results,
                provider_override= provider_overrid,
            )
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception as e:
            try:
                self._send_sse({"event": "error", "data": {"message": str(e)}})
            except Exception:
                pass

    def _serve_json_status(self, status: int, data: dict):
        body = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _stream_clean_path(self, category_id: str, target_path: str):
        """Clean a single path — validates path is in the category's safe/probably_safe groups."""
        cat = cleaners.CATEGORIES.get(category_id)
        if not cat:
            return self.send_error(404, "unknown category")

        cleanable_paths = set()
        for group_name in ("safe", "probably_safe"):
            for _label, path in cat["groups"].get(group_name, []):
                cleanable_paths.add(path)

        if target_path not in cleanable_paths:
            return self.send_error(400, "path not in safe/probably-safe groups for this category")

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

        before = get_status()
        self._send_sse({"event": "status", "data": before})
        self._send_sse({"event": "line", "data": f"▶ Clean: {target_path}"})

        expanded = os.path.expanduser(target_path)
        # Quote properly for shell; trailing /* deletes contents
        import shlex
        cmd = ["bash", "-c", f"rm -rf {shlex.quote(expanded)}/* 2>&1; true"]

        token = _next_token()
        _register_clean(token, category_id, "clean-path")
        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, bufsize=1, text=True)
            for line in proc.stdout:
                self._send_sse({"event": "line", "data": line.rstrip()})
            proc.wait()
            after = get_status()
            freed = round(after["free_gb"] - before["free_gb"], 1)
            self._send_sse({
                "event": "done",
                "data": {"code": proc.returncode, "before_gb": before["free_gb"],
                         "after_gb": after["free_gb"], "freed_gb": freed},
            })
            self._log_run(category_id, f"clean-path:{target_path}", freed, before["free_gb"], after["free_gb"])
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            _unregister_clean(token)

    def _stream_clean_all(self, category_id: str, tier: str):
        """Clean every path in the given tier (safe or probably_safe) for the category."""
        cat = cleaners.CATEGORIES.get(category_id)
        if not cat or tier not in ("safe", "probably_safe"):
            return self.send_error(404, "bad category or tier")

        items = cat["groups"].get(tier, [])
        if not items:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.end_headers()
            self._send_sse({"event": "line", "data": f"(no {tier} paths in {category_id})"})
            self._send_sse({"event": "done", "data": {"code": 0, "freed_gb": 0}})
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

        before = get_status()
        self._send_sse({"event": "status", "data": before})
        self._send_sse({"event": "line", "data": f"▶ Clean all {tier} paths in {cat['label']} ({len(items)} paths)"})

        import shlex
        token = _next_token()
        _register_clean(token, category_id, f"clean-all-{tier}")
        try:
            for label, path in items:
                expanded = os.path.expanduser(path)
                self._send_sse({"event": "line", "data": f"  cleaning: {label}"})
                try:
                    subprocess.run(
                        ["bash", "-c", f"rm -rf {shlex.quote(expanded)}/* 2>/dev/null; true"],
                        timeout=60,
                    )
                except subprocess.TimeoutExpired:
                    self._send_sse({"event": "line", "data": f"    (timeout — skipped)"})
            after = get_status()
            freed = round(after["free_gb"] - before["free_gb"], 1)
            self._send_sse({
                "event": "done",
                "data": {"code": 0, "before_gb": before["free_gb"],
                         "after_gb": after["free_gb"], "freed_gb": freed},
            })
            self._log_run(category_id, f"clean-all-{tier}", freed, before["free_gb"], after["free_gb"])
        finally:
            _unregister_clean(token)

    def _stream_clean_everything(self, tier: str):
        """Clean every <tier> path across every category in one streamed pass."""
        if tier not in ("safe", "probably_safe"):
            return self.send_error(400, "tier must be safe or probably_safe")

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

        before = get_status()
        self._send_sse({"event": "status", "data": before})
        self._send_sse({"event": "line", "data": f"▶ Clean ALL {tier} paths across every category"})

        import shlex
        total_paths = 0
        token = _next_token()
        _register_clean(token, "ALL", f"clean-everything-{tier}")
        try:
            for cat_id, cat in cleaners.CATEGORIES.items():
                items = cat["groups"].get(tier, [])
                if not items:
                    continue
                self._send_sse({"event": "line", "data": f""})
                self._send_sse({"event": "line", "data": f"[{cat['label']}]"})
                for label, path in items:
                    expanded = os.path.expanduser(path)
                    self._send_sse({"event": "line", "data": f"  cleaning: {label}"})
                    try:
                        subprocess.run(
                            ["bash", "-c", f"rm -rf {shlex.quote(expanded)}/* 2>/dev/null; true"],
                            timeout=60,
                        )
                        total_paths += 1
                    except subprocess.TimeoutExpired:
                        self._send_sse({"event": "line", "data": f"    (timeout — skipped)"})

            after = get_status()
            freed = round(after["free_gb"] - before["free_gb"], 1)
            self._send_sse({"event": "line", "data": ""})
            self._send_sse({"event": "line", "data": f"✓ Done. Cleaned {total_paths} paths across {len(cleaners.CATEGORIES)} categories."})
            self._send_sse({
                "event": "done",
                "data": {"code": 0, "before_gb": before["free_gb"],
                         "after_gb": after["free_gb"], "freed_gb": freed},
            })
            self._log_run("ALL", f"clean-everything-{tier}", freed, before["free_gb"], after["free_gb"])
        finally:
            _unregister_clean(token)

    def _stream_action(self, category_id: str, action_id: str):
        cat = cleaners.CATEGORIES.get(category_id)
        if not cat or action_id not in cat["actions"]:
            return self.send_error(404, f"unknown action: {category_id}/{action_id}")

        action = cat["actions"][action_id]

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

        before = get_status()
        self._send_sse({"event": "status", "data": before})
        self._send_sse({"event": "line", "data": f"▶ {action['label']}"})
        self._send_sse({"event": "line", "data": f"  {action['desc']}"})
        if action.get("cost"):
            self._send_sse({"event": "line", "data": f"  cost: {action['cost']}"})

        # Build subprocess command
        if "shell" in action:
            cmd = ["bash", "-c", action["shell"] + " 2>&1"]
        elif "cmd" in action:
            cmd = action["cmd"]
        else:
            self._send_sse({"event": "line", "data": "(no command defined for this action)"})
            self._send_sse({"event": "done", "data": {"code": 0, "freed_gb": 0}})
            return

        token = _next_token()
        kind = "action-info" if action.get("informational") else "action"
        _register_clean(token, category_id, kind)
        try:
            proc = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                bufsize=1, text=True,
            )
            for line in proc.stdout:
                self._send_sse({"event": "line", "data": line.rstrip()})
            proc.wait()

            after = get_status()
            freed = round(after["free_gb"] - before["free_gb"], 1)
            self._send_sse({
                "event": "done",
                "data": {
                    "code": proc.returncode,
                    "before_gb": before["free_gb"],
                    "after_gb":  after["free_gb"],
                    "freed_gb":  freed,
                },
            })

            # Log to CSV (real cleanup runs only — skip informational ones)
            if not action.get("informational") and proc.returncode == 0:
                self._log_run(category_id, action_id, freed, before["free_gb"], after["free_gb"])

        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            _unregister_clean(token)

    def _log_run(self, category_id, action_id, freed_gb, before_gb, after_gb):
        try:
            from datetime import datetime
            csv_path = Path.home() / "Library/Logs/dustpan-history.csv"
            csv_path.parent.mkdir(parents=True, exist_ok=True)
            with csv_path.open("a") as f:
                ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                mode = f"real-ui-{category_id}-{action_id}"
                f.write(f"{ts},{mode},{freed_gb},{before_gb},{after_gb}\n")
        except Exception:
            pass

    def _send_sse(self, payload: dict):
        try:
            self.wfile.write(f"data: {json.dumps(payload)}\n\n".encode("utf-8"))
            self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, fmt, *args):
        return  # silence default access log


def main():
    # v0.20.4: init persistence (SQLite default, Postgres when DATABASE_URL set)
    _init_store()
    if _store is not None:
        try:
            _store.migrate()
        except Exception as e:
            print(f"[store] startup migration error (non-fatal): {e}", file=sys.stderr)

    port = find_open_port(PREFERRED_PORT)
    if port != PREFERRED_PORT:
        print(f"⚠  Port {PREFERRED_PORT} is busy — using {port} instead.")

    httpd = socketserver.ThreadingTCPServer((HOST, port), Handler)
    httpd.daemon_threads = True

    # Decide what URL to show the user and what to open in the browser.
    network_mode = (HOST == "0.0.0.0")
    local_url    = f"http://127.0.0.1:{port}"
    lan_ip       = _local_ip() if network_mode else None
    network_url  = f"http://{lan_ip}:{port}" if lan_ip else None

    n_actions = sum(len(c["actions"]) for c in cleaners.CATEGORIES.values())
    n_tabs    = len([t for t in cleaners.TABS if not t.get("meta")])

    print()
    print(f"  🧹  Dustpan  ·  by AVERY GOODMAN")
    print()
    if network_mode:
        print(f"  {'Local':9}  \033[1;36m{local_url}\033[0m")
        if network_url:
            print(f"  {'Network':9}  \033[1;32m{network_url}\033[0m  ← share with devices on your Wi-Fi")
        else:
            print(f"  Network    (could not detect LAN IP — try http://YOUR_MAC_IP:{port})")
        print()
        print("  ⚠  Anyone on your Wi-Fi can reach this URL and trigger cleanups.")
        print("     Run `make ui-local` for localhost-only mode. Stop with Ctrl+C when done.")
    else:
        print(f"  {'URL':9}  \033[1;36m{local_url}\033[0m")
        print(f"  Access     Localhost only (run `make ui` to expose on Wi-Fi too)")
    print()
    print(f"  {n_actions} actions across {n_tabs} tabs  ·  Press Ctrl+C to stop.")
    print()

    # Open the local URL in the default browser. Always use localhost (127.0.0.1)
    # so this works regardless of HOST setting and doesn't depend on LAN IP detection.
    if not os.environ.get("XCC_UI_NO_OPEN"):
        try:
            # Small delay lets the server fully bind before the first request arrives.
            import threading as _threading
            _threading.Timer(0.4, lambda: webbrowser.open(local_url)).start()
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")
        httpd.server_close()
        sys.exit(0)


if __name__ == "__main__":
    main()
