"""
Plan 0023, Ship 2 — Cleaner proposals storage.

The AI agent can call `propose_new_cleaner` to suggest a new cleanup entry
DustPan doesn't yet know about. Proposals land here for human review —
never auto-edit cleaners.py.

Storage:
  - Standalone (default): JSON file at ~/.dustpan/proposals.json
  - Docker mode: cleaner_proposals table in Postgres (if available)

For Ship 2 we ship the JSON path — Postgres is a clean future-add since the
public API doesn't change.
"""
from __future__ import annotations

import json
import os
import time
import uuid
from pathlib import Path
from typing import Any, Optional

STORE_PATH = Path.home() / ".dustpan" / "proposals.json"


# ── File I/O ──────────────────────────────────────────────────────────────────

def _ensure_store_exists() -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not STORE_PATH.exists():
        STORE_PATH.write_text("[]")


def _read_all() -> list[dict]:
    _ensure_store_exists()
    try:
        data = json.loads(STORE_PATH.read_text())
        if not isinstance(data, list):
            return []
        return data
    except (json.JSONDecodeError, OSError):
        return []


def _write_all(proposals: list[dict]) -> None:
    _ensure_store_exists()
    tmp = STORE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(proposals, indent=2))
    tmp.replace(STORE_PATH)


# ── Public API ────────────────────────────────────────────────────────────────

def list_proposals(status: Optional[str] = None) -> list[dict]:
    """Return all proposals, optionally filtered by status."""
    items = _read_all()
    if status:
        items = [p for p in items if p.get("status") == status]
    # Most recent first
    items.sort(key=lambda p: p.get("created_at", 0), reverse=True)
    return items


def count_pending() -> int:
    return sum(1 for p in _read_all() if p.get("status") == "pending")


def get(proposal_id: str) -> Optional[dict]:
    for p in _read_all():
        if p.get("id") == proposal_id:
            return p
    return None


def create(payload: dict) -> dict:
    """
    Insert a new pending proposal. Returns the stored record.

    Required payload keys:
      - name              (str)
      - category_id_suggested (str)
      - rationale         (str)
    Optional:
      - cost_to_user      (str)
      - paths             ([{label, path, tier}])
      - shell             (str)
      - kind              (str: "cleaner" | "applescript") — determines snippet format
      - script_body       (str) — for AppleScript proposals, the full .applescript source
      - file_name         (str) — for AppleScript proposals, the suggested filename
    """
    items = _read_all()
    pid = uuid.uuid4().hex[:12]
    record = {
        "id":                    pid,
        "created_at":            int(time.time()),
        "status":                "pending",
        "name":                  (payload.get("name") or "").strip()[:120] or "Unnamed proposal",
        "category_id_suggested": (payload.get("category_id_suggested") or "").strip() or "apps",
        "rationale":             (payload.get("rationale") or "").strip(),
        "cost_to_user":          (payload.get("cost_to_user") or "").strip(),
        "paths":                 payload.get("paths") or [],
        "shell":                 (payload.get("shell") or "").strip() or None,
        "kind":                  payload.get("kind") or "cleaner",
        "script_body":           (payload.get("script_body") or "").strip() or None,
        "file_name":             (payload.get("file_name") or "").strip() or None,
        "source":                payload.get("source") or "ai-chat",
    }
    items.append(record)
    _write_all(items)
    return record


def update_status(proposal_id: str, status: str) -> Optional[dict]:
    """Set the status of a proposal. Returns the updated record or None if not found."""
    if status not in ("pending", "accepted", "dismissed"):
        return None
    items = _read_all()
    updated = None
    for p in items:
        if p.get("id") == proposal_id:
            p["status"]      = status
            p["resolved_at"] = int(time.time())
            updated = p
            break
    if updated:
        _write_all(items)
    return updated


def delete(proposal_id: str) -> bool:
    items = _read_all()
    n_before = len(items)
    items = [p for p in items if p.get("id") != proposal_id]
    if len(items) == n_before:
        return False
    _write_all(items)
    return True


# ── Snippet generation ────────────────────────────────────────────────────────

def generate_snippet(proposal: dict) -> str:
    """
    Convert a proposal into a paste-ready snippet.

    Two output shapes depending on `kind`:
      - "cleaner"     → Python tuples for cleaners.py (the original v0.25.0 format)
      - "applescript" → returns a sentinel; use generate_applescript_artifacts() instead
                        which returns a dict with separate script_body + doc_template
                        fields so the UI can render them in two distinct blocks with
                        separate Copy buttons.
    """
    if proposal.get("kind") == "applescript" or proposal.get("script_body"):
        # AppleScript proposals are richer than a single text blob — the UI
        # should call /snippet then check `applescript` key. For backward-compat
        # the server endpoint returns both shapes (snippet + applescript dict).
        # This function returns a single combined string for callers that just
        # want a paste-ready text (e.g. terminal output).
        return _generate_applescript_snippet_text(proposal)

    name           = proposal.get("name", "Unnamed")
    category       = proposal.get("category_id_suggested", "apps")
    rationale      = proposal.get("rationale", "")
    cost           = proposal.get("cost_to_user", "")
    paths          = proposal.get("paths", []) or []
    shell          = proposal.get("shell")

    lines: list[str] = []
    lines.append(f"# ── Proposed by AI agent: {name} ──")
    lines.append(f"# Target category: {category!r}")
    if rationale:
        lines.append(f"# Rationale: {rationale}")
    if cost:
        lines.append(f"# Cost: {cost}")
    lines.append("# Add the following tuples to CATEGORIES[{!r}]['groups'][TIER]:".format(category))
    lines.append("")

    # Group paths by tier
    by_tier: dict[str, list[tuple[str, str]]] = {"safe": [], "probably_safe": [], "caution": []}
    for p in paths:
        tier = p.get("tier", "safe")
        if tier not in by_tier:
            tier = "safe"
        label = p.get("label", "").strip()
        path  = p.get("path", "").strip()
        if label and path:
            by_tier[tier].append((label, path))

    for tier, entries in by_tier.items():
        if not entries:
            continue
        lines.append(f"# Tier: {tier}")
        for label, path in entries:
            # Quote with care — match cleaners.py style
            label_q = label.replace('"', '\\"')
            path_q  = path.replace('"',  '\\"')
            lines.append(f'    ("{label_q}", "{path_q}"),')
        lines.append("")

    if shell:
        action_id = (
            "ai-"
            + "".join(c if c.isalnum() else "-" for c in name.lower()).strip("-")[:40]
        )
        shell_indented = "\n            ".join(shell.splitlines()) if "\n" in shell else shell
        lines.append("# Optional: custom action in CATEGORIES[{!r}]['actions']:".format(category))
        lines.append(f'"{action_id}": {{')
        lines.append(f'    "label": "{name}",')
        lines.append(f'    "desc":  "{rationale.replace(chr(34), chr(92)+chr(34))}",')
        lines.append(f'    "cost":  "{cost.replace(chr(34), chr(92)+chr(34))}",')
        lines.append(f'    "shell": (')
        lines.append(f'        "{shell_indented}"')
        lines.append(f'    ),')
        lines.append("},")

    return "\n".join(lines)


# ── AppleScript proposal artifacts (Plan 0023 Ship 2 + v0.26.1) ──────────────

def _safe_file_stem(name: str, fallback: str = "ai-proposal") -> str:
    """Convert 'Show Xcode Cache Sizes' → 'show-xcode-cache-sizes'."""
    stem = "".join(c if c.isalnum() else "-" for c in name.lower())
    while "--" in stem:
        stem = stem.replace("--", "-")
    stem = stem.strip("-")[:60]
    return stem or fallback


def _next_doc_number() -> int:
    """Scan applescripts/docs/ for the highest NNNN- prefix and return next."""
    from pathlib import Path as _P
    docs = _P(__file__).resolve().parent.parent / "applescripts" / "docs"
    highest = 0
    if docs.exists():
        for f in docs.glob("*.md"):
            try:
                n = int(f.name.split("-", 1)[0])
                highest = max(highest, n)
            except (ValueError, IndexError):
                continue
    return highest + 1


def generate_applescript_artifacts(proposal: dict) -> dict:
    """
    Generate the two artifacts an AppleScript proposal acceptance produces:
      - `script`     — full .applescript content with a header comment block
      - `script_path`— suggested filename (e.g. "applescripts/show-disk-status.applescript")
      - `doc`        — full doc template following applescripts/docs/ conventions
      - `doc_path`   — suggested doc filename (e.g. "applescripts/docs/0005-show-disk-status.md")

    Caller pastes each into the suggested path and commits.
    """
    name       = proposal.get("name", "Unnamed").replace("[applescript] ", "")
    rationale  = proposal.get("rationale", "")
    cost       = proposal.get("cost_to_user", "")
    body_raw   = (proposal.get("script_body") or "").strip()

    # Suggested filename
    file_name  = proposal.get("file_name") or f"{_safe_file_stem(name)}.applescript"
    if not file_name.endswith(".applescript"):
        file_name += ".applescript"
    script_path = f"applescripts/{file_name}"

    # Suggested doc filename
    doc_num    = _next_doc_number()
    doc_stem   = file_name.replace(".applescript", "")
    doc_name   = f"{doc_num:04d}-{doc_stem}.md"
    doc_path   = f"applescripts/docs/{doc_name}"

    # ── Build the script: header comment + body ────────────────────────────
    header = [
        f"-- {file_name}",
        "-- ─────────────────────────────────────────────────────────────────────────────",
    ]
    if rationale:
        # Wrap rationale at ~72 chars across `--` comment lines
        words = rationale.split()
        line  = "-- "
        for w in words:
            if len(line) + len(w) + 1 > 78:
                header.append(line.rstrip())
                line = "-- " + w
            else:
                line += (" " if line.strip() != "--" else "") + w
        if line.strip() != "--":
            header.append(line.rstrip())
        header.append("--")
    header.append("-- Proposed by SADPA. Part of the DustPan AppleScript Library.")
    header.append(f"-- Documentation: {doc_path}")
    header.append("")
    script_full = "\n".join(header) + body_raw + ("\n" if not body_raw.endswith("\n") else "")

    # ── Build the doc template ─────────────────────────────────────────────
    doc_lines = [
        f"# {doc_num:04d} — {name}",
        "",
        f"**File:** [`{script_path}`](../{file_name})",
        "**Status:** 💡 Proposed (accepted from review inbox)",
        "**Type:** _(fill in: Cleanup · Diagnostic · UI helper · Utility · Recovery)_",
        "",
        "## What it does",
        "",
        "_(One paragraph in plain English. Take the SADPA-proposed rationale below as a starting point and refine.)_",
        "",
        rationale,
        "",
        "## The moment that prompted it",
        "",
        "_(The specific user pain or feature request that triggered this script. Tells future maintainers why.)_",
        "",
        rationale,
        "",
        "## Cost to the user",
        "",
        cost or "_(What does running this script do? If it deletes something, what rebuilds?)_",
        "",
        "## Native macOS UI patterns used",
        "",
        "_(List the patterns this script uses, with links back to applescripts/snippets/.)_",
        "",
        "- See [`snippets/native-confirmation.md`](../snippets/native-confirmation.md) for the confirmation alert",
        "- See [`snippets/native-progress-bar.md`](../snippets/native-progress-bar.md) for the progress block",
        "- See [`snippets/native-notification.md`](../snippets/native-notification.md) for the completion notification",
        "- See [`snippets/native-clipboard-copy.md`](../snippets/native-clipboard-copy.md) for the clipboard + Open Terminal pattern",
        "",
        "## The full script",
        "",
        f"See [`{script_path}`](../{file_name}).",
        "",
        "## How to invoke",
        "",
        "```bash",
        f"# Direct",
        f"osascript {script_path}",
        "",
        f"# As a Shortcut — bind to a hotkey for one-tap invocation.",
        f"# In Shortcuts.app: New Shortcut → Run AppleScript → paste the body → save with a hotkey.",
        "```",
        "",
        "## Variations / extensions",
        "",
        "_(Ideas for follow-up improvements. Leave at least one bullet.)_",
        "",
        "- _(TODO)_",
        "",
        "## Related",
        "",
        "- [`applescripts/README.md`](../README.md) — library index + philosophy",
    ]
    doc_full = "\n".join(doc_lines)

    return {
        "script":      script_full,
        "script_path": script_path,
        "doc":         doc_full,
        "doc_path":    doc_path,
        "file_name":   file_name,
        "doc_number":  doc_num,
    }


def _generate_applescript_snippet_text(proposal: dict) -> str:
    """
    Fallback text form for AppleScript proposals — for callers that want a
    single string blob (terminal output, plain-text export). Combines the
    script header + the doc template, separated by a clear divider.
    """
    artifacts = generate_applescript_artifacts(proposal)
    return (
        f"# ─── Paste into: {artifacts['script_path']} ───\n\n"
        f"{artifacts['script']}\n\n"
        f"# ─── Paste into: {artifacts['doc_path']} ───\n\n"
        f"{artifacts['doc']}\n"
    )
