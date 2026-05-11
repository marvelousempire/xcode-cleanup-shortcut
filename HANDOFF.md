# Real-Time Handoff Sheet

> The single source of truth for "what's the state of this repo right now?"
> Edit this in place. Don't append a new section per handoff — overwrite stale lines.

**Last updated:** 2026-05-08
**Updated by:** v0.4.1 ship (Shortcuts docs + remote-cleanup.sh)

---

## TL;DR

Repo is at v0.4.1. All 7 gaps + all 8 elevations from the prior audits are closed. v0.4 shipped: `xcc` CLI (bin/), launchd hourly agent, SwiftBar menu-bar plugin, daily update check via GitHub API (cached), CSV history + sparkline report, auto-release Actions workflow (`vX.Y.Z:` prefix → tag + release), retroactive tags for all historical versions, `make package-shortcut` infrastructure. v0.4.1 adds `scripts/remote-cleanup.sh` (pure-shell, no UI) and `docs/SHORTCUTS.md` (paste-ready blocks for Run Shell Script / Run AppleScript / Run Script Over SSH, validated against Shortcuts 12.4 / macOS 26). Issue #2 (progress-bar GIF) remains the only outstanding follow-up.

## Current status

- ✅ v0.1, v0.2, v0.2.1, v0.3 tagged + released on GitHub
- ✅ CI green on `main` (`.github/workflows/check.yml` — `make check` on macOS-latest)
- ✅ `/tmp` patterns customizable via `XCODE_CLEANUP_TMP_PATTERNS` env var
- ✅ History log at `~/Library/Logs/xcode-cleanup.log` populated on every run
- 🟡 Issue #2 — progress-bar GIF still uncaptured. v0.2.1 made auto-recording feasible; v0.3 didn't move it forward. Owner-driven follow-up.

## In flight right now

Nothing.

## Recent decisions

| Date | Decision | Why |
|---|---|---|
| 2026-05-08 | Build as a Shortcut + Run AppleScript, not a Mac app | Lower friction, no signing, native progress + notifications, schedulable. |
| 2026-05-08 | 50 GB threshold, hardcoded | Reasonable absolute floor for an active dev machine. |
| 2026-05-08 | Skip `Archives/` and active simulator devices | Preserves crash symbolication and installed simulator state. |
| 2026-05-08 | `xcrun simctl delete unavailable`, not `erase all` | Removes only simulators whose runtime is uninstalled. |
| 2026-05-08 | v0.2 flags via env vars (system attribute), not Shortcut variables | Keeps the Shortcut path one-paste; flags are for power users invoking via Makefile. |
| 2026-05-08 | Dry-run uses `du -sk` per phase, not df-delta | Df-delta would be 0 in dry-run; per-phase measurement gives the answer the user wants. |
| 2026-05-08 | `XCODE_CLEANUP_AUTO_CONFIRM` separate flag from DEMO | Recording automation needs to skip the alert; real demo users still see the safety prompt. |
| 2026-05-08 | `/tmp` patterns kept Red-E Play–defaults but env-var overridable | Maintainer's machine still works out of the box; forks/clones can override without editing source. |
| 2026-05-08 | History log local-only at `~/Library/Logs/xcode-cleanup.log`, no upload | Privacy. Pure reflection tool, never phones home. |
| 2026-05-08 | Lucide `wand-sparkles` icon over Apple/Xcode artwork | Apple icons are trademarked; Lucide is ISC. |
| 2026-05-08 | CI on macOS-latest, single `make check` step | `osacompile` is macOS-only; AppleScript syntax is the only thing meaningful to validate. |
| 2026-05-08 | `xcc` lives in `bin/` and uses `osascript` to invoke the AppleScript | One source of truth — CLI is a thin wrapper, no logic duplication. |
| 2026-05-08 | launchd interval = 1 hour, not 30 min or 6 hours | Hourly + threshold gate is the right balance: low overhead, fast to catch a sudden disk-fill, never spammy. |
| 2026-05-08 | SwiftBar plugin filename uses `.30m.` suffix | Half the launchd cadence — menu bar refreshes more often than the cleanup itself. |
| 2026-05-08 | Update check cached for 24h at `~/Library/Caches/xcode-cleanup-version-cache` | One GitHub API call per day per user, max. Curl timeout 3s, failures silent. |
| 2026-05-08 | CSV + pipe-delimited logs both kept | Pipe-delimited is human-readable in `tail`; CSV is structured for `report.py`. Different consumers, both small. |
| 2026-05-08 | Auto-release workflow keys off `vX.Y.Z:` commit prefix | Lightweight convention; doesn't require separate version files or git tag pushes. |
| 2026-05-08 | Ship `remote-cleanup.sh` as a sibling, not a replacement | AppleScript version stays the rich UX (progress bar, alert, notifications). Shell version is the SSH-safe headless variant. Both kept in sync. |
| 2026-05-08 | Shortcuts SSH blocks default to `bash <(curl …)` against `main` | Self-updating; one set of blocks works forever even as the script evolves. Inline fallback documented for air-gapped remotes. |

## Blockers

None.

## Open questions (mirrored from PRD)

1. **Threshold: absolute GB or percentage?** — currently 50 GB hardcoded.
2. **Ship a prebuilt `.shortcut` bundle?** — saves install friction but bundles are tied to creator's iCloud signature. Mitigated for now via `make install-shortcut` (clipboard paste).

## Next steps (in priority order)

1. **Capture progress-bar GIF** (issue #2) — only open task. Interactive ~5-minute screen-recording on a sanitized desktop.
2. **(v0.5)** Event-driven disk-pressure trigger via `fs_usage` instead of interval-based launchd.
3. **(v0.5)** `terminal-notifier` integration so the daily update banner can have a clickable "Open release" action button.
4. **(v0.5)** `xcc completion` — bash/zsh/fish tab-completion generators.

## Key files

| File | What it is |
|---|---|
| `xcode-cleanup.applescript` | The canonical script. The whole product is this one file. |
| `Makefile` | CLI targets: run/dry-run/demo/force/install-shortcut/uninstall-shortcut/shortcut-run/record-demo/check/size-report/history/help. |
| `.github/workflows/check.yml` | CI — `make check` on every push/PR. |
| `assets/icon-hero.svg` | Lucide wand-sparkles, 96×96, Apple-blue (#0A84FF). README hero. |
| `bin/xcc` | CLI wrapper exposing flags as `--dry-run` / `--force` / `--patterns` etc. |
| `launchd/com.marvelousempire.xcode-cleanup.plist` | LaunchAgent template (path substituted at install time). |
| `swiftbar/xcode-cleanup.30m.sh` | SwiftBar plugin — menu-bar disk indicator + actions. |
| `scripts/report.py` | Reads CSV history, renders sparkline. |
| `scripts/remote-cleanup.sh` | Pure-shell cleanup for SSH / headless / CI. |
| `docs/SHORTCUTS.md` | Paste-ready Shortcuts blocks (Run Shell Script + Run Script Over SSH + Run AppleScript). |
| `.github/workflows/check.yml` | CI: `make check` on every push/PR. |
| `.github/workflows/release.yml` | Auto-creates tag + release when commit msg starts with `vX.Y.Z:`. |
| `assets/icon.svg` | Original 24×24 currentColor variant. |
| `assets/ATTRIBUTION.md` | Lucide ISC attribution. |
| `assets/RECORDING.md` | How to capture the README progress-bar GIF (issue #2). |
| `README.md` | User-facing install + usage. Has hero + 5 badges. |
| `PRD.md` | Why this exists, what's in / out of scope, F-requirements with ✅/⬜ status. |
| `CHANGELOG.md` | v0.1 → v0.3 history. |
| `HANDOFF.md` | This file. Overwrite, don't append. |
| `LICENSE` | MIT. |

## Contact / context

- Maintainer: [@marvelousempire](https://github.com/marvelousempire)
- Origin: extracted from a Red-E Play dev workflow where DerivedData regularly hit 19 GB and `/private/tmp` accumulated multi-GB sandbox orphans from `xcodebuild`-driven scratch sessions.
