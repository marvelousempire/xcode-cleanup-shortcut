<p align="center">
  <img src="assets/icon-hero.svg" width="96" height="96" alt="Cleanup Hub">
</p>

<h1 align="center">Reclaim 10–25 GB Xcode is hoarding. One click.</h1>

<p align="center">
  <em>Plus Docker, Adobe, DaVinci Resolve, Final Cut, Logic, LLM tool caches, browser caches, system junk — anything macOS quietly fills with. On a working creative-pro Mac the across-all-categories reclaim usually lands at 50–150 GB.<br>
  Every action tells you the cost before you click. No subscription. No telemetry. <a href="./xcode-cleanup.applescript">~250 readable lines</a>.</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/macOS-14%2B-0f766e" alt="macOS 14+">
  <img src="https://img.shields.io/badge/Xcode-15%2B-0f766e" alt="Xcode 15+">
  <img src="https://img.shields.io/badge/no%20telemetry-✓-0f766e" alt="No telemetry">
  <a href="https://github.com/marvelousempire/xcode-cleanup-shortcut/actions/workflows/check.yml"><img src="https://github.com/marvelousempire/xcode-cleanup-shortcut/actions/workflows/check.yml/badge.svg" alt="CI"></a>
</p>

---

## 60 seconds, three lines

```sh
git clone https://github.com/marvelousempire/xcode-cleanup-shortcut.git
cd xcode-cleanup-shortcut
make ui
```

Your browser opens a localhost dashboard. You see a big *free GB* number, four tabs (Xcode · LLMs · Apps · System), and one button: **Scan every category**. Click it. Read the cost annotations. Decide what to clean.

Nothing is deleted until you say so. Nothing is sent to a server. The cleanup logic is one [AppleScript file](./xcode-cleanup.applescript) you can read end-to-end in five minutes.

---

## What it finds

Six tabs. Every path tagged with a safety tier (✓ safe · ⚠ opt-in · ⛔ caution). Every action carries a cost annotation — *exactly* what you lose when you click.

| Tab | What it finds | Typical reclaim |
|---|---|---|
| **Xcode** | DerivedData, DeviceSupport (iOS/watchOS/tvOS/visionOS), SwiftPM caches, simulator app data, IB caches, Instruments traces, CocoaPods | **10–25 GB** |
| **LLM tools** | Claude Desktop updater, Claude Code session transcripts, Cursor extension/GPU caches, ChatGPT cache + logs | 1–15 GB |
| **Docker** | Build cache (`buildx prune`), dangling images, stopped containers, unused volumes (with pre-flight check), `docker system df` widget. Surfaces Docker.raw size + shows how to actually shrink the VM disk. | **5–60 GB** |
| **Everyday apps** | Chrome/Safari/Firefox/Brave/Arc caches, Slack/Discord/Zoom/Teams/Spotify, `~/Downloads/*.dmg`, Trash, Homebrew | 0.5–5 GB |
| **Creative** *(6 sub-cards)* | **Adobe** (Premiere + AE Media Cache, Photoshop, Camera Raw, per-catalog Lightroom previews) · **DaVinci Resolve** (Render Cache + Optimized Media + CacheClip) · **Final Cut Pro** (per-library render + transcoded media + backups) · **Logic Pro** (caches, Apple Loops info) · **Blender** (per-version Cycles cache + autosave) · **OBS Studio** (logs, crashes, browser-source cache) | **5–80 GB** for working video editors / photographers |
| **macOS system** | Icon cache, Spotlight parser, Time Machine local snapshots, diagnostic reports, old installers | 0.1–20 GB |

**Never auto-deletes:** Xcode Archives (App Store crash symbolication), iOS device backups, provisioning profiles, active simulators, Docker.raw + unattached volumes (unless you explicitly run the aggressive prune after the pre-flight), Lightroom catalogs, DaVinci project databases, Final Cut library structure, Logic projects, OBS scenes. Surfaced for review only.

---

## How it compares

|  | Cleanup Hub | CleanMyMac | DevCleaner | `rm -rf` from memory |
|---|---|---|---|---|
| **Open source / auditable** | ✓ MIT, ~250 readable lines | ✗ closed binary | ✗ closed | n/a |
| **Xcode-specific knowledge** | ✓ | partial | ✓ | up to you |
| **Tells you the cost of each action** | ✓ | ✗ | ✗ | ✗ |
| **Dry-run / measure-before-delete** | ✓ | partial | ✗ | ✗ |
| **Touches Archives safely (won't break crash symbolication)** | ✓ skipped by default | ?  | ✓ | risky |
| **Multi-modal (CLI / Shortcut / launchd / SwiftBar / SSH)** | ✓ all five | ✗ | ✗ | shell only |
| **No telemetry / no auto-update phone-home** | ✓ | ✗ | ✗ | n/a |
| **Price** | $0 | $30–50/yr | $5 one-time | $0 |

The moat is the first row. CleanMyMac will never let you read what it does; we will never *not* let you.

---

## Install paths — pick one (or stack)

All five paths share the same source script. The choice is about ergonomics, not capability.

<details open>
<summary><strong>I want a GUI</strong> — web dashboard, Apple Shortcut, or menu bar</summary>

<br>

| Surface | Setup | What you get |
|---|---|---|
| **Web UI** ⭐ | `make ui` | Localhost dashboard at `127.0.0.1:8765`. Live disk meter, per-path sizes, four-tab scan, cost annotations on every action, streaming output. Zero deps (Python stdlib). |
| **Apple Shortcut** | `make install-shortcut` | Drops the AppleScript into a new Shortcut. Pin to menu bar, bind a hotkey, or schedule via Automations. |
| **SwiftBar plugin** | `brew install --cask swiftbar && make install-swiftbar` | Menu-bar widget shows `🧹 12 GB`. Click → Run / Dry run / Force / History / Report. |

</details>

<details>
<summary><strong>I want a CLI</strong> — terminal, hourly daemon, or remote Mac over SSH</summary>

<br>

| Surface | Setup | What you get |
|---|---|---|
| **`xcc` CLI** | `make install-cli` | Symlinks to `~/.local/bin/xcc`. Flags: `--dry-run`, `--force`, `--history`, `--report`, `--patterns`. |
| **launchd hourly agent** | `make install-launchd` | Runs every hour. Threshold-gated — silent no-op when disk is healthy. `make uninstall-launchd` to remove. |
| **Remote Mac via SSH** | See [`docs/SHORTCUTS.md`](./docs/SHORTCUTS.md) | Paste-ready *Run Script Over SSH* block. Clean a build server without SSHing in and `rm -rf`ing from memory. |

```sh
# No-clone version — just measure, deletes nothing
bash <(curl -fsSL https://raw.githubusercontent.com/marvelousempire/xcode-cleanup-shortcut/main/scripts/remote-cleanup.sh) --dry-run
```

</details>

---

## Why this and not the alternatives

- **Auditable.** [One AppleScript](./xcode-cleanup.applescript). ~250 lines. Read it. You can't read CleanMyMac.
- **Specific.** Knows which Xcode paths are safe (skip Archives, only wipe *unavailable* simulators, never touch active project state). That knowledge *is* the product.
- **Cost-aware.** Every action surfaces what you lose. "First build takes ~30s longer." "Chrome reloads pages from origin on next visit." "Conversation history with Claude Code gone." You decide.
- **Quiet.** The 50 GB threshold means the launchd agent does nothing on days you don't need it.
- **Multi-modal.** GUI for the casual session. CLI for the build server. Menu bar for the live indicator. Same script under all of them.

Pricing comparison: this is free. CleanMyMac is $30–50/yr. After two years a paid cleaner has cost you ~$100. This won't.

---

## Customize

### `/tmp` orphan patterns

The shipped defaults are example patterns from the maintainer's Red-E Play workflow (`redeplay-*`, `RedEPlay-*`, etc.) — they'll match nothing for other users and phase 4 will safely no-op.

```sh
# One-off
XCODE_CLEANUP_TMP_PATTERNS="/private/tmp/myproject-* /private/tmp/build-cache-*" make run

# Skip phase 4 entirely
XCODE_CLEANUP_TMP_PATTERNS="" make run

# Permanent: edit kDefaultTmpPatterns at the top of xcode-cleanup.applescript
```

### Add cleanup phases

The script is one self-contained AppleScript. Common additions:

- Simulator app/data state: `xcrun simctl erase all`
- Homebrew downloads: `brew cleanup -s`
- Package manager caches: `pnpm store prune`, `npm cache clean --force`, `yarn cache clean`

### Environment flags

| Variable | Effect |
|---|---|
| `XCODE_CLEANUP_DRY_RUN=1` | Measure phase sizes; no files deleted. |
| `XCODE_CLEANUP_DEMO=1` | Sleep instead of deleting. For screen recording. |
| `XCODE_CLEANUP_FORCE=1` | Skip the 50 GB free threshold check. |
| `XCODE_CLEANUP_AUTO_CONFIRM=1` | Skip the confirmation alert. For scripted invocation only. |
| `XCODE_CLEANUP_TMP_PATTERNS=…` | Override `/private/tmp` orphan globs. |
| `XCODE_CLEANUP_NO_UPDATE_CHECK=1` | Skip the once-daily GitHub release check. |

---

## Makefile targets

```sh
make ui              # Localhost dashboard (recommended)
make run             # Run cleanup (with alert + progress + notification)
make dry-run         # Measure freeable space; delete nothing
make force           # Run even if disk looks healthy
make history         # Last 20 run-log entries
make report          # ▁▂▃▄▅▆▇ sparkline of freed GB
make demo            # Simulate phases (for screen recording)
make check           # Verify AppleScript compiles
make install-cli     # Symlink xcc to ~/.local/bin/
make install-shortcut
make install-launchd
make install-swiftbar
make help            # Everything
```

---

## Files

- [`xcode-cleanup.applescript`](./xcode-cleanup.applescript) — the canonical cleanup script
- [`web/cleaners.py`](./web/cleaners.py) — single source of truth for what the dashboard scans
- [`web/index.html`](./web/index.html) — the dashboard UI
- [`docs/Design-System.md`](./docs/Design-System.md) — design tokens and rationale for the v0.11 redesign
- [`docs/Redesign-Brief.md`](./docs/Redesign-Brief.md) — the brief that drove this redesign
- [`HANDOFF.md`](./HANDOFF.md) — current state for fresh sessions
- [`CHANGELOG.md`](./CHANGELOG.md) — version history
- [`PRD.md`](./PRD.md) — product requirements (F1–F29)
- [`docs/SHORTCUTS.md`](./docs/SHORTCUTS.md) — paste-ready Apple-Shortcuts blocks (Run Shell Script · Run Script Over SSH · Run AppleScript)

---

## Credits

Icon: [Lucide](https://lucide.dev) `wand-sparkles` (ISC). See [`assets/ATTRIBUTION.md`](./assets/ATTRIBUTION.md). Animation primitives: [Motion](https://motion.dev) (MIT), loaded via CDN — no install required.

## License

MIT. See [`LICENSE`](./LICENSE).
