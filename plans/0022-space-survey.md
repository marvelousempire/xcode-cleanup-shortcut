# Plan 0022 — Space Survey

**Status:** shipped (v0.22.0 initial, v0.22.1 per-worktree merge status + "Probably not worth touching")

## Context

DustPan's predefined categories catch the 80% case (Xcode, Docker, browsers, etc.) but every Mac accumulates a long-tail of unique cruft: Claude Code worktrees with their own `node_modules`, stale `.next-local` build artifacts, forgotten `node_modules` in retired projects.

`/api/doctor` only reads from the scan cache — it only knows about paths the user has manually clicked "Scan" on. Need an **active filesystem crawl** that finds the long-tail.

## Approach

**New endpoint `/api/survey`** — SSE stream that emits `target` events live as each item is found.

**Four parallel discovery threads** in `_stream_survey()`:

1. `measure_known()` — walks 11 known high-value caches (Docker.raw, DerivedData, iOS DeviceSupport, DocumentationIndex, Cursor caches, mediaanalysisd, pnpm store, npm cache, Homebrew Cellar, `~/.cache`). Measures fresh. Plus a `NOT_WORTH_IT` list (mediaanalysisd, Spotlight) emitted as a separate `not_worth_it` SSE event.

2. `discover_worktrees()` — `find ~ -maxdepth 7 -type d -name worktrees -path '*/.claude/worktrees'`. For each match:
   - Measure total
   - Iterate sub-worktrees with individual `du -sh`
   - Cross-reference `git -C <project> branch -r --merged origin/main` to flag merged worktrees
   - Emit with `sub_worktrees: [{name, size_gb, merged}]` + `merged_count`

3. `discover_build_artifacts()` — walks `~/Developer`, `~/Documents`, `~/Projects`, `~/Code` for `.next`, `.next-local`, `dist`, `.build`, `build` over 200 MB. Skips `node_modules` and `.git`.

4. `discover_large_node_modules()` — same walk pattern, finds `node_modules` over 500 MB outside predefined paths.

**New frontend `SurveyPanel.tsx`** — live-streaming table:

- 3 metric tiles: Free / Found so far / Status (with elapsed timer)
- Animated disk bar
- Targets appear and sort by size as SSE arrives
- After done: "Recommended cleanup order" section (easy targets first, biggest wins first)
- Distinct "🚫 Probably not worth touching" section with size + reason ("macOS rebuilds within hours")
- Each card expands to show rationale, rebuild cost, exact shell command, navigation buttons to Emergency Rescue or the relevant category

**Per-worktree breakdown (v0.22.1)** — expanded worktree card shows an inline table with name, size, and green "merged ✓" badge for branches already in main.

## Critical files

| File | Action |
|---|---|
| `web/server.py` | NEW `_stream_survey()` method (~480 lines), threading.Queue for parallel discovery |
| `apps/web/src/components/SurveyPanel.tsx` | NEW (~600 lines) |
| `apps/web/src/components/SidebarLeft.tsx` | "📊 Space Survey" footer entry |
| `apps/web/src/App.tsx` | Route `activeTab === "survey"` |
| `dustpan.applescript` | kVersion 0.21.5 → 0.22.0 → 0.22.1 |

## Verification

1. Click `📊 Space Survey` → `🔍 Start Full Space Survey` button.
2. Within 5 seconds, first `target` events arrive and populate the table.
3. Survey completes within 60s (capped). Final `done` event includes `targets`, `not_worth_it`, `total_gb`, `elapsed_s`.
4. Worktree targets expand to show per-sub-worktree breakdown with green "merged ✓" badges for branches already in `origin/main`.
5. "Recommended cleanup order" section lists easy targets first. "🚫 Probably not worth touching" lists `mediaanalysisd` and Spotlight with explanations.
6. Per-`du` timeouts (15–20s) prevent hangs. Overall 60s deadline.
