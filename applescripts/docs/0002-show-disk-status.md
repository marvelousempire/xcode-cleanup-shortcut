---
name: 0002-show-disk-status
id: DS-0002
hash: 3f6f1a3
keywords: [show-disk, check-health, open-dashboard]
relations: []
before: []
governed_by: [global]
meta: dynamic
---

# 0002 — Show Disk Status

**File:** [`applescripts/show-disk-status.applescript`](../show-disk-status.applescript)
**Status:** ✅ Shipped in v0.26.0
**Type:** Diagnostic + UI helper

## What it does

A one-tap native macOS dialog that shows your current disk health: free / used / total, percent used, and a colour-coded status emoji (✅ / 🟡 / ⚠️ / 🚨) based on how full the disk is.

Three buttons:
- **Done** — closes the dialog
- **Run Quick Rescue** — invokes [`quick-rescue.applescript`](../quick-rescue.applescript) in a detached process, then exits this one
- **Open DustPan** — opens `http://127.0.0.1:8765` if the dashboard is running; otherwise shows a system notification telling you to start it

## The moment that prompted it

You're working in your IDE. You feel your Mac slowing down. You don't want to fire up the full DustPan dashboard just to find out *how* full your disk is — you want one-tap "tell me the number." Especially nice bound to a global hotkey via Shortcuts.app or pinned to SwiftBar.

It was also useful for testing the AppleScript library philosophy — a minimal native-UI script that demonstrates `display dialog`, `with icon note`, branching button handlers, and inter-script invocation. Reusable as a template for the next "I just want to know X right now" script.

## Native macOS UI patterns used

- **`display dialog ... with title ... buttons {...} default button ... with icon note`** — the main multi-line dialog. `with icon note` gives the standard info icon (vs `caution` for warnings or `stop` for errors).
- **`display notification ... sound name "Funk"`** — used when DustPan isn't running, to tell the user how to launch it. `sound name "Funk"` is a soft "info" sound; `"Glass"` is reserved for success.
- **`do shell script "open http://..."`** — opens a URL in the default browser. The system handles `cmd-clicking` it to open in background, etc.
- **`do shell script "osascript ... &"`** — invokes another AppleScript detached so this one can exit cleanly without waiting.
- **Conditional `display alert as warning`** — used in the error path if Quick Rescue can't launch.

## The full script

See [`applescripts/show-disk-status.applescript`](../show-disk-status.applescript). ~80 lines, two helpers (`parsePercent`, `scriptFolder`).

## How to invoke

```bash
# Direct
osascript applescripts/show-disk-status.applescript

# Via Shortcuts — create a Shortcut with one "Run AppleScript" action and
# paste the script body. Bind the Shortcut to ⌥⌘D (or anything you like).

# Via SwiftBar — drop a stub plugin that runs this on click. The script's
# native dialog appears over any active app.
```

## Variations / extensions

- **Trend arrow.** Read the last few entries from `~/Library/Logs/dustpan-history.csv` and add a `↗`, `↘`, or `→` showing whether free GB is growing or shrinking week-over-week.
- **Per-category preview.** If the DustPan dashboard is running, hit `/api/doctor` and show the top 3 quick-wins inline ("3 quickest reclaims: Xcode 6.4 GB · Cursor 2.1 GB · Docker 1.8 GB").
- **Stack Status integration.** macOS Stage Manager–friendly: the dialog persists on screen while you switch apps so you can keep an eye on the number.
- **Speak the result.** `say "You have " & diskFree & " free"` for accessibility / voice-mode workflows.

## Related

- [show-locked-space.applescript](../show-locked-space.applescript) — the sibling "let me check one thing in a native dialog" script for foreign-ownership
- [quick-rescue.applescript](../quick-rescue.applescript) — the cleanup this dialog can launch
- [snippets/native-confirmation.md](../snippets/native-confirmation.md) — the `display dialog` pattern
