# 📊 Space Survey — the comprehensive filesystem crawl

**Tagline:** Live-streaming filesystem survey that finds what DustPan's predefined categories miss — Claude Code worktrees with merge status, stale `.next` builds, large `node_modules`, foreign-owned paths. All ranked, all with copy-paste commands.

**Version:** v0.22.0 (initial), v0.22.1 (per-worktree merge status + "Probably not worth touching")
**Plan:** [0022](../../plans/)
**Surface:** Web dashboard tab `📊 Space Survey`
**Backend:** `web/server.py::_stream_survey`
**Frontend:** `apps/web/src/components/SurveyPanel.tsx`

## The problem in plain English

DustPan's predefined categories (Xcode, Docker, browsers, etc.) catch the 80% case. But every Mac accumulates a long-tail of unique cruft:

- **15 Claude Code worktrees** under `~/Developer/project/.claude/worktrees/`, each carrying its own `node_modules`. The user has merged 12 of the branches but never pruned the worktrees.
- **A stale `marketing/.next-local`** in a project that was deployed and forgotten. 1.2 GB.
- **`~/Developer/some-old-project/node_modules`** at 1.7 GB for a project the user hasn't opened in two years.
- **Files in `/opt/homebrew` owned by 'olivia'** — see [locked-space-recovery.md](./locked-space-recovery.md).

These don't fit into a category because they live in user-specific paths. The Doctor report can't see them either — Doctor reads from the scan cache, which only contains paths the user has already manually clicked "Scan" on.

The Space Survey is the answer: a **live-streaming filesystem crawl** that runs `find` across the user's home directory and known multi-user-cruft roots, measures what it finds, and emits each target as it's discovered.

## How DustPan solves it

The Survey tab has a single button: `🔍 Start Full Space Survey`. Clicking it kicks off a server-side SSE stream (`GET /api/survey`) that runs four parallel discovery threads:

1. **`measure_known()`** — Walks 11 known high-value caches (Docker.raw, DerivedData, iOS DeviceSupport, DocumentationIndex, Cursor caches, mediaanalysisd, pnpm store, npm cache, Homebrew Cellar, `~/.cache`). Measures fresh sizes. Also measures the "probably not worth touching" list (mediaanalysisd and Spotlight indexes — they rebuild within hours).

2. **`discover_worktrees()`** — Runs `find ~ -maxdepth 7 -type d -name worktrees -path '*/.claude/worktrees'`. For each match: measures total size, lists each sub-worktree with individual size, and cross-references `git -C <project> branch -r --merged origin/main` to flag worktrees whose branch is already merged (safe to prune).

3. **`discover_build_artifacts()`** — Walks `~/Developer`, `~/Documents`, `~/Projects`, `~/Code`. Looks for `.next`, `.next-local`, `dist`, `.build`, `build` directories larger than 200 MB. Skips `node_modules` and `.git`.

4. **`discover_large_node_modules()`** — Same walking pattern. Finds `node_modules` directories larger than 500 MB outside predefined paths and outside `.claude/worktrees/` (those are handled by the worktree discoverer).

Plus **`discover_foreign_ownership()`** (v0.24) — see [locked-space-recovery.md](./locked-space-recovery.md).

### Live streaming

Each thread emits `target` events to the SSE stream as it finds things. The frontend keeps a sorted-by-size array; new targets slot in at their rank as they arrive. The user sees results filling in **as they're found** rather than waiting 45 seconds for a single dump.

Progress events (`{event: "progress", data: {phase, msg}}`) give the user a sense of which discoverer is currently running:

```
Scanning for Claude Code worktrees…
Scanning for stale build artifacts…
Scanning for large node_modules…
Measuring known cache locations…
```

The whole survey is capped at 60 seconds with per-`du` timeouts of 15–20 seconds, so it can't hang.

### Three sections after completion

When the survey completes:

**1. "🔒 Locked by previous users — X.X GB recoverable"** (if any foreign-owned paths were found) — see [locked-space-recovery.md](./locked-space-recovery.md).

**2. "Recommended cleanup order"** — a ranked list of easy targets, biggest wins first. Links the action_id-tagged ones to the Emergency Rescue panel.

**3. "Targets found — ranked by size"** — the main table. Each card expands to show notes, rebuild cost, exact shell command, and direct links to either the Emergency panel or the relevant category.

**4. "🚫 Probably not worth touching"** — a distinct grey section explaining why some big-looking things aren't worth deleting (mediaanalysisd: macOS rebuilds within hours; Spotlight: rebuilds in 30–60 min and breaks search). Critical to include — without it, users would chase reclaim that comes right back.

### Per-worktree breakdown (v0.22.1)

When the Survey finds a `worktrees/` directory, the expanded card shows an inline table:

```
Individual worktrees

  compassionate-chaum    1.7 GB  [merged ✓ safe to prune]
  zen-germain            1.5 GB  [merged ✓ safe to prune]
  festive-ritchie        914 MB
  agent-a035da-…         842 MB
  …

✓ 2 already merged into origin/main — safe to prune immediately
```

The `[merged ✓]` badge comes from `git branch -r --merged origin/main`. Those worktrees can be removed without losing work — their commits are already in main.

## What it looks like

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 Space Survey                                                          │
│ Crawls your entire filesystem — not just predefined categories.         │
│                                                                          │
│ ┌─ Free ──────────┐ ┌─ Found so far ─┐ ┌─ Status ──────────────────┐  │
│ │   12.1 GB        │ │   38.4 GB       │ │   18s                      │  │
│ │   94% used        │ │   12 targets    │ │   12 targets found        │  │
│ └───────────────────┘ └─────────────────┘ └────────────────────────────┘  │
│                                                                          │
│ ████████████████████████████████████████████░░░░ 94% used               │
│                                                                          │
│ [ ↺ Re-scan ]                                                            │
│                                                                          │
│ ─────────────────────────────────────────────────────────────────────── │
│ 🔒 Locked by previous users — 12 GB recoverable                         │
│ (see locked-space-recovery.md for full mockup)                          │
│                                                                          │
│ ─────────────────────────────────────────────────────────────────────── │
│ ✅ Recommended cleanup order — biggest wins, lowest risk first          │
│                                                                          │
│  1. Docker disk image (Docker.raw)         34 GB    → Emergency panel   │
│  2. Xcode iOS Device Debug Files            3.7 GB   → Emergency panel  │
│  3. macOS Photo Recognition Cache           3.6 GB   → Emergency panel  │
│  4. ~/Library/Containers/com.apple…         2.8 GB                       │
│  5. Cursor IDE Caches                       2.1 GB                       │
│                                                                          │
│ Then, after reviewing:                                                   │
│  6. Claude Code worktrees — red-e-play-app/  5.4 GB                     │
│  7. node_modules — old-side-project/         1.7 GB                     │
│                                                                          │
│ ─────────────────────────────────────────────────────────────────────── │
│ Targets found — ranked by size                                          │
│                                                                          │
│  1  34 GB   Docker disk image (Docker.raw)              [caution]  [▼]  │
│             /Users/nivram/Library/Containers/com.docker.docker/…        │
│                                                                          │
│  2  5.4 GB  Claude Code worktrees — red-e-play-app/     [easy] discovered│
│             /Users/nivram/Developer/red-e-play-app/.claude/worktrees    │
│             [▲ Expand to see worktree breakdown]                         │
│             18 worktree(s) found — each carries its own node_modules.   │
│             2 already merged into origin/main.                          │
│             [Per-worktree table with merged ✓ badges]                   │
│                                                                          │
│  3  3.6 GB  macOS Photo Recognition Cache              [easy]            │
│  4  3.7 GB  Xcode iOS Device Debug Files               [easy]            │
│  …                                                                       │
│                                                                          │
│ ─────────────────────────────────────────────────────────────────────── │
│ 🚫 Probably not worth touching                                          │
│ These look big but macOS rebuilds them automatically — net gain zero.   │
│                                                                          │
│ macOS Photo Recognition (mediaanalysisd)              3.6 GB             │
│ macOS rebuilds this automatically within hours of deletion. You'd       │
│ get the space back temporarily, then lose it again as macOS             │
│ re-analyzes. Net gain: zero.                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## The technical story

### Threading model

`_stream_survey` uses a `queue.Queue` for thread→main communication. Each discoverer pushes `("target", target_dict)` or `("progress", payload)` onto the queue. The main thread drains the queue every 0.5s and pushes SSE frames to the HTTP response. When all threads are done and the queue is empty, the main thread emits the final `done` event with the sorted target list.

This pattern lets discoverers run in parallel without holding a global lock, while keeping all SSE writes on the main thread (which owns the response writer).

### Path-validator reuse

The Survey panel reuses the same `_du()` helper as the chat agent's `measure_path` tool. Same timeouts, same parsing. Single source of truth for "how do we measure path size."

### The "not_worth_it" channel

The "Probably not worth touching" section is emitted as a separate `not_worth_it` SSE event (not just another `target`). This lets the frontend render it in its own distinct section without size-sorting it into the main table. It's also a deliberate UX signal: these aren't candidates ranked-but-not-recommended, they're explicitly anti-recommendations.

## Paste-ready channel copy

### Tweet (280 chars)

> DustPan v0.22 ships Space Survey — a live-streaming filesystem crawl that finds what predefined categories miss.
>
> Claude Code worktrees with merge status. Stale .next builds. Forgotten node_modules. All ranked, all with copy-paste commands.
>
> https://github.com/marvelousempire/dustpan

### LinkedIn (3-5 paragraphs)

> DustPan v0.22 ships Space Survey — a comprehensive filesystem crawl that goes beyond predefined cleanup categories. One button, 30–45 seconds, live-streaming results as each target is found.
>
> What it discovers:
>
> - **Claude Code worktrees** anywhere under your home, with per-worktree breakdown. Cross-references `git branch -r --merged origin/main` to flag which worktrees are already merged (safe to prune immediately).
> - **Stale `.next`, `.next-local`, `dist`, `build` directories** over 200 MB in your developer folders.
> - **Large `node_modules`** over 500 MB outside predefined paths.
> - **11 known high-value caches** measured fresh.
> - **Disk space locked by previous users** (see [locked-space-recovery.md](./locked-space-recovery.md)).
>
> Two sections that matter as much as the results themselves:
>
> - **"Recommended cleanup order"** — biggest wins first, ranked by safety.
> - **"Probably not worth touching"** — explains why some big-looking caches (like macOS photo recognition) aren't worth deleting. Net gain zero, OS rebuilds within hours.
>
> Free, open source, MIT, no telemetry. https://github.com/marvelousempire/dustpan

### Reddit r/programming

**Title:** Built a live-streaming filesystem survey for macOS — finds Claude Code worktrees, stale `.next` builds, oversized `node_modules`

**Body:**

> Open-sourcing a side project. DustPan's Space Survey tab runs four parallel discovery threads that crawl your home directory looking for things predefined cleanup tools miss:
>
> 1. Claude Code worktrees under `~/*/.claude/worktrees/` with per-worktree sizes, cross-referenced against `git branch -r --merged origin/main` to flag already-merged ones
> 2. Stale `.next`, `dist`, `build` directories over 200 MB in `~/Developer`, `~/Documents`, `~/Projects`, `~/Code`
> 3. Large `node_modules` over 500 MB outside predefined paths
> 4. 11 known high-value caches measured fresh (Docker.raw, DerivedData, etc.)
>
> Results stream live via SSE as each target is found. After completion, a "Recommended order" section ranks easy wins first, plus a "Probably not worth touching" section that explains why some big-looking caches (mediaanalysisd, Spotlight) aren't worth deleting.
>
> Stack: Python stdlib `http.server`, parallel `threading.Thread`s with `queue.Queue` for communication. ~60 second cap with per-du timeouts. Frontend uses fetch + ReadableStream to consume the SSE.
>
> Repo: https://github.com/marvelousempire/dustpan

## FAQ

**Q: How long does the Survey take?**
A: 15–45 seconds typically. Capped at 60 seconds total with per-`du` timeouts of 15–20 seconds. If a single directory is enormous (300+ GB project folder), its measurement might time out and not appear, but the rest of the survey completes.

**Q: Why does the Survey find things the Doctor doesn't?**
A: The Doctor reads from the **scan cache** — only categories the user has manually clicked "Scan" on. The Survey actively crawls the filesystem. Doctor is for "what's in the categories I've already scanned"; Survey is for "what's anywhere."

**Q: Will the Survey delete anything?**
A: No. It only measures and reports. Cleanup happens through the regular category Run buttons or the Emergency Rescue panel.

**Q: What if I run it on a freshly-installed Mac?**
A: Most discovery threads return nothing. The known-cache measurer might find DerivedData and a small Docker.raw if those are installed. The Survey will complete in 5–10 seconds with "Recommended cleanup order" showing whatever exists.

**Q: Does the Survey see my Time Machine snapshots?**
A: No — it only walks user-accessible paths. Time Machine local snapshots are managed by `tmutil` and have their own surface in macOS (`tmutil listlocalsnapshots /`). DustPan handles them through a dedicated category instead.

**Q: Can the AI agent trigger the Survey?**
A: There's a `run_disk_survey` tool registered, but Ship 1 has it return a hint rather than block waiting for 45 seconds of crawl. Future work: stream the SSE through the chat. For now the agent uses `scan_category` per category instead.

## What it took to ship

**Two PRs:**
- v0.22.0 — Initial Survey panel + 4 discovery threads. ~900 lines across `server.py` and `SurveyPanel.tsx`.
- v0.22.1 — Per-worktree merge status + "Probably not worth touching" section. ~240 lines.

### Things we deliberately chose not to do

- **Persistent survey results.** Each survey is fresh. Caching the last survey was tempting but introduces "is this still accurate" UX problems.
- **Survey other volumes.** Root volume only. External drives have their own quirks; out of scope.
- **Auto-clean from the Survey panel.** Survey shows things; Emergency or category tabs clean them. Separating these surfaces keeps the mental model clear.
- **Configurable scan roots.** Currently hardcoded to `~/Developer`, `~/Documents`, etc. A settings UI for adding custom roots is a wishlist item.
