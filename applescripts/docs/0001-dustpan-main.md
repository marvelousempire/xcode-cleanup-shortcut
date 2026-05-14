# 0001 — DustPan main cleanup

**File:** [`/dustpan.applescript`](../../dustpan.applescript) (lives at repo root, not inside `applescripts/`)
**Status:** ✅ Shipped in v0.1.0 — present in every release since
**Type:** Cleanup
**Version it tracks:** the canonical app version (`property kVersion`)

## What it does

The original DustPan script. A single AppleScript that wipes the well-known Xcode and developer caches in 4 phases:

1. **Phase 1** — Xcode DerivedData + iOS / watchOS / tvOS DeviceSupport + `~/Library/Caches/com.apple.dt.Xcode`
2. **Phase 2** — SwiftPM caches in `~/Library/Caches/org.swift.swiftpm` + `~/Library/org.swift.swiftpm`
3. **Phase 3** — CoreSimulator caches + `xcrun simctl delete unavailable` to remove dormant simulator runtimes
4. **Phase 4** — `/tmp` orphan globs (configurable via `DUSTPAN_TMP_PATTERNS`)

Each phase updates a native macOS progress bar so the user sees what's happening. The script never touches Xcode Archives (they hold crash symbolication data for shipped App Store builds — irreplaceable).

## The moment that prompted it

The author had been Googling "which Xcode paths are safe to delete" every couple of months for years. On one of those occasions, while running a hand-typed `rm -rf` fast, the wrong path took out `~/Library/Developer/Xcode/Archives`. The shipped App Store builds lost crash symbolication for every report from production users. Tuesday afternoon, irreversible, painful.

The PRD problem statement is short: *"This is friction that should be a button."*

## Native macOS UI patterns used

- **`display alert ... buttons {"Cancel", "Run"}`** — the confirmation dialog at the top. Default button is Run; cancel button is Cancel; cancellation throws the standard AppleScript "user canceled" error which exits cleanly.
- **`progress total steps`, `progress completed steps`, `progress description`, `progress additional description`** — the 4-phase progress bar with per-phase updates. Apple's preferred long-operation pattern; renders as a system-style progress sheet attached to AppleScript Editor / Script menu / Shortcuts.
- **`display notification ... with title ... sound name "Glass"`** — the success notification at the end. Honors macOS Do Not Disturb settings.
- **`display alert ... as critical`** — used for error states.
- **`do shell script "..."`** — to invoke `rm -rf`, `du`, `xcrun simctl`. Each is a one-liner with `2>/dev/null; true` so a single permission-denied error doesn't halt the whole phase.

See [`snippets/native-confirmation.md`](../snippets/native-confirmation.md), [`snippets/native-progress-bar.md`](../snippets/native-progress-bar.md), and [`snippets/native-notification.md`](../snippets/native-notification.md) for the reusable patterns lifted from this script.

## The full script

Lives at the repo root as `/dustpan.applescript` (250+ lines — too long to inline here). Read it directly; every phase is commented and the env-var contract is documented at the top of the file.

Key sections:
- Lines 1–30: Header comment + env-var contract (`DUSTPAN_DRY_RUN`, `DUSTPAN_DEMO`, `DUSTPAN_FORCE`, `DUSTPAN_AUTO_CONFIRM`, `DUSTPAN_TMP_PATTERNS`, `DUSTPAN_NO_UPDATE_CHECK`)
- Lines 32–80: `property` block — `kVersion`, `kRepo`, threshold + path constants
- Lines 82–180: `on run` — flag parsing, threshold check, confirmation alert, phase dispatch
- Lines 182–250: Phase implementations + helpers (`isFlag`, `freeBytes`, dialog formatters)

## How to invoke

```bash
# From the repo
osascript dustpan.applescript

# Dry run — measure what would be freed, delete nothing
DUSTPAN_DRY_RUN=1 osascript dustpan.applescript

# Force-run even if disk is healthy (skips the 50 GB threshold gate)
DUSTPAN_FORCE=1 osascript dustpan.applescript

# Or via the `xcc` CLI wrapper:
xcc --dry-run
xcc --force
xcc --version
```

Also installed as a Shortcut (menu bar + hotkey), launchd agent (hourly), and SwiftBar menu-bar widget — all four invoke this same AppleScript.

## Variations / extensions

- **Per-phase opt-out via env var.** Currently the script runs all 4 phases (subject to the threshold gate). A `DUSTPAN_SKIP_PHASE_3=1` style env var could let users disable a phase. Tracked in the wishlist; not urgent because the web dashboard exposes this with finer granularity.
- **macOS Sonoma + Tahoe `system events`-driven progress.** Apple has been incrementally migrating AppleScript dialogs to be more Aqua-native. Worth re-testing the progress bar UI on every macOS release.
- **Localized strings.** Currently English-only. AppleScript supports stringsdict files.

## Related

- [SHORTCUTS.md](../../docs/SHORTCUTS.md) — how the script is wrapped as a Shortcut for menu-bar / hotkey invocation
- [Plan 0001 — Cleanup Hub v1 redesign](../../plans/0001-cleanup-hub-v1-redesign.md) — the redesign that added the web dashboard on top of this script
- [bin/xcc](../../bin/xcc) — the bash CLI wrapper that invokes this script with the right env vars
- [launchd/com.marvelousempire.dustpan.plist](../../launchd/com.marvelousempire.dustpan.plist) — the hourly agent that invokes this script
