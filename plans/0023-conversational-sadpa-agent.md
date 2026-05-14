# Plan 0023 — Conversational SADPA agent with tool-calling

**Status:** shipped — Ship 1 (v0.23.0, chat + 13 tools + approval flow), Ship 2 (v0.25.0, cleaner proposals)

## Context

The original SADPA panel was **one-shot**: click "Analyze now" → server measures → LLM responds with static findings. No follow-ups, no drill-in, no ability to ask "what's in that weird 12 GB folder?"

User asked: *"I want to be able to add the API so I can choose which AI I want and then it will be able to look at the report and do everything he needs to do just like if it was a real person looking at it that was an expert at this stuff. It could have access to my computer. Look around my computer, suggest things and use dustpan as a tool, this thing should be so smart that it would even suggest tools that he needs to build to add to the app."*

This plan adds the conversational counterpart to the existing one-shot SADPA. New tab `💬 Chat with SADPA` with real tool-calling against curated DustPan endpoints. The existing one-shot SADPA stays for the zero-friction shortcut case.

## Approach

### Ship 1 (v0.23.0) — chat + tool-calling

**Backend:**

- New `web/agent_tools.py` (~500 lines) — single source of truth for the tool registry. Each tool dict: `name, description, input_schema, tier, requires_approval, handler`. Two helper functions project the canonical schema into Anthropic `tool_use` shape and OpenAI `function-calling` shape. 13 initial tools across three tiers:
  - **A (read-only, auto-execute):** `get_disk_status`, `get_doctor_report`, `list_categories`, `list_category_actions`, `scan_category`, `run_disk_survey`, `measure_path`, `list_directory`, `get_recent_runs`
  - **B (action, requires approval):** `run_category_action`, `clean_path`
  - **C (meta):** `navigate_to_tab`, `ask_user`

- New `web/agent_chat.py` (~200 lines) — orchestrator. Builds the system prompt with live disk numbers, configures the `server_helpers` dict, decorates `on_event` with approval-summary enrichment so the UI receives curated `desc + cost` text from `cleaners.py`.

- Extend `web/ai.py` with `complete_with_tools(provider, key, system, messages, tools, tool_runner, on_event, approval_checker, pending_results, max_rounds=10)` — multi-turn loop for Anthropic and OpenAI. Other providers return `{unsupported: true}` and the chat works in text-only mode with a banner.

- Extend `web/server.py` with `POST /api/ai/chat` — SSE stream. Events: `provider_info`, `assistant_text`, `tool_use_start`, `tool_use_result`, `tool_approval_needed`, `assistant_done`, `error`. Approval re-entry protocol: when a destructive tool is called, the stream emits `tool_approval_needed` and closes; client re-POSTs with `pending_tool_results: [{id, approved}]` and the loop resumes.

- New `POST /api/settings/agent` — auto-approve toggle (`allow_safe_auto`). Persists to `~/.dustpan/agent-settings.json` (or kv_store table in Docker mode).

**Frontend:**

- New `apps/web/src/lib/streamChat.ts` (~80 lines) — fetch-based SSE parser. `EventSource` is GET-only; chat is POST.

- New `apps/web/src/components/AIAgentChat.tsx` (~500 lines) — conversation log with bubble / tool-chip / approval / system renderers. Token streaming per-round. Tool chips show `🔧 tool_name → summary` collapsed, expanded shows input/result JSON. Approval cards pull desc+cost from `cleaners.py` (not AI-generated) with [✓ Approve] / [✕ Reject] buttons.

- Sidebar: new `💬 Chat with SADPA` entry above `📊 Space Survey`. AISettingsPanel gets a single toggle row "Trust the AI to run safe-tier cleanups without asking" (defaults off).

### Ship 2 (v0.25.0) — cleaner proposals

- New tool `propose_new_cleaner` (#15) with strict input schema (name, category_id_suggested, rationale, cost_to_user, paths: [{label, path, tier}], shell?).
- New `web/proposals_store.py` (~150 lines) — JSON-backed storage at `~/.dustpan/proposals.json`. Atomic writes. `generate_snippet(proposal)` produces paste-ready Python for `cleaners.py`.
- New endpoints: `GET /api/ai/proposals[?status]`, `GET /api/ai/proposals/count`, `GET /api/ai/proposals/<id>/snippet`, `POST /api/ai/proposals/<id>/accept`, `POST /api/ai/proposals/<id>/dismiss`.
- New `apps/web/src/components/ProposalsInbox.tsx` (~270 lines) — pending/accepted/dismissed filter tabs, per-proposal expandable cards, snippet block with [📋 Copy].
- Sidebar badge with pending count on the chat tab.

**Critical principle:** Accept never auto-edits `cleaners.py`. The source file stays hand-curated; the snippet is shown for the user to paste themselves.

### Filesystem peek sandbox

`validate_peek_path()` in `agent_tools.py`:
1. Tilde-expand + `Path.resolve(strict=False)` — resolves symlinks first
2. Reject if any prefix in `DENY_ROOTS_HARD`: `/`, `/etc`, `/System`, `/usr`, `/bin`, `/sbin`, `/var`, `/private`, `/dev`, `/Library`, `/Network`
3. Reject `DENY_SUBPATHS`: `~/.ssh`, `~/.aws`, `~/.gnupg`, `~/Library/Keychains`, `~/Library/Mail`, `~/Library/Messages`, iOS backup folders
4. Require `ALLOWED_ROOTS` prefix: `~/Library/Caches`, `~/Library/Application Support`, `~/Library/Containers`, `~/Library/Developer`, `~/Developer`, `~/Documents`, `~/Downloads`, `~/Desktop`, `~/Movies`, `~/Music`, `~/Pictures`, `~/.cache`, common dev caches, `/Applications`
5. `list_directory` returns only `{name, is_dir, size_bytes}` — never contents. Cap of 50 entries.

## Critical files

| File | Ship | Action |
|---|---|---|
| `web/agent_tools.py` | 1, +1 in 2 | NEW (~500 lines) |
| `web/agent_chat.py` | 1 | NEW (~200 lines) |
| `web/ai.py` | 1 | EXTEND `complete_with_tools()` (~250 lines added) |
| `web/server.py` | 1+2 | POST /api/ai/chat + 5 proposal endpoints (~250 added lines) |
| `web/proposals_store.py` | 2 | NEW (~150 lines) |
| `apps/web/src/lib/streamChat.ts` | 1 | NEW (~80 lines) |
| `apps/web/src/components/AIAgentChat.tsx` | 1+2 | NEW (~530 lines after Ship 2 wiring) |
| `apps/web/src/components/ProposalsInbox.tsx` | 2 | NEW (~270 lines) |
| `apps/web/src/state/DashboardContext.tsx` | 1+2 | agent settings + pendingProposals state |
| `apps/web/src/components/SidebarLeft.tsx` | 1+2 | Chat entry + badge prop |
| `dustpan.applescript` | 1, 2 | kVersion 0.22.1 → 0.23.0, 0.24.0 → 0.25.0 |

## Verification

**Ship 1:**
1. With Anthropic key, ask "what's eating my disk?" → tool chain `get_disk_status` + `get_doctor_report` → ranked text response.
2. Ask "show me everything in `~/Library/Containers`" → `list_directory` call, returns sized children.
3. Filesystem peek of `/etc/passwd` returns `{error: "path not allowed"}`. Of `~/.ssh` same.
4. With auto-approve OFF, "clean my Xcode DerivedData" → approval card with `desc + cost` pulled from `cleaners.py` → ✓ Approve → action runs → freed GB shows.
5. Tool round cap: a runaway loop ("measure every directory under `~/Library`") stops at 10 rounds with `assistant_done`.
6. Non-tool-use provider (Perplexity-only key) → text-only banner, chat still works.

**Ship 2:**
7. Ask "find caches you don't already track" → agent calls `propose_new_cleaner` → proposal appears in inbox + sidebar badge ticks to 1.
8. Accept proposal → paste-ready snippet renders with [📋 Copy] button → manual paste into `cleaners.py` works (snippet style matches existing tuples).
9. Dismiss proposal → status changes, proposal stays under "dismissed" filter.
