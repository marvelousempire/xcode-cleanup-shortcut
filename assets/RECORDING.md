# Recording the progress-bar demo GIF

The `progress-bar.gif` shown in the README needs to be captured locally — the AppleScript progress bar only renders on a real machine.

## Quick way

1. From the repo root: `make record-demo`
2. Follow the on-screen instructions (it'll prompt you to start a screen recording with `⌘⇧5`, then press Return to fire the demo).
3. After the demo notification, stop the recording.
4. Convert `.mov` → `.gif` with the command the Make target prints.
5. Save the resulting `progress-bar.gif` to this directory.
6. Commit and push.

## Manual way

```sh
# 1. Start screen recording (⌘⇧5 → Record Selected Portion → cover the menu bar area)
# 2. Run demo
XCODE_CLEANUP_DEMO=1 osascript xcode-cleanup.applescript
# 3. Stop recording
# 4. Convert
ffmpeg -i ~/Desktop/recording.mov -vf "fps=10,scale=720:-1:flags=lanczos" -f gif - | gifsicle --optimize=3 > assets/progress-bar.gif
```

`brew install ffmpeg gifsicle` if you don't have them.

## What to capture

The progress bar renders in two places at once:
1. **Menu bar** — a small spinner/text near the Shortcuts.app icon (right side).
2. **Inside Shortcuts.app's run HUD** if the shortcut was launched from there.

For the README GIF, the menu-bar version is what users will actually see day-to-day. Frame your recording around that area.
