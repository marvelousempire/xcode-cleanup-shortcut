---
name: 0005-quick-rescue-dry-run
id: DS-0005
hash: c0964d4
keywords: [measure-space, preview-cleanup, check-savings]
relations: []
before: []
governed_by: [global]
meta: dynamic
---

# 0005 — Quick Rescue (Dry Run)

**File:** [`applescripts/quick-rescue-dry-run.applescript`](../quick-rescue-dry-run.applescript)
**Status:** ✅ Shipped in v0.27.0
**Type:** Diagnostic + measurement

## What it does

The "what would I get back" version of [Quick Rescue](./0003-quick-rescue.md). Same UX shape — confirmation alert → native progress bar → completion alert — but every phase only **measures** the target with `du -sh`. Nothing is deleted.

Designed to live next to the real Quick Rescue with a separate hotkey binding. Audit first, commit second.

## The moment that prompted it

The real Quick Rescue's confirmation alert tells you which paths will be cleaned and what rebuilds, but it doesn't tell you how much you'd actually get back this minute on this Mac. Sometimes the answer is 12 GB (worth it!); sometimes it's 800 MB (skip it, do real work instead). Without a measurement step you have to guess.

Dry Run answers the question without committing. Pair the two on adjacent hotkeys (e.g. ⌥⌘R for real, ⌥⌘D for dry-run) and the workflow becomes: hit D, see if it's worth it, hit R if yes.

## Cost to the user

None. This script is read-only. Just runs `du -sh` and `docker system df`.

## Native macOS UI patterns used

- **`display alert ... as warning` / cancel button** — the confirmation prompt. Cancel exits cleanly via the `cancel button` parameter.
- **`progress total steps to 5` + per-phase `additional description`** — same determinate progress as the real Quick Rescue so the muscle memory transfers.
- **`display alert "Quick Rescue — Dry Run complete"`** — single multi-line completion alert with all five measurements. No notification (the user is in front of the screen looking for the number; the alert is the right level).
- **`do shell script "du -sh ..."`** — measurement primitive. Wrapped in `try` for paths that don't exist.

See [`snippets/native-progress-bar.md`](../snippets/native-progress-bar.md), [`snippets/native-confirmation.md`](../snippets/native-confirmation.md).

## The full script

See [`applescripts/quick-rescue-dry-run.applescript`](../quick-rescue-dry-run.applescript). ~80 lines, one helper (`measure`).

## How to invoke

```bash
# Direct
osascript applescripts/quick-rescue-dry-run.applescript

# As a Shortcut — recommend binding to ⌥⌘D (D for dry-run) alongside
# Quick Rescue on ⌥⌘R. Hit D first, decide, then hit R if yes.

# After `make install-applescripts`, this also appears in Shortcuts.app's
# "Run AppleScript" picker.
```

## Variations / extensions

- **Add the worktree + node_modules discovery** (from Space Survey) — would give a fuller "what could you reclaim right now" picture beyond the 5 emergency paths.
- **Threshold-gated nag.** Add a config so when measured-recoverable > N GB, the alert offers a [Run Now] button that launches the real Quick Rescue inline.
- **CSV log of dry-run results.** Append to `~/Library/Logs/dustpan-dry-runs.csv` for trend analysis.

## Related

- [Quick Rescue (the real one)](./0003-quick-rescue.md) — the script this one previews
- [Plan 0021 — Emergency Rescue panel](../../plans/0021-emergency-rescue-panel.md) — the web-dashboard version of both
