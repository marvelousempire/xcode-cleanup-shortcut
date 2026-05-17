# Feature Ledger

*Last updated: 2026-05-17 Eastern (v0.28.2)*

Status legend: **✅ shipped** · **✔️ partial / works but rough** · **🔜 next** · **❌ deferred / out of scope**

## Install surfaces (six paths, one backend script)

| # | Surface | Status | Where | Notes |
|---|---|---|---|---|
| 1 | Web UI dashboard | ✅ | `make ui` | Recommended path. Localhost-only Python server + single HTML file. |
| 2 | Apple Shortcut | ✅ | `make install-shortcut` | Pastes the AppleScript into a new Shortcut for menu-bar / hotkey / schedule. |
| 3 | CLI (`xcc`) | ✅ | `make install-cli` | Symlinked at `~/.local/bin/xcc`. `xcc --dry-run`, `--force`, `--report`, `--history`. |
| 4 | launchd background agent | ✅ | `make install-launchd` | Runs hourly; silent no-op when disk is healthy. |
| 5 | SwiftBar menu-bar plugin | ✅ | `make install-swiftbar` | Live `🧹 12 GB` indicator, click-to-cleanup actions. |
| 6 | Run Script Over SSH | ✅ | `docs/SHORTCUTS.md` | Paste-ready block for remote Macs / build servers. |

## Web UI features

| # | Feature | Status | Tab/area | Shipped in |
|---|---|---|---|---|
| 7 | Hero disk indicator (color-coded) | ✅ | top | v0.5.0 |
| 8 | Live free-space auto-refresh (15s) | ✅ | top | v0.5.0 |
| 9 | 4 top-level tabs (Xcode / LLMs / Apps / System) | ✅ | navigation | v0.7.0 |
| 10 | LLMs sub-tabs (Claude / Cursor / ChatGPT) | ✅ | LLMs tab | v0.7.0 |
| 11 | Per-tab `[Scan]` button | ✅ | each tab | v0.7.0 |
| 12 | Three safety tiers (safe / probably_safe / caution) | ✅ | each tab | v0.7.0 |
| 13 | Per-action cost-of-deletion annotations | ✅ | each tab | v0.7.0 |
| 14 | Per-tab `[Clean all safe · X.X GB]` button | ✅ | top-of-tab bar | v0.8.0 |
| 15 | Per-tab `[Clean opt-in · X.X GB]` button | ✅ | top-of-tab bar | v0.8.0 |
| 16 | Per-path inline `[Clean]` button | ✅ | every scan row | v0.8.0 |
| 17 | Global `[⚡ Scan everything]` mega-button | ✅ | above tabs | v0.8.1 |
| 18 | Global `[✨ Clean ALL safe]` mega-button | ✅ | above tabs | v0.8.1 |
| 19 | Global `[⚠ Clean ALL opt-in]` mega-button | ✅ | above tabs | v0.8.1 |
| 20 | Parallel scanning (ThreadPoolExecutor, 10-30× faster) | ✅ | server | v0.8.3 |
| 21 | Dynamic port discovery (fallback if 8765 busy) | ✅ | server | v0.8.4 |
| 22 | Dynamic version badge (reads CHANGELOG) | ✅ | header | v0.8.5 |
| 23 | In-app changelog modal | ✅ | click version badge | v0.8.6 |
| 24 | Live SSE output console | ✅ | bottom | v0.5.0 |
| 25 | History sparkline (Unicode blocks) | ✅ | bottom | v0.5.0 |

## Web UI — v0.11 redesign (the big polish pass)

| # | Feature | Status | Tab/area | Shipped in |
|---|---|---|---|---|
| 25a | Design system (teal accent, Lucide icons, motion tokens) | ✅ | global, `docs/Design-System.md` | v0.11.0 |
| 25b | First-run progressive disclosure flow (localStorage gated) | ✅ | top of dashboard | v0.11.0 |
| 25c | Custom cost-modal (replaces `window.confirm`) | ✅ | any clean action | v0.11.0 |
| 25d | "Factory-fresh without losing your stuff" promise lockup | ✅ | hero card | v0.11.0 |
| 25e | Live cumulative-freed history strip (reads `/api/report`) | ✅ | under hero | v0.11.0 |
| 25f | LLM providers as stacked cards in one panel (sub-tabs removed) | ✅ | LLMs panel | v0.11.0 |
| 25g | Cost annotation lifted to top of every action card | ✅ | per-action | v0.11.0 |
| 25h | Motion (motion.dev) via CDN — hero tween, spring fill, stagger, success pulse | ✅ | global | v0.11.0 |
| 25i | `prefers-reduced-motion` honoured globally | ✅ | global | v0.11.0 |
| 25j | Lucide tab icons (emoji dropped) | ✅ | tab bar | v0.11.0 |
| 25k | Category callout in panel header (Docker.raw size highlight) | ✅ | Docker panel header | v0.13.0 |
| 25l | **Library atlas** — expandable `~/Library` map (Caches, Application Support, Containers, Group Containers, Developer, Logs, Mobile Documents, prefs caution) with tab-jump pills incl. LLM sub-tabs | ✅ | Overview → Home folder guidance | v0.27.5 |

## Cleanup categories (~120 paths, 35+ actions)

| # | Category | Paths | Actions | Status | Added |
|---|---|---|---|---|---|
| 26 | Xcode | 20 | 6 | ✅ | v0.7.0 / refined v0.27.7 |
| 27 | LLMs/Claude | 9 | 5 (incl. scoped `clear-claude-vm-bundles` plus opt-in full reset) | ✅ | v0.7.0 / refined v0.27.7 |
| 28 | LLMs/Cursor | 13 | 2 | ✅ | v0.7.0 |
| 29 | LLMs/ChatGPT | 3 | 1 | ✅ | v0.7.0 |
| 30 | Apps (browsers, chat, Homebrew) | 15 | 5 | ✅ | v0.7.0 |
| 31 | System (icon cache, snapshots, etc.) | 11 | 5 | ✅ | v0.7.0 |
| 31a | Docker (logs, buildx, prune, Docker.raw surface) | 8 | 6 (prune-safe, buildx-prune, volume-preflight, prune-everything, vm-reset-info, system-df, clear-logs) | ✅ | v0.12.0 / refined v0.13.0 |
| 31b | Creative/Adobe (Premiere/AE/Photoshop/Lightroom/Bridge) | 11 | 5 (incl. per-catalog Lightroom preview cleanup + folder-stats info) | ✅ | v0.12.0 / refined v0.13.0 |
| 31c | Creative/DaVinci Resolve | 10 | 3 (incl. both legacy + Resolve-18+ CacheClip locations) | ✅ | v0.12.0 / refined v0.13.0 |
| 31d | Creative/Final Cut Pro (per-library render + transcoded media + backups) | 4 | 3 | ✅ | v0.13.0 |
| 31e | Creative/Logic Pro (caches, Apple Loops info) | 6 | 2 | ✅ | v0.13.0 |
| 31f | Creative/Blender (per-version Cycles cache + autosave temp) | 4 | 2 | ✅ | v0.13.0 |
| 31g | Creative/OBS Studio (logs, crash dumps, browser-source cache) | 5 | 2 | ✅ | v0.13.0 |

## Auto-release & CI

| # | Feature | Status | Notes |
|---|---|---|---|
| 32 | GitHub Actions CI (`make check`) | ✅ | macos-latest; runs on every push + PR |
| 33 | Auto-release workflow (tag + GH Release from commit prefix) | ✅ | Triggers when commit msg starts with `vX.Y.Z:` |
| 34 | Auto-release notes from CHANGELOG section | ✅ | `awk` pulls the matching `## [X.Y.Z]` block |

## Docs

| # | Doc | Status | Notes |
|---|---|---|---|
| 35 | README hero (conversion-shaped via copywriting skill) | ✅ | v0.4.2 → rewritten v0.11.0 |
| 36 | `docs/SHORTCUTS.md` (Apple Shortcuts integration) | ✅ | v0.4.1 |
| 37 | `docs/Launch-Plan.md` (Show HN / Reddit / Mastodon copy) | ✅ | v0.4.4 |
| 38 | `docs/CHANGELOG.md` (canonical format) | ✅ | v0.9.0 — moved from root |
| 39 | `docs/Feature Ledger.md` (this file) | ✅ | v0.9.0 → updated v0.13.0 |
| 40 | `docs/Issue-Log.md` (near-misses + lessons) | ✅ | v0.9.0 |
| 41 | `.agents/product-marketing-context.md` (positioning) | ✅ | v0.4.3 |
| 42 | `PRD.md` (functional + non-functional requirements) | ✅ | v0.1 → maintained per release |
| 43 | `HANDOFF.md` (current state of the repo) | ✅ | maintained per release |
| 44 | `docs/Design-System.md` (tokens + rationale for the v0.11 redesign) | ✅ | v0.11.0 |
| 45 | `docs/Redesign-Brief.md` (the action document the v0.11 redesign answered) | ✅ | v0.10.0 |

## Shipped — v0.21 to v0.25 (the big push)

These five releases substantially widened DustPan from "Xcode cleaner" to "local AI-powered disk-recovery app." Update the README and channel copy when these are mentioned in launch material.

| Version | Feature | What it adds |
|---|---|---|
| **v0.21.4** | 🚨 Emergency Rescue panel (Plan 0021) | Disk-at-zero rescue with 6 numbered command cards, in-app terminal streaming, low-space auto-navigation when `free_gb < 1`. |
| **v0.21.5** | Real-time calc fix | EmergencyPanel now wires to the actual SSE `done` event (not a fake 1500ms timer); per-card freed-GB counters from kernel reads. |
| **v0.22.0** | 📊 Space Survey (Plan 0022) | Live-streaming filesystem crawl beyond predefined categories. Finds Claude Code worktrees, `.next`/`dist` artifacts, large `node_modules`, plus 11 known caches measured fresh. |
| **v0.22.1** | Per-worktree merge status | `git branch -r --merged origin/main` cross-reference — flags worktrees safe to prune. Plus the "🚫 Probably not worth touching" section (mediaanalysisd, Spotlight). |
| **v0.23.0** | 💬 Ask DustPan (Plan 0023 Ship 1) | Conversational agent with tool-calling. Anthropic + OpenAI tool-use loops. 13 curated tools (read-only + action). Sandboxed filesystem peek with allowlist. Approval cards pull desc+cost from `cleaners.py`. Settings toggle for safe-tier auto-approve. |
| **v0.24.0** | 🔒 Foreign-ownership discovery (Plan 0024) | Finds disk locked by previous users (Homebrew owned by old account, `/Users/<oldname>/` still on disk). Survey + Emergency surfaces show takeover commands with [📋 Copy]. AI agent gets `find_foreign_ownership` tool. Never runs `sudo` — macOS password prompt is the consent gate. |
| **v0.25.0** | AI cleaner proposals (Plan 0023 Ship 2) | `propose_new_cleaner` tool (#15). Proposals land in review inbox at `~/.dustpan/proposals.json`. Accept generates paste-ready Python snippet for `cleaners.py` — never auto-edits source. Sidebar badge with pending count. |
| **v0.27.5** | Library atlas (Overview) | Teach **where macOS stacks weight** under the home folder, with one-click navigation to the matching category tabs — complements **Space Survey** and **Home folder guidance**. |
| **v0.27.6** | Xcode Build Rescue (Plan 0029) | Encodes the disk-full Xcode recovery path: read-only diagnostics, active-build guard, SwiftPM/Xcode cache cleanup, and Emergency coverage for package-resolution failures. |
| **v0.27.7** | Dev Build Rescue Payload (Plan 0030) | Adds the Red-E Play recovery lesson: Claude Desktop `vm_bundles` can be the real 10+ GB blocker, and external/network DerivedData can cause Xcode `disk I/O error`; DustPan now diagnoses both and clears the rebuildable VM bundle cache without a full Claude reset. |
| **v0.27.8** | AI_AGENT_RULES Handbook (Plan 0031) | Adds a root AI binder and wires Ask DustPan to load compact local-law context, with read-only section lookup through `read_ai_agent_rules`. |
| **v0.27.9** | AI_AGENT_RULES Provider Coverage | Extends compact handbook loading from Ask DustPan chat to every API-key provider call, including scan summaries and diagnosis helpers. |
| **v0.28.0** | Realtime Server Performance analytics (Plan 0033) | Adds Mac/Linux snapshot + SSE performance APIs, Ultra Dashboard live meter wall, gauges and sparklines, process/network/service views, Detailed Activity Monitor, bottleneck radar, and DustPan's own safe DustBench benchmark. |
| **v0.28.1** | Header status pill + stack modal | Bumps the release after the header/server-status work: top-left pill shows live LED + connected port, and the modal now has Change Log plus Tech Stack tabs with under-the-hood sections. |
| **v0.28.2** | AI dashboard release rules | Refreshes `AI_AGENT_RULES/` so future agents preserve server-status visibility, version/changelog coupling, Tech Stack modal updates, and compact meter-rich monitoring behavior. |

## Next (v0.26+ wishlist)

| Feature | Why | Difficulty |
|---|---|---|
| Token-by-token streaming for chat | Replace per-round-text emission with real SSE token streaming | ~3 hours |
| Postgres backend for proposals (Docker mode) | Currently JSON-only; Docker mode should use `cleaner_proposals` table | ~2 hours |
| `propose_new_cleaner` tier-classification UX | When AI suggests a path, let user reclassify safe/probably_safe/caution before accepting | ~1 hour |
| Progress-bar GIF in README (issue #2) | Visual proof in repo hero | Manual screen-record |
| Linux path set | The cleaner data structure already supports per-OS, just needs Linux paths added | ~1 hour |
| `caution` tab summary at top of dashboard | So big un-reviewed items (Archives, iOS backups) don't get forgotten | ~30 min |
| Scheduled cleanup config from UI | Pick which actions auto-run hourly | ~2 hours |
| Per-action history charts | "You've reclaimed 47 GB from Xcode over 12 runs" | ~1 hour |
| `terminal-notifier` integration for update banner | Clickable "Open release" notification | ~30 min |
| `xcc` shell-completion (bash/zsh/fish) | CLI ergonomics | ~30 min |
| Event-driven disk-pressure trigger (vs interval launchd) | Better than hourly polling | ~2 hours |

## Deferred / out of scope

| Item | Why |
|---|---|
| Full system cleanup (Mail, browser history beyond cache, etc.) | Out of scope per product-marketing-context — this is a *dev* cleanup tool, not CleanMyMac |
| Multi-user / shared-system support | Designed for personal dev machines only |
| MDM-packaged signed installer for enterprise IT | Not the target audience |
| Sudo-elevated system cleanups from the web UI | Surfaces sizes only; never executes sudo |
| Auto-deleting Xcode Archives | Irreplaceable for App Store crash symbolication |
| Auto-deleting iOS device backups | User-data, irreplaceable |
