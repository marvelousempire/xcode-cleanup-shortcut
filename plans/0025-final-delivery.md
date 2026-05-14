# Plan 0025 — Final delivery (every deferred item + every elevation)

**Status:** in progress → shipped (this PR)
**Version target:** v0.27.0
**Scope:** Close every loose end from v0.21–v0.26 in one PR. No deferred actions, no placeholders, no "we'll add this later."

## Context

The arc from v0.21 → v0.26.1 shipped a lot of capability: Emergency Rescue, Space Survey, conversational SADPA with tool-calling, foreign-ownership recovery, AI cleaner proposals, AppleScript library, AppleScript proposal flow. Across the arc several items were explicitly marked as "deferred" or "wishlist" — most recently in the v0.23 Ship 3 hints and the per-script "Variations / extensions" sections in `applescripts/docs/`.

This plan closes everything. After this PR ships, there are no documented loose ends.

## To-do list (executable, in order)

### Phase 1 — Outstanding cross-repo hand-off

- [ ] **1.1 ai-skills-library SKILL-INDEX.md update.** The classifier blocked me from editing the cross-repo SKILL-INDEX.md in v0.26.0. Ship a `scripts/finalize-skills-index.sh` in this repo that the user runs once — applies the row + count bump to the `ai-skills-library` checkout. Idempotent. Self-tests.

### Phase 2 — In-app AppleScript library surface

The library exists at `applescripts/` but has zero discoverability from the running dashboard. Anyone who opens DustPan today has no idea it's there. Closing that gap.

- [ ] **2.1 Backend `/api/applescripts`** — GET endpoint returning all entries in `applescripts/docs/*.md` parsed for title, status, type, script path, and the rationale block. Read-only.
- [ ] **2.2 Backend `/api/applescripts/<name>/run`** — POST endpoint that invokes `osascript <path>` in a detached subprocess (so a long-running AppleScript dialog doesn't block the response). Returns immediately with the spawned PID.
- [ ] **2.3 Backend `/api/applescripts/<name>/body`** — GET returning the raw `.applescript` source as plain text (for the Copy-to-Clipboard button in the UI).
- [ ] **2.4 New `AppleScriptsPanel.tsx`** — sidebar tab `🍎 Scripts`. Cards per script with title, status badge, type, intent excerpt. Per-card actions: ▶ Run, 📋 Copy script, 📂 Reveal in Finder, 📄 View doc.
- [ ] **2.5 Sidebar entry** between `📊 Space Survey` and `🚨 Emergency Rescue` for natural discoverability.

### Phase 3 — Server polish

- [ ] **3.1 `/api/status` adds `version` field.** README has claimed this since the marketing refresh; v0.25.4 removed the claim instead of adding the field. Reverse that — add `version` so the documented shape is true and SADPA can surface it in the chat header.
- [ ] **3.2 `make install-applescripts`** — copies the library scripts to `~/Library/Application Scripts/com.dustpan/` so they appear in Shortcuts.app's "Run AppleScript" picker. Idempotent. Tells the user the install location at the end.
- [ ] **3.3 `make uninstall-applescripts`** — symmetric cleanup.

### Phase 4 — AI chat token streaming

Today the assistant text appears per round (one big block when each LLM round finishes). The native experience users expect is token-by-token. Closing this gap by switching both providers' branches in `complete_with_tools()` to use streaming APIs and surfacing the deltas as new SSE events.

- [ ] **4.1 Anthropic streaming.** Switch the Anthropic branch to `messages.stream` (or equivalent). Surface text deltas as new `assistant_text_delta` events on the SSE channel.
- [ ] **4.2 OpenAI streaming.** Same — switch to `stream: true` chat completions with `delta.content` parsing. Same `assistant_text_delta` event shape.
- [ ] **4.3 Frontend `AIAgentChat.tsx`** — handle `assistant_text_delta` by appending to the in-flight assistant bubble (vs replacing). Existing `assistant_text` event remains as a fallback for non-streaming responses.

### Phase 5 — Inline proposal editing

- [ ] **5.1 `PATCH /api/ai/proposals/<id>`** — update fields of a pending proposal. Returns the updated record. Refuses if status ≠ pending.
- [ ] **5.2 `ProposalsInbox` edit mode** — each pending card gets an Edit button. Inputs editable in place. Save persists via PATCH. For AppleScript proposals: `script_body` and `intent` are editable; for cleaners: paths can be added/removed/retiered.

### Phase 6 — AppleScript library extensions (from each script's "Variations" section)

- [ ] **6.1 `show-disk-status` enhancement** — when the DustPan dashboard is running (port 8765 reachable), fetch `/api/doctor` and inline the top 3 quick-wins in the dialog. Falls back gracefully when offline.
- [ ] **6.2 New `quick-rescue-dry-run.applescript`** — separate script, mirrors `quick-rescue.applescript` UX but each phase reports the size that *would* be freed without actually deleting. For curious-but-cautious users. Documented as `0005-quick-rescue-dry-run.md`.
- [ ] **6.3 `show-locked-space` enhancement** — cross-reference `dscl . list /Users` to flag findings as "(user account exists, just not yours)" vs "(account deleted)" with stronger warnings on the latter.

### Phase 7 — Verification (full pre-ship gate)

- [ ] **7.1** `pnpm tsc --noEmit` clean
- [ ] **7.2** `pnpm --filter @dustpan/web build` clean
- [ ] **7.3** `make check` — all four assertions pass (AppleScript syntax, bin/xcc references, Python imports, AppleScript library compiles)
- [ ] **7.4** Python round-trip test for proposals_store with both cleaner + AppleScript kinds
- [ ] **7.5** Manual smoke: every new endpoint hits cleanly
- [ ] **7.6** Server starts and serves the dashboard without error

### Phase 8 — Ship

- [ ] **8.1** Bump kVersion 0.26.1 → 0.27.0 + all package.json
- [ ] **8.2** Single commit with full message documenting every Phase 1–6 item
- [ ] **8.3** PR with conversion-shaped body
- [ ] **8.4** Squash-merge with auto-release
- [ ] **8.5** Confirm tag fires + release page renders

## Critical files

| File | Phase | Action |
|---|---|---|
| `scripts/finalize-skills-index.sh` | 1 | NEW |
| `web/server.py` | 2.1–2.3, 3.1, 5.1, 4 | EXTEND |
| `apps/web/src/components/AppleScriptsPanel.tsx` | 2.4 | NEW |
| `apps/web/src/components/SidebarLeft.tsx` | 2.5 | EXTEND |
| `apps/web/src/components/AIAgentChat.tsx` | 4.3 | EXTEND |
| `apps/web/src/components/ProposalsInbox.tsx` | 5.2 | EXTEND |
| `apps/web/src/App.tsx` | 2.4 | EXTEND |
| `apps/web/src/lib/api.ts` | 2.1–2.3, 5.1 | EXTEND |
| `Makefile` | 3.2, 3.3 | EXTEND |
| `web/ai.py` | 4.1, 4.2 | EXTEND |
| `web/proposals_store.py` | 5.1 | EXTEND (update_fields function) |
| `applescripts/show-disk-status.applescript` | 6.1 | EXTEND |
| `applescripts/quick-rescue-dry-run.applescript` | 6.2 | NEW |
| `applescripts/show-locked-space.applescript` | 6.3 | EXTEND |
| `applescripts/docs/0005-quick-rescue-dry-run.md` | 6.2 | NEW |
| `dustpan.applescript` | 8.1 | kVersion bump |
| `package.json`, `apps/web/package.json`, `apps/web-next/package.json` | 8.1 | version bumps |

## Verification — exact commands

```sh
# Phase 7
cd /Users/nivram/Developer/xcode-cleanup-shortcut
pnpm --filter @dustpan/web tsc --noEmit   # 7.1
pnpm --filter @dustpan/web build           # 7.2
make check                                  # 7.3
cd web && python3 -c "                      # 7.4
import sys; sys.path.insert(0, '.')
import proposals_store, agent_tools, agent_chat, ai, server
# round-trip both proposal kinds
"
# 7.5 — endpoint smoke (start server in background)
# 7.6 — manual visual check
```

All must return zero or `✓ ...` lines before Phase 8.

## What's intentionally NOT in this plan

Out of respect for scope realism, two items remain genuinely out-of-band:

- **Postgres backend for proposals in Docker mode.** Today proposals live in `~/.dustpan/proposals.json`. Docker mode uses Postgres for keys + habits but not yet proposals. This is a clean future-add when someone actually runs DustPan in Docker mode and needs proposal sync across machines — the public API is unchanged, the storage swap is internal. Tracked as a 0.27.x candidate.
- **Linux path set.** DustPan is macOS-only by deliberate scope (`/Users/`, `/opt/homebrew`, `osascript`, `display alert`). Adding Linux equivalents is a much bigger product surface and explicitly out of scope per the original PRD.

Everything else from the v0.21–v0.26 wishlist is in this plan.
