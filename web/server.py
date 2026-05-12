#!/usr/bin/env python3
"""Xcode/LLM/Apps/System Cleanup web UI — localhost-only server.

Runs on http://127.0.0.1:8765 (override via XCC_UI_PORT env var).
Reads cleanup definitions from cleaners.CATEGORIES.

Endpoints:
    GET /                          → index.html
    GET /api/status                → {free_gb, used_gb, total_gb, used_pct}
    GET /api/tabs                  → tab structure for the UI
    GET /api/category/<id>/scan    → {groups, totals} for that category
    GET /api/category/<id>/actions → list of {id, label, desc, cost} for that category
    GET /api/run?category=<>&action=<>  → SSE stream of action output
    GET /api/report                → CSV history sparkline data

Pure Python stdlib. No pip install. macOS only.
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
from urllib.parse import parse_qs, urlparse

# Make sibling module importable
sys.path.insert(0, str(Path(__file__).resolve().parent))
import cleaners  # noqa: E402

REPO_DIR = Path(__file__).resolve().parent.parent
WEB_DIR  = REPO_DIR / "web"
REACT_DIST_DIR = WEB_DIR / "app" / "dist"
PREFERRED_PORT = int(os.environ.get("XCC_UI_PORT", "8765"))

# Pick the React build if it's been compiled (vite build → web/app/dist/), unless
# XCC_LEGACY_UI=1 forces vanilla. Each request can also opt-back into vanilla
# via ?legacy=1, so users can switch without restarting the server.
def _react_build_available() -> bool:
    return (REACT_DIST_DIR / "index.html").exists()

# Minimal mime mapping for vite's emitted assets (js, css, source maps, fonts).
# We intentionally avoid the heavier mimetypes module — this covers everything
# vite actually produces and stays in line with the rest of the stdlib-only feel.
_CTYPE_MAP = {
    ".js":   "application/javascript; charset=utf-8",
    ".mjs":  "application/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".map":  "application/json; charset=utf-8",
    ".svg":  "image/svg+xml",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
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
HOST           = "127.0.0.1"   # localhost only


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
    csv_path = Path.home() / "Library/Logs/xcode-cleanup-history.csv"
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
    """Worker for parallel scanning. Returns (group_name, label, path, expanded, exists, size_kb)."""
    group_name, label, path = args
    expanded = os.path.expanduser(path)
    exists = os.path.exists(expanded)
    size_kb = 0
    if exists:
        try:
            out = subprocess.check_output(
                ["du", "-sk", expanded], stderr=subprocess.DEVNULL, timeout=30,
            )
            size_kb = int(out.split()[0])
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired,
                ValueError, FileNotFoundError):
            pass
    return (group_name, label, path, size_kb, exists)


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

    # Reassemble into groups in the original order
    groups_out = {gname: {"paths": [], "total_gb": 0} for gname in cat["groups"]}
    by_label = {(g, l, p): (size_kb, exists) for g, l, p, size_kb, exists in results}
    for group_name, items in cat["groups"].items():
        for label, path in items:
            size_kb, exists = by_label.get((group_name, label, path), (0, False))
            size_gb = round(size_kb / 1024 / 1024, 2)
            groups_out[group_name]["paths"].append({
                "label": label, "path": path,
                "size_kb": size_kb, "size_gb": size_gb,
                "exists":  exists,
            })
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
            # Prefer the built React app when web/app/dist/index.html exists,
            # unless the user opted into legacy via env or ?legacy=1.
            force_legacy = os.environ.get("XCC_LEGACY_UI") == "1" or query.get("legacy", ["0"])[0] == "1"
            if _react_build_available() and not force_legacy:
                return self._serve_react_root()
            return self._serve_file("index.html", "text/html; charset=utf-8")

        # Serve hashed assets emitted by `vite build` (web/app/dist/assets/*).
        if path.startswith("/assets/") and _react_build_available():
            rel = path[len("/assets/"):]
            asset = REACT_DIST_DIR / "assets" / rel
            if asset.exists() and asset.is_file() and not any(p == ".." for p in asset.parts):
                ctype = _guess_ctype(asset.name)
                return self._serve_path(asset, ctype, cacheable=True)
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
        # Serve web/app/dist/index.html as the canonical UI when available.
        # Marked no-store so a rebuild during `make ui` is reflected immediately.
        return self._serve_path(REACT_DIST_DIR / "index.html", "text/html; charset=utf-8", cacheable=False)

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
        body = json.dumps(data).encode("utf-8")
        self.send_response(200)
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
            csv_path = Path.home() / "Library/Logs/xcode-cleanup-history.csv"
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
    port = find_open_port(PREFERRED_PORT)
    if port != PREFERRED_PORT:
        print(f"⚠  Port {PREFERRED_PORT} is busy — using {port} instead.")
    httpd = socketserver.ThreadingTCPServer((HOST, port), Handler)
    httpd.daemon_threads = True
    url = f"http://{HOST}:{port}"
    print(f"🧹  Cleanup Hub web UI → \033[1;36m{url}\033[0m")
    print(f"    {sum(len(c['actions']) for c in cleaners.CATEGORIES.values())} actions across {len([t for t in cleaners.TABS])} tabs")
    print("    Localhost only — never reachable from your network.")
    print("    Press Ctrl+C to stop.\n")

    if not os.environ.get("XCC_UI_NO_OPEN"):
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n    Stopped.")
        httpd.server_close()
        sys.exit(0)


if __name__ == "__main__":
    main()
