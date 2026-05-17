"""
Plan 0023 — chat orchestrator for Ask DustPan.

This module is the glue between:
  - the HTTP handler (server.py POST /api/ai/chat)
  - the multi-provider tool-calling loop (ai.complete_with_tools)
  - the tool registry (agent_tools.run_tool)
  - the cleaners.py source-of-truth

It builds the system prompt, configures the ctx dict tool handlers need,
selects the right provider, and pipes events back to the caller.
"""
from __future__ import annotations

import json
import os
import shlex
import subprocess
import sys
import time
from pathlib import Path
from typing import Callable, Optional

from ai_agent_rules import load_compact_handbook_context
import agent_tools


# ── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Ask DustPan, the AI disk co-pilot inside DustPan, a macOS disk-space cleanup app.

You are talking to the user who owns this Mac. Their disk is currently {free_gb} GB free of {total_gb} GB ({used_pct}% used).

# Your job
Help them understand what's taking space and reclaim it safely. Be specific, direct, and respect their time. Use tools to measure real things — never speculate about sizes or paths without checking.

# How to work
1. **Measure first.** Before recommending anything, call `get_disk_status` and either `get_doctor_report` (fast, uses cached scans) or `run_disk_survey` (slow but comprehensive — use for deep audits or first-time triage).
2. **Drill in.** If you spot a big folder you're uncertain about, use `measure_path` and `list_directory` to investigate. Only home-directory paths are reachable — system dirs are blocked for safety.
3. **Use DustPan's pre-vetted tools.** When recommending a cleanup, call `list_category_actions` to see what's available, then `run_category_action` or `clean_path`. Never invent shell commands — DustPan has curated commands for every safe cleanup.
4. **Get permission for destructive operations.** Any cleanup tool call will surface an approval card to the user with the action's curated description + cost. Don't hide what you're about to delete.

# Tone
- Plain English, like a smart friend who happens to be a sysadmin.
- Short paragraphs. Use lists for ranked items. Use code blocks for paths.
- When you report a size, always include it from a tool result — don't approximate.
- When you find something concerning (>10 GB cache, broken-looking dir), say so plainly.

# Tools you have
You have read-only tools (disk status, doctor report, survey, scan_category, measure_path, list_directory, get_recent_runs) and action tools (run_category_action, clean_path) that need the user's approval. Use navigate_to_tab to direct them to a panel when relevant.

# Hard rules
- NEVER claim to have deleted something you didn't actually call a tool for.
- NEVER recommend `rm` on a path outside DustPan's known categories.
- NEVER speculate about sizes — call `measure_path` or `scan_category` first.
- If a tool errors with "path not allowed", explain to the user that DustPan sandboxes filesystem peek to safe locations.

# Local AI handbook
DustPan carries app-specific AI law in AI_AGENT_RULES/. Treat it as the local binder for agent assignments, operating rules, skills, changelog context, and history. Load this compact context before answering, and call `read_ai_agent_rules` only when you need a full section:
{ai_agent_rules_context}
"""


def build_system_prompt(disk_status: dict) -> str:
    handbook_context = load_compact_handbook_context()
    if not handbook_context:
        handbook_context = "AI_AGENT_RULES/ is not available in this checkout yet."
    return SYSTEM_PROMPT.format(
        free_gb  = disk_status.get("free_gb", "?"),
        total_gb = disk_status.get("total_gb", "?"),
        used_pct = disk_status.get("used_pct", "?"),
        ai_agent_rules_context = handbook_context,
    )


# ── Sync executors — wrap server.py's SSE-streaming versions ─────────────────

def _execute_action_sync(category_id: str, action_id: str, cleaners_dict: dict) -> dict:
    """Run a cleaner action and return result dict. No SSE — just before/after."""
    cat = cleaners_dict.get(category_id, {})
    action = cat.get("actions", {}).get(action_id, {})
    if not action:
        return {"ok": False, "error": f"unknown action: {category_id}/{action_id}"}

    # Build the same command server.py does
    if "shell" in action:
        cmd = ["bash", "-c", action["shell"] + " 2>&1"]
    elif "cmd" in action:
        cmd = action["cmd"]
    else:
        return {"ok": False, "error": "action has no shell or cmd"}

    # Capture before/after disk
    try:
        import shutil as _shutil
        before = _shutil.disk_usage("/")
        before_free_gb = round(before.free / 1024**3, 2)
    except Exception:
        before_free_gb = 0.0

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        output = (proc.stdout or "") + (proc.stderr or "")
        return_code = proc.returncode
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "action timed out after 5 minutes"}
    except Exception as e:
        return {"ok": False, "error": f"failed to run: {e}"}

    try:
        import shutil as _shutil
        after = _shutil.disk_usage("/")
        after_free_gb = round(after.free / 1024**3, 2)
    except Exception:
        after_free_gb = before_free_gb

    freed_gb = round(after_free_gb - before_free_gb, 2)

    return {
        "ok":          return_code == 0,
        "freed_gb":    freed_gb,
        "before_gb":   before_free_gb,
        "after_gb":    after_free_gb,
        "return_code": return_code,
        "output_tail": output[-2000:] if len(output) > 2000 else output,
    }


def _execute_clean_path_sync(category_id: str, target_path: str, cleaners_dict: dict) -> dict:
    """rm -rf a single path that lives in a category's safe/probably_safe groups."""
    cat = cleaners_dict.get(category_id, {})
    if not cat:
        return {"ok": False, "error": f"unknown category: {category_id}"}

    # Validate path is in the category (same check server.py does)
    allowed: list[str] = []
    for tier in ("safe", "probably_safe"):
        for label, p in cat.get("groups", {}).get(tier, []):
            allowed.append(os.path.expanduser(p))
    expanded = os.path.expanduser(target_path)
    if expanded not in allowed:
        return {"ok": False, "error": "path not in category's safe/probably_safe groups",
                "hint": f"call scan_category({category_id!r}) to see allowed paths"}

    try:
        import shutil as _shutil
        before = _shutil.disk_usage("/")
        before_free_gb = round(before.free / 1024**3, 2)
    except Exception:
        before_free_gb = 0.0

    quoted = shlex.quote(expanded)
    cmd = ["bash", "-c", f"rm -rf {quoted}/* 2>&1 || true"]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        output = (proc.stdout or "") + (proc.stderr or "")
    except Exception as e:
        return {"ok": False, "error": f"failed: {e}"}

    try:
        import shutil as _shutil
        after = _shutil.disk_usage("/")
        after_free_gb = round(after.free / 1024**3, 2)
    except Exception:
        after_free_gb = before_free_gb

    freed_gb = round(after_free_gb - before_free_gb, 2)
    return {
        "ok":        True,
        "freed_gb":  freed_gb,
        "before_gb": before_free_gb,
        "after_gb":  after_free_gb,
        "output_tail": output[-1000:] if len(output) > 1000 else output,
    }


def _run_survey_sync_stub() -> dict:
    """
    Placeholder — server.py will inject the real survey-sync helper that
    reuses the same logic as /api/survey but blocks for completion.
    Returning a hint so the agent can pivot to a per-category scan.
    """
    return {"note": "Full survey is async — call scan_category per category instead, or use get_doctor_report for cached results."}


# ── Public entry: chat_turn ──────────────────────────────────────────────────

def chat_turn(
    messages:          list[dict],
    on_event:          Callable[[dict], None],
    server_helpers:    dict,
    cleaners_dict:     dict,
    allow_safe_auto:   bool = False,
    pending_results:   Optional[list[dict]] = None,
    provider_override: Optional[str] = None,
) -> dict:
    """
    Run one chat turn (possibly multi-round if tools are involved).
    Pipes events to `on_event`. Returns the final {messages, usage, ...} dict.

    server_helpers must include at minimum:
      - get_status:           () -> {free_gb, used_gb, total_gb, used_pct}
      - build_doctor_report:  () -> doctor report dict
      - scan_category:        (cid) -> scan result dict
    Optional:
      - run_survey_sync:      () -> survey result dict (else stub returned)
    """
    # Determine provider + key
    import ai

    provider, api_key = _resolve_provider(provider_override)
    if not provider:
        on_event({"event": "error", "data": {
            "message": "No AI provider configured. Add an Anthropic or OpenAI key in Settings → AI."
        }})
        return {"ok": False, "error": "no provider"}

    # Build ctx for tool handlers
    disk_status = server_helpers.get("get_status", lambda: {})() or {}
    ctx = {
        "scan_cache":      server_helpers.get("scan_cache", {}),
        "disk_status":     disk_status,
        "allow_safe_auto": allow_safe_auto,
        "cleaners":        cleaners_dict,
        "server_helpers": {
            **server_helpers,
            # Inject sync executors that read from cleaners_dict
            "execute_action_sync":      lambda cid, aid: _execute_action_sync(cid, aid, cleaners_dict),
            "execute_clean_path_sync":  lambda cid, p:   _execute_clean_path_sync(cid, p, cleaners_dict),
            "run_survey_sync":          server_helpers.get("run_survey_sync") or _run_survey_sync_stub,
        },
    }

    def tool_runner(name: str, args: dict) -> dict:
        return agent_tools.run_tool(name, args, ctx)

    def approval_checker(name: str, args: dict) -> bool:
        return agent_tools.needs_approval(name, args, allow_safe_auto, cleaners_dict)

    # Pick schema for the provider
    if provider == "anthropic":
        tools = agent_tools.schemas_anthropic()
    elif provider == "openai":
        tools = agent_tools.schemas_openai()
    else:
        tools = None  # Will trigger unsupported path

    # Run the loop
    system = build_system_prompt(disk_status)

    # Decorate on_event with approval-summary enrichment so the UI gets the
    # cleaners.py-curated desc + cost text alongside the raw tool input.
    def enriched_on_event(ev: dict) -> None:
        if ev.get("event") == "tool_approval_needed":
            d = ev.get("data", {})
            summary = agent_tools.approval_summary(d.get("name", ""), d.get("input", {}) or {}, cleaners_dict)
            d.update(summary)
            ev["data"] = d
        on_event(ev)

    try:
        result = ai.complete_with_tools(
            provider          = provider,
            api_key           = api_key,
            system            = system,
            messages          = messages,
            tools             = tools,
            tool_runner       = tool_runner,
            on_event          = enriched_on_event,
            approval_checker  = approval_checker,
            pending_results   = pending_results,
            max_rounds        = 10,
        )
    except Exception as e:
        on_event({"event": "error", "data": {"message": f"AI request failed: {e}"}})
        return {"ok": False, "error": str(e)}

    if result.get("unsupported"):
        on_event({"event": "error", "data": {
            "message": f"Provider '{provider}' doesn't support tool-use in DustPan. "
                       "Configure an Anthropic or OpenAI key for the full chat experience.",
        }})

    return result


# ── Provider resolution ──────────────────────────────────────────────────────

def _resolve_provider(override: Optional[str] = None) -> tuple[Optional[str], Optional[str]]:
    """
    Pick a tool-capable provider (Anthropic or OpenAI). Returns (provider, key).
    Reads from env first, then sqlite_store DB.
    """
    candidates = ["anthropic", "openai"]
    if override in candidates:
        candidates = [override]

    env_map = {"anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY"}
    for p in candidates:
        v = os.environ.get(env_map[p], "").strip()
        if v:
            return p, v

    # Try DB
    try:
        sys.path.insert(0, os.path.dirname(__file__))
        import sqlite_store as ss
        if ss.is_available():
            for p in candidates:
                k = ss.get_api_key(p)
                if k:
                    return p, k
    except Exception:
        pass

    return None, None
