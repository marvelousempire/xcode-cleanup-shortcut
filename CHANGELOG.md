# Changelog

## v0.8.3 — 2026-05-12

### Performance
- **Parallel scanning** — `scan_category` now uses a 6-thread `ThreadPoolExecutor` for the `du -sk` calls. `du` is I/O bound, so 6 paths can scan simultaneously without contention. Measured on the maintainer's machine: scan times dropped from minutes to seconds.
  - Xcode (20 paths incl. DerivedData/DeviceSupport): ~2 sec
  - LLMs/Claude/Cursor/ChatGPT: 30–210 ms each
  - Apps: 250 ms
  - System: 20 ms
  - "Scan everything" (6 categories in parallel via JS): ~2 sec total (gated by Xcode, the slowest)
- Scan response now includes `scan_ms` for the per-category wallclock — useful for "why is X slow" diagnostics.

### Why
User: "why does it take so long to load stats from each one?" — answer: the original implementation ran every `du -sk` sequentially. Threading was the fix.

## v0.8.1 — 2026-05-12

### Added
- **Mega action bar** above the tabs with three global buttons:
  - **⚡ Scan everything** — fires scans for all 6 categories in parallel, populates every tab at once. Shows a per-tab breakdown in the hint line afterward (`🛠 Xcode 5.0 GB · 🤖 Claude 10.7 GB · …`).
  - **✨ Clean ALL safe · X.X GB** — wipes every safe-tier path across every category in one pass. Disabled until "Scan everything" runs first; label always shows total reclaim potential.
  - **⚠ Clean ALL opt-in · X.X GB** — same, for the probably-safe tier (Simulator app data, Claude Desktop state, browser-cache opt-ins, etc.).
- **`/api/clean-everything?tier={safe,probably_safe}`** server endpoint — streams the cleanup of every path in the chosen tier across every category. Logs to CSV as `clean-everything-{tier}`.

### Why
User: "Want me to also add a 'Clean all safe across every tab' mega-button at the very top (above the tabs)?" → "yes please". One-click factory-fresh across Xcode/LLMs/Apps/System without touching anything in the caution tier.

## v0.8.0 — 2026-05-12

### Added
- **Per-path inline `[Clean]` button** on every scan result row (for paths in the safe + probably-safe tiers, only if non-empty). Click the button next to a path to wipe just that path — no need to run a predefined action that batches multiple paths together.
- **Top-of-tab action bar** with three buttons:
  - `Scan` / `Re-scan` (primary) — refreshes the scan
  - `Clean all safe · X.X GB` — wipes every safe-tier path in this category at once
  - `Clean opt-in · X.X GB` — wipes every probably-safe path in this category at once
  Both clean buttons display the freed-GB potential in their label and are disabled when there's nothing to clean.
- **`/api/clean-path`** server endpoint — streams the cleanup of a single path via SSE. Validates the path against the category's safe/probably-safe groups (security: rejects arbitrary path injection).
- **`/api/clean-all-safe?tier={safe,probably_safe}`** server endpoint — iterates every path in the chosen tier of a category, streams progress per path.

### Changed
- Predefined-action cards moved below the scan results (was: above). Per-tab top-action-bar is now the primary surface; predefined actions are for special cases (`xcrun simctl erase all`, `brew cleanup -s`, etc.) that aren't simple `rm -rf`.
- "Re-scan" button removed from the bottom of the scan list (it's at the top now, replacing the original "Scan" button after first run).

### Why
User feedback: "where you ask what would be cleaned right there, we have little buttons that we could activate or deploy any one of those steps just by pressing the button next to it. Put the deep scan button at the top next to the other buttons." This change makes every individual cache reachable with one click, and moves the scan action to the top where you'd expect it next to the clean-all buttons.

## v0.7.0 — 2026-05-12

### Major: from one tool to four tabs

This release turns the web UI from "Xcode cleanup" into a multi-category cleanup hub. Four tabs, each with its own scan + actions + cost-of-deletion notes:

- **🛠 Xcode** (existing, reorganized as one tab)
- **🤖 LLMs** — with sub-tabs for Claude, Cursor, ChatGPT
- **🧹 Apps** — browsers (Chrome/Safari/Firefox/Brave/Arc), chat apps (Slack/Discord/Zoom/Teams), Spotify, Homebrew downloads, `~/Downloads/*.dmg`, Trash
- **💾 System** — icon cache, Spotlight parser, help/CloudKit/iCloud Drive caches, Time Machine local snapshots, diagnostic reports, old macOS installers

### Added
- **`web/cleaners.py`** — single source of truth for all categories, paths, actions, and cost annotations. ~370 LOC, ~70 paths, 20+ actions across 6 categories (xcode, llms-claude, llms-cursor, llms-chatgpt, apps, system).
- **Cost annotations** — every action has a `cost` field shown in the UI with an orange "Cost of doing this:" banner. Tells the user *exactly* what they lose. Examples: "First build after cleanup takes ~30s longer", "Chrome reloads pages from origin on next visit. Bookmarks/passwords safe", "Hard reset: you sign out of Claude Desktop and re-sign-in. Cloud conversation history re-syncs."
- **Three safety tiers per tab**: ✓ Safe (regenerable, low-cost) / ⚠ Probably safe (opt-in, bigger reclaim) / ⛔ Caution (surfaces sizes only, never auto-deletes).
- **`reset-claude-desktop` action** — explicit opt-in for the (often 10+ GB) Claude Desktop app state with full cost disclosure.
- **Time Machine local snapshot deletion** — finds and clears local APFS snapshots (typically 5–20 GB of "purgeable" disk).
- **Old macOS installer detection** + sudo-required actions surfaced informationally (web UI doesn't elevate).
- **Tabbed UI** in `web/index.html` — top-level tabs with sub-tabs (LLMs has 3). Vanilla JS, no framework.
- **Per-run logging** of UI-triggered cleanups to the CSV history (`mode=real-ui-<category>-<action>`).

### Changed
- **Server refactored** — `web/server.py` now imports `cleaners.py` for all category data. Endpoints unified under `/api/category/<id>/{scan,actions}` and `/api/run?category=&action=`. Old `/api/sizes`, `/api/deep-scan` endpoints removed (no external users — clean break).
- **README headline broadened** — "Reclaim 10–40 GB your Mac is hoarding — Xcode, LLM tools, apps, system" (was Xcode-only).
- Footer tagline now: "factory-fresh without losing your stuff."

### Philosophy
The app's design rule, baked into the UI: tell the user what each cleanup costs before they click. Cleanup actions are categorized by reversibility and impact. The goal is a fast, clean computer — not a factory wipe.

## v0.6.0 — 2026-05-12

### Added
- **Deep scan** in the web UI — exhaustive scan of ~20 Xcode-adjacent locations, grouped into three categories with safety semantics:
  - **Safe** (13 paths) — same caches basic mode cleans + iOS Device Logs, Snapshots, IB caches, Xcode Products, visionOS DeviceSupport, CoreSimulator Cryptex. Cleanable by the basic "Clean now" button or a dedicated "Clear Xcode extras" deep action.
  - **Probably safe — opt in** (4 paths) — Simulator app data (5+ GB typical), Instruments traces, CocoaPods cache + specs. Each gets its own action button: "Erase all simulator app data" (`xcrun simctl erase all`), "Clear Instruments traces", "Clear CocoaPods caches".
  - **Caution — review manually** (3 paths) — Xcode Archives, iOS device backups, Provisioning Profiles. Size only, never auto-deleted.
- **`/api/deep-scan`** + **`/api/deep-action`** + **`/api/deep-actions`** server endpoints
- **"Run deep scan" button** in the UI between "What would be cleaned" and "Your cleanup history"; each category renders with its own color, a one-line note explaining the safety semantics, the path list with sizes, and (where applicable) opt-in action buttons that stream output via SSE just like basic mode.

### Changed
- **README rewritten** with `make ui` as the **recommended** install path (⭐) at the top of the install matrix.
- New **"60-second quickstart"** section right under the badges — just three commands (`git clone`, `cd`, `make ui`) plus a one-paragraph explanation of which buttons to press. No prerequisites, no AppleScript paste, no CLI install needed for first run.
- Web UI section now documents the deep scan with a category-by-category breakdown of what each finds.

### Why
User feedback: "I ran it and only 4 things were checked... nothing came back as being deleted so we want a deep dive because I know there's more space Xcode is just taking." Basic mode handles 7 known-safe caches; deep mode covers 13+ safe + 4 opt-in + 3 caution paths.

## v0.5.0 — 2026-05-08

### Added
- **Web UI** (`make ui`) — a localhost-only browser dashboard at `http://127.0.0.1:8765`. Zero dependencies (pure Python stdlib `http.server` + a single HTML file with vanilla JS).
  - Big live disk-free indicator (color-coded by pressure)
  - Per-path size breakdown (bar chart) of every cleanup target
  - Three one-click actions: Dry run / Clean now / Force clean
  - Live output streaming via Server-Sent Events (real-time, no polling)
  - Sparkline of cleanup history pulled from `~/Library/Logs/xcode-cleanup-history.csv`
  - Apple-style design (SF font stack, system colors, frosted-glass cards, dark-mode auto)
- **`web/server.py`** — ~150 LOC HTTP server with 4 endpoints: `/api/status`, `/api/sizes`, `/api/report`, `/api/stream` (SSE). Bound to `127.0.0.1` only — never network-reachable.
- **`web/index.html`** — single-file UI, ~280 lines including CSS + JS. No build step, no framework, no npm.
- **`make ui`** Makefile target — opens the browser automatically.

## v0.4.4 — 2026-05-08

### Added
- **`docs/Launch-Plan.md`** — full public-launch playbook generated via the `launch-strategy` skill from coreyhaines31/marketingskills, reading from `.agents/product-marketing-context.md` for positioning.
  - Pre-launch checklist + launch-day timeline (T-1d through T+24h)
  - Ready-to-paste copy for: **Show HN** (title + URL + anchor first-comment), **r/iOSProgramming**, **r/swift**, **iOS dev Mastodon** (3-post thread), **X/Twitter** (2-tweet sequence)
  - Engagement playbook (what to do in the first 30min on every channel, what to absolutely not do, tone reminders)
  - **Hit/Steady/Flop** scenario plans with what to do in each — including issue triage, PR review readiness, and how to diagnose a flop before re-launching
  - **7-day follow-up plan** day by day
  - Metrics tracking template
  - Product Hunt deferred to v1.0 (low ROI for a dev utility at launch)
  - Pointers into the next marketing-skill chain (`customer-research`, `page-cro`, `programmatic-seo`, `email-sequence`)

## v0.4.2 — 2026-05-08

### Changed
- **README hero rewritten** using the `copywriting` skill from coreyhaines31/marketingskills. New headline ("Reclaim 10–25 GB Xcode is hoarding. One click.") leads with the specific outcome and uses customer-language ("hoarding"). Subhead names what's wiped + the trust-anchor (skips Archives). "Why bother" section replaces the feature list with five benefits framed against alternatives (manual rm, CleanMyMac, dev guesswork). Install table moved above-the-fold so first-time visitors see the path-to-value in the first screen.

### Why
Before: engineering-voice spec sheet. After: conversion-shaped landing page. Same product, clearer story.

## v0.4.1 — 2026-05-08

### Added
- **`scripts/remote-cleanup.sh`** — pure-shell cleanup that doesn't depend on AppleScript, `osascript`, or a UI session. Safe to run over SSH, in CI, or anywhere headless. Honors `--dry-run` / `--force` flags + `XCODE_CLEANUP_*` env vars; appends a `real-ssh` row to the CSV history when not in dry-run.
- **`docs/SHORTCUTS.md`** — paste-ready blocks for Apple Shortcuts' Run Shell Script and Run Script Over SSH actions, with field-by-field parameter values for macOS 26 / Shortcuts 12.4, four script variants per action (self-updating, repo-pinned, CLI-via-xcc, fully inline), gotchas table, and three suggested whole-Shortcut compositions ("Clean all my Macs", "Babysit the build server", "Pre-flight before TestFlight upload").

### Changed
- README links to `docs/SHORTCUTS.md` from the install section.

## v0.4 — 2026-05-08

Closes all 7 remaining elevations from the post-v0.2 gap-audit.

### Added
- **`bin/xcc` CLI wrapper** — `xcc --dry-run`, `xcc --force`, `xcc --history`, `xcc --report`, `xcc --patterns '...'`. Installable via `make install-cli` (symlinks to `~/.local/bin/xcc`). Covers users who don't want to touch Shortcuts at all. *(Elevation C)*
- **launchd agent** — `launchd/com.marvelousempire.xcode-cleanup.plist` runs the cleanup hourly in the background. Threshold-gated so it no-ops when disk is healthy. Install/uninstall via `make install-launchd` / `make uninstall-launchd`. *(Elevation E)*
- **SwiftBar plugin** — `swiftbar/xcode-cleanup.30m.sh` shows free disk space in the menu bar (`🧹 12GB` / `🚨` red / `✨` green) with click-to-cleanup actions. `make install-swiftbar`. *(Elevation G)*
- **Daily update check** — script fetches the latest release tag from the GitHub Releases API once per day (cached at `~/Library/Caches/xcode-cleanup-version-cache`) and fires a `display notification` if newer. Opt-out: `XCODE_CLEANUP_NO_UPDATE_CHECK=1`. *(Elevation F)*
- **CSV history log** — `~/Library/Logs/xcode-cleanup-history.csv` gets a row per run: `timestamp,mode,freed_gb,before_gb,after_gb`. *(Elevation H)*
- **`scripts/report.py`** + **`make report`** — Unicode-block sparkline of freed-GB across recent real cleanup runs, plus min/max/avg/total stats. *(Elevation H)*
- **`make package-shortcut`** — signs an exported `.shortcut` bundle in Anyone Mode for distribution via `shortcuts sign`. *(Elevation B)*
- **`.github/workflows/release.yml`** — auto-creates a git tag + GitHub Release whenever a commit message on `main` starts with `vX.Y.Z:`. Pulls release notes from the matching CHANGELOG section. *(Elevation A)*
- **Retroactive tags + releases** for v0.1, v0.2, v0.2.1.

### Changed
- Makefile grows 7 new targets: `install-cli`, `uninstall-cli`, `install-launchd`, `uninstall-launchd`, `install-swiftbar`, `uninstall-swiftbar`, `package-shortcut`, `report`. `make help` displays them all.
- README gains an "Install options" matrix + sections per install path. PRD lists F20–F27 with ✅ status.

## v0.3 — 2026-05-08

### Added
- **`XCODE_CLEANUP_TMP_PATTERNS=...`** — override the default `/tmp` orphan globs. Empty string skips phase 4 entirely. Repo is now useful to non-maintainer users without editing source.
- **History log** at `~/Library/Logs/xcode-cleanup.log` — every run (real, dry-run, or demo) appends one line: `timestamp | mode | freed GB | before GB | after GB`.
- **`make history`** Makefile target — prints the last 20 log entries.
- **CI workflow** `.github/workflows/check.yml` — runs `make check` on every push and PR (macos-latest runner). README has the badge.
- **README hero** — centered Lucide `wand-sparkles` icon (Apple blue), title, tagline, 5 shields.io badges (MIT, macOS 14+, Xcode 15+, AppleScript, CI status).
- **`assets/icon.svg` + `assets/icon-hero.svg` + `assets/ATTRIBUTION.md`** — ISC-licensed icon assets and Lucide attribution.

### Changed
- README "Customize" section explicitly flags the Red-E Play `/tmp` patterns as example-only and documents the env-var override.
- Retroactive git tags + GitHub Releases for v0.1, v0.2, v0.2.1.

## v0.2.1 — 2026-05-08

### Added
- **`XCODE_CLEANUP_AUTO_CONFIRM=1`** — skips the confirmation alert. Intended for scripted screen-recording (so the alert doesn't block the capture timeline). Real users should leave this off — the alert is the safety gate before destructive deletion.
- **Demo mode now fires per-phase `display notification` banners** so the recording catches a visible 4-step sequence instead of silent sleeps.

## v0.2 — 2026-05-08

### Added
- **Dry-run mode** — `XCODE_CLEANUP_DRY_RUN=1` measures what would be freed without deleting anything. Reports `Would free ~X.X GB` via notification.
- **Demo mode** — `XCODE_CLEANUP_DEMO=1` simulates phases with sleeps instead of deleting. Used for capturing the README progress-bar GIF.
- **Force mode** — `XCODE_CLEANUP_FORCE=1` skips the 50 GB free threshold check, useful for testing or running on demand even when the disk looks healthy.
- **Per-phase size measurement** — each phase uses `du -sk` before deletion, so dry-run can report total bytes touched.
- **Makefile** — `make help` lists targets: `run`, `dry-run`, `demo`, `force`, `install-shortcut`, `uninstall-shortcut`, `shortcut-run`, `record-demo`, `check`, `size-report`.
- **`assets/RECORDING.md`** — instructions for capturing the progress-bar GIF.

### Changed
- Script title in the progress bar updates to `(Dry Run)` or `(Demo)` based on the active flag.
- README documents the Makefile and the new flags.

## v0.1 — 2026-05-08

Initial release. One-button macOS Shortcut that reclaims Xcode disk space (DerivedData, DeviceSupport, SwiftPM caches, unavailable simulators, /tmp orphans) with a native progress bar, threshold-gated confirmation, and final notification.
