# Feature Ledger

*Last updated: 2026-05-12 11:57 Eastern (v0.9.0)*

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

## Cleanup categories (~70 paths, 21 actions)

| # | Category | Paths | Actions | Status |
|---|---|---|---|---|
| 26 | Xcode | 20 | 4 | ✅ |
| 27 | LLMs/Claude | 8 | 4 (incl. opt-in `reset-claude-desktop` for 10+ GB app state) | ✅ |
| 28 | LLMs/Cursor | 13 | 2 | ✅ |
| 29 | LLMs/ChatGPT | 3 | 1 | ✅ |
| 30 | Apps (browsers, chat, Homebrew) | 15 | 5 | ✅ |
| 31 | System (icon cache, snapshots, etc.) | 11 | 5 | ✅ |

## Auto-release & CI

| # | Feature | Status | Notes |
|---|---|---|---|
| 32 | GitHub Actions CI (`make check`) | ✅ | macos-latest; runs on every push + PR |
| 33 | Auto-release workflow (tag + GH Release from commit prefix) | ✅ | Triggers when commit msg starts with `vX.Y.Z:` |
| 34 | Auto-release notes from CHANGELOG section | ✅ | `awk` pulls the matching `## [X.Y.Z]` block |

## Docs

| # | Doc | Status | Notes |
|---|---|---|---|
| 35 | README hero (conversion-shaped via copywriting skill) | ✅ | v0.4.2 |
| 36 | `docs/SHORTCUTS.md` (Apple Shortcuts integration) | ✅ | v0.4.1 |
| 37 | `docs/Launch-Plan.md` (Show HN / Reddit / Mastodon copy) | ✅ | v0.4.4 |
| 38 | `docs/CHANGELOG.md` (canonical format) | ✅ | v0.9.0 — moved from root |
| 39 | `docs/Feature Ledger.md` (this file) | ✅ | v0.9.0 |
| 40 | `docs/Issue-Log.md` (near-misses + lessons) | ✅ | v0.9.0 |
| 41 | `.agents/product-marketing-context.md` (positioning) | ✅ | v0.4.3 |
| 42 | `PRD.md` (functional + non-functional requirements) | ✅ | v0.1 → maintained per release |
| 43 | `HANDOFF.md` (current state of the repo) | ✅ | maintained per release |

## Next (v0.10 wishlist)

| Feature | Why | Difficulty |
|---|---|---|
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
