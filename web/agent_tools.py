"""
Plan 0023 — Tool registry for the conversational SADPA agent.

This module is the single source of truth for what the AI agent can do.
Everything is curated:
  - Tier A (read-only): runs immediately, no approval
  - Tier B (action): requires user approval unless allow_safe_auto + safe tier
  - Tier C (meta): client-side concerns (navigate, ask_user)

Crucially, NO tool ever accepts a raw shell command. Action tools take
category_id + action_id only, so the model can never bypass the pre-vetted
commands in cleaners.py. Path-touching tools route through validate_peek_path.
"""
from __future__ import annotations

import csv
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any, Callable, Optional


# ── Path safety: home-subtree allowlist + hard denies ────────────────────────

HOME = Path.home()

# Hard denies — any path under these is rejected, period.
DENY_ROOTS_HARD = {
    "/etc", "/System", "/usr", "/bin", "/sbin", "/var", "/private",
    "/dev", "/Library", "/Network", "/cores", "/.vol",
}

# Sub-paths under HOME that are off limits even though HOME itself is allowed.
DENY_SUBPATHS = [
    HOME / ".ssh",
    HOME / ".aws",
    HOME / ".gnupg",
    HOME / ".config" / "gh" / "hosts.yml",
    HOME / "Library" / "Keychains",
    HOME / "Library" / "Mail",
    HOME / "Library" / "Messages",
    HOME / "Library" / "Application Support" / "MobileSync" / "Backup",
    HOME / "Library" / "Cookies",
    HOME / "Library" / "PersonalAssistant",
]

# Allow-list of roots the agent may peek at.
ALLOWED_ROOTS = [
    HOME / "Library" / "Caches",
    HOME / "Library" / "Application Support",
    HOME / "Library" / "Containers",
    HOME / "Library" / "Developer",
    HOME / "Library" / "Logs",
    HOME / "Library" / "Saved Application State",
    HOME / "Library" / "WebKit",
    HOME / "Developer",
    HOME / "Documents",
    HOME / "Downloads",
    HOME / "Desktop",
    HOME / "Movies",
    HOME / "Music",
    HOME / "Pictures",
    HOME / ".cache",
    HOME / ".npm",
    HOME / ".cargo",
    HOME / ".cocoapods",
    HOME / ".gradle",
    HOME / ".m2",
    HOME / ".pnpm-store",
    HOME / ".pyenv",
    HOME / ".nvm",
    HOME / ".rvm",
    HOME / ".rustup",
    Path("/Applications"),
]


def validate_peek_path(raw: str) -> Optional[Path]:
    """
    Return a resolved Path if the input is safe to read, else None.

    Rules:
      1. Tilde-expand and resolve symlinks (strict=False — path may not exist yet)
      2. Reject if the resolved path or any prefix matches DENY_ROOTS_HARD
      3. Reject if path is under any DENY_SUBPATHS entry
      4. Require path to be under at least one ALLOWED_ROOTS entry
    """
    if not raw or not isinstance(raw, str):
        return None
    try:
        p = Path(os.path.expanduser(raw.strip())).resolve(strict=False)
    except (OSError, RuntimeError):
        return None

    # Reject paths under hard-deny roots
    p_str = str(p)
    for deny in DENY_ROOTS_HARD:
        if p_str == deny or p_str.startswith(deny + "/"):
            return None

    # Reject paths under sensitive sub-paths
    for deny in DENY_SUBPATHS:
        try:
            p.relative_to(deny)
            return None  # match — reject
        except ValueError:
            pass

    # Must be under an allowed root
    for root in ALLOWED_ROOTS:
        try:
            p.relative_to(root)
            return p
        except ValueError:
            pass

    return None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _du_gb(p: Path, timeout: int = 8) -> float:
    """Return on-disk size in GB. 0 on error / timeout / missing."""
    if not p.exists():
        return 0.0
    try:
        r = subprocess.run(
            ["du", "-sh", str(p)],
            capture_output=True, text=True, timeout=timeout,
        )
        s = r.stdout.split("\t")[0].strip()
        if not s or s in ("-", "0"):
            return 0.0
        mult = {"K": 1 / 1024 / 1024, "M": 1 / 1024, "G": 1.0, "T": 1024.0}
        for suffix, factor in mult.items():
            if s.endswith(suffix):
                return round(float(s[:-1]) * factor, 2)
        return round(int(s) / 1024**3, 2)
    except Exception:
        return 0.0


def _du_bytes(p: Path, timeout: int = 6) -> int:
    """Return on-disk size in bytes via `du -sk`. 0 on error."""
    if not p.exists():
        return 0
    try:
        r = subprocess.run(
            ["du", "-sk", str(p)],
            capture_output=True, text=True, timeout=timeout,
        )
        kb = int(r.stdout.split("\t")[0].strip())
        return kb * 1024
    except Exception:
        return 0


# ── Tool handlers ────────────────────────────────────────────────────────────
# Each handler returns a JSON-serialisable dict.
# Handlers receive (args: dict, ctx: dict). ctx is a per-turn bag with:
#   - "scan_cache"      — the global scan cache
#   - "disk_status"     — current get_status() dict
#   - "allow_safe_auto" — bool from settings
#   - "cleaners"        — cleaners.CATEGORIES dict (passed in to avoid circular imports)
#   - "server_helpers"  — dict of bound server helpers (scan_category, get_status, etc.)

def _h_get_disk_status(args: dict, ctx: dict) -> dict:
    helpers = ctx.get("server_helpers", {})
    get_status = helpers.get("get_status")
    if not get_status:
        return {"error": "get_status helper unavailable"}
    s = get_status()
    return {
        "free_gb":  s.get("free_gb", 0),
        "used_gb":  s.get("used_gb", 0),
        "total_gb": s.get("total_gb", 0),
        "used_pct": s.get("used_pct", 0),
    }


def _h_get_doctor_report(args: dict, ctx: dict) -> dict:
    """Top safe-tier paths ranked by size, across all scanned categories."""
    helpers = ctx.get("server_helpers", {})
    build = helpers.get("build_doctor_report")
    if not build:
        return {"error": "doctor report builder unavailable"}
    return build()


def _h_list_categories(args: dict, ctx: dict) -> dict:
    cats = ctx.get("cleaners", {})
    out = []
    for cid, cat in cats.items():
        # Skip meta categories (emergency, etc.)
        if cat.get("meta"):
            continue
        groups = cat.get("groups", {})
        out.append({
            "id":       cid,
            "label":    cat.get("label", cid),
            "tagline":  cat.get("tagline", ""),
            "tiers": {
                "safe":           len(groups.get("safe", [])),
                "probably_safe":  len(groups.get("probably_safe", [])),
                "caution":        len(groups.get("caution", [])),
            },
            "action_count": len(cat.get("actions", {})),
        })
    out.sort(key=lambda x: x["id"])
    return {"categories": out, "count": len(out)}


def _h_list_category_actions(args: dict, ctx: dict) -> dict:
    cid = (args.get("category_id") or "").strip()
    if not cid:
        return {"error": "category_id required"}
    cats = ctx.get("cleaners", {})
    cat = cats.get(cid)
    if not cat:
        return {"error": f"unknown category: {cid}"}
    actions = cat.get("actions", {})
    out = []
    for aid, a in actions.items():
        out.append({
            "id":             aid,
            "label":          a.get("label", aid),
            "desc":           a.get("desc", ""),
            "cost":           a.get("cost", ""),
            "informational":  bool(a.get("informational", False)),
        })
    return {"category_id": cid, "actions": out}


def _h_scan_category(args: dict, ctx: dict) -> dict:
    cid = (args.get("category_id") or "").strip()
    if not cid:
        return {"error": "category_id required"}
    helpers = ctx.get("server_helpers", {})
    scan = helpers.get("scan_category")
    if not scan:
        return {"error": "scan_category helper unavailable"}
    try:
        result = scan(cid)
    except KeyError:
        return {"error": f"unknown category: {cid}"}
    except Exception as e:
        return {"error": f"scan failed: {e}"}
    # Trim to the structured essentials so we don't blow the context window
    groups = result.get("groups", {})
    summary = {"category_id": cid}
    for tier_name in ("safe", "probably_safe", "caution"):
        tier = groups.get(tier_name, {})
        paths = tier.get("paths", []) or []
        # Keep top 15 per tier, dropping anything < 50 MB
        big = [
            {
                "label":    p.get("label", ""),
                "path":     p.get("path", ""),
                "size_gb":  round(p.get("size_gb", 0) or 0, 2),
            }
            for p in paths
            if (p.get("size_gb") or 0) >= 0.05
        ]
        big.sort(key=lambda x: x["size_gb"], reverse=True)
        summary[tier_name] = {
            "total_gb":  tier.get("total_gb", 0),
            "top_paths": big[:15],
        }
    return summary


def _h_measure_path(args: dict, ctx: dict) -> dict:
    raw = (args.get("path") or "").strip()
    p = validate_peek_path(raw)
    if p is None:
        return {"error": "path not allowed", "input": raw,
                "hint": "Allowed roots include ~/Library/Caches, ~/Library/Containers, ~/Developer, ~/Documents, /Applications"}
    if not p.exists():
        return {"path": str(p), "exists": False, "size_gb": 0}
    return {
        "path":      str(p),
        "exists":    True,
        "size_gb":   _du_gb(p, timeout=10),
        "is_dir":    p.is_dir(),
        "is_symlink": p.is_symlink(),
    }


def _h_list_directory(args: dict, ctx: dict) -> dict:
    raw = (args.get("path") or "").strip()
    p = validate_peek_path(raw)
    if p is None:
        return {"error": "path not allowed", "input": raw}
    if not p.exists():
        return {"error": "path does not exist", "path": str(p)}
    if not p.is_dir():
        return {"error": "not a directory", "path": str(p)}
    try:
        entries = []
        for child in sorted(p.iterdir()):
            if len(entries) >= 50:
                break
            try:
                stat = child.lstat()
                size_bytes = stat.st_size if child.is_file() else _du_bytes(child, timeout=3)
            except (OSError, PermissionError):
                size_bytes = 0
            entries.append({
                "name":       child.name,
                "is_dir":     child.is_dir(),
                "is_symlink": child.is_symlink(),
                "size_bytes": size_bytes,
                "size_gb":    round(size_bytes / 1024**3, 3) if size_bytes else 0,
            })
        # Sort by size desc so the model sees the big ones first
        entries.sort(key=lambda e: e["size_bytes"], reverse=True)
        return {
            "path":       str(p),
            "entries":    entries,
            "truncated":  len(entries) >= 50,
        }
    except PermissionError:
        return {"error": "permission denied", "path": str(p)}


def _h_get_recent_runs(args: dict, ctx: dict) -> dict:
    """Read the recent-runs CSV maintained by server.py _log_run()."""
    limit = int(args.get("limit", 20))
    limit = max(1, min(limit, 100))
    csv_path = HOME / ".dustpan" / "runs.csv"
    if not csv_path.exists():
        return {"runs": [], "note": "no runs logged yet"}
    try:
        rows = []
        with csv_path.open() as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
        # Return most recent N
        return {"runs": rows[-limit:][::-1], "total": len(rows)}
    except Exception as e:
        return {"error": f"failed to read runs: {e}"}


def _h_find_foreign_ownership(args: dict, ctx: dict) -> dict:
    """
    Scan known multi-user-cruft locations for files/dirs owned by users other
    than the current one. This is huge for systems passed down between accounts.

    Returns a list of foreign-owned things with sizes + recommended sudo command.
    NEVER runs sudo — only reports.
    """
    import pwd as _pwd

    try:
        current_user = os.environ.get("USER") or _pwd.getpwuid(os.getuid()).pw_name
    except Exception:
        return {"error": "could not determine current user"}

    roots = [
        (Path("/opt/homebrew"),       "whole"),
        (Path("/opt/local"),          "whole"),
        (Path("/usr/local/Homebrew"), "whole"),
        (Path("/usr/local/Cellar"),   "whole"),
        (Path("/Users"),              "enumerate"),
    ]

    findings = []

    def _owner(p: Path):
        try:
            uid = p.lstat().st_uid
            try:
                return _pwd.getpwuid(uid).pw_name, uid, True
            except KeyError:
                return f"uid-{uid}", uid, False
        except OSError:
            return "unknown", -1, False

    for root, mode in roots:
        if not root.exists():
            continue
        try:
            if mode == "whole":
                owner, uid, exists = _owner(root)
                if owner == current_user or uid == 0:
                    continue
                size = _du_gb(root, timeout=20)
                if size < 0.05:
                    continue
                findings.append({
                    "path":             str(root),
                    "owner":            owner,
                    "owner_uid":        uid,
                    "owner_still_exists": exists,
                    "size_gb":          size,
                    "kind":             "system-tool" if str(root).startswith("/opt") or str(root).startswith("/usr") else "user-home",
                    "takeover_command": f"sudo chown -R $(whoami) {root}",
                })
            else:
                skip = {current_user, "Shared", ".localized", "root"}
                for child in root.iterdir():
                    if child.name in skip or child.name.startswith(".") or not child.is_dir():
                        continue
                    owner, uid, exists = _owner(child)
                    if owner == current_user or uid == 0:
                        continue
                    size = _du_gb(child, timeout=20)
                    if size < 0.05:
                        continue
                    findings.append({
                        "path":             str(child),
                        "owner":            owner,
                        "owner_uid":        uid,
                        "owner_still_exists": exists,
                        "size_gb":          size,
                        "kind":             "user-home",
                        "takeover_command": f"sudo chown -R $(whoami) {child}",
                        "delete_command":   f"sudo rm -rf {child}  # only if you don't need their files",
                    })
        except (PermissionError, OSError):
            continue

    findings.sort(key=lambda f: f["size_gb"], reverse=True)
    total_gb = round(sum(f["size_gb"] for f in findings), 2)
    return {
        "current_user": current_user,
        "findings":     findings,
        "total_gb_locked": total_gb,
        "count":        len(findings),
    }


def _h_run_disk_survey(args: dict, ctx: dict) -> dict:
    """Run a synchronous version of the survey. Returns the final target list.

    Heavy operation — typically 15–45 seconds. Reuses the same logic as
    /api/survey but returns all results at once instead of streaming.
    """
    helpers = ctx.get("server_helpers", {})
    run_survey_sync = helpers.get("run_survey_sync")
    if not run_survey_sync:
        return {"error": "survey helper unavailable"}
    return run_survey_sync()


def _h_run_category_action(args: dict, ctx: dict) -> dict:
    """Execute a pre-vetted action from cleaners.py.

    Approval logic is handled by the chat orchestrator before we get here.
    By the time this runs, the user has either auto-approved (safe tier +
    allow_safe_auto) or explicitly approved via the UI.
    """
    cid = (args.get("category_id") or "").strip()
    aid = (args.get("action_id")   or "").strip()
    if not cid or not aid:
        return {"error": "category_id and action_id required"}
    helpers = ctx.get("server_helpers", {})
    exec_action = helpers.get("execute_action_sync")
    if not exec_action:
        return {"error": "action executor unavailable"}
    return exec_action(cid, aid)


def _h_clean_path(args: dict, ctx: dict) -> dict:
    """Clean a single path that lives inside a category's safe/probably_safe."""
    cid  = (args.get("category_id") or "").strip()
    path = (args.get("path") or "").strip()
    if not cid or not path:
        return {"error": "category_id and path required"}
    helpers = ctx.get("server_helpers", {})
    exec_clean = helpers.get("execute_clean_path_sync")
    if not exec_clean:
        return {"error": "clean executor unavailable"}
    return exec_clean(cid, path)


def _h_list_applescript_library(args: dict, ctx: dict) -> dict:
    """
    Returns the contents of the applescripts/ library so SADPA knows what
    already exists before proposing a new script. Reads the docs/ folder
    and returns one entry per documented script with title, status, type,
    and the rationale (the "moment that prompted it" section).
    """
    repo_root = Path(__file__).resolve().parent.parent
    docs_dir  = repo_root / "applescripts" / "docs"

    if not docs_dir.exists():
        return {"library_available": False, "note": "applescripts/docs/ not found"}

    entries = []
    for f in sorted(docs_dir.glob("*.md")):
        try:
            body = f.read_text()
        except Exception:
            continue
        # Pull the title (first # heading)
        title = f.stem
        for line in body.splitlines():
            if line.startswith("# "):
                title = line[2:].strip()
                break
        # Pull the moment/intention section (between "## The moment that prompted it" and the next ##)
        intent = ""
        in_intent = False
        for line in body.splitlines():
            if line.startswith("## The moment that prompted it"):
                in_intent = True
                continue
            if in_intent:
                if line.startswith("## "):
                    break
                intent += line + "\n"
        entries.append({
            "doc":    str(f.relative_to(repo_root)),
            "title":  title,
            "intent": intent.strip()[:500],
        })

    snippets_dir = repo_root / "applescripts" / "snippets"
    snippets = []
    if snippets_dir.exists():
        for f in sorted(snippets_dir.glob("*.md")):
            try:
                first_line = f.read_text().splitlines()[0]
            except Exception:
                first_line = ""
            snippets.append({
                "path":  str(f.relative_to(repo_root)),
                "title": first_line.lstrip("# ").strip() if first_line.startswith("#") else f.stem,
            })

    return {
        "library_available": True,
        "scripts":   entries,
        "snippets":  snippets,
        "philosophy": "Every script in this library uses native macOS UI (display alert, progress, display notification) — never echo/Terminal output. DustPan never runs sudo from a script; it surfaces the command for the user to paste into Terminal.",
    }


def _h_propose_new_applescript(args: dict, ctx: dict) -> dict:
    """
    Propose a new AppleScript for the library. Same review-inbox pattern as
    propose_new_cleaner — but stores `script_body` as a top-level field and
    sets `kind: "applescript"` so the snippet generator produces two artifacts
    (script + doc) instead of cleaners.py-style Python tuples.
    """
    try:
        import proposals_store
    except ImportError:
        return {"error": "proposals_store module not available"}

    name = (args.get("name") or "").strip()
    if not name:
        return {"error": "name is required"}
    body = (args.get("script_body") or "").strip()
    if not body:
        return {"error": "script_body is required (the actual AppleScript code)"}
    intent = (args.get("intent") or "").strip()
    if not intent:
        return {"error": "intent is required (why this script exists, the moment that prompted it)"}

    # Sanity-check the script for the hard rules we documented in the SKILL.md
    body_lower = body.lower()
    warnings_list = []
    if "with administrator privileges" in body_lower:
        return {
            "error": "AppleScript must not use `with administrator privileges` — DustPan does not run sudo from scripts. Show the command via `display dialog` with a Copy button and let the user paste into Terminal.",
            "hint":  "See applescripts/snippets/native-clipboard-copy.md",
        }
    if "do shell script \"echo " in body_lower or "do shell script 'echo " in body_lower:
        warnings_list.append("Body contains `do shell script \"echo …\"` — prefer display alert / display dialog / display notification for user-facing output.")
    if "on run" not in body:
        warnings_list.append("Body does not contain an `on run` handler — scripts should have one as an entry point.")

    record = proposals_store.create({
        "name":                  f"[applescript] {name}",
        "category_id_suggested": "applescript-library",
        "rationale":             intent,
        "cost_to_user":          (args.get("cost") or "User pastes the snippet into applescripts/ and the doc template into applescripts/docs/.").strip(),
        "kind":                  "applescript",
        "script_body":           body,
        "file_name":             args.get("file_name"),
        "paths":                 [],   # Not used for AppleScript proposals
        "shell":                 None,
        "source":                "ai-chat-applescript",
    })
    return {
        "ok":          True,
        "proposal_id": record["id"],
        "summary":     f"Proposed AppleScript '{name}' filed to review inbox (id {record['id']}).",
        "warnings":    warnings_list,
        "ui_hint":     "User reviews at the bottom of the Chat with SADPA panel — accept generates two paste-ready artifacts (script + doc).",
    }


def _h_propose_new_cleaner(args: dict, ctx: dict) -> dict:
    """
    Persist a proposal for a new DustPan cleaner to the review inbox.
    Never modifies cleaners.py — that file is hand-curated source. The user
    reviews the proposal in the UI and chooses to dismiss it or accept it
    (accept generates a paste-ready snippet).
    """
    try:
        import proposals_store
    except ImportError:
        return {"error": "proposals_store module not available"}

    # Validate
    name = (args.get("name") or "").strip()
    if not name:
        return {"error": "name is required"}
    if len(name) > 120:
        name = name[:120]
    paths = args.get("paths") or []
    if not isinstance(paths, list) or not paths:
        return {"error": "paths must be a non-empty list of {label, path, tier} objects"}
    for p in paths:
        if not isinstance(p, dict) or not p.get("path"):
            return {"error": "each path entry must have at least a 'path' field"}

    payload = {
        "name":                  name,
        "category_id_suggested": args.get("category_id_suggested", "apps"),
        "rationale":             args.get("rationale", ""),
        "cost_to_user":          args.get("cost_to_user", ""),
        "paths":                 paths,
        "shell":                 args.get("shell"),
        "source":                "ai-chat",
    }
    record = proposals_store.create(payload)
    return {
        "ok":          True,
        "proposal_id": record["id"],
        "status":      record["status"],
        "name":        record["name"],
        "summary":     f"Proposal '{name}' saved for review (id {record['id']}).",
        "ui_hint":     "User can review at the bottom of the Chat with SADPA panel.",
    }


def _h_navigate_to_tab(args: dict, ctx: dict) -> dict:
    """Client-side concern — server just echoes it as an instruction."""
    tab = (args.get("tab_id") or "").strip()
    if not tab:
        return {"error": "tab_id required"}
    return {"tab_id": tab, "ok": True, "client_action": "navigate"}


def _h_ask_user(args: dict, ctx: dict) -> dict:
    """Client-side concern — render a follow-up question in the chat."""
    return {
        "question":     args.get("question", ""),
        "options":      args.get("options", []),
        "ok":           True,
        "client_action": "ask",
    }


# ── Tool registry ────────────────────────────────────────────────────────────

TOOLS: list[dict] = [
    # ── Tier A: read-only, auto-execute ──
    {
        "name": "get_disk_status",
        "description": (
            "Get current macOS disk usage: free GB, used GB, total GB, percent used. "
            "Call this FIRST when the user asks anything about disk space."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
        "tier": "A", "requires_approval": False,
        "handler": _h_get_disk_status,
    },
    {
        "name": "get_doctor_report",
        "description": (
            "Get the top safe-tier reclaimable paths across all previously-scanned "
            "categories, ranked by size. Returns quick-wins ready to clean."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
        "tier": "A", "requires_approval": False,
        "handler": _h_get_doctor_report,
    },
    {
        "name": "list_categories",
        "description": (
            "List every cleanup category DustPan knows about (xcode, docker, apps, "
            "system, temp, archives, downloads, browsers, etc.) with each category's "
            "tagline and per-tier path counts. Use this to know what's available."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
        "tier": "A", "requires_approval": False,
        "handler": _h_list_categories,
    },
    {
        "name": "list_category_actions",
        "description": (
            "List the pre-defined actions for a single category (e.g. 'clear DerivedData', "
            "'docker system prune'). Returns each action's label, description, and cost. "
            "Use this BEFORE proposing run_category_action so you know exactly what runs."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"category_id": {"type": "string", "description": "Category id, e.g. 'xcode'"}},
            "required": ["category_id"],
        },
        "tier": "A", "requires_approval": False,
        "handler": _h_list_category_actions,
    },
    {
        "name": "scan_category",
        "description": (
            "Scan a category and return the top safe/probably_safe/caution paths "
            "ranked by size. Use this when the user asks about a specific category "
            "(e.g. 'how much can I clean in xcode?')."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"category_id": {"type": "string"}},
            "required": ["category_id"],
        },
        "tier": "A", "requires_approval": False,
        "handler": _h_scan_category,
    },
    {
        "name": "run_disk_survey",
        "description": (
            "Run a comprehensive filesystem survey. Discovers Claude Code worktrees, "
            "stale build artifacts (.next, dist, .next-local), large node_modules, "
            "and measures all known caches (Docker.raw, DerivedData, etc.). "
            "Takes 15-45 seconds. Returns the full ranked target list. Use this "
            "when the user asks for a deep audit or 'what's eating my disk'."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
        "tier": "A", "requires_approval": False,
        "handler": _h_run_disk_survey,
    },
    {
        "name": "measure_path",
        "description": (
            "Measure on-disk size of a specific path (du -sh equivalent). "
            "Only paths under ~/Library, ~/Developer, ~/Documents, ~/Downloads, "
            "~/Desktop, ~/Movies, ~/Music, ~/Pictures, /Applications, and common "
            "dev caches (~/.npm, ~/.cargo, etc.) are allowed. System dirs are blocked."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string", "description": "Absolute or tilde-expanded path"}},
            "required": ["path"],
        },
        "tier": "A", "requires_approval": False,
        "handler": _h_measure_path,
    },
    {
        "name": "list_directory",
        "description": (
            "List the immediate children of a directory with their sizes. Returns "
            "up to 50 entries sorted by size desc. Same safety rules as measure_path. "
            "Use this to drill into what's inside a big folder you found."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"],
        },
        "tier": "A", "requires_approval": False,
        "handler": _h_list_directory,
    },
    {
        "name": "find_foreign_ownership",
        "description": (
            "Find disk space locked behind another user's file ownership. Detects: "
            "(a) Homebrew or other system tools installed by a previous user "
            "(e.g. /opt/homebrew owned by 'olivia'), and (b) old user home "
            "directories still on disk (e.g. /Users/oldperson). Returns paths, "
            "sizes, owner names, and the exact `sudo chown` or `sudo rm` command "
            "to recover the space. DustPan CANNOT run sudo itself — the user must "
            "paste these commands into Terminal."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
        "tier": "A", "requires_approval": False,
        "handler": _h_find_foreign_ownership,
    },
    {
        "name": "get_recent_runs",
        "description": (
            "Get the user's recent cleanup history (last N runs). Each entry has "
            "timestamp, category, action, freed_gb. Use this to understand patterns: "
            "'what did I clean last week?', 'how often do I run Docker prune?'"
        ),
        "input_schema": {
            "type": "object",
            "properties": {"limit": {"type": "integer", "default": 20}},
            "required": [],
        },
        "tier": "A", "requires_approval": False,
        "handler": _h_get_recent_runs,
    },

    # ── Tier B: action, requires approval (toggle-able for safe-tier) ──
    {
        "name": "run_category_action",
        "description": (
            "Run a pre-defined cleanup action (e.g. clear DerivedData, docker prune). "
            "ALWAYS list_category_actions first to know what's available and what each "
            "does. The user will be shown an approval card with the action's full "
            "description and cost before it runs (unless they've enabled safe-tier "
            "auto-approval in Settings)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "category_id": {"type": "string"},
                "action_id":   {"type": "string"},
            },
            "required": ["category_id", "action_id"],
        },
        "tier": "B", "requires_approval": True,
        "handler": _h_run_category_action,
    },
    {
        "name": "clean_path",
        "description": (
            "Clean a single path that's already in a category's safe or probably_safe "
            "group. Path must match exactly what was returned by scan_category — the "
            "server validates against cleaners.py. Requires user approval."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "category_id": {"type": "string"},
                "path":        {"type": "string"},
            },
            "required": ["category_id", "path"],
        },
        "tier": "B", "requires_approval": True,
        "handler": _h_clean_path,
    },

    {
        "name": "list_applescript_library",
        "description": (
            "List the AppleScripts in DustPan's library (applescripts/) with each "
            "script's title and the 'moment that prompted it' rationale. Call this "
            "BEFORE proposing a new AppleScript so you know what already exists "
            "and what reusable snippets (native-confirmation, native-progress-bar, "
            "native-notification, native-clipboard-copy) are available."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
        "tier": "A", "requires_approval": False,
        "handler": _h_list_applescript_library,
    },
    {
        "name": "propose_new_applescript",
        "description": (
            "Propose a NEW AppleScript for DustPan's library — one-tap utilities "
            "that use native macOS UI (display alert, progress block, system "
            "notification, choose from list). Use when you spot a recurring task "
            "the user would benefit from binding to a Shortcut or hotkey. "
            "Examples of fit: 'show me free space right now', 'one-tap clean of X', "
            "'show me which Macs on the network have low disk', 'pop a dialog "
            "asking which Xcode runtime to delete'. \n\n"
            "Hard rules for any script you propose:\n"
            "  - Use display alert / display dialog / progress / display notification — never echo to Terminal.\n"
            "  - NEVER `do shell script ... with administrator privileges` — DustPan does not run sudo.\n"
            "  - If sudo is needed, show the command via display dialog with a Copy button (see snippets/native-clipboard-copy.md).\n"
            "  - Include `on run` and end with sensible feedback (alert or notification).\n\n"
            "Call list_applescript_library first so you can reuse snippets and avoid duplicating existing scripts."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Short human-readable name (e.g. 'Show Xcode Cache Sizes', 'Quick Docker Prune', 'Pick a Simulator to Delete')",
                },
                "file_name": {
                    "type": "string",
                    "description": "Filename for the script, kebab-case with .applescript extension (e.g. 'show-xcode-cache-sizes.applescript')",
                },
                "intent": {
                    "type": "string",
                    "description": "Plain-English explanation: why does this script need to exist? What pain or recurring task does it solve? Becomes the 'moment that prompted it' doc section.",
                },
                "cost": {
                    "type": "string",
                    "description": "What does running this script do? If it deletes something, what rebuilds? Becomes the docstring cost annotation.",
                },
                "script_body": {
                    "type": "string",
                    "description": "The full AppleScript code. Must include `on run` and use native UI patterns. Reference snippets/native-*.md for reusable patterns.",
                },
            },
            "required": ["name", "intent", "script_body"],
        },
        "tier": "B-meta", "requires_approval": False,  # Save-for-review needs no approval — it's just a record
        "handler": _h_propose_new_applescript,
    },

    # ── Tier B-meta: proposes a new cleaner, never auto-executes ──
    {
        "name": "propose_new_cleaner",
        "description": (
            "Propose a NEW cleanup entry for DustPan to add. Use when you find "
            "a large directory or recurring cache that DustPan doesn't already "
            "know about (check list_categories + list_category_actions first). "
            "Your proposal goes to a review inbox — it does NOT modify DustPan. "
            "The user reviews it and either dismisses it or accepts (accept "
            "generates a paste-ready Python snippet they can drop into "
            "cleaners.py themselves). Be specific: include exact paths, the "
            "right tier (safe = always reclaimable, probably_safe = usually "
            "fine, caution = needs human review), what category it belongs to, "
            "and what the user gives up if they accept."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Short human-readable name (e.g. 'JetBrains IDE Caches', 'pyenv Cache', 'Bun install cache')",
                },
                "category_id_suggested": {
                    "type": "string",
                    "description": "Which existing category this belongs to (apps, xcode, temp, system, browsers, docker, downloads, archives, creative, etc.). Call list_categories if unsure.",
                },
                "rationale": {
                    "type": "string",
                    "description": "Plain-English explanation of what these files are and why they accumulate. 1–3 sentences.",
                },
                "cost_to_user": {
                    "type": "string",
                    "description": "What rebuilds / what's lost if the user accepts. Concrete (e.g. '~30s slower next launch of the IDE').",
                },
                "paths": {
                    "type": "array",
                    "description": "Concrete filesystem paths to include in the cleaner. Each is {label, path, tier}.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "label": {"type": "string"},
                            "path":  {"type": "string"},
                            "tier":  {"type": "string", "enum": ["safe", "probably_safe", "caution"]},
                        },
                        "required": ["label", "path", "tier"],
                    },
                },
                "shell": {
                    "type": "string",
                    "description": "OPTIONAL — a shell snippet for cleanups that are more complex than `rm -rf <paths>`. Most proposals should omit this and rely on the standard tiered-path cleanup pattern.",
                },
            },
            "required": ["name", "category_id_suggested", "rationale", "paths"],
        },
        "tier": "B-meta", "requires_approval": False,  # Saving for review needs no approval — it's just a record
        "handler": _h_propose_new_cleaner,
    },

    # ── Tier C: meta / client-side ──
    {
        "name": "navigate_to_tab",
        "description": (
            "Tell the UI to switch tabs. Valid tab ids: 'overview', 'emergency', "
            "'survey', 'agent', 'ai-chat', 'settings', or any category id from "
            "list_categories. Use this to direct the user to where they should look."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"tab_id": {"type": "string"}},
            "required": ["tab_id"],
        },
        "tier": "C", "requires_approval": False,
        "handler": _h_navigate_to_tab,
    },
    {
        "name": "ask_user",
        "description": (
            "Ask the user a follow-up question with optional multiple-choice options. "
            "Use this when you need a decision before proceeding (e.g. 'I see two "
            "ways to free space — which would you like?')."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "options":  {"type": "array", "items": {"type": "string"}},
            },
            "required": ["question"],
        },
        "tier": "C", "requires_approval": False,
        "handler": _h_ask_user,
    },
]

# Index by name for O(1) dispatch
_BY_NAME: dict[str, dict] = {t["name"]: t for t in TOOLS}


# ── Schema projections for each provider ─────────────────────────────────────

def schemas_anthropic() -> list[dict]:
    """Tool schemas in Anthropic Messages API shape."""
    return [
        {
            "name":         t["name"],
            "description":  t["description"],
            "input_schema": t["input_schema"],
        }
        for t in TOOLS
    ]


def schemas_openai() -> list[dict]:
    """Tool schemas in OpenAI function-calling shape."""
    return [
        {
            "type": "function",
            "function": {
                "name":        t["name"],
                "description": t["description"],
                "parameters":  t["input_schema"],
            },
        }
        for t in TOOLS
    ]


# ── Dispatch ─────────────────────────────────────────────────────────────────

def get_tool(name: str) -> Optional[dict]:
    return _BY_NAME.get(name)


def run_tool(name: str, args: dict, ctx: dict) -> dict:
    """
    Execute a tool. Returns a dict with the tool's result OR an error dict.
    Catches all exceptions so the model can recover gracefully.
    """
    t = _BY_NAME.get(name)
    if not t:
        return {"error": f"unknown tool: {name}", "available": list(_BY_NAME.keys())}
    handler: Callable = t["handler"]
    try:
        t0 = time.time()
        result = handler(args or {}, ctx or {})
        return {"ok": True, "result": result, "elapsed_ms": int((time.time() - t0) * 1000)}
    except Exception as e:
        return {"ok": False, "error": str(e), "tool": name}


def needs_approval(name: str, args: dict, allow_safe_auto: bool, cleaners_dict: dict) -> bool:
    """
    Decide whether a tool call needs explicit user approval.

    Rules:
      - Tier A and C: never need approval
      - Tier B: need approval UNLESS allow_safe_auto is True AND the action's
        tier in cleaners.py is 'safe'
    """
    t = _BY_NAME.get(name)
    if not t:
        return True  # Unknown tool — always require approval
    if not t.get("requires_approval", False):
        return False

    if not allow_safe_auto:
        return True

    # Determine if this is a safe-tier action
    if name == "run_category_action":
        # We treat all explicit named actions as needing approval unless we can
        # confidently classify them as "safe tier" — for now, ANY run_category_action
        # call requires approval since action shells are arbitrary by nature.
        # Future: tag each action in cleaners.py with explicit tier metadata.
        return True
    if name == "clean_path":
        cid = (args.get("category_id") or "").strip()
        path = (args.get("path") or "").strip()
        cat = cleaners_dict.get(cid)
        if not cat:
            return True
        # Auto-approve only if path appears in the 'safe' group
        for label, p in cat.get("groups", {}).get("safe", []):
            if os.path.expanduser(p) == os.path.expanduser(path) or p == path:
                return False
        return True

    return True


def approval_summary(name: str, args: dict, cleaners_dict: dict) -> dict:
    """
    Build the human-facing approval card payload for a Tier-B tool call.
    Pulls 'desc' and 'cost' text from cleaners.py so wording stays curated.
    """
    if name == "run_category_action":
        cid = (args.get("category_id") or "").strip()
        aid = (args.get("action_id") or "").strip()
        cat = cleaners_dict.get(cid, {})
        action = cat.get("actions", {}).get(aid, {})
        return {
            "summary": f"Run '{action.get('label', aid)}' in {cat.get('label', cid)}",
            "desc":    action.get("desc", ""),
            "cost":    action.get("cost", ""),
            "category_id": cid,
            "action_id":   aid,
        }
    if name == "clean_path":
        cid = (args.get("category_id") or "").strip()
        path = (args.get("path") or "").strip()
        cat = cleaners_dict.get(cid, {})
        return {
            "summary": f"Clean {path}",
            "desc":    f"Delete the contents of {path} (this path is in '{cat.get('label', cid)}').",
            "cost":    "The path will be removed. If it's a cache it will rebuild on next use.",
            "category_id": cid,
            "path":        path,
        }
    return {"summary": f"Run {name}", "desc": json.dumps(args), "cost": "Unknown."}
