# DustPan by AVERY GOODMAN — PRD

**Status:** Live (v0.4 shipped)
**Owner:** marvelousempire
**Last updated:** 2026-05-08

## Problem

Active iOS developers running Xcode see their boot drive fill up by 20–60 GB over a few weeks of normal work. The disk pressure surfaces as failed builds, full simulators, slow Spotlight, and macOS warning banners. The fix — `rm -rf` of well-known cache directories — is well documented but tedious to remember and run.

The current state of the user's workflow before this tool:
- `du -sh ~/Library/Developer/...` to see what's eating space.
- Hand-typed `rm -rf` for each path.
- Repeat every couple of weeks.

This is friction that should be a button.

## Goals

1. **One-button reclaim** — a single Shortcut invocation frees Xcode-related space with no further input on the happy path.
2. **Visible progress** — the user sees what phase is running, never wonders if it hung.
3. **Safe by default** — never deletes anything that breaks an active project, loses simulator state with installed app data, or destroys archive symbols.
4. **Threshold-aware** — does nothing if the disk is already healthy.
5. **Schedulable** — runs unattended from a Shortcuts time-of-day automation.
6. **Inspectable** *(v0.2)* — dry-run mode reports what *would* be freed without committing to a delete.

## Non-Goals

- Not a general macOS cleaner (no Trash, no Mail downloads, no browser caches).
- Not a real Mac app. Shortcuts + AppleScript is the deliberate ceiling.
- Not a multi-user / shared system tool. Personal dev machine only.
- Not for CI. Build agents have their own ephemeral filesystems.

## Users

**Primary:** the repo owner — a working iOS/macOS developer who runs Xcode daily and has 60+ git worktrees on disk.

**Secondary:** any iOS dev who clones the repo. The script is parameterized only via the `/tmp` orphan patterns, which are project-specific (currently `redeplay-*`, `RedEPlay-*`, `sweep.mov.sb-*`, etc.); other users edit those globs to match their own scratch patterns or remove that phase entirely.

## Functional requirements

| ID | Requirement | Status |
|---|---|---|
| F1 | Read current root-volume free space before any action. | ✅ |
| F2 | If free space > 50 GB, exit with a non-blocking notification. No prompts. | ✅ |
| F3 | Otherwise, present a modal `display alert` with current free GB, action description, and Cancel/Run buttons. Default button is Run. | ✅ |
| F4 | On Run, advance a 4-step AppleScript progress bar with per-phase `additional description`. | ✅ |
| F5 | Phase 1: clear `~/Library/Developer/Xcode/DerivedData`, `iOS DeviceSupport`, `watchOS DeviceSupport`, `tvOS DeviceSupport`, `~/Library/Caches/com.apple.dt.Xcode`. | ✅ |
| F6 | Phase 2: clear SwiftPM caches in `~/Library/Caches/org.swift.swiftpm` and `~/Library/org.swift.swiftpm`. | ✅ |
| F7 | Phase 3: clear CoreSimulator caches and run `xcrun simctl delete unavailable`. | ✅ |
| F8 | Phase 4: remove project-scratch `/private/tmp` orphans matching configured globs. | ✅ |
| F9 | Re-measure free space and compute GB freed. | ✅ |
| F10 | Show final `display notification` with freed GB and new free space. Sound: Glass. | ✅ |
| F11 | Dry-run mode (`DUSTPAN_DRY_RUN=1`) measures each phase via `du -sk` and reports the total without deleting. | ✅ v0.2 |
| F12 | Demo mode (`DUSTPAN_DEMO=1`) sleeps instead of deleting, for capturing the README progress-bar GIF. | ✅ v0.2 |
| F13 | Force mode (`DUSTPAN_FORCE=1`) skips the threshold check. | ✅ v0.2 |
| F14 | Makefile exposes `run`, `dry-run`, `demo`, `force`, `install-shortcut`, `uninstall-shortcut`, `shortcut-run`, `record-demo`, `check`, `size-report`. | ✅ v0.2 |
| F15 | History log at `~/Library/Logs/dustpan.log` records every run (real / dry-run / demo) with timestamp, mode, freed GB, before/after. | ✅ v0.3 |
| F16 | `DUSTPAN_TMP_PATTERNS` overrides the default `/tmp` orphan globs; empty string skips phase 4. | ✅ v0.3 |
| F17 | `DUSTPAN_AUTO_CONFIRM=1` skips the confirmation alert (for scripted recording). | ✅ v0.2.1 |
| F18 | CI runs `make check` on every push and PR via `.github/workflows/check.yml` (macos-latest). | ✅ v0.3 |
| F19 | `make history` prints the last 20 entries from the run log. | ✅ v0.3 |
| F20 | `bin/xcc` CLI wrapper exposes the script as a first-class command (`xcc --dry-run`, `xcc --force`, etc.). Installable via `make install-cli`. | ✅ v0.4 |
| F21 | `launchd/com.marvelousempire.dustpan.plist` runs the cleanup hourly in the background, passing `AUTO_CONFIRM=1` + `NO_UPDATE_CHECK=1`. Installable via `make install-launchd`. | ✅ v0.4 |
| F22 | `swiftbar/dustpan.30m.sh` displays free disk space in the menu bar with click-to-cleanup actions. Installable via `make install-swiftbar`. | ✅ v0.4 |
| F23 | Daily update check via GitHub Releases API. Caches result for 24h. Opt-out: `DUSTPAN_NO_UPDATE_CHECK=1`. | ✅ v0.4 |
| F24 | CSV history log at `~/Library/Logs/dustpan-history.csv` for analytics. | ✅ v0.4 |
| F25 | `scripts/report.py` and `make report` render a Unicode-block sparkline of freed-GB over time. | ✅ v0.4 |
| F26 | Auto-release GitHub Actions workflow tags + creates a release when a commit message starts with `vX.Y.Z:`. | ✅ v0.4 |
| F27 | `make package-shortcut` signs an exported `.shortcut` bundle in Anyone Mode for distribution. | ✅ v0.4 |
| F28 | `scripts/remote-cleanup.sh` pure-shell equivalent (no AppleScript, no UI) usable over SSH or in CI. | ✅ v0.4.1 |
| F29 | `docs/SHORTCUTS.md` ships ready-to-paste blocks for Run Shell Script, Run AppleScript, and Run Script Over SSH actions with current macOS 26 / Shortcuts 12.4 parameter shapes documented. | ✅ v0.4.1 |

## Non-functional requirements

| ID | Requirement |
|---|---|
| N1 | Total wall time on a fully primed cache: < 60 seconds typical, < 5 minutes worst case. |
| N2 | Survives missing target dirs without failing the run (each phase appends `; true`). |
| N3 | Survives Focus / Do Not Disturb — script completes silently if banners are suppressed. |
| N4 | No `sudo`. All paths are user-owned. |
| N5 | No external dependencies beyond `xcrun` (ships with Xcode CLT) and BSD `df`/`du`/`awk`/`rm`. |
| N6 | Compatible with macOS 14+ on Apple Silicon. |
| N7 | `make check` lints AppleScript syntax in CI-style without executing. |

## Success metrics

- **GB reclaimed per invocation** (read from the final notification text). Healthy range: 5–25 GB.
- **Time to invocation** — should be < 5 seconds from "I notice low disk" to "cleanup running" via menu bar or hotkey.
- **False-positive rate** — number of times the user runs it and gets "no action needed" because the threshold check caught it. Higher = good.
- **Dry-run usage** — proxy for trust; users running dry-run before real-run = healthy adoption.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Running while `xcodebuild` has DerivedData open → partial deletion errors. | `rm -rf` continues past locked paths; `; true` swallows the exit code. Re-run after build finishes. |
| User accidentally deletes simulator state they care about. | Phase 3 only targets `Caches/` and unavailable runtimes. Active simulators are untouched. |
| Threshold (50 GB) is wrong for users with smaller drives. | Easy to edit one constant. Documented in README. |
| `/tmp` orphan patterns hit something user wanted. | Patterns are explicit globs, never `/private/tmp/*`. Documented in README. |
| AppleScript Automation permission denied. | First-run macOS prompt; if missed, README points to System Settings → Privacy & Security → Automation. |

## Open questions

- Should the threshold be a percentage of disk size instead of absolute GB? Argument for: portable across drive sizes. Argument against: 50 GB is a reasonable absolute floor for an active dev machine regardless.
- Should we ship a prebuilt `.shortcut` file? Argument for: zero-paste install. Argument against: `.shortcut` bundles are signed iCloud exports tied to the original creator; contributors can't easily edit them. Workaround: `make install-shortcut` puts the script on the clipboard and opens the editor.

## Future work (v0.5+)

- **Per-phase opt-out toggles** as env vars (`DUSTPAN_SKIP_SIMS=1`, etc.).
- **Homebrew/pnpm/npm cleanup phases** as optional extensions.
- **SwiftBar plugin variant** for live menu-bar disk-free indicator.
- **Disk-pressure trigger via `fs_usage`** — current launchd is interval-based; an event-driven trigger fires only when df % crosses a threshold.
- **Notification action buttons** via `terminal-notifier` so the daily update banner can deep-link to GitHub Releases on click.
- **`xcc completion`** — bash/zsh/fish tab-completion generation.
