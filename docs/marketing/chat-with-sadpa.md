# 💬 Chat with SADPA — your AI disk co-pilot

**Tagline:** Talk to your Mac's disk like it's a senior sysadmin — bring your own API key, sandbox by default, never runs `sudo` for you.

**Version:** v0.23.0 (Ship 1), v0.25.0 (Ship 2)
**Plan:** [0023](../../plans/0023-conversational-sadpa-agent.md)
**Surface:** Web dashboard tab `💬 Chat with SADPA`
**Backend:** `web/agent_chat.py`, `web/agent_tools.py`, `web/ai.py::complete_with_tools()`
**Frontend:** `apps/web/src/components/AIAgentChat.tsx`, `apps/web/src/lib/streamChat.ts`

## The problem in plain English

You see your Mac filling up. You want to ask an expert what to clean — but the expert costs $200/hour and needs ssh access. So you Google "which Xcode paths are safe to delete," paste the first three answers into Terminal, and hope none of them break your IDE.

DustPan already had a one-shot "Diagnose" button (the original SADPA panel) — but it couldn't ask follow-ups, couldn't drill into a specific folder you spotted, and couldn't propose cleaners for things DustPan didn't already know about. It was a pamphlet, not a conversation.

SADPA — **Smart Auto-Detector Protector Agent** — is now a chat. You bring your own Anthropic or OpenAI key (kept in macOS Keychain, never leaves the machine). The agent has 15 curated tools, a sandboxed filesystem peek, and an approval-card gate before any deletion runs. You can literally ask "what's eating my disk and what should I do about it?" and watch the agent measure, drill in, recommend, and (with your approval) clean.

## How DustPan solves it

### The tool-calling loop

When you send a message, the server (`web/server.py::_stream_chat`) opens an SSE stream and calls `complete_with_tools()` (`web/ai.py`). The model sees:

- Its system prompt (live disk numbers baked in, plus a tool-use playbook)
- The conversation history
- 15 tools in the provider's native schema (Anthropic `tool_use` blocks or OpenAI `function-calling`)

Each round:
1. Model emits text + zero-or-more tool calls.
2. Text streams to the chat as an assistant bubble.
3. For each tool call: server runs the tool, streams `tool_use_start` then `tool_use_result` events to the client.
4. If any tool needs approval, the loop pauses, the client renders an approval card, the user clicks ✓ or ✕, the client re-POSTs with `pending_tool_results`, the loop resumes.
5. Capped at **10 tool rounds** per turn to prevent runaway loops.

### The 15 tools

| Tier | Tool | What it does |
|---|---|---|
| A read-only | `get_disk_status` | Live free / used / total / pct |
| A | `get_doctor_report` | Top safe-tier paths ranked by size across cached scans |
| A | `list_categories` | Every DustPan category with tier counts |
| A | `list_category_actions` | Pre-defined actions per category with desc + cost |
| A | `scan_category` | Top 15 paths per tier for one category |
| A | `run_disk_survey` | Hints to use per-category scans (full survey is async) |
| A | `measure_path` | `du -sh` on a sandboxed home-subtree path |
| A | `list_directory` | Top 50 children sorted by size |
| A | `get_recent_runs` | The `~/.dustpan/runs.csv` history |
| A | `find_foreign_ownership` | Files locked by previous user accounts (see locked-space-recovery.md) |
| B action | `run_category_action` | Run a pre-vetted cleaner. **Requires approval.** |
| B action | `clean_path` | rm-rf one safe/probably_safe path. **Requires approval.** |
| B-meta | `propose_new_cleaner` | File a proposal for the review inbox (see cleaner-proposals.md) |
| C meta | `navigate_to_tab` | Tell the UI to switch tabs |
| C meta | `ask_user` | Render a multiple-choice follow-up question |

### The filesystem peek sandbox

`measure_path` and `list_directory` route through `validate_peek_path()`:

1. Tilde-expand + `Path.resolve(strict=False)` → resolves symlinks first
2. Reject if any prefix matches **DENY_ROOTS_HARD**: `/`, `/etc`, `/System`, `/usr`, `/bin`, `/sbin`, `/var`, `/private`, `/dev`, `/Library`, `/Network`, `/cores`, `/.vol`
3. Reject any **DENY_SUBPATH**: `~/.ssh`, `~/.aws`, `~/.gnupg`, `~/Library/Keychains`, `~/Library/Mail`, `~/Library/Messages`, `~/Library/Application Support/MobileSync/Backup`
4. Require **ALLOWED_ROOTS** prefix: `~/Library/Caches`, `~/Library/Application Support`, `~/Library/Containers`, `~/Library/Developer`, `~/Library/Logs`, `~/Developer`, `~/Documents`, `~/Downloads`, `~/Desktop`, `~/Movies`, `~/Music`, `~/Pictures`, `~/.cache`, `~/.npm`, `~/.cargo`, `~/.cocoapods`, `~/.gradle`, `~/.m2`, `~/.pnpm-store`, `/Applications`

`list_directory` returns only `{name, is_dir, size_bytes}` — never file contents. Cap of 50 entries.

The validator is over-eager on purpose: `Path("/Applications/Safari.app").resolve()` follows the symlink to `/System/Applications/Safari.app` and gets blocked. That's correct behavior — Safari is a system app, the agent shouldn't be poking at it anyway.

### The approval gate

Every Tier-B tool call routes through `agent_tools.needs_approval()`:

- Tier A and C: always allowed
- Tier B: always requires approval **unless** `allow_safe_auto` is on AND the action's tier is `safe`

The approval card pulls `desc` and `cost` text from `cleaners.py` — never from the AI. So the warning is **curated, never hallucinated**:

```
⚠️  SADPA wants to run this

    Run 'Clear Xcode Build Cache (DerivedData)' in Xcode

    Removes ~/Library/Developer/Xcode/DerivedData/* — Xcode's scratch pad
    where it saves build work. Your code is completely untouched.

    Cost: One slightly slower Xcode build (~30s). That's it.

    [✓ Approve]  [✕ Reject]
```

On approve: stream re-opens with `pending_tool_results: [{id, approved: true}]`. The action runs. The freed-GB shows in the tool chip.

## What it looks like

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💬  Chat with SADPA                                                    │
│  Using anthropic / claude-3-5-sonnet-20241022                           │
│  □  Trust the AI to run safe-tier cleanups without asking              │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────┐  YOU       │
│  │ What's eating my disk?                                  │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                          │
│  ┌── SADPA ────────────────────────────────────────────────────┐        │
│  │ Let me check.                                                │        │
│  └──────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  ● 🔧 get_disk_status                              → 6.2 GB free  [▼]   │
│  ● 🔧 get_doctor_report                            → 14 quick wins [▼]  │
│                                                                          │
│  ┌── SADPA ────────────────────────────────────────────────────┐        │
│  │ You have 6.2 GB free of 228 GB (97% used). The 3 biggest    │        │
│  │ safe wins are:                                                │        │
│  │                                                                │        │
│  │ 1. Docker.raw — 34 GB (run `docker system prune -a`)         │        │
│  │ 2. ~/Library/Containers/com.apple.mediaanalysisd — 3.6 GB   │        │
│  │ 3. ~/Library/Developer/Xcode/iOS DeviceSupport — 3.7 GB     │        │
│  │                                                                │        │
│  │ Want me to clean any of these?                               │        │
│  └──────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│  📋 AI Cleaner Proposals                                  [0 pending]   │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ Type a message…                                       [Send]  │       │
│  └──────────────────────────────────────────────────────────────┘       │
│  ⌘+Enter to send · The agent's tool calls show below as chips           │
└─────────────────────────────────────────────────────────────────────────┘
```

## The technical story

The architecture has three layers:

**`agent_tools.py`** is the source of truth for what tools exist. Each tool is a dict with `name`, `description`, `input_schema`, `tier`, `requires_approval`, and `handler`. Two helper functions project the canonical schema into Anthropic and OpenAI shapes: `schemas_anthropic()` and `schemas_openai()`. The dispatcher is a 5-line function:

```python
def run_tool(name, args, ctx):
    t = _BY_NAME.get(name)
    if not t: return {"error": ...}
    return {"ok": True, "result": t["handler"](args, ctx), "elapsed_ms": ...}
```

**`ai.py::complete_with_tools()`** is the multi-turn loop. ~250 lines, handles both Anthropic and OpenAI body shapes, has approval re-entry via `pending_results`, caps at 10 rounds, emits the `on_event` callback for each interesting moment. Other providers (Perplexity, Groq, Gemini, Ollama) return `{unsupported: true, reason: ...}` early — the chat works in text-only mode for them with a banner.

**`agent_chat.py`** is the orchestrator. It builds the system prompt (with live disk numbers), wires the `server_helpers` dict the tool handlers need, decorates `on_event` with approval-summary enrichment so the UI gets the curated desc + cost text alongside the raw tool input, and dispatches into `complete_with_tools`.

The whole thing is stdlib Python — no FastAPI, no Pydantic, no Celery. SSE via `http.server` and a hand-rolled `streamChat.ts` on the frontend (EventSource is GET-only so we need fetch + ReadableStream for POSTs).

## Paste-ready channel copy

### Tweet (280 chars)

> Your Mac filling up. You want to ask an expert what to delete. Now you can.
>
> DustPan v0.25 ships SADPA — a conversational AI agent (BYO Anthropic/OpenAI key) that measures your disk, drills into folders, runs pre-vetted cleanups *after you approve*, and proposes new cleaners.
>
> https://github.com/marvelousempire/dustpan

### LinkedIn (3-5 paragraphs)

> DustPan v0.25 ships something I've wanted for years: a conversational AI agent that can actually look at your Mac and recommend specific cleanups — not from training data, from real measurements.
>
> It's called SADPA (Smart Auto-Detector Protector Agent). Bring your own Anthropic or OpenAI key. The agent has 15 curated tools: get disk status, list directories, scan categories, run pre-vetted cleanups, and propose new ones for cleaners DustPan should learn about.
>
> Three design choices that mattered:
>
> 1. **Sandboxed filesystem peek.** The agent can read sizes and list folders under your home directory and /Applications. It cannot see /System, /etc, ~/.ssh, Keychains, Mail, or iOS backups. Hard-blocked, symlinks resolved first.
>
> 2. **Approval cards.** Every destructive tool call shows an approval card before running, with the cleanup's description and cost text pulled from a curated source file — never generated by the AI. You click ✓ or ✕.
>
> 3. **Never auto-edits source.** When the agent proposes a new cleaner for DustPan to track, the proposal lands in a review inbox. Accept generates a paste-ready Python snippet you copy into the source file. The cleaners file stays hand-curated.
>
> 100% local. No SaaS layer. No telemetry. MIT.
>
> https://github.com/marvelousempire/dustpan

### Reddit r/MacOS

**Title:** DustPan v0.25 — your Mac disk cleaner can now hold a conversation (BYO API key, no SaaS)

**Body:**

> Open-sourcing a side project that grew bigger than I expected. DustPan started as a 150-line Xcode caches script. v0.25 ships a real conversational AI agent.
>
> You bring your own Anthropic or OpenAI key (stored in macOS Keychain, never leaves your Mac). The agent has 15 curated tools — measure paths, list directories, scan categories, run pre-vetted cleanups, propose new ones for things DustPan doesn't already track.
>
> Filesystem peek is sandboxed. The agent can poke around ~/Library, ~/Developer, ~/Documents, /Applications, common dev caches. Hard-blocked from /System, /etc, ~/.ssh, Keychains, Mail, iOS backups. Symlinks resolved first so you can't sneak through them.
>
> Every destructive action shows an approval card before running. The card's description and cost text comes from a curated cleaners file — not from the AI. So you'll never see "this is safe, trust me" hallucinated text.
>
> Stack: Python stdlib http.server (no FastAPI, no pip installs), Vite+React frontend, SSE for streaming. MIT, no telemetry, fully auditable.
>
> https://github.com/marvelousempire/dustpan

### Reddit r/LocalLLaMA

**Title:** Built a tool-calling agent for macOS disk recovery — Anthropic + OpenAI BYO key, sandboxed FS peek, 15 curated tools

**Body:**

> Posting here because the tool-use loop and sandbox design might be interesting to people building local agents.
>
> Architecture:
> - Tool registry is a single Python dict with name, input_schema, tier, requires_approval, handler. Two helper functions project into Anthropic `tool_use` and OpenAI `function-calling` shapes from the same source.
> - Multi-turn loop in ~250 lines. Anthropic and OpenAI branches share the same control flow; only the body shape differs. Caps at 10 tool rounds.
> - Approval re-entry: when a destructive tool is called, the loop emits `tool_approval_needed`, closes the stream, the client renders an approval card, and on click re-POSTs with `pending_tool_results: [{id, approved: bool}]`. The loop resumes from where it stopped.
> - Filesystem peek validator: home-subtree allowlist + hard-deny roots. Symlinks resolved before allowlist check so /Applications/Safari.app → /System/Applications/Safari.app correctly gets blocked.
>
> Stack is plain Python stdlib http.server (no FastAPI) + Vite/React frontend. SSE for streaming. Frontend uses fetch+ReadableStream because EventSource is GET-only and chat is POST.
>
> Repo: https://github.com/marvelousempire/dustpan
>
> Critiques welcome — especially on the approval-re-entry protocol and the foreign-ownership scanner (different feature, same boundary: app never runs sudo, surfaces the command for the user to paste into Terminal).

### Show HN first comment

> Hi HN — author here.
>
> DustPan started as a 150-line Xcode caches AppleScript. Over the past few months it grew into a local-first macOS disk-recovery app. v0.25 ships the piece I think this audience will care about most: a conversational AI agent with real tool-calling.
>
> Three design choices:
>
> **1.** Tool registry is a single Python dict with `name`, `input_schema`, `tier`, `requires_approval`, `handler`. Two helper functions project the same schema into Anthropic's `tool_use` shape and OpenAI's `function-calling` shape. Same source of truth, two API surfaces.
>
> **2.** Multi-turn loop with approval re-entry. When a destructive tool is called, the server emits `tool_approval_needed`, closes the SSE stream, the client renders an approval card pulling desc+cost text from a curated cleaners file (not AI-generated), and on click re-POSTs with `pending_tool_results`. The loop resumes from the same message state.
>
> **3.** Sandboxed filesystem peek. Allow-listed home-subtree roots (`~/Library`, `~/Developer`, `~/Documents`, `/Applications`, common dev caches). Hard-blocked: `/System`, `/etc`, `~/.ssh`, Keychains, Mail, iOS backups. Symlinks resolved before allowlist check.
>
> The whole thing is stdlib Python (no FastAPI, no pip installs) + Vite/React frontend. SSE streaming. ~700 lines for the agent layer. MIT, no telemetry, no SaaS.
>
> Repo: https://github.com/marvelousempire/dustpan
>
> Try it: `git clone … && make ui`. Then drop an Anthropic or OpenAI key in Settings → AI and ask SADPA what's eating your disk.

## FAQ

**Q: Does DustPan see my API key?**
A: It stores it. The key never leaves your Mac — it's saved in macOS Keychain (or encrypted Postgres in Docker mode). The Python server uses it to call Anthropic/OpenAI directly. There is no SaaS layer.

**Q: Why only Anthropic and OpenAI for tool-use?**
A: Those are the providers with mature, well-documented tool-calling APIs. Perplexity, Groq, Gemini, and Ollama either don't have it or implement it inconsistently. They work in text-only chat mode with a banner explaining the limitation.

**Q: Can the AI delete files without my approval?**
A: Only if you explicitly turn on the `Trust the AI to run safe-tier cleanups without asking` toggle, AND the cleanup is in the `safe` tier of `cleaners.py`. The default is off. Even with it on, `probably_safe` and `caution` tier actions still require approval. And `clean_path` requires the path to match a path in the `safe` group exactly — the AI can't suggest deleting `/etc/passwd`.

**Q: Can the AI run sudo?**
A: No. There is no `sudo` tool. For ownership-takeover commands (see [locked-space-recovery.md](./locked-space-recovery.md)), the app shows you the command with a Copy button and you paste into Terminal — macOS prompts for your password directly.

**Q: What happens if the AI tries to call a tool 100 times in a loop?**
A: The loop caps at 10 rounds per turn. After that, the server emits `assistant_done` and stops. The user can ask again to continue.

**Q: Can the AI read my files?**
A: No file contents. `list_directory` returns only `{name, is_dir, size_bytes}`. `measure_path` returns size only. The agent can know that `~/Library/Caches/JetBrains/PyCharm2024.1` is 3.4 GB and contains some folders — it cannot read what's in them.

**Q: Is there a free / no-key option?**
A: The original one-shot SADPA panel (the `✨ SADPA Agent` tab) works without an API key — it's rule-based plus optional AI. The conversational chat requires a key because tool-calling requires a tool-capable LLM.

## What it took to ship

**~1,700 net new lines** across:
- `web/agent_tools.py` — 500 lines (tool registry + dispatcher + path validator)
- `web/agent_chat.py` — 200 lines (orchestrator + sync executors)
- `web/ai.py` — +250 lines (`complete_with_tools()` for two providers)
- `web/server.py` — +120 lines (POST /api/ai/chat + settings endpoints)
- `apps/web/src/lib/streamChat.ts` — 80 lines (fetch-based SSE parser)
- `apps/web/src/components/AIAgentChat.tsx` — 500 lines (the chat UI)
- Plus settings panel + sidebar + context wiring

Shipped in two PRs:
- v0.23.0 — Ship 1 (chat, 13 tools, approval flow, filesystem peek)
- v0.25.0 — Ship 2 (`propose_new_cleaner` + review inbox)

### Things we deliberately chose not to do

- **Token-by-token streaming.** The text streams per-round, not per-token. For Ship 1 this kept the loop simpler. Ship 3 candidate.
- **Persistent chat history.** Each chat starts fresh. Persistence is a clean future-add but adds DB schema work.
- **Auto-write to `cleaners.py`.** Proposals are review-only. The file is hand-curated and stays that way.
- **Custom model selection.** The agent uses each provider's default model. Settings could surface a model picker — left for later.
