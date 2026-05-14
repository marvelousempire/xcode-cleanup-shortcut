# 0004 — Show Locked Space (foreign-ownership recovery)

**File:** [`applescripts/show-locked-space.applescript`](../show-locked-space.applescript)
**Status:** ✅ Shipped in v0.26.0
**Type:** Diagnostic + recovery
**Related plan:** [0024 — foreign-ownership discovery](../../plans/0024-foreign-ownership-discovery.md)

## What it does

A standalone native AppleScript wrapper around DustPan's foreign-ownership scanner. Walks `/opt/homebrew`, `/usr/local/Homebrew`, and every `/Users/<name>/` looking for paths owned by accounts other than your current login.

When it finds locked space, it shows a native dialog summarising the findings, then lets you pick one with `choose from list` and shows the exact `sudo chown -R $(whoami) <path>` command. Three buttons on the command screen:

- **Done** — closes the dialog
- **Copy to Clipboard** — copies the command + shows a "Command copied — paste it into Terminal" notification
- **Open Terminal** — copies the command AND opens Terminal.app so you can paste with ⌘V immediately

**This script never runs sudo.** macOS's password prompt is the correct consent gate for a permanent ownership change. DustPan's job is finding the locked space and handing you the exact command.

## The moment that prompted it

The user reported this on a Mac that had been migrated from a previous owner ('olivia'). `/opt/homebrew` was owned by `olivia`, so `brew install` was failing under the new account — 12 GB of Homebrew packages were invisible to the current user.

DustPan's web dashboard finds this via the Space Survey panel (plan 0024). But the user wanted a **one-tap version** they could bind to a Shortcut for quick "is anything locked right now?" checks — without opening the full dashboard.

This script is also the test case for `choose from list` as a native picker pattern. Most AppleScript tutorials show only `display dialog`; `choose from list` is the right pattern when the options come from runtime data (filesystem scans, API responses) rather than a hardcoded list.

## Native macOS UI patterns used

- **`progress total steps to -1`** — indeterminate progress bar (the marching-ants style) while the `du -sh` scans run. Used when you can't predict how many steps the operation will take.
- **`display alert "✅ Nothing locked"`** — the happy-path early exit when no foreign-owned paths are found.
- **`display dialog ... with title ... with icon caution`** — the findings summary. `with icon caution` (vs `note`) signals "important but not destructive."
- **`choose from list ... with prompt ... OK button name "Show command"`** — the native multiple-choice picker. Custom button names make the action verbs concrete ("Show command" vs "OK").
- **`display dialog ... default answer cmdString`** — the trick to make a multi-line command **selectable and copyable** inside a dialog. Plain `display dialog` text isn't selectable; `default answer` populates a text field that is.
- **`set the clipboard to ...`** — native clipboard write. Followed immediately by a system notification to confirm the copy succeeded.
- **`tell application "Terminal" to activate`** — the "Open Terminal" button focuses Terminal.app so the user can paste with ⌘V without window-switching.

See [`snippets/native-clipboard-copy.md`](../snippets/native-clipboard-copy.md) for the copy-with-confirmation pattern.

## The full script

See [`applescripts/show-locked-space.applescript`](../show-locked-space.applescript). ~95 lines.

The findings format is `|<label>|<size>|<command>` triples joined by `|`. Splitting on `|` and iterating in groups of 3 is the dumb-but-reliable approach for AppleScript string parsing (no JSON parser in the stdlib).

## How to invoke

```bash
# Direct
osascript applescripts/show-locked-space.applescript

# As a Shortcut — bind to ⌥⌘L for "is anything locked?"

# From SwiftBar — drop a stub plugin that runs this on click; the badge can
# show a 🔒 icon when foreign-owned paths are detected.
```

## Variations / extensions

- **Background daily check.** Run this script as a launchd agent once a day. If new locked-space is detected (e.g. someone shared the Mac yesterday), surface a notification. Currently the user has to actively check.
- **Delete-vs-takeover dialog.** For old `/Users/<name>/` homes, the script could show *both* options (delete vs chown) with `choose from list`, so the user can pick "remove the data" without seeing the chown command at all.
- **Bulk takeover.** Show all findings and let the user multi-select with `choose from list with multiple selections allowed`; generate a single shell snippet that chowns all selected paths in one go.
- **Stale-account audit.** Run `dscl . list /Users` and cross-reference findings to surface "user X has been deleted but their files are still here" with even louder warnings.
- **Pre-flight permission probe.** Use `try`/`on error` around the `du -sh` calls to detect cases where macOS's Full Disk Access permission is needed (some `/Users/` entries can't be measured without it).

## Related

- [Plan 0024 — Foreign-ownership discovery](../../plans/0024-foreign-ownership-discovery.md) — the web-dashboard version with the live SurveyPanel section
- [DustPan's Emergency Rescue panel](../../docs/marketing/emergency-rescue.md) — also surfaces these commands but inside the in-app terminal
- [docs/marketing/locked-space-recovery.md](../../docs/marketing/locked-space-recovery.md) — the marketing brief on this feature pillar
