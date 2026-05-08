# Xcode Cleanup Shortcut

A one-button macOS Shortcut that reclaims disk space Xcode silently hoards: `DerivedData`, iOS/watchOS/tvOS `DeviceSupport`, SwiftPM caches, and unavailable simulators. Designed for Apple Silicon Macs running modern Xcode (15+).

> Typical reclaim on an active dev machine: **10–25 GB** per run.

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

## Install

1. Open **Shortcuts.app** (built into macOS).
2. **File → New Shortcut** (`⌘N`). Name it **"Xcode Cleanup"**.
3. Search the action library for **Run AppleScript**, drag it into the workflow.
4. Replace the placeholder code with the contents of [`xcode-cleanup.applescript`](./xcode-cleanup.applescript).
5. Open the shortcut's info panel (ⓘ in the toolbar) and enable:
   - **Pin in Menu Bar** — adds it to the Shortcuts menu-bar dropdown.
   - **Use as Quick Action → Services Menu** — adds to Finder right-click.
   - Optional: bind a keyboard shortcut (e.g. `⌃⌥⌘X`).
6. Hit ▶️ to test. macOS will prompt for Automation permission on first run — approve.

## Schedule it (optional)

Shortcuts → Automation tab → **Create Personal Automation → Time of Day → 9:00 AM Daily** → Add action **Run Shortcut → Xcode Cleanup** → toggle **Run Immediately**.

The threshold check means it stays silent on days you don't need it.

## Invoke it

| How | Action |
|---|---|
| Menu bar | Shortcuts icon → Xcode Cleanup |
| Hotkey | Whatever you bound in setup |
| Spotlight | `⌘Space` → "Xcode Cleanup" → Return |
| Finder | Right-click → Services → Xcode Cleanup |
| Terminal | `shortcuts run "Xcode Cleanup"` |
| Schedule | Automation → Time of Day |

## Customize

The script is one self-contained AppleScript. Edit the `do shell script` lines to add or remove cleanup phases. Common additions:

- Wipe simulator app/data state too (keeps device definitions): `xcrun simctl erase all`
- Clear Homebrew cleanup: `brew cleanup -s`
- Clear pnpm/npm/yarn caches: `pnpm store prune`, `npm cache clean --force`, `yarn cache clean`

## Files

- [`xcode-cleanup.applescript`](./xcode-cleanup.applescript) — the canonical script.
- [`PRD.md`](./PRD.md) — product requirements.
- [`HANDOFF.md`](./HANDOFF.md) — current state, what's in flight, next steps.

## License

MIT. See [`LICENSE`](./LICENSE).
