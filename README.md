<p align="center">
  <img src="assets/icon-hero.svg" width="80" height="80" alt="Dustpan">
</p>

<h1 align="center">🧹 Dustpan</h1>

<p align="center">
  <sub><strong>by AVERY GOODMAN</strong></sub>
</p>

<p align="center">
  <strong>Sweep your Mac clean.</strong>
</p>

<p>
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-22b573?style=flat-square">
  <img alt="macOS 14+" src="https://img.shields.io/badge/macOS-14%2B-94a3b8?style=flat-square">
  <img alt="Python 3 stdlib" src="https://img.shields.io/badge/python-3%20stdlib-3776AB?style=flat-square">
  <img alt="Vite + React" src="https://img.shields.io/badge/vite-%2B%20react-646cff?style=flat-square">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-workspace-f69220?style=flat-square">
  <img alt="No Docker" src="https://img.shields.io/badge/no%20docker-needed-0f766e?style=flat-square">
  <img alt="No pip install" src="https://img.shields.io/badge/no%20pip%20install-needed-0f766e?style=flat-square">
  <img alt="No telemetry" src="https://img.shields.io/badge/no%20telemetry-✓-22b573?style=flat-square">
  <a href="https://github.com/marvelousempire/xcode-cleanup-shortcut/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/marvelousempire/xcode-cleanup-shortcut?color=8b5cf6&style=flat-square"></a>
  <a href="https://github.com/marvelousempire/xcode-cleanup-shortcut/actions/workflows/check.yml"><img alt="CI" src="https://github.com/marvelousempire/xcode-cleanup-shortcut/actions/workflows/check.yml/badge.svg"></a>
</p>

> Your Xcode caches, your Docker volumes, your browser data, your forgotten
> downloads — **every cleanup tells you what it will cost before you click.**
> Local. Auditable. Free.

**Dustpan finds files on your Mac you probably don't need and helps you delete them safely.** Things like the working files Xcode makes when building apps, the giant disk Docker uses internally, browser caches, leftover installers in your Downloads folder, and dozens of other places things pile up. On a Mac that does real work it usually finds **50–150 GB** worth.

The big difference from other "Mac cleaners": Dustpan **tells you exactly what you lose before you click**. Cleaning Chrome's cache? *"The first time you load each website it'll be 1–3 seconds slower."* Cleaning Xcode's working files? *"Your next build will take about 30 extra seconds."* No mystery. No "trust me." No closed source.

---

## ⚡ Three lines to start

Open Terminal on your Mac. Paste these three lines:

```sh
git clone https://github.com/marvelousempire/xcode-cleanup-shortcut.git
cd xcode-cleanup-shortcut
make ui
```

Done. Your browser opens to the dashboard. Other devices on your Wi-Fi (your iPad, your phone, another laptop) can also open it — Terminal will show you the address to type in.

> **No Docker. No `pip install`. No subscription. No telemetry.**
> Dustpan's server is plain Python that comes with every Mac. The dashboard is built once (takes about 6 seconds) and then cached. After that, every run is instant.

Don't want it visible on your Wi-Fi? Run `make ui-local` instead — only your Mac sees it.

---

## 🖥️ What you see when it opens

The dashboard has three things side-by-side at the top, then a grid of category cards underneath.

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

**The sidebar on the left** is the list of categories. Each one shows how many GB it has total. Tiny multi-color rings next to each name show how much is safe to delete, how much needs your okay, and how much should stay.

**The big number in the top-left** is how much disk space you have free right now. It updates live as Dustpan cleans.

**The donut in the middle** shows where your disk space is going. Each color is a different category. Click any slice to jump to that category.

**The black box on the right** is the activity log. When you start cleaning, you'll see every file Dustpan touches scroll by in real time — like a live shipping tracker for your disk space.

---

## 📦 What's in the box

| Feature | What it does |
|---|---|
| 🥧 **Live disk pie chart** | A donut that shows where your gigabytes are going. Each slice is one category. Click a slice → jump to that category. Updates every time you scan. |
| 📊 **Hero free-space counter** | The big GB-free number at the top updates in real time. If anything outside Dustpan frees disk (like Time Machine, or you deleting a file in Finder), the number ticks immediately. |
| 🪟 **Three dashboard versions** | The main one (built with React), a simpler vanilla one, and an experimental Next.js one. All run from the same Python server. |
| 🌗 **Auto / Light / Dark theme** | A switch at the bottom of the sidebar. "Auto" follows your Mac's system setting. Your choice saves so it's the same every time you open Dustpan. |
| 📶 **Wi-Fi access** | By default, `make ui` lets your iPad / phone / other laptop see Dustpan on the same Wi-Fi. The address shows up in Terminal. |
| ⚡ **Live activity log** | A built-in mini-terminal shows every file being scanned or cleaned as it happens. Search through it with `Ctrl+F`. |
| 🚦 **Three safety tiers** | Every path is labeled: **safe** (auto-cleans nicely), **opt-in** (bigger reclaim but you re-cache something), **caution** (we surface it, never auto-delete). |
| 💬 **Cost annotations** | Every cleanup tells you exactly what you're trading. *"Next build takes ~30s longer."* No mystery deletions. |
| 🛡️ **Localhost-only by default** | No data leaves your Mac. No analytics. No telemetry. No "phone home." Ever. |
| 🔌 **Multiple ways to run it** | Web dashboard, Apple Shortcut, menu bar widget, command-line tool, hourly auto-clean, even over SSH to a build Mac. |

---

## 🧹 What Dustpan actually cleans

Eleven categories. Each one has a tier (safe / opt-in / caution) so you know what's happening.

| Category | What it is (plain English) | What you'd get back |
|---|---|---|
| **Xcode** | Apple's app for making iPhone/Mac apps. When you build a project it makes a LOT of working files. They pile up over months. | **10–25 GB.** Your projects are fine — these working files just rebuild next time. |
| **LLMs** | Desktop apps for AI — Claude, Cursor, ChatGPT. They save copies of conversations and download tool data. | 1–15 GB. Your conversations on the cloud are safe; only local copies get cleared. |
| **Docker** | A program developers use to package apps. It builds up huge internal snapshots called "images" and a giant virtual disk file. | 5–60 GB. Same as cleaning Docker yourself, but with a safety check first. |
| **Apps** | Random caches from apps you use daily — Slack, Discord, Zoom, Spotify, Teams. | 0.5–5 GB. They re-download what they need automatically. |
| **Browsers** | Chrome, Safari, Firefox, Edge, Brave, Arc, Vivaldi. Each one saves copies of websites you visit so they reload faster. | 2–20 GB. The first time you visit each site again, it's 1–3 seconds slower. That's the whole cost. |
| **Downloads** | Your `~/Downloads` folder. Dustpan helps you find old installers, leftover .dmg files, and big files you forgot about. You choose what to delete. | 0–50 GB depending on how messy your Downloads is. |
| **Creative** | Adobe (Photoshop, Premiere), DaVinci Resolve, Final Cut Pro, Logic Pro, Blender, OBS. These create giant scratch files while you work. | 5–80 GB on a working creative Mac. Your projects are never touched — only the work-in-progress scratch files. |
| **Temp files** | macOS itself makes temporary files in `/tmp` and `/var/folders`. They're supposed to clean up, but often don't. Plus your Trash. | 0.5–10 GB. They're literally meant to be temporary. |
| **Archives** | Old `.zip`, `.dmg`, `.iso`, `.tar.gz` files lying around in Downloads, Desktop, Documents, and Movies. Dustpan finds them; you decide. | Highly variable. Could be 0 GB, could be 30 GB. |
| **System** | macOS's own caches — icon thumbnails, Spotlight search index, Time Machine local copies, diagnostic reports. | 0.1–20 GB. macOS rebuilds them automatically as needed. |

**Things Dustpan will never auto-delete** (it shows them so you can decide):

Xcode Archives (your App Store crash data), iPhone backups, provisioning profiles, Docker.raw (the big virtual disk), unattached Docker volumes, Lightroom catalogs, DaVinci project databases, Final Cut library structure, Logic projects, OBS scenes.

---

## 🪟 Three versions of the dashboard, one engine underneath

All three connect to the same Python server. They look different but do the same thing.

| Open this URL | You'll see | When to use it |
|---|---|---|
| `http://127.0.0.1:8765` | **Vite + React** dashboard (the main one) | Default. Full pie chart, live updates, theme toggle, animations. |
| `http://127.0.0.1:8765/?legacy=1` | **Vanilla HTML** dashboard | Works in any browser, no JavaScript framework. Same features, simpler engine. Always available even if pnpm isn't installed. |
| `http://127.0.0.1:8765/next/` | **Next.js** dashboard | Experimental. Build it with `make ui-all`. |

---

## 🚀 Every command, explained

Open Terminal in the project folder. Type any of these.

### Running the dashboard

| Command | What it does (plain English) |
|---|---|
| `make ui` | **Most common.** Builds the React dashboard (takes about 6 seconds) and opens it in your browser. Other devices on your Wi-Fi can see it too — Terminal prints the address. |
| `make ui-local` | Same as `make ui` but **only your Mac** sees it. Use when you don't want it on Wi-Fi. |
| `make ui-dev` | For when you're **editing the code yourself**. Two preview servers run side-by-side and refresh the page the second you save a file. |
| `make ui-all` | Builds **both** the React dashboard AND the experimental Next.js one. Takes longer (about 2 minutes). |
| `make ui-legacy` | Opens the simpler dashboard right away. Doesn't need pnpm to be installed. **Use this if you want to start instantly without building anything.** |
| `make ui-next` | Builds only the experimental Next.js dashboard. |

### The AppleScript cleanup (no dashboard needed)

This is the original way Dustpan worked — a Mac script that pops up a confirmation, shows a progress bar, and cleans. The dashboard wraps the same logic with a nice interface.

| Command | What it does (plain English) |
|---|---|
| `make run` | **Cleans your Mac right now.** A pop-up confirms first. A progress bar shows what's happening. A notification at the end tells you how much you freed. |
| `make dry-run` | **Practice mode.** Counts up how much space would be freed, but doesn't actually delete anything. Safe to run anytime to see what's there. |
| `make force` | Normally Dustpan won't bother you if you already have 50+ GB free. This command runs cleanup anyway. |
| `make history` | Shows the **last 20 times Dustpan cleaned**. Date, how it was run, GB freed. Useful for "did I clean recently?" |
| `make report` | Shows a tiny **sparkline chart** of GB freed over the last few weeks. ▁▂▃▄▅▆▇ |
| `make demo` | Pretend mode. Runs through the phases without deleting anything. Useful for **recording a video** of Dustpan. |
| `make check` | Makes sure the AppleScript file is still valid (run this if you edited it). |

### Installing Dustpan permanently

| Command | What it does (plain English) |
|---|---|
| `make install-cli` | Adds a tiny `xcc` command to your Terminal so you can type **just `xcc`** from any folder to run a cleanup. |
| `make install-shortcut` | Adds Dustpan to your Mac's **Shortcuts app**. From there you can pin it to the menu bar or trigger it with a keyboard shortcut. |
| `make install-swiftbar` | Puts a tiny **menu-bar widget** at the top of your screen that shows how many GB you can reclaim. Click it for a menu. Requires SwiftBar (`brew install --cask swiftbar`). |
| `make install-launchd` | Sets up Dustpan to **check every hour** automatically. It only does anything if disk is low — silent otherwise. |

### Help

```sh
make help            # Lists every available command with a one-line description
```

---

## ⚙️ Settings you can change

These are "environment variables." You put them before the command, like:
`XCC_HOST=0.0.0.0 make ui`. Here's what each does.

| Variable | What it does |
|---|---|
| `XCODE_CLEANUP_DRY_RUN=1` | Don't delete anything — just measure how much would be freed |
| `XCODE_CLEANUP_DEMO=1` | Pretend mode — sleeps instead of deleting (for recording videos) |
| `XCODE_CLEANUP_FORCE=1` | Run cleanup even if disk has lots of free space already |
| `XCODE_CLEANUP_AUTO_CONFIRM=1` | Skip the "are you sure?" pop-up (only for scripts) |
| `XCODE_CLEANUP_TMP_PATTERNS=…` | Customize which `/tmp` files to clean. Set to `""` to skip them entirely. |
| `XCODE_CLEANUP_NO_UPDATE_CHECK=1` | Don't ping GitHub to check for new Dustpan releases |
| `XCC_UI_PORT=9000` | Change the dashboard's port (default is 8765) |
| `XCC_HOST=127.0.0.1` | Localhost-only mode (same as `make ui-local`) |
| `XCC_LEGACY_UI=1` | Always serve the vanilla HTML dashboard even if the React one is built |

---

## 🧱 How Dustpan is built

```
my-mac
└─ Dustpan project folder
   │
   ├─ web/
   │   ├─ server.py           ← The web server. Plain Python. ~700 lines.
   │   ├─ cleaners.py         ← All 11 categories and 58 actions defined here.
   │   └─ index.html          ← The vanilla dashboard (no framework).
   │
   ├─ apps/
   │   ├─ web/                ← The React dashboard. Built with Vite + Tailwind + Motion.
   │   └─ web-next/           ← The Next.js dashboard. Experimental.
   │
   ├─ xcode-cleanup.applescript  ← The original cleanup script. Pop-ups + progress bar.
   ├─ Makefile                ← All `make` commands defined here.
   └─ docs/                   ← Changelog, design system, handoff notes.
```

### What happens when you click "Clean ALL safe"

```
   ┌─────────────────────┐
   │   Your browser      │  ← clicks the button
   └─────────┬───────────┘
             │  GET /api/clean-all-safe
             ▼
   ┌─────────────────────┐
   │   web/server.py     │
   │   (Python)          │
   └─────────┬───────────┘
             │  reads list of safe paths
             ▼
   ┌─────────────────────┐
   │   web/cleaners.py   │  ← single source of truth
   │   (the data layer)  │      for every cleanable path
   └─────────┬───────────┘
             │  spawns `rm -rf` for each path
             ▼
   ┌─────────────────────┐
   │   macOS shell       │
   │   (rm, du, find,    │  ← actually deletes the files
   │    docker, xcrun…)  │
   └─────────┬───────────┘
             │  each line of output…
             ▼
   ┌─────────────────────┐
   │   SSE stream        │  ← Server-Sent Events:
   │   /api/clean-all-…  │      a live, one-way channel
   └─────────┬───────────┘      back to the browser
             │
             ▼
   ┌─────────────────────┐
   │   Activity terminal │  ← that black box on the right
   │   in your browser   │      shows the live output
   └─────────────────────┘
```

The dashboard, the AppleScript, the menu bar widget, the SSH version — **all of them talk to `cleaners.py`**. That one file is the brain. When something new should be cleanable, you only have to add it there.

---

## 🐣 What a category looks like in code

If you want to add a new cleanup category, here's the shape of one in `web/cleaners.py`:

```python
"browsers": {
    "label": "Browsers",
    "icon":  "🌐",
    "tagline": "Reclaim 2–20 GB across Chrome / Safari / Firefox / Edge / Brave / Arc.",
    "groups": {
        "safe": [
            ("Chrome cache",     "~/Library/Caches/Google/Chrome"),
            ("Safari cache",     "~/Library/Caches/com.apple.Safari"),
            ("Firefox cache",    "~/Library/Caches/Firefox"),
            # …
        ],
        "probably_safe": [
            ("Chrome history",   "~/Library/Application Support/Google/Chrome/Default/History"),
            # …
        ],
        "caution": [
            ("Chrome cookies (logs you out)", "~/Library/Application Support/Google/Chrome/Default/Cookies"),
            # …
        ],
    },
    "actions": {
        "clean-all-browser-caches": {
            "label": "Clean every browser's cache",
            "desc":  "rm -rf the safe-tier folders across all installed browsers.",
            "cost":  "First page-load on each site re-fetches assets (~1–3s per site). No logins lost.",
            "shell": "rm -rf ~/Library/Caches/Google/Chrome/* ~/Library/Caches/com.apple.Safari/* …",
        },
    },
},
```

The three keys you'll always set: **`groups`** (the paths, sorted by safety), **`actions`** (one-click cleanup buttons with the *cost* spelled out in plain English), and **`tagline`** (the one-liner that shows on the category card).

That's the whole pattern. Read [`web/cleaners.py`](./web/cleaners.py) — every category in Dustpan is just that shape repeated.

---

## 🆚 How Dustpan is different from CleanMyMac and other paid cleaners

| | **Dustpan** | CleanMyMac | DevCleaner | Doing it yourself in Terminal |
|---|---|---|---|---|
| **You can read every line of what it does** | ✓ All open source, MIT | ✗ Closed binary | ✗ Closed | n/a |
| **Knows Xcode-specific things** (skips Archives, only wipes unavailable simulators) | ✓ | partly | ✓ | up to you |
| **Tells you the cost of each action in plain English** | ✓ | ✗ | ✗ | ✗ |
| **Has a "measure before deleting" mode** | ✓ | partly | ✗ | ✗ |
| **Handles Browsers, Downloads, Archives** | ✓ | partly | ✗ | manual |
| **Updates the disk-free number live as you clean** | ✓ | ✗ | ✗ | ✗ |
| **Lets other devices on Wi-Fi see it** | ✓ | ✗ | ✗ | ✗ |
| **Five different ways to run it** (web · Shortcut · menu bar · CLI · over SSH) | ✓ | ✗ | ✗ | shell only |
| **No Docker, no `pip install`, no subscription, no telemetry** | ✓ | ✗ | partly | ✓ |
| **Price** | **$0** | $30–50/year | $5 one-time | $0 |

The most important row is the first one. CleanMyMac will never let you see what it actually does. Dustpan will never *not* let you.

---

## 🌐 Running Dustpan on a different Mac (build server, NAS, Mac mini in the closet)

You can run Dustpan on **any Mac on your network** and use it from your main computer. Useful for:

- A **build server Mac** that runs Xcode and accumulates 50+ GB of DerivedData a week
- A **Mac mini in the closet** you forget about and never check
- An **older Mac** you use for testing apps

Two options:

**Option A — SSH into it and run `make ui`:**

```sh
ssh you@buildserver.local
cd ~/Developer/xcode-cleanup-shortcut   # clone there first
make ui                                  # by default this exposes Wi-Fi
```

Then on your main Mac, open the Network URL Terminal printed (e.g. `http://192.168.1.50:8765`). You're now controlling that Mac's Dustpan from this Mac.

**Option B — `make install-launchd` so it auto-runs every hour:**

```sh
ssh you@buildserver.local
cd ~/Developer/xcode-cleanup-shortcut
make install-launchd
```

That installs a background service that runs Dustpan every hour. It does **nothing** when disk is healthy. Only kicks in when free space drops.

**Option C — single-line SSH cleanup with no install:**

See [`docs/SHORTCUTS.md`](./docs/SHORTCUTS.md) for a paste-ready *Run Script Over SSH* shortcut. You don't have to clone Dustpan on the remote Mac at all — the shortcut runs the script over SSH in-place.

---

## 🗺️ Where things live

| Path | What it is |
|---|---|
| `xcode-cleanup.applescript` | The original cleanup script. ~250 lines of Mac automation. |
| `web/server.py` | The web dashboard's server. Plain Python. Routes, SSE, network mode, all in one file. |
| `web/cleaners.py` | **The data layer.** Every category, every path, every action — all defined here. |
| `web/index.html` | The vanilla HTML dashboard. No framework. Works as a fallback. |
| `apps/web/` | The Vite + React dashboard (`@cleanup-hub/web`). |
| `apps/web-next/` | The Next.js dashboard (`@cleanup-hub/web-next`). Experimental. |
| `Makefile` | Every `make` command defined here. |
| `package.json` | The pnpm workspace root. |
| `turbo.json` | The Turbo build pipeline (handles building multiple apps in parallel). |
| `docs/CHANGELOG.md` | What changed in every version, with timestamps. |
| `docs/HANDOFF.md` | Notes for picking up a new coding session. |
| `docs/SHORTCUTS.md` | Apple Shortcuts paste-blocks (Run Shell Script / Run Over SSH / Run AppleScript). |
| `docs/Design-System.md` | The design tokens (colors, typography, motion). |
| `scripts/report.py` | Generates the sparkline chart for `make report`. |
| `scripts/remote-cleanup.sh` | The `curl | bash` runner for cleaning a remote Mac without cloning. |
| `bin/xcc` | The CLI wrapper installed by `make install-cli`. |
| `launchd/` | The `.plist` file for the hourly auto-clean service. |
| `swiftbar/` | The menu-bar plugin. |

---

## Credits & License

**Animation:** [Motion](https://motion.dev) (MIT) · **Icons:** [Lucide](https://lucide.dev) (ISC) · **Components:** [Radix UI](https://radix-ui.com) (MIT) · **Build:** [Vite](https://vitejs.dev) + [Turbo](https://turbo.build) (MIT)

**© 2026 Learn Mappers LLC DBA AVERY GOODMAN · All rights reserved · Intellectual property · UCC 1-308**

MIT License — see [`LICENSE`](./LICENSE). Free to use, fork, modify. Just don't claim you made it.
