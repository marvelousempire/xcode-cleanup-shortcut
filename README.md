<p align="center">
  <img src="assets/icon-hero.svg" width="80" height="80" alt="Dustpan">
</p>

<h1 align="center">🧹 Dustpan</h1>

<p align="center">
  <sub><strong>by AVERY GOODMAN</strong></sub>
</p>

<p align="center">
  <strong>Sweep your Mac clean.</strong> Reclaim 50–150 GB. Three lines. No Docker. No subscription. No telemetry.
</p>

<p align="center">
  <em>A local-first disk-cleanup dashboard purpose-built for Mac developers and creative pros.<br>
  11 categories · 17 sub-tools · 58 annotated actions · three frontends · one Python file to serve them all.</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a" alt="MIT"></a>
  <img src="https://img.shields.io/badge/macOS-14%2B-0f766e" alt="macOS 14+">
  <img src="https://img.shields.io/badge/no%20Docker-required-0f766e" alt="No Docker">
  <img src="https://img.shields.io/badge/no%20pip%20install-required-0f766e" alt="No pip">
  <img src="https://img.shields.io/badge/no%20telemetry-✓-0f766e" alt="No telemetry">
  <a href="https://github.com/marvelousempire/xcode-cleanup-shortcut/releases"><img src="https://img.shields.io/github/v/release/marvelousempire/xcode-cleanup-shortcut?color=0f766e" alt="Latest release"></a>
  <a href="https://github.com/marvelousempire/xcode-cleanup-shortcut/actions/workflows/check.yml"><img src="https://github.com/marvelousempire/xcode-cleanup-shortcut/actions/workflows/check.yml/badge.svg" alt="CI"></a>
</p>

---

## ⚡ Three lines. Browser opens. Use it from any device on your Wi-Fi.

```sh
git clone https://github.com/marvelousempire/xcode-cleanup-shortcut.git
cd xcode-cleanup-shortcut
make ui
```

Your terminal prints **two URLs** — `http://127.0.0.1:8765` on your Mac, and `http://192.168.X.X:8765` from any other device on the same Wi-Fi (iPad, another laptop, your phone). Browser auto-opens to the local URL.

> **No Docker. No `pip install`. No Node runtime.** The server is pure Python 3 stdlib.
> `pnpm` is used to build the React UI once (~6 seconds) and is not required to run the server.
> If `pnpm` is not installed, `make ui` falls back to the pre-built vanilla dashboard automatically.

Want localhost-only (no Wi-Fi visibility)? Run `make ui-local` instead.

---

## 🖥️ What you see when it opens

The Overview tab loads first. Three panels across the top — then the full category grid below.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ← Sidebar                          Main viewport                         │
│  ┌──────────┐                                                              │
│  │ Overview │  ┌──── Hero ────┐  ┌── Disk pie ──┐  ┌── Activity ──────┐  │
│  │ Xcode    │  │  12.1 GB free│  │   42.8 GB    │  │ Filter lines…    │  │
│  │ LLMs     │  │  94% used    │  │   scanned    │  │ → Scanning…      │  │
│  │ Docker   │  │  ▓▓▓▓▓▓▓▓▓░ │  │  🟢🟣🔵🟡🟤 │  │ ✓ Done. 6.4 GB  │  │
│  │ Apps     │  │  Factory-    │  │  Xcode 2.2GB │  │ freed in 3.1s    │  │
│  │ Browsers │  │  fresh w/o   │  │  Docker 14.6 │  │                  │  │
│  │ Downloads│  │  losing your │  │  LLMs  12.4  │  │ [Auto][Light][🌙]│  │
│  │ Creative │  │  stuff       │  │  …           │  │                  │  │
│  │ Temp     │  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  │ Archives │                                                              │
│  │ System   │  ── Re-scan everything ── ✓ Clean ALL safe · 6.4 GB ──────  │
│  │──────────│                                                              │
│  │  THEME   │  ┌ Xcode ──────┐  ┌ LLMs ───────┐  ┌ Docker ─────────┐   │
│  │[Auto][☀][🌙]│ 6.4 GB safe │  │ 0.0 GB safe │  │ 0.0 GB safe     │   │
│  └──────────┘  │ 0.2 GB opt-in│  │ 12.4 GB opt │  │ 0.0 GB opt-in   │   │
│                │ ● 2.0 caution│  │             │  │ ● 14.6 caution  │   │
└────────────────────────────────────────────────────────────────────────────┘
```

**Left sidebar** — 11 tabs, each showing its total recoverable GB + a color-coded mini-donut (green = safe / amber = opt-in / red = caution). Theme toggle pinned at the bottom.

**Three-pane top row:**
- **Hero** — live free GB counter (updates via SSE, no poll), used % progress bar
- **Disk pie** — SVG donut where each slice is a category, sized by total footprint. Click any slice to jump to that tab.
- **Activity terminal** — live streaming output as scans and cleans run. Search with `Ctrl+F`. Fixed height — scrolls inside, never stretches the page.

**Below the top row** — action buttons + a card grid of all 11 categories. Each card shows safe / opt-in / caution GB separately so the math is obvious before you click anything.

---

## 🗂️ 11 categories — 58 annotated actions

Every path is tagged with a safety tier. Every action tells you the exact cost before you click.

| Category | Sub-tools | Typical reclaim |
|---|---|---|
| **Xcode** | — | 10–25 GB |
| **LLMs** | Claude Desktop · Cursor · ChatGPT | 1–15 GB |
| **Docker** | — | 5–60 GB |
| **Apps** | — | 0.5–5 GB |
| **Browsers** | Chrome · Safari · Firefox · Edge · Brave · Arc · Vivaldi | 2–20 GB |
| **Downloads** | Installer scanner · age-based surfacing | 0–50 GB |
| **Creative** | Adobe · DaVinci Resolve · Final Cut · Logic · Blender · OBS | 5–80 GB |
| **Temp files** | `/private/tmp` · `/var/folders` · QuickLook · Trash | 0.5–10 GB |
| **Archives** | `.zip` · `.dmg` · `.iso` · `.tar.gz` surfacing across disk | 0–? GB |
| **System** | Icon cache · Spotlight · Time Machine snapshots · diagnostics | 0.1–20 GB |

**Safety tiers:**
- ✅ **Safe** — caches that auto-regenerate. Near-zero cost to delete.
- ⚠️ **Opt-in** — bigger reclaim, something re-fetches or rebuilds. Each action explains exactly what.
- 🚫 **Caution** — never auto-deleted. Surfaced for review (sizes, paths) so you can decide in Finder.

**Never touched automatically:**
Xcode Archives · iOS device backups · provisioning profiles · Docker.raw · unattached Docker volumes · Lightroom catalogs · DaVinci project databases · Final Cut library structure · Logic projects · OBS scenes/profiles.

---

## 🎨 Three frontends — one Python backend

All three hit the same `/api/*` endpoints. Switch between them without restarting anything.

| Frontend | URL | When to use |
|---|---|---|
| **Vite + React** *(default)* | `http://127.0.0.1:8765` | The full experience — pie chart, live SSE, animated sidebar, theme toggle |
| **Vanilla HTML** | `http://127.0.0.1:8765/?legacy=1` or `/legacy` | Works in any browser, zero JS framework. Identical features, different engine. |
| **Next.js** | `http://127.0.0.1:8765/next/` | Experimental App Router surface. Build with `make ui-all`. |

---

## 🚀 Make targets

```
make ui            Build React UI (~6s) + serve localhost AND Wi-Fi + browser auto-opens
make ui-local      Same build but localhost-only (no Wi-Fi visibility)
make ui-dev        Vite HMR (:5174) + Next HMR (:5175) in parallel
make ui-all        Build both Vite + Next.js via Turbo, then serve
make ui-legacy     Serve vanilla HTML only — no build required
make ui-next       Build + serve Next.js static export only

make run           AppleScript cleanup (with confirmation + progress bar)
make dry-run       Measure freeable space — no files deleted
make force         Run even when disk looks healthy (skip 50 GB threshold)
make history       Last 20 run-log entries
make report        Sparkline of freed GB over time
make check         Verify AppleScript syntax
make install-cli   Symlink xcc to ~/.local/bin/
make help          Everything
```

---

## 🏗️ Architecture

No Docker required. No cloud. Everything runs on your Mac.

```
xcode-cleanup-shortcut/
│
├── web/
│   ├── server.py          Python 3 stdlib HTTP server — zero pip deps
│   ├── cleaners.py        Single source of truth: 11 categories, 17 sub-tools,
│   │                      58 annotated actions, all safety tiers defined here
│   └── index.html         Vanilla HTML/JS dashboard (fallback + legacy)
│
├── apps/
│   ├── web/               @cleanup-hub/web — Vite + React + TypeScript (canonical UI)
│   └── web-next/          @cleanup-hub/web-next — Next.js 14 App Router (experimental)
│
├── xcode-cleanup.applescript  Standalone cleanup script — runs via Shortcuts / CLI / launchd
├── Makefile               All make targets
├── package.json           pnpm workspace root
├── turbo.json             Turbo build pipeline (build / dev / typecheck / lint)
│
├── scripts/               report.py (CSV history sparkline), remote-cleanup.sh
├── bin/                   xcc CLI wrapper
├── launchd/               com.example.xcode-cleanup.plist
├── swiftbar/              menu bar plugin
└── docs/                  CHANGELOG · HANDOFF · PRD · SHORTCUTS · Design-System
```

### How the server decides what to serve

```
GET /              →  apps/web/dist/index.html  (React, if built)
                      ↳  web/index.html         (vanilla, fallback)
GET /assets/*      →  apps/web/dist/assets/*    (hashed, 1-year cache)
GET /next/         →  apps/web-next/out/         (Next.js static export)
GET /?legacy=1     →  web/index.html             (always vanilla)
GET /api/*         →  web/server.py              (scan, clean, SSE streams)
```

### Real-time: the `/api/live` SSE channel

The dashboard subscribes to a single long-lived server-sent events stream. No polling.
- Server pushes `status` deltas whenever your free disk changes (another app deletes something, Time Machine runs, etc.)
- Server pushes `running` events when a clean starts or finishes — the header widget shows live
- Client auto-reconnects with backoff if the connection drops

---

## 📦 Install paths — pick your ergonomic preference

All paths share the same `cleaners.py` source. Choose based on how you want to interact.

<details open>
<summary><strong>Web UI</strong> — the full dashboard experience</summary>

```sh
git clone https://github.com/marvelousempire/xcode-cleanup-shortcut.git
cd xcode-cleanup-shortcut
make ui
# → http://127.0.0.1:8765
```

Requires: Python 3.9+ (pre-installed on every Mac since Monterey). `pnpm` optional — auto-falls-back to vanilla if absent.

For Wi-Fi access from your iPad or another laptop:
```sh
make ui-network
# → prints both http://127.0.0.1:8765 and http://192.168.X.X:8765
```

</details>

<details>
<summary><strong>Apple Shortcut</strong> — one tap from Siri / menu bar / hotkey</summary>

```sh
make install-shortcut
```

Drops the AppleScript into a new Shortcut. Pin it to the menu bar, bind a keyboard shortcut, or trigger it from an Automation. Works offline, no server needed.

</details>

<details>
<summary><strong>SwiftBar menu-bar plugin</strong></summary>

```sh
brew install --cask swiftbar
make install-swiftbar
```

Menu bar shows `🧹 12 GB`. Click for: Run · Dry run · Force · History · Report.

</details>

<details>
<summary><strong>CLI + launchd hourly agent</strong></summary>

```sh
make install-cli      # → xcc in your PATH
make install-launchd  # → runs every hour, silent when disk is healthy
```

Flags: `--dry-run`, `--force`, `--history`, `--report`, `--patterns`

Or without cloning:
```sh
bash <(curl -fsSL https://raw.githubusercontent.com/marvelousempire/xcode-cleanup-shortcut/main/scripts/remote-cleanup.sh) --dry-run
```

</details>

<details>
<summary><strong>Remote Mac over SSH</strong></summary>

See [`docs/SHORTCUTS.md`](./docs/SHORTCUTS.md) for a paste-ready *Run Script Over SSH* block. Clean a build server or CI Mac without SSHing in and `rm -rf`ing from memory.

</details>

---

## ⚙️ Environment flags

| Variable | Effect |
|---|---|
| `XCODE_CLEANUP_DRY_RUN=1` | Measure phase sizes; no files deleted |
| `XCODE_CLEANUP_DEMO=1` | Sleep instead of deleting — for screen recording |
| `XCODE_CLEANUP_FORCE=1` | Skip the 50 GB free-space threshold gate |
| `XCODE_CLEANUP_AUTO_CONFIRM=1` | Skip the confirmation alert — for scripted invocation |
| `XCODE_CLEANUP_TMP_PATTERNS=…` | Override `/private/tmp` orphan globs (`""` to skip phase 4) |
| `XCODE_CLEANUP_NO_UPDATE_CHECK=1` | Skip the once-daily GitHub release check |
| `XCC_UI_PORT=9000` | Change the server port (default 8765) |
| `XCC_HOST=0.0.0.0` | Bind to all interfaces (same as `make ui-network`) |
| `XCC_LEGACY_UI=1` | Force vanilla HTML even when a React build exists |

---

## 🆚 How it compares

|  | Dustpan | CleanMyMac | DevCleaner | `rm -rf` from memory |
|---|---|---|---|---|
| **Open source / auditable** | ✓ MIT | ✗ closed | ✗ closed | n/a |
| **Xcode-specific knowledge** | ✓ | partial | ✓ | up to you |
| **Cost annotation per action** | ✓ | ✗ | ✗ | ✗ |
| **Dry-run before deleting** | ✓ | partial | ✗ | ✗ |
| **Browsers / Downloads / Archives** | ✓ | partial | ✗ | manual |
| **Live disk meter (SSE, no poll)** | ✓ | ✗ | ✗ | ✗ |
| **Wi-Fi network mode** | ✓ | ✗ | ✗ | ✗ |
| **Three frontends (React / vanilla / Next)** | ✓ | ✗ | ✗ | ✗ |
| **Multi-modal (web · Shortcut · CLI · launchd · SwiftBar · SSH)** | ✓ all six | ✗ | ✗ | shell only |
| **No Docker / no pip / no subscription / no telemetry** | ✓ | ✗ | partial | ✓ |
| **Price** | **$0** | $30–50/yr | $5 | $0 |

The moat is the first row. You can read every line of what this does. You cannot read CleanMyMac.

---

## 🗺️ Repo files

| Path | What |
|---|---|
| `xcode-cleanup.applescript` | Standalone AppleScript — the original single-file tool |
| `web/server.py` | Python HTTP server + SSE streams + `/api/live` channel |
| `web/cleaners.py` | All 11 categories, 17 sub-tools, 58 actions — the data layer |
| `web/index.html` | Vanilla dashboard (no bundler, zero deps) |
| `apps/web/` | `@cleanup-hub/web` — Vite + React + TypeScript + Motion |
| `apps/web-next/` | `@cleanup-hub/web-next` — Next.js 14 App Router (experimental) |
| `Makefile` | All make targets |
| `package.json` | pnpm workspace root |
| `turbo.json` | Turbo build pipeline |
| `docs/CHANGELOG.md` | Version history with timestamps |
| `docs/HANDOFF.md` | Current session state and open work |
| `docs/SHORTCUTS.md` | Paste-ready Apple Shortcuts blocks |
| `docs/Design-System.md` | Design tokens and visual language |
| `scripts/report.py` | CSV history sparkline |
| `scripts/remote-cleanup.sh` | curl-pipe-to-bash remote runner |
| `bin/xcc` | CLI wrapper |
| `launchd/` | launchd plist for hourly automation |
| `swiftbar/` | SwiftBar menu-bar plugin |

---

## Credits & License

**Animation:** [Motion](https://motion.dev) (MIT) · **Icons:** [Lucide](https://lucide.dev) (ISC) · **Components:** [Radix UI](https://radix-ui.com) (MIT) · **Build:** [Vite](https://vitejs.dev) + [Turbo](https://turbo.build) (MIT)

**© 2026 Learn Mappers LLC DBA AVERY GOODMAN · All rights reserved · Intellectual property · UCC 1-308**

MIT License — see [`LICENSE`](./LICENSE).
