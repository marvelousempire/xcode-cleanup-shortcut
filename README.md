<p align="center">
  <img src="assets/icon-hero.svg" width="96" height="96" alt="Xcode Cleanup">
</p>

<h1 align="center">Xcode Cleanup Shortcut</h1>

<p align="center">
  A one-button macOS Shortcut that reclaims disk space Xcode silently hoards.<br>
  <em>Typical reclaim on an active dev machine: <strong>10–25 GB</strong> per run.</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-brightgreen" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/macOS-14%2B-blue" alt="macOS 14+">
  <img src="https://img.shields.io/badge/Xcode-15%2B-blue" alt="Xcode 15+">
  <img src="https://img.shields.io/badge/built%20with-AppleScript-orange" alt="AppleScript">
</p>

---

`DerivedData`, iOS/watchOS/tvOS `DeviceSupport`, SwiftPM caches, unavailable simulators, and `/tmp` orphans — gone in one click.

## What it does

1. Reads current free space.
2. If you have plenty (>50 GB free), shows a "no action needed" notification and exits.
3. Otherwise, asks you to confirm with a native modal.
4. Cleans in 4 phases with a live menu-bar progress bar:
   - DerivedData + DeviceSupport (iOS/watchOS/tvOS) + Xcode caches
   - SwiftPM caches
   - CoreSimulator caches + simulators for runtimes you no longer have
   - `/private/tmp` orphans matching project scratch patterns
5. Pings you with a banner + chime showing exact GB freed.

## What it deliberately does NOT touch

- `~/Library/Developer/Xcode/Archives` — needed to symbolicate App Store crash reports.
- Active simulator devices — only ones whose runtime is no longer installed are removed.
- Any project files, source code, build configs, or git state.

## Install (the Shortcut way)

1. Open **Shortcuts.app** (built into macOS).
2. **File → New Shortcut** (`⌘N`). Name it **"Xcode Cleanup"**.
3. Search the action library for **Run AppleScript**, drag it into the workflow.
4. Replace the placeholder code with the contents of [`xcode-cleanup.applescript`](./xcode-cleanup.applescript).
5. Open the shortcut's info panel (ⓘ) and enable:
   - **Pin in Menu Bar** — adds it to the Shortcuts dropdown.
   - **Use as Quick Action → Services Menu** — adds to Finder right-click.
   - Optional: bind a keyboard shortcut (e.g. `⌃⌥⌘X`).
6. Hit ▶️ to test. macOS will ask for Automation permission on first run — approve.

> **Faster install:** `make install-shortcut` copies the script to your clipboard and opens Shortcuts.app, ready to paste.

## Use without a Shortcut (Makefile)

If you want to skip the GUI entirely, the script runs standalone via osascript:

```sh
make run            # Run cleanup with the same UX (alert, progress, notification)
make dry-run        # Show what would be freed; delete nothing
make demo           # Simulate phases (for screen recording)
make force          # Run even if disk looks healthy
make size-report    # Print current size of every cleanup target
make check          # Verify AppleScript compiles
make help           # List all targets
```

`make dry-run` is the fastest way to get a "how much could I save right now?" number without committing to a delete.

## Schedule it (optional)

Shortcuts → Automation tab → **Create Personal Automation → Time of Day → 9:00 AM Daily** → Add action **Run Shortcut → Xcode Cleanup** → toggle **Run Immediately**.

The threshold check (>50 GB free) means it stays silent on days you don't need it.

## Invoke it

| How | Action |
|---|---|
| Menu bar | Shortcuts icon → Xcode Cleanup |
| Hotkey | Whatever you bound in setup |
| Spotlight | `⌘Space` → "Xcode Cleanup" → Return |
| Finder | Right-click → Services → Xcode Cleanup |
| Terminal | `shortcuts run "Xcode Cleanup"` (or `make run` for direct osascript) |
| Schedule | Automation → Time of Day |

## Environment flags

The AppleScript reads three optional env vars:

| Variable | Effect |
|---|---|
| `XCODE_CLEANUP_DRY_RUN=1` | Measure phase sizes; no files deleted. |
| `XCODE_CLEANUP_DEMO=1` | Sleep instead of deleting. For screen recording. |
| `XCODE_CLEANUP_FORCE=1` | Skip the 50 GB free threshold check. |
| `XCODE_CLEANUP_AUTO_CONFIRM=1` | Skip the confirmation alert. For scripted recording only — leave off for normal use. |

Set them when invoking via `osascript` (the Makefile targets do this for you). They're not visible to the Shortcuts UI itself; the Shortcut always runs in normal mode.

## Customize

The script is one self-contained AppleScript. Edit the `do shell script` paths to add or remove cleanup phases. Common additions:

- Wipe simulator app/data state too (keeps device definitions): `xcrun simctl erase all`
- Homebrew cleanup: `brew cleanup -s`
- pnpm/npm/yarn caches: `pnpm store prune`, `npm cache clean --force`, `yarn cache clean`

## Files

- [`xcode-cleanup.applescript`](./xcode-cleanup.applescript) — the canonical script.
- [`Makefile`](./Makefile) — CLI targets for run/dry-run/demo/install.
- [`PRD.md`](./PRD.md) — product requirements.
- [`HANDOFF.md`](./HANDOFF.md) — current state, what's in flight, next steps.
- [`CHANGELOG.md`](./CHANGELOG.md) — version history.
- [`assets/RECORDING.md`](./assets/RECORDING.md) — how to capture the README GIF.

## Credits

Icon: [Lucide](https://lucide.dev) `wand-sparkles` (ISC). See [`assets/ATTRIBUTION.md`](./assets/ATTRIBUTION.md).

## License

MIT. See [`LICENSE`](./LICENSE).
