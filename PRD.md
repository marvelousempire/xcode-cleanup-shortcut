# Xcode Cleanup Shortcut — PRD

**Status:** Live (v0.1)
**Owner:** marvelousempire
**Last updated:** 2026-05-08

## Problem

Active iOS developers running Xcode see their boot drive fill up by 20–60 GB over a few weeks of normal work. The disk pressure surfaces as failed builds, full simulators, slow Spotlight, and macOS warning banners. The fix — `rm -rf` of well-known cache directories — is well documented but tedious to remember and run.

The current state of the user's workflow:
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

## Non-Goals

- Not a general macOS cleaner (no Trash, no Mail downloads, no browser caches).
- Not a real Mac app. Shortcuts + AppleScript is the deliberate ceiling.
- Not a multi-user / shared system tool. Personal dev machine only.
- Not for CI. Build agents have their own ephemeral filesystems.

## Users

**Primary:** the repo owner — a working iOS/macOS developer who runs Xcode daily and has 60+ git worktrees on disk.

**Secondary:** any iOS dev who clones the repo. The script is parameterized only via the `/tmp` orphan patterns, which are project-specific (currently `redeplay-*`, `RedEPlay-*`, `sweep.mov.sb-*`, etc.); other users edit those globs to match their own scratch patterns or remove that phase entirely.

## Functional requirements

| ID | Requirement |
|---|---|
| F1 | Read current root-volume free space before any action. |
| F2 | If free space > 50 GB, exit with a non-blocking notification. No prompts. |
| F3 | Otherwise, present a modal `display alert` with current free GB, action description, and Cancel/Run buttons. Default button is Run. |
| F4 | On Run, advance a 4-step AppleScript progress bar with per-phase `additional description`. |
| F5 | Phase 1: clear `~/Library/Developer/Xcode/DerivedData`, `iOS DeviceSupport`, `watchOS DeviceSupport`, `tvOS DeviceSupport`, `~/Library/Caches/com.apple.dt.Xcode`. |
| F6 | Phase 2: clear SwiftPM caches in `~/Library/Caches/org.swift.swiftpm` and `~/Library/org.swift.swiftpm`. |
| F7 | Phase 3: clear CoreSimulator caches and run `xcrun simctl delete unavailable`. |
| F8 | Phase 4: remove project-scratch `/private/tmp` orphans matching configured globs. |
| F9 | Re-measure free space and compute GB freed. |
| F10 | Show final `display notification` with freed GB and new free space. Sound: Glass. |

## Non-functional requirements

| ID | Requirement |
|---|---|
| N1 | Total wall time on a fully primed cache: < 60 seconds typical, < 5 minutes worst case. |
| N2 | Survives missing target dirs without failing the run (each phase appends `; true`). |
| N3 | Survives Focus / Do Not Disturb — script completes silently if banners are suppressed. |
| N4 | No `sudo`. All paths are user-owned. |
| N5 | No external dependencies beyond `xcrun` (ships with Xcode CLT) and BSD `df`/`awk`/`rm`. |
| N6 | Compatible with macOS 14+ on Apple Silicon. |

## Success metrics

- **GB reclaimed per invocation** (read from the final notification text). Healthy range: 5–25 GB.
- **Time to invocation** — should be < 5 seconds from "I notice low disk" to "cleanup running" via menu bar or hotkey.
- **False-positive rate** — number of times the user runs it and gets "no action needed" because the threshold check caught it. Higher = good (means the threshold is doing its job).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Running while `xcodebuild` has DerivedData open → partial deletion errors. | `rm -rf` continues past locked paths; `; true` swallows the exit code. Re-run after build finishes. |
| User accidentally deletes simulator state they care about. | Phase 3 only targets `Caches/` and unavailable runtimes. Active simulators are untouched. |
| Threshold (50 GB) is wrong for users with smaller drives. | Easy to edit one constant in the script. Documented in README. |
| `/tmp` orphan patterns hit something user wanted. | Patterns are explicit globs, never `/private/tmp/*`. Documented in README to customize. |
| AppleScript Automation permission denied. | First-run macOS prompt; if missed, README points to System Settings → Privacy & Security → Automation. |

## Open questions

- Should the threshold be a percentage of disk size instead of absolute GB? Argument for: portable across drive sizes. Argument against: 50 GB is a reasonable absolute floor for an active dev machine regardless.
- Should we ship a prebuilt `.shortcut` file? Argument for: zero-paste install. Argument against: `.shortcut` bundles are signed iCloud exports tied to the original creator; contributors can't easily edit them.
- Add a "dry run" mode that lists what would be deleted? Probably yes, as `--dry-run` env var. Deferred to v0.2.

## Future work (v0.2+)

- **Dry-run mode** behind an env var.
- **Per-phase opt-out toggles** as Shortcuts variables (skip Phase 3 if you actively use simulators).
- **History log** — append each run's freed-GB to `~/Library/Logs/xcode-cleanup.log` for trend analysis.
- **Homebrew/pnpm/npm cleanup phases** as optional extensions.
- **SwiftBar plugin variant** for live menu-bar disk-free indicator.
