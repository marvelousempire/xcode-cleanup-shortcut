<p align="center">
  <img src="assets/icon-hero.svg" width="96" height="96" alt="Xcode Cleanup">
</p>

<h1 align="center">Reclaim 10–40 GB your Mac is hoarding — Xcode, LLM tools, apps, system.</h1>

<p align="center">
  A free dashboard that finds disk-hogging caches across <strong>Xcode</strong>, <strong>Claude / Cursor / ChatGPT</strong>, <strong>everyday apps</strong> (browsers, chat, Spotify, Homebrew, …), and <strong>macOS system junk</strong>. Tells you the <em>cost</em> of every cleanup so you choose with full info. Skips Archives and irreplaceable data. No subscription. No telemetry.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-brightgreen" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/macOS-14%2B-blue" alt="macOS 14+">
  <img src="https://img.shields.io/badge/Xcode-15%2B-blue" alt="Xcode 15+">
  <img src="https://img.shields.io/badge/built%20with-AppleScript-orange" alt="AppleScript">
  <a href="https://github.com/marvelousempire/xcode-cleanup-shortcut/actions/workflows/check.yml"><img src="https://github.com/marvelousempire/xcode-cleanup-shortcut/actions/workflows/check.yml/badge.svg" alt="CI"></a>
</p>

---

## 60-second quickstart

```sh
git clone https://github.com/marvelousempire/xcode-cleanup-shortcut.git
cd xcode-cleanup-shortcut
make ui
```

Your browser opens a localhost dashboard. **Click "Dry run"** to see exactly what would be freed (no deletion). **Click "Clean now"** to actually clean. **Click "Run deep scan"** to find ~5–10 GB more that basic mode doesn't touch (simulator app data, Instruments traces, CocoaPods caches).

That's it. Three buttons. No CLI, no AppleScript editing, nothing else to learn.

![preview of the dashboard](https://img.shields.io/badge/dashboard-localhost%3A8765-0A84FF?style=for-the-badge)

> Don't want a browser? See [other install paths](#install-60-seconds--pick-your-path) — Apple Shortcut, CLI, launchd background agent, SwiftBar menu-bar plugin, SSH for remote Macs. All five share one source script.

### Inside the dashboard

Four tabs, each with its own scan + actions + per-action cost notes:

| Tab | What it finds | Typical reclaim |
|---|---|---|
| **🛠 Xcode** | DerivedData, DeviceSupport (iOS/watchOS/tvOS/visionOS), SwiftPM, simulator caches + app data, Snapshots, IB caches, Products, Instruments traces, CocoaPods | 10–25 GB |
| **🤖 LLMs** (Claude · Cursor · ChatGPT) | Claude Desktop updater cache, Claude Code session transcripts, Cursor Code/GPU/extension caches, ChatGPT cache + logs | 1–15 GB |
| **🧹 Apps** | Chrome/Safari/Firefox/Brave/Arc caches, Slack/Discord/Zoom/Teams/Spotify caches, `~/Downloads/*.dmg`, Trash, Homebrew downloads | 0.5–5 GB |
| **💾 System** | Icon cache, Spotlight parser, help/CloudKit/iCloud Drive caches, Time Machine local snapshots, diagnostic reports, old macOS installers | 0.1–20 GB (Time Machine snapshots often the biggest) |

**Every action tells you the cost** — exactly what you lose when you click it ("Chrome reloads pages from origin on next visit. Bookmarks/passwords safe."). Three safety tiers per tab: ✓ Safe (regenerable), ⚠ Probably safe (opt-in), ⛔ Caution (surface only, never auto-delete).

---

> **The 30-second version.** Xcode's caches (`DerivedData`, `DeviceSupport`, SwiftPM, simulator caches) routinely grow to 20+ GB and stay there. Every iOS dev has Googled which paths are safe to `rm -rf`. This script settles it — wipes the ones that are, skips the ones that aren't, tells you how much it freed.

**No-clone version (just measure, deletes nothing):**

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/marvelousempire/xcode-cleanup-shortcut/main/scripts/remote-cleanup.sh) --dry-run
```

## Why bother

- **Safe by design.** Never touches `~/Library/Developer/Xcode/Archives` (App Store crash symbolication stays intact). Never wipes simulators you actively use — only ones whose runtime was uninstalled.
- **Specific.** Five known-safe Xcode cache locations, plus simulator caches and configurable `/tmp` orphans. Everything else is left alone.
- **Auditable.** [One short AppleScript](./xcode-cleanup.applescript). No binary blobs, no closed-source helper, no opaque CleanMyMac-style "let us decide."
- **Quiet.** Threshold-gated: does nothing when your disk is healthy (>50 GB free). Run it hourly via launchd — it stays silent until you actually need cleanup.
- **Reusable.** Run it from a Shortcut, a hotkey, the menu bar, the terminal (`xcc`), a `launchd` agent, or over SSH on a remote Mac. Pick one, stack them all.

## Install (60 seconds — pick your path)

```sh
git clone https://github.com/marvelousempire/xcode-cleanup-shortcut.git
cd xcode-cleanup-shortcut
make help        # see every option
```

| If you want… | Run this | What you get |
|---|---|---|
| **Web UI in your browser** ⭐ | `make ui` | Localhost dashboard with deep-scan, live indicator, one-click cleanup. No deps, pure Python stdlib. |
| **Apple Shortcut** (menu bar, hotkey, schedulable) | `make install-shortcut` | Pastes the AppleScript into a new Shortcut for you |
| **CLI** (`xcc --dry-run`, `xcc --force`) | `make install-cli` | Symlink at `~/.local/bin/xcc` |
| **Hands-free hourly cleanup** | `make install-launchd` | LaunchAgent runs every hour, silent when disk is healthy |
| **Live disk indicator in your menu bar** | `make install-swiftbar` | SwiftBar plugin — `🧹 12 GB`, click to clean |
| **Remote Mac (build server)** over SSH | [`docs/SHORTCUTS.md`](./docs/SHORTCUTS.md) | Paste-ready Run Script Over SSH block |

> [!TIP]
> First time? Run `make dry-run` to see exactly how much you'd reclaim before committing to a delete.

### Web UI (`make ui`) — recommended

Type `make ui` and your browser opens a localhost dashboard. Three things visible immediately:

- **Live disk indicator** — big GB-free number, color-coded (red <20, orange <50, green ≥50), auto-refreshes every 15s.
- **Per-path size breakdown** — bar-chart of every cleanup target showing exactly what you'd reclaim.
- **Three one-click actions** — Dry run · Clean now · Force clean. Output streams live in a terminal-style pane (Server-Sent Events).

#### Deep scan — find ~5–10 GB more that basic mode misses

The basic "Clean now" button handles the 7 known-safe Xcode caches (DerivedData, DeviceSupport, SwiftPM, simulator caches, Xcode caches). That's typically 10–25 GB per run on an active dev machine.

But Xcode also accumulates **more** stuff that basic mode deliberately doesn't touch — because it requires you to opt in. Click **"Run deep scan"** in the UI and you'll see three categorized sections:

| Category | What it contains | Example reclaim |
|---|---|---|
| **✓ Safe to delete** | Same set basic mode handles, plus iOS Device Logs, Xcode Snapshots, Interface Builder caches, Xcode Products | Already cleaned if you ran basic mode |
| **⚠ Probably safe (opt in)** | Simulator **app data** (`xcrun simctl erase all` — keeps device definitions, wipes installed apps + their data), Instruments traces, CocoaPods cache, CocoaPods specs | Usually 3–8 GB — biggest single win is simulator app data |
| **⛔ Caution (review manually)** | Xcode Archives (needed for App Store crash symbolication), iOS device backups from Finder/iTunes (often 10–50 GB and irreplaceable), Provisioning Profiles | Surfaces sizes only — never auto-deletes |

Each "Probably safe" group has its own button. Click **"Erase all simulator app data"** to reclaim that bucket without affecting your other caches or installed simulators themselves — just the apps and data installed inside them.

#### Zero dependencies, localhost-only

Pure Python stdlib (`http.server`), zero npm/pip installs. Bound to `127.0.0.1` only — never reachable from your network. Ctrl-C in the terminal to stop the server.

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

> **Want paste-ready blocks for Run Shell Script + Run Script Over SSH?** See [`docs/SHORTCUTS.md`](./docs/SHORTCUTS.md) — covers local Mac, remote Mac via SSH, AppleScript variant, common gotchas, and 3 suggested whole-workflow compositions.

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

## Install options (pick one or stack them)

| Path | Best for | Setup |
|---|---|---|
| **Shortcut** (default) | One-button GUI invocation, scheduling, menu bar | `make install-shortcut`, then paste in Shortcuts.app |
| **CLI** (`xcc`) | Terminal users; scripting; piping into other workflows | `make install-cli` — symlinks to `~/.local/bin/xcc` |
| **launchd agent** | Hands-free hourly background cleanup | `make install-launchd` — runs every hour, no-ops when disk is healthy |
| **SwiftBar plugin** | Live free-disk indicator in the menu bar + 1-click cleanup | `brew install --cask swiftbar` → `make install-swiftbar` |

Each path uses the same underlying script. Mix and match — e.g. `install-cli` + `install-swiftbar` gives you terminal access *and* a live disk-pressure indicator.

### `xcc` — CLI

```sh
make install-cli         # symlink to ~/.local/bin/xcc
xcc --help               # see all flags
xcc --dry-run            # measure freeable space
xcc --force              # run even when disk is healthy
xcc --history            # last 20 run-log entries
xcc --report             # sparkline of freed GB over time
xcc --patterns '/tmp/myproj-*'  # override /tmp orphan globs
```

### launchd — hourly background cleanup

```sh
make install-launchd     # runs every hour via ~/Library/LaunchAgents/com.marvelousempire.xcode-cleanup.plist
make uninstall-launchd   # to disable
```

The launchd agent passes `XCODE_CLEANUP_AUTO_CONFIRM=1` so it never blocks on the safety alert, and `XCODE_CLEANUP_NO_UPDATE_CHECK=1` to skip the network call. The 50 GB threshold still gates real deletion — most hourly runs no-op silently.

### SwiftBar — menu-bar indicator

```sh
brew install --cask swiftbar
make install-swiftbar    # symlinks the plugin into ~/Library/Application Support/SwiftBar/Plugins/
```

The menu bar shows `🧹 12GB` (or `🚨` red under 20 GB, `✨` green over 50 GB). Click for dropdown: Run / Dry run / Force / Show history / Report.

### Update check

On every real-mode run, the script makes a single GitHub Releases API call (cached for 24h) and fires a `display notification` if a newer tag exists. Set `XCODE_CLEANUP_NO_UPDATE_CHECK=1` to opt out (the launchd agent does this by default).

### Run history & sparkline report

Every run appends a row to `~/Library/Logs/xcode-cleanup-history.csv`:

```csv
2026-05-08 12:13:57,real,18.3,12.0,30.3
```

```sh
make history             # human-readable last 20 entries
make report              # ▁▂▃▄▅▆▇ sparkline of freed GB
xcc --report             # same, from CLI
```

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
| `XCODE_CLEANUP_TMP_PATTERNS=...` | Override the `/private/tmp` orphan globs. Empty string skips phase 4 entirely. |
| `XCODE_CLEANUP_NO_UPDATE_CHECK=1` | Skip the once-daily GitHub release check. |

Set them when invoking via `osascript` (the Makefile targets do this for you). They're not visible to the Shortcuts UI itself; the Shortcut always runs in normal mode.

## Customize

### `/tmp` orphan patterns (important for non-maintainer users)

The shipped defaults are example patterns from the maintainer's project (Red-E Play): `redeplay-*`, `RedEPlay-*`, `sweep.mov.sb-*`, `keen-euclid-*`. They will never match anything for other users — phase 4 will safely no-op.

To set patterns matching your own scratch dirs, either:

```sh
# One-off, per invocation:
XCODE_CLEANUP_TMP_PATTERNS="/private/tmp/myproject-* /private/tmp/build-cache-*" make run

# Skip phase 4 entirely:
XCODE_CLEANUP_TMP_PATTERNS="" make run

# Permanent: edit the kDefaultTmpPatterns property at the top of xcode-cleanup.applescript
```

### Add cleanup phases

The script is one self-contained AppleScript. Common additions you can paste in:

- Wipe simulator app/data state too (keeps device definitions): `xcrun simctl erase all`
- Homebrew cleanup: `brew cleanup -s`
- pnpm/npm/yarn caches: `pnpm store prune`, `npm cache clean --force`, `yarn cache clean`

### History log

Every run (real, dry-run, or demo) appends one line to `~/Library/Logs/xcode-cleanup.log`:

```
2026-05-08 12:13:57 | mode: dry-run | freed: 14.2 GB | before: 22.5 GB | after: 22.5 GB
```

`make history` prints the last 20 entries.

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
