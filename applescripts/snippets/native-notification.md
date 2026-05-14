# 🔔 Native system notification

The macOS Notification Center toast. Used at the end of an operation to surface the result without forcing the user to acknowledge a dialog.

## The pattern

```applescript
display notification "Freed 6.4 GB of disk space." ¬
    with title "DustPan" ¬
    subtitle "Quick Rescue complete" ¬
    sound name "Glass"
```

What the user sees: a banner slides in from the top-right of the screen, lives in Notification Center afterwards, honors Do Not Disturb settings.

## What each parameter does

| Parameter | Role |
|---|---|
| `display notification "..."` | The body text. Shows in regular weight under the title. Keep it short — 60 chars max for the front-and-center banner. |
| `with title "..."` | Bold first line. Use your app's name (e.g. `"DustPan"`). |
| `subtitle "..."` | Optional middle line in slightly lighter weight. Use for a status keyword (e.g. `"Quick Rescue complete"`, `"Failed"`, `"Saved"`). |
| `sound name "..."` | Plays a system sound. See the sound name table below. |

## Sound name reference

System sounds live at `/System/Library/Sounds/`. The names AppleScript expects are the filenames without extension:

| Sound | When to use |
|---|---|
| `"Glass"` | ✅ Success / completion. The most pleasing sound — reserved for happy outcomes. |
| `"Funk"` | ℹ Informational / neutral. Use when the result is "fine, here's the info." |
| `"Pop"` | Quick acknowledgment. Use for short toasts that don't deserve full Glass. |
| `"Hero"` | Major accomplishment. Use sparingly — feels grand. |
| `"Submarine"` | Earnest "incoming message" sound. Use for "your action is needed." |
| `"Blow"` / `"Bottle"` / `"Frog"` / `"Morse"` / `"Ping"` / `"Purr"` / `"Sosumi"` / `"Tink"` | Style variations — Apple's mid-2000s sound library, still present in modern macOS. |
| (omit) | Silent notification. Good for chatty / repeating events that shouldn't sound off every time. |

If you want consistency: **Glass for success, Funk for info, no sound for noisy events**.

## When NOT to use a notification

- **When the user needs to acknowledge it.** Notifications can be silently dismissed by Do Not Disturb, Focus Mode, or just being missed because the user is in another app. If the result requires action, use a `display alert` instead (or in addition).
- **For multi-line content.** Notifications are one-line max. For multi-line summaries, use `display alert`.
- **For things the user is actively waiting on.** If they just clicked your button, they're looking at the screen. A `display alert` is more deliberate.

## Belt-and-suspenders pattern (recommended for important results)

```applescript
-- Notification first — lightweight, fast, dismissable
display notification "Freed 6.4 GB" ¬
    with title "DustPan — Quick Rescue done" ¬
    subtitle "6.4 GB recovered" ¬
    sound name "Glass"

-- Then a confirmation alert — slower but guaranteed to render
display alert "✅ Quick Rescue complete" ¬
    message "Freed 6.4 GB of disk space." & return & return & ¬
        "You now have 13.5 GB free on /." ¬
    buttons {"Done"} ¬
    default button "Done"
```

This is the pattern in [`quick-rescue.applescript`](../quick-rescue.applescript). The notification is the fast feedback; the alert is the guaranteed-render fallback.

## Permissions

The first time your script runs `display notification`, macOS asks the user to grant notification permission. The grant is per-script-bundle, so:

- Running from Terminal: granted to Terminal.app
- Running from Shortcuts: granted to Shortcuts.app
- Running from a saved `.app`: granted to that specific bundle

If the user denies, subsequent `display notification` calls silently no-op. **This is the main reason for the belt-and-suspenders pattern** — your alert dialog still renders even if notification permission was denied.

## Don't do this

```applescript
-- ❌ Notification for "you must confirm" content (gets missed)
display notification "Click OK to confirm deletion" with title "DustPan"

-- ❌ Multi-line notification (only the first line shows)
display notification "Freed 6.4 GB" & return & "Cleaned 5 folders" & return & "Took 4 seconds"

-- ❌ Notification + sound for a noisy / repeating event
repeat 100 times
    display notification "Step done" sound name "Glass"  -- soundscape from hell
end repeat
```

## See also

- [`snippets/native-confirmation.md`](./native-confirmation.md) — confirmation alert at the start
- [`snippets/native-progress-bar.md`](./native-progress-bar.md) — progress bar between confirmation and notification
- [`applescripts/quick-rescue.applescript`](../quick-rescue.applescript) — belt-and-suspenders production example
