"""
Shared AI_AGENT_RULES loader for Ask DustPan.

The chat prompt gets compact local-law context by default. Full handbook
sections stay read-on-demand through the read_ai_agent_rules tool.
"""
from __future__ import annotations

import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
HANDBOOK_DIR = REPO_ROOT / "AI_AGENT_RULES"

SECTION_ALIASES = {
    "readme": "README.md",
    "overview": "README.md",
    "manifest": "manifest.json",
    "assignments": "AGENT_ASSIGNMENTS.md",
    "operating_rules": "OPERATING_RULES.md",
    "rules": "OPERATING_RULES.md",
    "skills": "SKILLS.md",
    "changelog": "CHANGELOG_CONTEXT.md",
    "changelog_context": "CHANGELOG_CONTEXT.md",
    "history": "HISTORY.md",
}

COMPACT_SOURCES = [
    ("AI_AGENT_RULES/README.md", HANDBOOK_DIR / "README.md", 1400),
    ("AI_AGENT_RULES/OPERATING_RULES.md", HANDBOOK_DIR / "OPERATING_RULES.md", 1800),
    ("AI_AGENT_RULES/SKILLS.md", HANDBOOK_DIR / "SKILLS.md", 1400),
    ("AI_AGENT_RULES/CHANGELOG_CONTEXT.md", HANDBOOK_DIR / "CHANGELOG_CONTEXT.md", 1400),
    ("AI_AGENT_RULES/HISTORY.md", HANDBOOK_DIR / "HISTORY.md", 1200),
    ("AGENTS.md", REPO_ROOT / "AGENTS.md", 900),
    ("CLAUDE.md", REPO_ROOT / "CLAUDE.md", 900),
]


def _read_bounded(path: Path, max_chars: int) -> str:
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return ""
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "\n...[truncated]"


def load_compact_handbook_context(max_chars: int = 8000) -> str:
    """
    Return bounded local AI law for the system prompt.

    Missing files are ignored so older checkouts still run. Once
    AI_AGENT_RULES exists, it becomes the first source of context.
    """
    chunks: list[str] = []

    if HANDBOOK_DIR.exists():
        manifest_path = HANDBOOK_DIR / "manifest.json"
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            slots = [
                f"{section.get('content_slot')} -> {section.get('path')}"
                for section in manifest.get("sections", [])
                if section.get("content_slot") and section.get("path")
            ]
            if slots:
                chunks.append("AI_AGENT_RULES manifest slots:\n" + "\n".join(f"- {slot}" for slot in slots))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            chunks.append("AI_AGENT_RULES manifest: unavailable or invalid.")

    for label, path, limit in COMPACT_SOURCES:
        body = _read_bounded(path, limit)
        if body:
            chunks.append(f"## {label}\n{body}")

    combined = "\n\n".join(chunks).strip()
    if not combined:
        return ""
    if len(combined) > max_chars:
        combined = combined[:max_chars].rstrip() + "\n...[AI_AGENT_RULES context truncated]"
    return combined


def read_ai_agent_rules_section(section: str, max_chars: int = 12000) -> dict:
    """Read one allowed handbook section from AI_AGENT_RULES."""
    raw = (section or "").strip().lower().replace("-", "_")
    if not raw:
        return {
            "ok": False,
            "error": "section is required",
            "available_sections": sorted(SECTION_ALIASES),
        }
    filename = SECTION_ALIASES.get(raw)
    if not filename:
        return {
            "ok": False,
            "error": f"unknown AI_AGENT_RULES section: {section}",
            "available_sections": sorted(SECTION_ALIASES),
        }

    path = HANDBOOK_DIR / filename
    if not path.exists():
        return {"ok": False, "error": f"AI_AGENT_RULES section not found: {filename}"}

    body = _read_bounded(path, max_chars)
    return {
        "ok": True,
        "section": raw,
        "path": f"AI_AGENT_RULES/{filename}",
        "content": body,
        "truncated": body.endswith("...[truncated]"),
    }
