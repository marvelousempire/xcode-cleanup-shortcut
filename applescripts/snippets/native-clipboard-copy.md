# 📋 Native clipboard copy with feedback

The "Copy to Clipboard" button pattern. Used when you want to hand the user a string (command, URL, hash) so they can paste it elsewhere.

## The pattern

```applescript
set commandToShow to "sudo chown -R $(whoami) /opt/homebrew"

set userChoice to display dialog "Run this in Terminal:" ¬
    with title "DustPan — Takeover command" ¬
    default answer commandToShow ¬
    buttons {"Done", "Copy to Clipboard", "Open Terminal"} ¬
    default button "Copy to Clipboard"

if button returned of userChoice is "Copy to Clipboard" then
    set the clipboard to commandToShow
    display notification "Paste it into Terminal — macOS will prompt for your Mac password." ¬
        with title "DustPan — Command copied" ¬
        subtitle "Ready to paste" ¬
        sound name "Glass"
else if button returned of userChoice is "Open Terminal" then
    set the clipboard to commandToShow
    tell application "Terminal" to activate
    display notification "Command on your clipboard. Paste with ⌘V." ¬
        with title "DustPan — Terminal opened" ¬
        sound name "Glass"
end if
```

## The trick: `default answer` makes the text selectable

Plain `display dialog "..."` content is **not selectable** — the user can't drag-select it or copy it manually. The workaround: put the string you want them to see into the `default answer` parameter. AppleScript renders that as a text input field, which IS selectable and copyable. Just don't read `text returned` if you only wanted to display, not collect.

```applescript
-- ❌ Not selectable — user has to remember the string
display dialog "Run: sudo chown -R $(whoami) /opt/homebrew" buttons {"OK"}

-- ✅ Selectable — user can drag-select or ⌘A then ⌘C manually
display dialog "Run this in Terminal:" default answer "sudo chown -R $(whoami) /opt/homebrew" buttons {"OK"}
```

## The clipboard API

| AppleScript | What it does |
|---|---|
| `set the clipboard to "..."` | Writes the string to the macOS clipboard. Overwrites whatever was there. |
| `the clipboard as text` | Reads the current clipboard contents. |
| `the clipboard as «class furl»` | Reads as a file URL (for clipboards containing copied files). |
| `clipboard info` | Returns the available types — useful for "is the clipboard a string?" checks. |

For our use case (writing only), `set the clipboard to ...` is all you need.

## The "Open Terminal" power-button pattern

Pairing **Copy to Clipboard** with **Open Terminal** is great UX for ssh / sudo / shell snippets:

```applescript
buttons {"Done", "Copy to Clipboard", "Open Terminal"}
```

When clicked, the latter:
1. Copies the command to the clipboard
2. Activates Terminal.app (existing window if one's open, new window if not)
3. User pastes with ⌘V and presses ⏎ — total interaction is one click + ⌘V + ⏎

This is the pattern used in [`show-locked-space.applescript`](../show-locked-space.applescript). Especially valuable for sudo commands where you DON'T want the script to run the command itself — macOS's own password prompt is the correct consent gate.

## Belt-and-suspenders: confirm the copy succeeded

The clipboard write can silently fail in rare cases (sandboxing, focus-mode restrictions on automation). The notification after the write is your visible confirmation.

```applescript
set the clipboard to commandToShow
display notification "✓ Copied to clipboard" with title "DustPan" sound name "Glass"
```

`sound name "Glass"` makes the success audible — useful for users who have notifications muted but sound on.

## Don't do this

```applescript
-- ❌ Echoing to Terminal — user has to copy from the Terminal output
do shell script "echo 'sudo chown -R $(whoami) /opt/homebrew'"

-- ❌ Showing the command in unselectable display dialog text
display dialog "Run: sudo chown -R $(whoami) /opt/homebrew" buttons {"OK"}

-- ❌ Auto-running the sudo command instead of copying it
do shell script "sudo chown -R $(whoami) /opt/homebrew" with administrator privileges
-- This bypasses the macOS password prompt that protects irreversible operations.
-- DustPan deliberately never does this.
```

## See also

- [`applescripts/show-locked-space.applescript`](../show-locked-space.applescript) — production example with Done / Copy / Open Terminal pattern
- [`docs/marketing/locked-space-recovery.md`](../../docs/marketing/locked-space-recovery.md) — the broader UX rationale for "show the command, never run it"
