"""
DustPan AI Diagnosis Agent — plan 0010
=======================================
Gathers real disk ground truth (du measurements, docker system df,
sim counts, scan cache) then calls the configured LLM to produce a
ranked, executable action plan.

No LLM key? Falls back to a rule-based analysis using only the
measured data — useful on its own, better with AI.

Endpoint: POST /api/ai/diagnose
Response: SSE stream of {event, data} frames.
"""
from __future__ import annotations

import json
import os
import subprocess
import shutil
from pathlib import Path
from typing import Generator

# ── Paths to measure beyond the predefined DustPan categories ─────────────
# Each entry: (label, shell_path, note)
MEASURE_PATHS: list[tuple[str, str, str]] = [
    ("Docker virtual disk (Docker.raw)",
     "~/Library/Containers/com.docker.docker/Data/vms",
     "docker"),
    ("macOS media analysis ML cache",
     "~/Library/Containers/com.apple.mediaanalysisd",
     "system"),
    ("macOS geolocation cache",
     "~/Library/Containers/com.apple.geod",
     "system"),
    ("iOS DeviceSupport (debug symbols)",
     "~/Library/Developer/Xcode/iOS DeviceSupport",
     "xcode"),
    ("Xcode DerivedData",
     "~/Library/Developer/Xcode/DerivedData",
     "xcode"),
    ("Xcode Archives",
     "~/Library/Developer/Xcode/Archives",
     "xcode"),
    ("Xcode DocumentationIndex",
     "~/Library/Developer/Xcode/DocumentationIndex",
     "xcode"),
    ("Simulator device data",
     "~/Library/Developer/CoreSimulator/Devices",
     "xcode"),
    ("npm global cache",
     "~/.npm",
     "space-eaters"),
    ("CocoaPods cache",
     "~/.cocoapods",
     "space-eaters"),
    ("Homebrew downloads",
     "~/Library/Caches/Homebrew/downloads",
     "space-eaters"),
    ("pip cache",
     "~/Library/Caches/pip",
     "space-eaters"),
    ("Cargo registry",
     "~/.cargo/registry",
     "space-eaters"),
    ("All app containers (~/Library/Containers)",
     "~/Library/Containers",
     "system"),
]

def _expand(p: str) -> str:
    return str(Path(p.replace("~", str(Path.home()))).expanduser())

def _du(path: str) -> float:
    """Return size in GB. Returns 0.0 if path doesn't exist or no permission."""
    exp = _expand(path)
    if not Path(exp).exists():
        return 0.0
    try:
        out = subprocess.check_output(
            ["du", "-sk", exp], stderr=subprocess.DEVNULL, timeout=30
        ).decode()
        kb = int(out.split()[0])
        return round(kb / 1_048_576, 2)
    except Exception:
        return 0.0

def _docker_df() -> dict | None:
    """Run docker system df --format json. Returns None if Docker isn't running."""
    if not shutil.which("docker"):
        return None
    try:
        out = subprocess.check_output(
            ["docker", "system", "df", "--format", "{{json .}}"],
            stderr=subprocess.DEVNULL, timeout=15
        ).decode().strip()
        # docker system df emits one JSON object per line
        rows = [json.loads(line) for line in out.splitlines() if line.strip()]
        return {"rows": rows}
    except Exception:
        return None

def _sim_counts() -> dict:
    """Count available vs unavailable simulator devices."""
    try:
        out = subprocess.check_output(
            ["xcrun", "simctl", "list", "devices", "--json"],
            stderr=subprocess.DEVNULL, timeout=15
        ).decode()
        d = json.loads(out)
        avail = unavail = 0
        for devices in d.get("devices", {}).values():
            for dev in devices:
                if dev.get("isAvailable"):
                    avail += 1
                else:
                    unavail += 1
        return {"available": avail, "unavailable": unavail}
    except Exception:
        return {"available": 0, "unavailable": 0}

def _tm_snapshots() -> int:
    """Count local Time Machine snapshots."""
    try:
        out = subprocess.check_output(
            ["tmutil", "listlocalsnapshots", "/"],
            stderr=subprocess.DEVNULL, timeout=10
        ).decode()
        return sum(1 for l in out.splitlines() if "com.apple" in l)
    except Exception:
        return 0


def gather_context(scan_cache: dict, disk_status: dict) -> dict:
    """
    Collect all ground-truth measurements. Called before the LLM.
    Returns a dict that becomes the LLM's context + the rule-based fallback data.
    """
    measurements = []
    for label, path, category in MEASURE_PATHS:
        size_gb = _du(path)
        measurements.append({
            "label":    label,
            "path":     path,
            "size_gb":  size_gb,
            "category": category,
            "exists":   Path(_expand(path)).exists(),
        })

    # Sort biggest first
    measurements.sort(key=lambda x: x["size_gb"], reverse=True)

    return {
        "disk_status":   disk_status,
        "measurements":  measurements,
        "scan_cache_ids": list(scan_cache.keys()),
        "docker_df":     _docker_df(),
        "simulators":    _sim_counts(),
        "tm_snapshots":  _tm_snapshots(),
    }


# ── Rule-based fallback (no LLM key required) ─────────────────────────────

def _rule_based_findings(ctx: dict) -> dict:
    """
    Produce a ranked action plan from measurements alone — no LLM needed.
    Returns the same shape as the LLM analysis JSON.
    """
    findings = []
    rank = 1

    ACTIONS = {
        "docker": {
            "type": "run_action",
            "category": "docker",
            "action_id": "docker-prune-safe",
            "label": "Run docker system prune (safe)",
        },
        "xcode": {
            "type": "run_action",
            "category": "xcode",
            "action_id": "clean-safe",
            "label": "Clean all safe Xcode caches",
        },
        "space-eaters": {
            "type": "navigate",
            "category": "space-eaters",
            "label": "Open Space Eaters → clean caches",
        },
        "system": {
            "type": "navigate",
            "category": "system",
            "label": "Open System → clean caches",
        },
    }

    EXPLANATIONS = {
        "Docker virtual disk (Docker.raw)":
            "Docker's virtual disk file grows every time you pull images or run "
            "containers but never shrinks automatically. Running docker system "
            "prune removes unused images, stopped containers, and dangling layers "
            "— recovering space without affecting running containers. The .raw file "
            "itself is in Caution (deleting it wipes Docker entirely).",
        "Xcode DerivedData":
            "Xcode's build cache. Accumulates across every project and every "
            "build configuration. Safe to delete — Xcode rebuilds it on the next "
            "build (adds ~30s). Common to reach 10–25 GB on an active dev Mac.",
        "iOS DeviceSupport (debug symbols)":
            "Debug symbols downloaded when you connect an iOS device. One folder "
            "per device × OS version. Old versions accumulate for years. Safe to "
            "delete — re-downloaded when you reconnect the device.",
        "npm global cache":
            "npm saves every package it ever downloads. The cache never clears "
            "itself. Safe to wipe — npm re-downloads on next install.",
        "macOS media analysis ML cache":
            "macOS face recognition and scene analysis data built from your Photos "
            "library. Rebuilds automatically in the background. 100% safe to clear.",
        "Xcode Archives":
            "Compiled app archives used for App Store submission and symbolication. "
            "Shown in Caution — don't delete if you need to re-symbol crash reports.",
    }

    for m in ctx["measurements"]:
        if m["size_gb"] < 0.05:
            continue
        urgency = "high" if m["size_gb"] >= 5 else "medium" if m["size_gb"] >= 1 else "low"
        cat = m["category"]
        action = ACTIONS.get(cat, {
            "type": "navigate",
            "category": cat,
            "label": f"Open {cat} category",
        })
        explanation = EXPLANATIONS.get(m["label"], "")
        findings.append({
            "rank":        rank,
            "title":       m["label"],
            "path":        m["path"],
            "size_label":  f"{m['size_gb']} GB",
            "size_gb":     m["size_gb"],
            "urgency":     urgency,
            "explanation": explanation,
            "action":      action,
            "source":      "rule-based",
        })
        rank += 1

    sims = ctx.get("simulators", {})
    if sims.get("unavailable", 0) > 0:
        findings.append({
            "rank":        rank,
            "title":       f"Simulator cleanup ({sims['unavailable']} unavailable)",
            "path":        "~/Library/Developer/CoreSimulator/Devices",
            "size_label":  f"{sims['unavailable']} devices",
            "size_gb":     0,
            "urgency":     "low",
            "explanation": "Unavailable simulators (for iOS versions no longer "
                           "installed) can be deleted with xcrun simctl delete "
                           "unavailable.",
            "action": {
                "type": "run_action",
                "category": "xcode",
                "action_id": "delete-unavailable-sims",
                "label": "Delete unavailable simulators",
            },
            "source": "rule-based",
        })

    free = ctx["disk_status"].get("free_gb", 999)
    summary = (
        f"Your disk is critically low — {free:.1f} GB free. "
        f"Top item: {findings[0]['title']} at {findings[0]['size_label']}."
        if findings and free < 10
        else f"{len(findings)} cleanable items found, largest: "
             f"{findings[0]['title']} ({findings[0]['size_label']})."
        if findings
        else "Nothing significant found beyond already-scanned categories."
    )

    return {"summary": summary, "findings": findings[:10], "source": "rule-based"}


# ── LLM-powered analysis ───────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are DustPan's disk cleanup diagnosis agent running on macOS.
Your job: analyze the provided disk measurements and produce a ranked,
actionable cleanup plan in JSON.

Rules:
- Be specific and honest. If Docker.raw is 32 GB, say so and explain why.
- Do not repeat what the user already knows. Surface root causes, not symptoms.
- Each finding must have a concrete, executable action.
- Never recommend deleting user files, photos, documents, or app data.
- Rank by impact (size × safety). A 10 GB safe-to-delete item beats a 2 GB caution item.
- Max 8 findings.

Valid action types:
  run_action   → calls DustPan's existing clean action by category + action_id
  navigate     → takes user to a DustPan tab
  run_command  → a shell command to show the user (never auto-execute destructive commands)
  show_info    → explains something without an action

Respond ONLY with valid JSON in this exact shape:
{
  "summary": "one sentence: what is the main problem and biggest win",
  "findings": [
    {
      "rank": 1,
      "title": "short title",
      "explanation": "2-3 sentences: why this is big, what causes it, what the action does",
      "size_label": "32 GB",
      "size_gb": 32.0,
      "urgency": "high|medium|low",
      "action": {
        "type": "run_action|navigate|run_command|show_info",
        "category": "xcode|docker|space-eaters|browsers|system|apps|...",
        "action_id": "clean-safe|docker-prune-safe|...",
        "label": "Button label shown to user",
        "shell": "optional shell command for run_command type"
      }
    }
  ]
}
"""

def _call_llm(ctx: dict, ai_module) -> dict | None:
    """Call configured LLM via ai.complete_agent(). Returns parsed JSON or None."""
    ctx_str = json.dumps(ctx, indent=2)
    user_msg = (
        "Here is the disk analysis data for this Mac:\n\n"
        f"```json\n{ctx_str}\n```\n\n"
        "Provide your diagnosis as JSON only."
    )
    try:
        result = ai_module.complete_agent(
            system=_SYSTEM_PROMPT,
            user=user_msg,
            max_tokens=2048,
            temperature=0.2,
        )
        text = result.strip()
        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("```", 2)[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        return None


def diagnose(
    scan_cache: dict,
    disk_status: dict,
    ai_module=None,
) -> Generator[dict, None, None]:
    """
    Main entry point. Yields SSE-ready dicts.

    Yields:
      {"event": "thinking", "data": {"step": str, "detail": str}}
      {"event": "context",  "data": <gathered context>}
      {"event": "analysis", "data": <findings JSON>}
      {"event": "done",     "data": {}}
      {"event": "error",    "data": {"message": str}}
    """
    # Step 1 — measure
    yield {"event": "thinking", "data": {"step": "measuring",
           "detail": "Scanning disk — measuring key paths..."}}

    try:
        ctx = gather_context(scan_cache, disk_status)
    except Exception as e:
        yield {"event": "error", "data": {"message": str(e)}}
        return

    # Filter to paths that actually exist and have size
    visible = [m for m in ctx["measurements"] if m["size_gb"] > 0.01]
    yield {"event": "context", "data": {
        "measurements": visible,
        "docker_df": ctx.get("docker_df"),
        "simulators": ctx.get("simulators"),
        "tm_snapshots": ctx.get("tm_snapshots", 0),
    }}

    # Step 2 — LLM or rule-based
    if ai_module is not None:
        yield {"event": "thinking", "data": {"step": "thinking",
               "detail": "AI is analyzing your disk..."}}
        analysis = _call_llm(ctx, ai_module)
        if analysis is None:
            yield {"event": "thinking", "data": {"step": "fallback",
                   "detail": "AI call failed — using rule-based analysis"}}
            analysis = _rule_based_findings(ctx)
            analysis["source"] = "rule-based-fallback"
        else:
            analysis["source"] = "ai"
    else:
        yield {"event": "thinking", "data": {"step": "rule-based",
               "detail": "No AI key configured — using built-in analysis"}}
        analysis = _rule_based_findings(ctx)

    yield {"event": "analysis", "data": analysis}
    yield {"event": "done", "data": {}}
