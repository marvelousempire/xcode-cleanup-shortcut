# 🍎 DustPan AppleScript Library

> A curated, growable library of AppleScripts that use **native macOS UI** — display alerts, progress bars, system notifications — instead of looking like Terminal output.

Every script in this folder follows one philosophy: **if the user is going to see it, it should look like macOS, not like a dev tool**. No `echo`, no streaming logs, no monospace command output in a black box. Use `display dialog`, `display alert`, `display notification`, the AppleScript `progress` block, and `choose from list` — the same affordances Apple uses in System Settings.

## Why this library exists

DustPan's main cleanup AppleScript (`/dustpan.applescript` at the repo root) was the proof of concept: 250 lines that show a confirmation alert, run a 4-phase progress bar with real-time disk measurements, deliver a system notification when done, and never expose a Terminal window to the user.

Once we had one script doing it right, we kept reaching for the same pattern. The Emergency Rescue panel, the foreign-ownership recovery flow, the AI agent — each of these would feel more native as a one-tap AppleScript launched from Shortcuts, Stream Deck, or the menu bar.

This library gives us:

1. **A place to put new scripts** as we invent them — one `.applescript` per script, one `docs/NNNN-…md` per script with the story behind it.
2. **A snippets vault** (`snippets/`) of reusable patterns — native confirmation, progress bar, notification, file picker, secure password prompt — that any new script can lift directly.
3. **A clear way for SADPA to propose new scripts.** The AI agent has a `propose_new_applescript` tool that files proposals to a review inbox, with paste-ready code that follows the native-UI house style.
4. **Documentation that explains why each script exists** — the moment, the pain, the user need. Future contributors don't have to reverse-engineer intent from code.

## Library structure

```
applescripts/
├── README.md                       ← you are here
├── show-disk-status.applescript    ← native dialog with live disk stats
├── quick-rescue.applescript        ← progress-bar emergency cleanup
├── show-locked-space.applescript   ← foreign-ownership commands in a dialog
├── docs/
│   ├── 0001-dustpan-main.md        ← the main cleanup script (lives at repo root)
│   ├── 0002-show-disk-status.md
│   ├── 0003-quick-rescue.md
│   └── 0004-show-locked-space.md
└── snippets/
    ├── native-confirmation.md       ← display alert pattern
    ├── native-progress-bar.md       ← progress block pattern
    ├── native-notification.md       ← display notification pattern
    └── native-clipboard-copy.md     ← copy to clipboard with feedback
```

## Native-UI philosophy in one table

| Avoid (dev-looking) | Use instead (native macOS) |
|---|---|
| `echo "Are you sure?"` then `read y/n` | `display alert "..." buttons {"Cancel", "Continue"} default button "Continue"` |
| `echo "Cleaning Xcode..."` printed to Terminal | `progress` block with `additional description` updates per phase |
| `echo "✓ Done. Freed 6.4 GB."` | `display notification "Freed 6.4 GB" with title "DustPan" sound name "Glass"` |
| `read -p "Enter path:" path` | `choose folder with prompt "Select the folder to scan:"` |
| `echo "Pick one: a) b) c)"` then `read` | `choose from list {"a", "b", "c"} with prompt "..."` |
| Terminal `cat` of multi-line text | `display dialog "..." default answer "" buttons {"OK"}` for editable display |
| Shell-style colored output | `display alert` with `as critical` / `as warning` / no parameter |

The result: macOS users get a tool that looks like it belongs on their Mac. The same script can run from Terminal, the Shortcuts app, a SwiftBar menu-bar widget, or a launchd agent — and every invocation surfaces in the native UI layer.

## How to add a new script

1. **Pick a number.** The next available `NNNN` (look in `docs/` for the highest existing). Numbers are append-only — never reused.
2. **Write the script** at `applescripts/<short-kebab-name>.applescript`. Use the native-UI patterns from `snippets/`. Keep it focused — one script does one thing well.
3. **Write the doc** at `applescripts/docs/NNNN-<short-kebab-name>.md` using the template below.
4. **Test it standalone** with `osascript applescripts/<name>.applescript`. Then test it invoked from the main UI if applicable.
5. **Open a PR** with the script + doc together.

### Document template

```markdown
# [Title]

**File:** `applescripts/[name].applescript`
**Status:** ✅ Shipped in vX.Y.Z   /   💡 Proposed (in review inbox)
**Type:** Cleanup · Diagnostic · UI helper · Utility · Recovery

## What it does

One paragraph in plain English.

## The moment that prompted it

The specific user pain or feature request that triggered this script. Tells future maintainers *why*.

## Native macOS UI patterns used

- `display alert` for X
- `progress` block for Y
- `display notification` for Z
- (link to snippets/*.md for any reusable pattern referenced)

## The full script

```applescript
[the script body]
```

## How to invoke

```bash
osascript applescripts/[name].applescript
# or with env flags:
FOO_FLAG=1 osascript applescripts/[name].applescript
```

## Variations / extensions

- Could add Z
- Could integrate with W

## Related

- [link to another doc]
```

## SADPA can propose new scripts

When you chat with SADPA (the AI agent), it has a `propose_new_applescript` tool. If it finds a recurring task that would feel better as a one-tap script, it files a proposal to the review inbox — same flow as cleaner proposals, but for AppleScripts.

Accept generates a paste-ready `.applescript` file plus a draft doc you copy into `applescripts/docs/`. The library stays hand-curated; the AI's contribution is the **idea, the native-UI design, and the boilerplate** — you ship by reading and pasting.

## The scripts that exist today

| # | File | What it does | Shipped |
|---|---|---|---|
| 0001 | [`/dustpan.applescript`](../dustpan.applescript) | Main DustPan cleanup with 4-phase progress + confirmation alert + system notification. The reference implementation. | v0.1.0 |
| 0002 | [`show-disk-status.applescript`](./show-disk-status.applescript) | Native dialog showing current free/used disk + a "freed this session" tracker if DustPan UI is running. | v0.26.0 |
| 0003 | [`quick-rescue.applescript`](./quick-rescue.applescript) | Emergency 5-command cleanup with a native progress bar. Bind to a Shortcut for one-tap recovery. | v0.26.0 |
| 0004 | [`show-locked-space.applescript`](./show-locked-space.applescript) | Scans for foreign-owned paths and presents the takeover commands in a native dialog with a Copy button. | v0.26.0 |
