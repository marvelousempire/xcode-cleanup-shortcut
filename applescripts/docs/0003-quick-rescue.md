# 0003 — Quick Rescue

**File:** [`applescripts/quick-rescue.applescript`](../quick-rescue.applescript)
**Status:** ✅ Shipped in v0.26.0
**Type:** Cleanup + emergency recovery

## What it does

A one-tap version of the Emergency Rescue panel. Runs the same 5 cleanup commands (DerivedData, iOS DeviceSupport, mediaanalysisd, DocumentationIndex, Docker prune) in sequence, with a native macOS progress bar updating the description after each phase.

After completion, surfaces both a **system notification** (lives in Notification Center) and a **confirmation dialog** showing total freed GB. Both summaries appear because Do Not Disturb sometimes swallows notifications silently — the alert is the fallback that always renders.

The script first shows a `display alert` confirmation with the full list of what's about to run and the cost-to-rebuild text. No surprises — you see exactly what's going to happen before clicking.

## The moment that prompted it

The Emergency Rescue panel inside DustPan's web dashboard already does this — but to use it, you have to open the dashboard. When the disk is at zero, sometimes even opening the dashboard is friction (Vite needs scratch space for caches; Safari might be slow to open the localhost URL).

Quick Rescue is the **zero-app version**: bind it to ⌥⌘R via Shortcuts, hit the hotkey, see the native macOS progress sheet, get a notification when it's done. No window-management, no waiting for the dashboard to load, no DustPan UI needs to be running.

It's also the bind point for SwiftBar-based menu-bar widgets and Stream Deck buttons. The cleanup engine should always be one click away, regardless of which surface you're in.

## Native macOS UI patterns used

- **`display alert ... as warning`** — the confirmation alert. `as warning` gives it the yellow `!` icon (vs `as critical` red `⨯` or default blue ℹ). Right tone for "are you sure?" without being alarming.
- **`progress total steps to 5` / `progress completed steps to N`** — determinate progress bar that fills in 20% per phase. The native progress sheet shows phase X of 5 along with the description.
- **`progress additional description`** — updates the secondary line of the progress sheet after each phase. The user sees `"② Clearing Xcode iOS Device Debug Files…"` while phase 2 runs.
- **`display notification ... sound name "Glass"`** — Apple's "completion" sound. Reserved for success states.
- **`display alert "✅ Quick Rescue complete"`** — the fallback alert that always shows freed GB even if the notification got dropped.

See [`snippets/native-progress-bar.md`](../snippets/native-progress-bar.md) for the pattern in isolation.

## The full script

See [`applescripts/quick-rescue.applescript`](../quick-rescue.applescript). ~70 lines + 2 helpers (`freeBytes`, `round1`).

The script captures `freeBytes()` before and after the cleanup phases, computes the delta in GB, rounds to 1 decimal, and includes it in both the notification subtitle and the final alert message.

## How to invoke

```bash
# Direct
osascript applescripts/quick-rescue.applescript

# As a Shortcut (recommended) — bind to ⌥⌘R for one-tap emergency recovery.
# In Shortcuts.app: New Shortcut → Run AppleScript → paste the script body
# → File → Save → assign keyboard shortcut.

# From show-disk-status's "Run Quick Rescue" button — that script invokes
# this one in a detached process.
```

## Variations / extensions

- **Selective phases.** Add a `choose from list with multiple selections allowed` step so the user can untick phases they don't want to run. Useful for power users who know they always want DerivedData cleared but never want Docker prune.
- **Dry-run version.** Same UX flow but each phase prints the size that *would* be freed without actually deleting. Bind to a separate Shortcut for the curious-but-cautious flow.
- **Speak progress.** `say "Phase 1 complete"` between phases for accessibility / voice-mode.
- **Auto-skip Docker silently** if Docker isn't installed (currently the script just lets the shell `command -v docker` check fail silently, but the progress description still flashes "⑤ Pruning Docker…" briefly).
- **Per-Mac threshold.** If `free_gb > 50` going in, prompt with `"Your disk is already healthy — run anyway?"` to discourage habit-cleanup that produces no benefit.

## Related

- [Plan 0021 — Emergency Rescue panel](../../plans/0021-emergency-rescue-panel.md) — the web-dashboard version of this same flow
- [show-disk-status.applescript](../show-disk-status.applescript) — the sibling diagnostic that can launch Quick Rescue from its "Run Quick Rescue" button
- [snippets/native-progress-bar.md](../snippets/native-progress-bar.md) — the progress block in isolation
