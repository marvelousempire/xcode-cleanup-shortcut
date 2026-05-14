# ⏳ Native progress bar

The macOS-style progress sheet for long-running operations. Apple's preferred pattern when an operation will take more than 2–3 seconds.

## The pattern (determinate — when you know the step count)

```applescript
set progress total steps to 5
set progress completed steps to 0
set progress description to "DustPan Cleanup"
set progress additional description to "Starting…"

-- Phase 1
set progress additional description to "① Clearing Xcode DerivedData…"
do shell script "rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null; true"
set progress completed steps to 1

-- Phase 2
set progress additional description to "② Clearing iOS Device Debug Files…"
do shell script "rm -rf ~/Library/Developer/Xcode/'iOS DeviceSupport'/* 2>/dev/null; true"
set progress completed steps to 2

-- … etc up to total steps
```

## The pattern (indeterminate — when you don't know how long)

```applescript
set progress total steps to -1   -- the "-1" means indeterminate
set progress description to "Scanning…"
set progress additional description to "Walking the filesystem"

do shell script "long-running-thing-that-takes-unknown-time"

-- When done, just stop setting progress and the sheet auto-dismisses
```

`total steps to -1` shows the marching-ants animation (Apple's "I'm doing something, I just can't tell you when it'll finish" idiom).

## What each property does

| Property | Renders as |
|---|---|
| `progress description` | The bold first line of the progress sheet. **Stays constant for the whole operation** — this is the operation's name. |
| `progress additional description` | The second line in lighter weight. **Update this per phase** — this is the "currently doing X". |
| `progress total steps` | The total — set once. Use `-1` for indeterminate. |
| `progress completed steps` | The current count. Update after each phase completes. |

## Critical rules

1. **Always set `progress description` BEFORE the first `do shell script` call.** If you set it after, the system shows a generic "Running script" header for the first phase.
2. **Update `additional description` BEFORE the operation, not after.** The user wants to see "Clearing X…" while X is happening, not after it's done.
3. **Don't `delay` to make the progress bar look busy.** If a phase finishes in 50ms, just let the bar jump. Faking slowness is condescending.
4. **`total steps = -1` overrides `completed steps`.** Once you go indeterminate, the bar shows marching ants regardless of `completed steps`.

## Hybrid pattern (determinate with sub-progress)

If a single phase has multiple internal steps that you can detect:

```applescript
set progress total steps to 100
set progress completed steps to 0
set progress description to "Cleaning"

-- Phase 1 — 0–40%
set progress additional description to "Phase 1: Xcode caches"
do shell script "rm -rf ~/Library/Developer/Xcode/DerivedData/*"
set progress completed steps to 40

-- Phase 2 — 40–70%
set progress additional description to "Phase 2: SwiftPM caches"
do shell script "rm -rf ~/Library/Caches/org.swift.swiftpm"
set progress completed steps to 70

-- Phase 3 — 70–100%
set progress additional description to "Phase 3: Simulators"
do shell script "xcrun simctl delete unavailable"
set progress completed steps to 100
```

Use a total of 100 and treat percentages as steps. Better for non-uniform phase durations than `total = 3` because the bar moves smoothly.

## What this looks like to the user

```
┌─────────────────────────────────────┐
│ DustPan Cleanup                     │  ← progress description (bold)
│ ② Clearing iOS Device Debug Files…  │  ← additional description
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░  40%           │  ← bar based on completed/total
│                       [ Stop ]      │  ← built-in cancel button
└─────────────────────────────────────┘
```

The user gets a Stop button for free. If they click it, the script receives an error you can catch with `try`.

## Don't do this

```applescript
-- ❌ Streaming output to Terminal:
do shell script "echo '① Phase 1…'"
do shell script "rm -rf ~/Library/Developer/Xcode/DerivedData/*"
do shell script "echo '② Phase 2…'"

-- ❌ Updating description AFTER the operation (user sees it once it's already done):
do shell script "rm -rf …"
set progress additional description to "Phase 1 done"

-- ❌ Mixing display dialog inside a progress block (confuses the system progress sheet):
set progress description to "Cleaning"
display dialog "Wait for me!"  -- breaks the modal stack
```

## See also

- [`snippets/native-confirmation.md`](./native-confirmation.md) — confirmation alert that runs *before* the progress block
- [`snippets/native-notification.md`](./native-notification.md) — completion notification that fires *after* the progress block
- [`applescripts/quick-rescue.applescript`](../quick-rescue.applescript) — 5-phase determinate progress example
- [`/dustpan.applescript`](../../dustpan.applescript) — the main 4-phase cleanup example
