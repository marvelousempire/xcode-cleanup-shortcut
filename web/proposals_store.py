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
    Convert a proposal into a paste-ready Python snippet for cleaners.py.

    Format mirrors the existing CATEGORIES structure: a few `(label, path)`
    tuples per tier, optionally a custom action with shell.
    """
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
