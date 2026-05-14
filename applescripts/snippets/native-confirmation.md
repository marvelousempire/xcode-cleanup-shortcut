# 📋 Native confirmation dialog

The Mac-style "Are you sure?" pattern. Used at the top of any script that performs a destructive or significant action.

## The pattern

```applescript
set confirmResult to display alert "Your title here" ¬
    message "Multi-line message body explaining what's about to happen and what it costs the user." ¬
    buttons {"Cancel", "Run the thing"} ¬
    default button "Run the thing" ¬
    cancel button "Cancel" ¬
    as warning

if button returned of confirmResult is "Cancel" then return
```

## What each parameter does

| Parameter | Why |
|---|---|
| `display alert` (not `display dialog`) | `alert` is the macOS "modal sheet with icon" style — feels native for Yes/No decisions. `dialog` is for free-form text input. |
| `message "..."` | The body text. Supports `return` for line breaks. Keep under ~6 lines for readability. |
| `buttons {"Cancel", "Run the thing"}` | The button labels. **Order matters**: in macOS HIG, the destructive / cancelling button goes on the left, the affirmative on the right. AppleScript renders them in this order. |
| `default button "Run the thing"` | Highlighted blue, fires on ⏎. |
| `cancel button "Cancel"` | Fires on ⎋. AppleScript automatically generates a "user canceled" error you can catch with `try`. |
| `as warning` | Icon style. **`as critical`** = red ⨯ (irreversible / dangerous), **`as warning`** = yellow ⚠ (significant but recoverable), **omit it entirely** = blue ℹ (informational). |

## Tone guidance for the buttons

- ✅ **Good:** `{"Cancel", "Clean DerivedData"}` — verb makes the action concrete
- ❌ **Bad:** `{"No", "Yes"}` — leaves the user re-reading the message to confirm what they're agreeing to
- ❌ **Bad:** `{"OK", "Cancel"}` — same problem; "OK" is meaningless out of context

The principle: **read just the button label and know what it does**.

## When to use which icon style

| Icon | When |
|---|---|
| (none, blue ℹ) | Showing a result. "Disk is healthy", "Operation complete", "Found 3 things". |
| `as warning` | About to do something significant but recoverable. "Clean cache?", "Submit form?", "Restart service?". |
| `as critical` | About to do something irreversible. "Delete account data permanently?", "Reformat drive?", "Force-quit unsaved work?". |

## With Cancel button error handling (alternative pattern)

If you want to silently exit on Cancel without an explicit `if` branch:

```applescript
try
    display alert "Title" message "Body" ¬
        buttons {"Cancel", "Continue"} ¬
        default button "Continue" ¬
        cancel button "Cancel"
on error number -128
    return  -- user clicked Cancel or pressed Esc
end try

-- continue with the operation
```

Error number `-128` is AppleScript's "user canceled" signal. Useful when you want a single early-return without nested ifs.

## Don't do this

```applescript
-- ❌ Dev-looking output:
do shell script "echo 'Are you sure? (y/n)'"

-- ❌ Plain dialog with vague buttons:
display dialog "Continue?" buttons {"No", "Yes"}

-- ❌ Critical icon for routine actions:
display alert "Clean Xcode cache?" as critical
-- (Xcode cache is reversible — `as warning` is right; `critical` cries wolf)
```

## See also

- [`snippets/native-progress-bar.md`](./native-progress-bar.md) — the progress block that runs *after* the user clicks the affirmative button
- [`snippets/native-notification.md`](./native-notification.md) — the success notification at the end
- [`applescripts/quick-rescue.applescript`](../quick-rescue.applescript) — production example using this pattern
