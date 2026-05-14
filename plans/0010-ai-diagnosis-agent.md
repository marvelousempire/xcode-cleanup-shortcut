Status: in progress

# Plan 0010 — AI Diagnosis Agent (v0.21.3)

## The problem

The current AI is a passive summarizer. After a user manually scans a
category, they can click a button to get an LLM paragraph describing what
the scan found. It:

- Does not run any analysis itself
- Only sees what the user already manually scanned
- Cannot look beyond DustPan's predefined categories
- Cannot take any action
- Waits to be invoked — never proactively surfaces problems

What the user needs:

> "AI should be on-board analysis and actually agent worker."

That means:
1. AI proactively analyzes the disk — runs its own `du` surveys beyond the
   predefined category list, identifies the real culprits
2. AI diagnoses, not just describes — "Your Docker.raw is 32 GB because
   you have N images and M containers that are unused. Run prune."
3. AI produces an executable action plan — each finding has a direct
   clean button, not just a recommendation paragraph
4. AI auto-runs when disk is low — no clicking required

## Architecture

### Backend: `POST /api/ai/diagnose`

New streaming endpoint. Does three things before calling the LLM:

**Step 1 — Gather ground truth (Python, no LLM):**
- Current disk status (free_gb, total_gb, used_pct)
- All scan results from the in-memory scan cache
- `du -sh` on 12 key paths not in predefined categories:
  - `~/Library/Containers/com.docker.docker/Data/vms/` (Docker.raw)
  - `~/Library/Containers/com.apple.mediaanalysisd/`
  - `~/Library/Containers/` (top 5 by size)
  - `~/Library/Group Containers/`
  - `~/Library/Application Support/` (top 5 by size)
  - `/var/folders/`
  - Time Machine snapshot count
- `docker system df` if Docker is running
- Simulator count (available vs unavailable)

**Step 2 — Call LLM with full context:**

System prompt gives the model:
- Role: disk cleanup diagnosis agent for macOS
- Knowledge of DustPan categories and what each one cleans
- All ground truth data from Step 1
- Instructions: produce a JSON action plan, not a prose summary

The model returns a structured JSON:
```json
{
  "summary": "One sentence: what's wrong",
  "findings": [
    {
      "rank": 1,
      "title": "Docker.raw virtual disk",
      "explanation": "Docker's virtual disk file is 32 GB. It grows as you pull images and run containers, but doesn't shrink automatically when you delete them. Running docker system prune can recover 10–20 GB without touching running containers.",
      "size_label": "32 GB",
      "urgency": "high",
      "action": {
        "type": "docker_prune" | "clean_path" | "show_path" | "run_command",
        "category": "docker",
        "label": "Run docker system prune",
        "shell": "docker system prune -f 2>&1"
      }
    }
  ]
}
```

**Step 3 — Stream response to frontend:**

```
event: thinking  data: {"step": "measuring", "path": "~/Library/Containers"}
event: thinking  data: {"step": "docker_df"}
event: context   data: {"disk_status": {...}, "measurements": [...]}
event: analysis  data: {"summary": "...", "findings": [...]}
event: done
```

### Frontend: `AgentPanel.tsx`

Replaces the current AI Settings panel. Three states:

**Idle (no analysis yet):**
- "Analyze my disk" button
- Brief explanation of what the agent does

**Running:**
- Live step indicator: "Measuring Docker... Measuring Xcode... Asking AI..."
- Each step checks off as it completes (like a streaming install)

**Complete:**
- Summary sentence at top
- Ranked finding cards — each shows:
  - Title + explanation
  - Size label (large, colored by urgency)
  - Direct action button: "Run prune", "Clean this", "Open in Finder"
  - Urgency badge (high/medium/low)
- "Re-analyze" button

**Auto-trigger:**
When disk < 10 GB and an LLM key is configured, analysis runs automatically
0.8 s after startup (same timing as the auto-scan).

### Where it lives in the UI

The AI agent panel replaces the current "Settings & AI" modal/panel.
A new "🤖 Analyze" tab entry in the sidebar, or a persistent "AI Diagnosis"
button in the DiskAlarmBar's "Clean now →" CTA.

## Files to create/modify

| File | Change |
|---|---|
| `web/agent.py` | New — gathers context + calls LLM with tools |
| `web/server.py` | Add `POST /api/ai/diagnose` endpoint |
| `apps/web/src/components/AgentPanel.tsx` | New — the agent UI |
| `apps/web/src/lib/types.ts` | Add `AgentFinding`, `AgentAnalysis` types |
| `apps/web/src/lib/api.ts` | Add `api.diagnose()` call |
| `apps/web/src/state/DashboardContext.tsx` | Add agent state + auto-trigger |
| `apps/web/src/App.tsx` | Wire AgentPanel into layout |
| `dustpan.applescript` | kVersion bump |

## No-key fallback

When no LLM key is configured: the ground truth gathering (Step 1) still
runs and produces a rule-based analysis — the same findings ranked by size,
without AI-generated explanations. The UI shows "DustPan found these issues"
instead of "AI analysis". This is useful even without a key.
