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
> downloads, *and disk space locked by previous users of this Mac* — **every cleanup tells you what it will cost before you click.**
> Local. Auditable. Free. Now with an AI agent you can chat with.

**Dustpan finds files on your Mac you probably don't need and helps you delete them safely.** Things like the working files Xcode makes when building apps, the giant disk Docker uses internally, browser caches, leftover installers in your Downloads folder, and dozens of other places things pile up. On a Mac that does real work it usually finds **50–150 GB** worth.

The big difference from other "Mac cleaners": Dustpan **tells you exactly what you lose before you click**. Cleaning Chrome's cache? *"The first time you load each website it'll be 1–3 seconds slower."* Cleaning Xcode's working files? *"Your next build will take about 30 extra seconds."* No mystery. No "trust me." No closed source.

**Three new superpowers as of v0.25:**
- 💬 **Chat with SADPA** — a conversational AI agent (bring your own Anthropic or OpenAI key) that can measure your disk, drill into folders, run cleanups *after you approve*, and even propose new cleaners DustPan should know about.
- 🔒 **Unlock space locked by previous users** — finds Homebrew owned by "olivia" from when she had the Mac, old `/Users/<name>/` home directories still on disk, and other multi-user cruft. Often **5–50 GB**. Shows the exact `sudo` command, never runs it for you.
- 🚨 **Emergency Rescue panel** — when the disk is at zero and nothing else works, six numbered commands that recover space in under 60 seconds, with live output streaming to a terminal in the app.

---

## 🚀 Quick start

### One command (no Docker, no pip)

Open Terminal on your Mac. Paste these three lines:

```sh
git clone https://github.com/marvelousempire/xcode-cleanup-shortcut.git
cd xcode-cleanup-shortcut  # (repo folder)
make ui
```

Your browser opens to the dashboard. **Both URLs print at startup:**

| URL | Who can see it |
|---|---|
| `http://127.0.0.1:8765` | Only your Mac |
| `http://192.168.X.X:8765` | Any device on the same Wi-Fi (your iPad, phone, another laptop) |

> **No Docker. No `pip install`. No subscription. No telemetry.**
> Dustpan's server is plain Python that comes with every Mac. The dashboard is built once (takes about 6 seconds) and then cached. After that, every run is instant.

### Don't want it on your Wi-Fi?

```sh
make ui-local
```

Same dashboard. Only your Mac can reach it. Use this when you're on a coffee-shop network or somewhere you don't trust.

### To update later — always use `make update`

```sh
make update
```

Pulls the latest DustPan from `main` no matter what branch you're on. **Do not run `git pull` directly** — if you're on a stale feature branch, git will fail with `"There is no tracking information for the current branch"` and that error message is not designed for humans. `make update` handles every branch state, warns you about uncommitted changes, and shows what changed when it's done.

### Something feels off? Run `make doctor`

```sh
make doctor
```

Prints your current branch, git status, DustPan version, pnpm + Python versions, whether the dashboard is built, and how much disk you have free. Use this when you want to file a bug or just confirm things look right.

---

## 🖥️ What you see when it opens

The dashboard has three things side-by-side at the top, then a grid of category cards underneath.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ← Sidebar                          Main viewport                         │
│  ┌──────────────┐                                                          │
│  │ Overview     │ ┌──── Hero ────┐ ┌── Disk pie ──┐ ┌── Activity ──────┐  │
│  │ Xcode        │ │  12.1 GB free│ │   42.8 GB    │ │ Filter lines…    │  │
│  │ LLMs         │ │  94% used    │ │   scanned    │ │ → Scanning…      │  │
│  │ Docker       │ │  ▓▓▓▓▓▓▓▓▓░ │ │  🟢🟣🔵🟡🟤 │ │ ✓ 6.4 GB freed   │  │
│  │ Apps         │ │  Factory-    │ │  Xcode 2.2GB │ │ in 3.1s          │  │
│  │ Browsers     │ │  fresh w/o   │ │  Docker 14.6 │ │                  │  │
│  │ Downloads    │ │  losing your │ │  LLMs  12.4  │ │ [Auto][Light][🌙]│  │
│  │ Creative     │ │  stuff       │ │  …           │ │                  │  │
│  │ Temp         │ └──────────────┘ └──────────────┘ └──────────────────┘  │
│  │ Archives     │                                                          │
│  │ System       │ ── Re-scan everything ── ✓ Clean ALL safe · 6.4 GB ───  │
│  │──────────────│                                                          │
│  │ 💬 Chat       │ ┌ Xcode ──────┐ ┌ LLMs ───────┐ ┌ Docker ─────────┐    │
│  │   w/ SADPA[2]│ │ 6.4 GB safe │ │ 0.0 GB safe │ │ 0.0 GB safe     │    │
│  │ 📊 Survey     │ │ 0.2 GB opt-in│ │ 12.4 GB opt │ │ 0.0 GB opt-in   │    │
│  │ 🚨 Emergency  │ │ ● 2.0 caution│ │             │ │ ● 14.6 caution  │    │
│  │ ✨ SADPA      │ └──────────────┘ └──────────────┘ └──────────────────┘  │
│  │ ⚙️  Settings  │                                                          │
│  │──────────────│                                                          │
│  │  THEME       │                                                          │
│  │[Auto][☀][🌙]│                                                          │
│  └──────────────┘                                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

**The sidebar on the left** is the list of categories. Each one shows how many GB it has total. Tiny multi-color rings next to each name show how much is safe to delete, how much needs your okay, and how much should stay.

**The big number in the top-left** is how much disk space you have free right now. It updates live as Dustpan cleans.

**The donut in the middle** shows where your disk space is going. Each color is a different category. Click any slice to jump to that category.

**The black box on the right** is the activity log. When you start cleaning, you'll see every file Dustpan touches scroll by in real time — like a live shipping tracker for your disk space.

**The bottom of the sidebar** has five extra surfaces — the things that make DustPan more than a category cleaner. They're explained in the four sections below.

---

## 💬 Chat with SADPA — your AI disk co-pilot

> *"It could have access to my computer. Look around my computer, suggest things and use dustpan as a tool, this thing should be so smart that it would even suggest tools that he needs to build to add to the app."*

Drop in an **Anthropic** or **OpenAI** API key in Settings → AI. Open the **💬 Chat with SADPA** tab. Now you have a conversational disk-recovery expert.

SADPA stands for **Smart Auto-Detector Protector Agent**. It has access to 15 curated tools — never raw shell — including measuring paths, listing directories, scanning categories, running pre-vetted cleanups, and proposing new ones DustPan should learn about.

### What it can do, in plain English

| Ask SADPA… | What happens |
|---|---|
| *"What's eating my disk?"* | Calls `get_disk_status` + `get_doctor_report`, returns a ranked list with real measured sizes — never speculation. |
| *"Show me everything bigger than 5 GB in `~/Library/Containers`."* | Calls `list_directory`, returns sized children, drills into the big ones with `measure_path`. |
| *"Find caches you don't already track."* | Explores known cache locations, finds something new (say JetBrains caches), calls `propose_new_cleaner` — the proposal lands in a review inbox at the bottom of the chat. |
| *"Clean my Xcode DerivedData."* | Surfaces an **approval card** with the action's curated description + cost pulled straight from `cleaners.py`. You click [✓ Approve] or [✕ Reject]. |
| *"Is any disk space locked by other user accounts?"* | Calls `find_foreign_ownership` — see the next section. |

### Approval, by default

Action tools (anything that deletes) show an **approval card** before running:

```
⚠️  SADPA wants to run this
    Run 'Clear Xcode Build Cache (DerivedData)' in Xcode
    Removes ~/Library/Developer/Xcode/DerivedData/* — Xcode's scratch pad…
    Cost: One slightly slower Xcode build. That's it.

    [✓ Approve]  [✕ Reject]
```

The `desc` and `cost` text comes from `cleaners.py`, not the AI — so the warning is curated, never hallucinated. A Settings toggle (*"Trust the AI to run safe-tier cleanups without asking"*) flips approval to automatic for paths in the `safe` group — defaults off.

### Filesystem peek is sandboxed

The agent can read sizes and list directories under `~/Library`, `~/Developer`, `~/Documents`, `~/Downloads`, `~/Desktop`, `/Applications`, and common dev caches (`~/.npm`, `~/.cargo`, `~/.pnpm-store`, etc.).

**Hard-blocked**: `/System`, `/etc`, `/usr`, `/bin`, `~/.ssh`, `~/.aws`, `~/.gnupg`, `~/Library/Keychains`, `~/Library/Mail`, `~/Library/Messages`, iOS backup folders. The validator resolves symlinks first so you can't sneak through them.

### Proposals inbox

When SADPA finds a cache DustPan doesn't already cover, it can call `propose_new_cleaner`. The proposal goes to an inbox below the chat with **[✓ Accept & generate snippet]** / **[✕ Dismiss]** buttons.

Accept generates a **paste-ready Python snippet** for `cleaners.py` with the right tuples, tiers, and an optional action block:

```python
# ── Proposed by AI agent: JetBrains IDE Caches ──
# Target category: 'apps'
# Rationale: IntelliJ, PyCharm, WebStorm keep large indexes/caches in ~/Library/Caches/JetBrains.
# Cost: IDE re-indexes on next launch (~30 sec).

# Tier: safe
    ("IntelliJ caches", "~/Library/Caches/JetBrains/IntelliJIdea2024.1"),
    ("PyCharm caches",  "~/Library/Caches/JetBrains/PyCharm2024.1"),
```

You copy. You paste. You commit. **The file stays hand-curated** — the AI hands you a draft, never a mutation. The sidebar shows a pending-proposal badge so you don't lose track.

### Providers

Real tool-use loop for **Anthropic** (Claude) and **OpenAI** (GPT-4 family). Other providers (Perplexity, Groq, Gemini, Ollama) work in text-only mode with a banner — they don't have tool-calling APIs DustPan can leverage. Keys are stored in macOS Keychain (Docker mode → encrypted Postgres).

---

## 🔒 Unlock space locked by previous users

Macs that have been passed between users, migrated from another account, or shared with family members accumulate **disk space you literally can't touch** under your current login. The classic case: Homebrew installed by a previous user named "olivia" — `/opt/homebrew` is owned by her account, `brew install anything` fails for you. Or `/Users/<oldname>/` is still sitting on disk taking 30 GB.

DustPan's **Space Survey** finds all of it:

```
🔒 Locked by previous users — 38.4 GB recoverable

  1   12 GB    Homebrew at /opt/homebrew (installed by 'olivia')        owner: olivia
              ▼ Expand to see the takeover command
  2   24 GB    Old user home: /Users/abrownsanta                         owner: abrownsanta (gone)
              ▼ Both delete and chown options shown
  3   2.4 GB   Old user home: /Users/Guest                               owner: uid-201
```

Click any row to expand. The card shows the exact command in monospace with a **[📋 Copy]** button:

```bash
sudo chown -R $(whoami) /opt/homebrew
```

DustPan **never** runs `sudo` on its own. That's deliberate — ownership transfer is a permanent filesystem change, and the macOS password prompt is the correct consent gate. You copy, you paste into Terminal, macOS prompts you for your Mac password, done. After that, `brew` works under your account.

For old user homes the card shows *both* options — delete (frees the full size immediately) or chown (keeps the data but makes it yours) — so you can decide based on whether you need their files.

This is also a tool the AI agent can call (`find_foreign_ownership`) — ask it *"Is any disk space locked by other users?"* and you get the same scan in conversational form.

---

## 🚨 Emergency Rescue — when the disk is at zero

When `df -h /` shows `0 bytes free` and macOS starts refusing to do anything, the **🚨 Emergency Rescue** tab is the one-stop panel. Six numbered command cards, each with a plain-English explanation, the exact shell command in monospace, and a **▶ Run this** button that streams live output to the terminal at the bottom of the screen.

```
① Xcode Build Cache (DerivedData)        typically 5–20 GB    [▶ Run this]
② Xcode Device Debug Files               typically 2–8 GB     [▶ Run this]
③ macOS Photo Recognition Cache          typically 2–5 GB     [▶ Run this]
④ Xcode Documentation Index              typically 1–5 GB     [▶ Run this]
⑤ Docker: Remove Unused Images           typically 2–20 GB    [▶ Run this]
⑥ Check Disk Space Right Now             read-only            [▶ Run check]

[▶▶ Run All Emergency Commands Now]
```

Plus two **read-only diagnostic** cards above for the foreign-ownership case:

```
🔒  Find space locked by previous users   [▶ Run check]
🍺  Get the Homebrew takeover command     [▶ Run check]
```

**The Smart Auto-Detector Protector Agent watches your free space in real time.** When it drops below 1 GB, DustPan auto-navigates you to the Emergency Rescue panel — no clicking required. When it drops below 10 GB, a full background scan kicks off so the quick-wins and survey panels have real data when you get to them.

---

## 📊 Space Survey — the comprehensive crawl

The Space Survey goes **beyond** DustPan's predefined categories. A single click triggers a parallel filesystem crawl that finds:

- **Claude Code worktrees** anywhere under your home (`~/Developer/*/.claude/worktrees/`) with per-worktree size breakdown and merge status — *"`compassionate-chaum` 1.7 GB ✓ merged"*
- **Stale build artifacts** (`.next`, `.next-local`, `dist`, `build`) over 200 MB in `~/Developer`, `~/Documents`, `~/Projects`, `~/Code`
- **Large `node_modules`** over 500 MB outside predefined paths
- **Known high-value caches** measured fresh (Docker.raw, Cursor, mediaanalysisd, pnpm store, Homebrew Cellar, ~/.cache, etc.)
- **Foreign-owned paths** (see previous section)

Results stream in **live** as each target is found, sorted by size. After the scan completes, a **"Recommended order"** section lays out the cleanup sequence (easy targets first, biggest wins first), and a separate **"🚫 Probably not worth touching"** section explains why some big-looking things (like `mediaanalysisd` — macOS rebuilds it within hours) aren't worth deleting.

Each card expands to show the rationale, rebuild cost, exact shell command, and direct links to either the Emergency Rescue panel or the relevant category.

---

## 🛠️ Under the hood

The complete tech stack. Six surfaces, each built for its own constraints. If you're contributing or curious — this is everything that goes into making Dustpan run.

### TL;DR — surfaces at a glance

| Surface | Stack | Why this stack |
|---|---|---|
| 🐍 **Backend** | Python 3 stdlib (`http.server` + threading) | Ships on every Mac. Zero pip installs. Auditable in ~700 readable lines. |
| ⚡ **Main dashboard** | Vite 6 + React 18 + TypeScript 5.7 + Tailwind 3.4 + Motion 11 | Fast cold build (~6s), HMR for dev, premium animation feel, Apple-native typography |
| 📰 **Fallback dashboard** | Vanilla HTML + Motion via CDN | Works the second after `git clone` — no `pnpm install` required |
| 🧪 **Experimental UI** | Next.js 14 (App Router, static export) | Future surface; statically exported so backend stays Python |
| 🎭 **Cleanup engine** | AppleScript + macOS shell | Native pop-ups, progress bars, notifications. Runs without a server. |
| 🚀 **Install surfaces** | Shortcut · CLI · launchd · SwiftBar · SSH | One cleanup source, five ergonomic entry points |

### 🐍 Backend (`web/server.py` + `web/cleaners.py`)

| Layer | Tool | What it handles |
|---|---|---|
| Runtime | **Python 3.9+ stdlib only** | No `pip install`. Ships on every Mac since Monterey. |
| HTTP | `http.server.BaseHTTPRequestHandler` | Routing, response writing, content types |
| Concurrency | `ThreadingTCPServer` + `threading.Lock` | One thread per request; lock-protected in-flight clean registry |
| Streaming | Server-Sent Events (`text/event-stream`) | `/api/live` channel + per-clean output streams |
| Network | `socket` + `XCC_HOST` env var | Toggle between `127.0.0.1` (localhost-only) and `0.0.0.0` (Wi-Fi visible) |
| LAN discovery | Zero-packet UDP socket to `8.8.8.8` | OS picks the outbound interface → reveals primary LAN IP for the Network URL |
| Subprocess | `subprocess.Popen` + `subprocess.run` | Shells out to `rm`, `du`, `find`, `xcrun`, `docker`, `osascript` |
| Data layer | [`web/cleaners.py`](./web/cleaners.py) | 11 categories · 17 sub-tools · 58 actions — single source of truth |
| Static serving | `apps/web/dist/` + `apps/web-next/out/` + `web/index.html` | Serves whichever frontend the URL asks for |

**Why this stack.** Dustpan's brand promise is *"no Docker, no pip install, no telemetry."* Python is on every Mac. The whole server is auditable in one file. Anyone can read it, understand it, and verify it isn't doing anything sneaky.

### ⚡ Main dashboard (`apps/web/` = `@dustpan/web`)

| Layer | Tool | What it handles |
|---|---|---|
| Framework | **React 18.3** + **TypeScript 5.7** | UI + types |
| Build | **Vite 6** (`vite build`, `vite dev`) | Production bundle ~120 KB JS gz + ~6 KB CSS gz · builds in ~6s · HMR for dev |
| Styling | **Tailwind CSS 3.4** + `tailwindcss-animate` | Utility-first styling |
| Tokens | HSL CSS custom properties | Light + Dark + explicit `[data-theme]` override (all three activation paths) |
| Typography | **Apple SF Pro Display** + **SF Pro Text** | Native Mac type via `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro"...` |
| Animation | **Motion 11** (`motion/react`) | Springs, layout-aware tweens, `AnimatePresence` |
| Components | **Radix UI** primitives (1.x) | `@radix-ui/react-dialog`, `react-scroll-area`, `react-separator`, `react-tooltip`, `react-slot` |
| Icons | **Lucide React 0.469** | All glyphs throughout the UI |
| Utils | `clsx` + `tailwind-merge` + `class-variance-authority` | `cn()` helper + variant patterns |
| State | Hand-rolled `DashboardContext` (`useState` + `useEffect`) | No Redux/Zustand — Context is sufficient |
| Real-time | Native `EventSource` | Subscribed to `/api/live` with exponential backoff reconnect |
| Theme | Pre-paint inline `<script>` in `index.html` | Applies saved theme **before React mounts** — no flash on cold load |

**Why this stack.** Vite is the fastest cold-build path in the React ecosystem. Motion 11 gives the cinematic spring physics the maintainer specified. Radix gives accessibility primitives for free (Dialog focus trapping, ESC handling, Portal). Apple's SF Pro Display + Text resolve automatically on macOS via the system-ui stack — no fonts to host, no FOUT.

### 📰 Fallback dashboard (`web/index.html`)

| Layer | Tool | What it handles |
|---|---|---|
| Build | **None** | Single self-contained HTML file. No bundler. |
| Animation | **Motion 11** via `cdn.jsdelivr.net/npm/motion@11.18.0/+esm` | Loaded as an ES module; gracefully degrades if CDN unreachable |
| Icons | Inline SVGs (Lucide source) | Hand-pasted for offline use |
| API contracts | Same `/api/*` endpoints as Vite app | Identical scan/clean flow, different render engine |

**Why this stack.** Works the second after `git clone` without `pnpm install`. The demo/airgap path. If pnpm isn't installed, `make ui` falls back to serving this — the user never sees an error.

### 🧪 Experimental dashboard (`apps/web-next/` = `@dustpan/web-next`)

| Layer | Tool | What it handles |
|---|---|---|
| Framework | **Next.js 14.2** (App Router) | Router + RSC patterns |
| Mode | `output: "export"` (static export) | Pre-rendered HTML + `_next/static/*` chunks. No Node runtime in production. |
| basePath | `/next` | Coexists with the Vite app at root |
| Tailwind | Same token system as `apps/web` | Mirrored, not shared — keeps the apps loosely coupled |

**Why this stack.** A future surface to explore Next-specific patterns (server components, route groups, parallel routes) without coupling them to the canonical Vite UI. Static export keeps the Python backend as the only runtime — no Node needed in production.

### 🎭 Cleanup engine ([`dustpan.applescript`](./dustpan.applescript))

| Layer | Tool | What it handles |
|---|---|---|
| Language | **AppleScript** (~250 lines) | The original Dustpan script — predates the web dashboard |
| Native UI | `display alert` · `display notification` · `progress total steps` | Real macOS modals, progress bars, system notifications |
| Shell-out | `do shell script` | Runs `rm -rf`, `du`, `xcrun simctl delete unavailable`, etc. |
| Logging | `~/Library/Logs/dustpan.log` + CSV | Consumed by [`scripts/report.py`](./scripts/report.py) for the sparkline chart |
| Update check | Once-daily `curl` to GitHub Releases API (cached 24h) | Tells you when a new Dustpan is out |

**Why this stack.** Native macOS feel. Zero dependencies. Runs without any server. Anyone with a Mac can `osascript dustpan.applescript` and it just works.

### 🚀 Install surfaces

| Surface | File | What it does |
|---|---|---|
| **`xcc` CLI** | [`bin/xcc`](./bin/xcc) | Wrapper installed to `~/.local/bin/` by `make install-cli` |
| **Apple Shortcut** | `make install-shortcut` | Registers the AppleScript with Shortcuts.app — pin to menu bar, bind a hotkey |
| **launchd** | [`launchd/com.marvelousempire.dustpan.plist`](./launchd/) | Hourly auto-clean; threshold-gated so it's silent when disk is healthy |
| **SwiftBar plugin** | [`swiftbar/dustpan.30m.sh`](./swiftbar/) | Menu-bar widget showing reclaimable GB; click for inline actions |
| **Remote SSH runner** | [`scripts/remote-cleanup.sh`](./scripts/remote-cleanup.sh) | `curl \| bash` runner for cleaning a remote Mac without cloning |

**Why this stack.** One source of cleanup logic, five different ergonomic entry points so every workflow has its preferred surface — GUI for the casual session, CLI for the build server, menu bar for the live indicator, Shortcut for the keyboard hotkey, SSH for the remote.

### 🧰 Build & tooling

| Layer | Tool | What it handles |
|---|---|---|
| Package manager | **pnpm 9** (workspace mode) | `apps/*` glob, single lockfile |
| Monorepo orchestration | **Turbo 2** | `turbo run build / dev / typecheck / lint` — parallel + cached |
| Type-check | **TypeScript 5.7** strict mode | `tsc --noEmit` runs in CI + on every build |
| PostCSS | **Autoprefixer 10** + Tailwind 3.4 | Vendor prefixes + utility CSS |
| Vite plugin | **`@vitejs/plugin-react` 4.3** | Fast Refresh + JSX transform |
| CI | **GitHub Actions** ([`.github/workflows/check.yml`](./.github/workflows/check.yml)) | AppleScript syntax + Python import + TS strict — every push |
| Auto-release | GitHub Actions on `main` merge | Squash-merges tag the release and publish; PR title becomes the release name |
| Dev experience | `make ui-dev` → `pnpm turbo run dev` | Vite HMR (`:5174`) + Next dev (`:5175`) in parallel |

**Why this stack.** Fast, type-safe, parallel builds. No Docker, no Node runtime needed in production (the React app builds to static HTML+JS that Python serves). Turbo's caching means a no-op `make ui` is instant.

---

### 🐳 Future apps that need state

Dustpan is **stateless** — it scans your disk and shells out to `rm`. There's nothing to persist, so it ships without Docker. That's the whole reason `make ui` is one line.

If you're cloning Dustpan as a starter for a *new* app that **does** need a database, don't add SQLite or Homebrew Postgres alongside this code. The org convention is binary:

> **Needs state? → Docker. No state? → no Docker.**

The canonical Docker stack (cloned from [`marvelousempire/claude-chat-reader`](https://github.com/marvelousempire/claude-chat-reader)) lives in the `app-launch-workflow` skill and is ready to copy-paste:

```sh
mkdir my-new-app && cd my-new-app
cp -r ~/Developer/ai-skills-library/rules/library/app-launch-workflow/templates/docker-stack/* .
./go
```

What you get: `app + db + caddy` services, **HTTPS out of the box** (one-time `caddy trust` for localhost, automatic Let's Encrypt in prod), Postgres + pgvector ready for both regular SQL and AI/RAG, security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy), and the same `make backup / restore / reset / export` UX. Full template + docs: [`ai-skills-library/.../templates/docker-stack/`](https://github.com/marvelousempire/ai-skills-library/tree/main/rules/library/app-launch-workflow/templates/docker-stack).

---

> **When this section changes.** Update this section whenever a dependency is added/removed, or a major version of any tool changes (React 18 → 19, Vite 6 → 7, Tailwind 3 → 4, etc.). Treat it as a living document — the README is the prototype for every future app shipped from this org, and this section is the contract for what each one's tech stack inventory should look like.

---

## 🧹 What Dustpan actually cleans

Thirteen categories. Each one has a tier (safe / opt-in / caution) so you know what's happening before anything is deleted.

> **Need Full Disk Access?** macOS blocks size measurement for protected directories (Downloads, Safari, Notes, iCloud, device backups) without it. If sections show 0 GB, the app will tell you exactly what to grant and how.

| Category | What it is (plain English) | What you'd get back |
|---|---|---|
| 🔥 **Space Eaters** | The stuff nobody told you about — npm/pip/Cargo/Gradle/Go/Yarn package caches, Ruby gems, CocoaPods. These accumulate silently from everyday development work. | **2–30 GB.** Every cache is 100% auto-rebuilt the next time you run the tool. Nothing installed is removed. |
| ☁️ **iCloud Drive** | Files synced from iCloud that are stored as local copies on your Mac. Notes with embedded photos (receipts, screenshots) can hit 10–30 GB alone. Dustpan uses `brctl evict` — files stay on iCloud and re-download when you open them. | 1–50 GB. Completely reversible. Files never leave iCloud. |
| 🔨 **Xcode** | Apple's app for building iPhone/Mac apps. Every build creates working files that pile up for months. | **10–25 GB.** Your projects are fine — these files rebuild next time you compile. |
| 🤖 **LLMs** | Desktop AI apps — Claude, Cursor, ChatGPT. They download tool data and save local conversation copies. | 1–15 GB. Your cloud conversations are safe; only local copies are cleared. |
| 🌐 **Browsers** | Chrome, Safari, Firefox, Edge, Brave, Arc, Vivaldi. Plus `~/Library/WebKit` — the shared offline storage all of them use — which is almost never cleaned. | 2–20 GB. The first visit to each site after cleaning is 1–3 seconds slower. That's it. |
| 💬 **Apps** | Telegram (5–20 GB in its group container), Slack, Discord, Zoom, Teams, Spotify, VS Code, Figma, WhatsApp, Signal. Their caches rebuild automatically. | 0.5–25 GB depending on what's installed. |
| 🐳 **Docker** | Builds up internal snapshots ("images") and a giant virtual disk file (Docker.raw). | 5–60 GB. Same as running Docker cleanup yourself, with safety checks. |
| 📥 **Downloads** | Your `~/Downloads` folder. Dustpan surfaces old installers, leftover .dmg files, and big files you forgot about. You decide what to remove. | 0–50 GB depending on how old your Downloads folder is. |
| 🎨 **Creative** | Adobe (Photoshop, Premiere), DaVinci Resolve, Final Cut Pro, Logic Pro, Blender, OBS. Giant scratch files accumulate while you work. | 5–80 GB on an active creative Mac. Your projects are never touched — only the scratch files. |
| 🧹 **Temp files** | macOS temp directories (`/tmp`, `/var/folders`). They're supposed to clean themselves; they often don't. Plus your Trash. | 0.5–10 GB. Literally meant to be temporary. |
| 📦 **Archives** | Old `.zip`, `.dmg`, `.iso`, `.tar.gz` files in Downloads, Desktop, Documents. Dustpan finds them by file type; you decide. | Highly variable — 0 to 30+ GB depending on your habits. |
| 💾 **System** | macOS's own caches — icon thumbnails, Spotlight parser, CloudKit, diagnostic reports, app logs. | 0.1–10 GB. macOS rebuilds them automatically. |

**Things Dustpan surfaces but never auto-deletes** (shows sizes so you can decide):

iOS/iPadOS device backups, Steam game installs, Docker.raw, iCloud Notes attachments, Lightroom catalogs, DaVinci project databases, Final Cut library structure, Logic projects, OBS scenes, app cookies and login data.

> **Finder sidebar stays safe.** Dustpan explicitly excludes `~/Library/Application Support/com.apple.sharedfilelist` (your sidebar favorites) and `~/Library/Preferences/` (all app settings) from every clean tier.

---

## ⚡ Quick CLI — one-shot commands (no app needed)

Copy any of these into Terminal and run. No Dustpan install needed.
Every command here is **safe** — it only deletes caches that macOS or the app rebuilds automatically. Nothing you created is touched.

> **Shortcut:** Bookmark this section. When your Mac slows down or your disk is full, open this README on GitHub, grab a command, paste it into Terminal.

---

### 🏆 The big one — all safe caches in one shot

Typically frees **5–25 GB**. Safe on any Mac. Everything below is included.

```sh
rm -rf \
  ~/Library/Developer/Xcode/DerivedData \
  ~/Library/Developer/Xcode/iOS\ DeviceSupport \
  ~/Library/Developer/Xcode/watchOS\ DeviceSupport \
  ~/Library/Developer/Xcode/tvOS\ DeviceSupport \
  ~/Library/Caches/com.apple.dt.Xcode \
  ~/Library/Caches/org.swift.swiftpm \
  ~/Library/org.swift.swiftpm \
  ~/Library/Caches/Google/Chrome \
  "~/Library/Application Support/Google/Chrome/Default/Code Cache" \
  "~/Library/Containers/com.apple.Safari/Data/Library/Caches" \
  ~/Library/WebKit \
  ~/Library/Caches/com.apple.WebKit.WebContent \
  ~/Library/Caches/Firefox \
  ~/Library/Caches/BraveSoftware \
  "~/Library/Caches/Microsoft Edge" \
  "~/Library/Application Support/Slack/Cache" \
  "~/Library/Application Support/Slack/Code Cache" \
  "~/Library/Application Support/discord/Cache" \
  ~/Library/Caches/us.zoom.xos \
  ~/Library/Caches/com.spotify.client \
  ~/Library/Caches/CocoaPods \
  ~/Library/Caches/pip \
  ~/.cache/pip \
  2>/dev/null
xcrun simctl delete unavailable 2>/dev/null
echo "✓ Done. Run: df -h /"
```

---

### By category — grab just what you need

| Target | What it frees | Command |
|---|---|---|
| **Xcode DerivedData** | 5–20 GB | `rm -rf ~/Library/Developer/Xcode/DerivedData` |
| **Xcode DeviceSupport** | 2–10 GB | `rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport ~/Library/Developer/Xcode/watchOS\ DeviceSupport ~/Library/Developer/Xcode/tvOS\ DeviceSupport` |
| **Xcode + SwiftPM caches** | 0.5–3 GB | `rm -rf ~/Library/Caches/com.apple.dt.Xcode ~/Library/Caches/org.swift.swiftpm ~/Library/org.swift.swiftpm` |
| **Unavailable simulators** | 1–5 GB | `xcrun simctl delete unavailable` |
| **All browser caches + WebKit** | 1–10 GB | see block below |
| **Telegram media cache** | 2–20 GB | `rm -rf "~/Library/Group Containers/6N38VWS5BX.ru.keepcoder.Telegram/stable/postbox/media"` |
| **Slack all caches** | 0.5–3 GB | `rm -rf "~/Library/Application Support/Slack/Cache" "~/Library/Application Support/Slack/Code Cache" "~/Library/Application Support/Slack/GPUCache"` |
| **Discord all caches** | 0.5–2 GB | `rm -rf "~/Library/Application Support/discord/Cache" "~/Library/Application Support/discord/Code Cache" "~/Library/Application Support/discord/blob_storage"` |
| **Spotify cache** | 1–8 GB | `rm -rf ~/Library/Caches/com.spotify.client "~/Library/Application Support/Spotify/PersistentCache" "~/Library/Application Support/Spotify/Storage"` |
| **VS Code cache** | 0.5–3 GB | `rm -rf "~/Library/Application Support/Code/Cache" "~/Library/Application Support/Code/CachedData" "~/Library/Application Support/Code/GPUCache"` |
| **npm cache** | 0.5–5 GB | `npm cache clean --force && rm -rf ~/.npm` |
| **pip cache** | 0.2–2 GB | `rm -rf ~/Library/Caches/pip ~/.cache/pip` |
| **Cargo cache (Rust)** | 1–10 GB | `rm -rf ~/.cargo/registry ~/.cargo/git` |
| **Gradle cache** | 0.5–5 GB | `rm -rf ~/.gradle/caches` |
| **CocoaPods cache** | 0.5–3 GB | `rm -rf ~/Library/Caches/CocoaPods` |
| **QuickLook thumbnails** | 0.2–1 GB | `rm -rf ~/Library/Caches/com.apple.QuickLook.thumbnailcache` |
| **Empty Trash** | varies | `rm -rf ~/.Trash/*` |
| **iCloud Drive local cache** | 1–50 GB | see block below |

---

### 🌐 All browser caches + WebKit offline storage

```sh
rm -rf \
  ~/Library/Caches/Google/Chrome \
  "~/Library/Application Support/Google/Chrome/Default/Cache" \
  "~/Library/Application Support/Google/Chrome/Default/Code Cache" \
  "~/Library/Application Support/Google/Chrome/Default/GPUCache" \
  ~/Library/Caches/com.apple.Safari \
  "~/Library/Containers/com.apple.Safari/Data/Library/Caches" \
  ~/Library/WebKit \
  ~/Library/Caches/com.apple.WebKit.WebContent \
  ~/Library/Caches/Firefox \
  "~/Library/Caches/Microsoft Edge" \
  "~/Library/Application Support/Microsoft Edge/Default/Cache" \
  "~/Library/Caches/BraveSoftware/Brave-Browser" \
  "~/Library/Caches/Company Browser, Inc." \
  ~/Library/Caches/Vivaldi \
  2>/dev/null
echo "✓ Browser caches cleared. First page-load per site will be slightly slower once."
```

---

### ☁️ iCloud Drive — reclaim local space safely

Files are **not deleted**. They stay on iCloud and re-download when you open them.
This is exactly what macOS "Optimize Mac Storage" does, triggered on demand.

```sh
# See how much is locally cached right now
du -sh ~/Library/Mobile\ Documents/ 2>/dev/null

# Evict local copies — files stay on iCloud, become cloud-only stubs
find ~/Library/Mobile\ Documents -not -name '*.icloud' -type f 2>/dev/null \
  | while read f; do brctl evict "$f" 2>/dev/null && echo "Evicted: $f"; done
echo "✓ Done. iCloud files are now cloud-only. They re-download when opened."
```

---

### 🔍 Scan first — see what's eating space before deleting anything

```sh
# What's biggest in ~/Library/Caches?
du -sh ~/Library/Caches/* 2>/dev/null | sort -rh | head -20

# What's eating space in Application Support?
du -sh ~/Library/Application\ Support/* 2>/dev/null | sort -rh | head -20

# iOS/iPadOS device backups (often 10–80 GB, forgotten)
du -sh ~/Library/Application\ Support/MobileSync/Backup/* 2>/dev/null | sort -rh

# Developer caches (npm / pip / cargo / gradle)
for p in ~/.npm "~/Library/Caches/pip" ~/.cargo/registry ~/.gradle/caches ~/go/pkg/mod/cache; do
  [ -d "$p" ] && printf "%-30s  %s\n" "$p" "$(du -sh "$p" 2>/dev/null | cut -f1)"
done

# 25 biggest files in ~/Downloads + ~/Documents
find ~/Downloads ~/Documents -maxdepth 4 -type f -size +100M 2>/dev/null \
  | while read f; do du -sh "$f" 2>/dev/null; done | sort -rh | head -25
```

---

### 🩹 Safe Xcode full clean (use before a big build or when builds act weird)

```sh
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport
rm -rf ~/Library/Developer/Xcode/watchOS\ DeviceSupport
rm -rf ~/Library/Developer/Xcode/tvOS\ DeviceSupport
rm -rf ~/Library/Caches/com.apple.dt.Xcode
rm -rf ~/Library/Caches/org.swift.swiftpm ~/Library/org.swift.swiftpm
xcrun simctl delete unavailable 2>/dev/null
echo "✓ Xcode cleaned. First build will be slower (re-downloads caches). That's normal."
```

---

### 📊 Check your disk right now

```sh
df -h /
```

Run before and after any cleanup block to see what you actually freed.

---

> All of these are the same commands Dustpan runs when you click the Clean buttons in the dashboard. If you want the guided experience with sizes shown before you delete, run `make ui` from the repo.

---

## 🛠️ Requirements

### Hardware

- **Any Mac running macOS 14 or newer** (Sonoma, Sequoia, Tahoe).
- **8 GB RAM minimum** — Dustpan itself uses about 50 MB. The dashboard build (one-time, ~6 seconds) needs a bit more.
- **Apple Silicon or Intel** — both work. Build steps are universal.
- **A few GB of free disk space to start with** — yes, you need a *little* free space to run a disk cleaner. Dustpan needs ~200 MB to clone + build.

### Software

Required (already on every modern Mac — you do not need to install these):

- **macOS 14+** (Sonoma or newer)
- **Python 3.9+** — ships with Xcode Command Line Tools, which ship with every Mac.
- **Bash** + **make** + **git** — also part of Xcode Command Line Tools.

If you don't have Xcode Command Line Tools, run this once:
```sh
xcode-select --install
```

Optional (for the modern React dashboard — but not required to run Dustpan):

- **pnpm 9+** — `brew install pnpm`. Without pnpm, Dustpan automatically falls back to the simpler vanilla dashboard.
- **Node 20+** — required by pnpm to install dependencies. `brew install node` if you don't have it.

Category-specific (only needed if you want that category's cleanup):

- **Docker Desktop** — only required if you want to clean Docker. Without it, the Docker category shows zero — no error.
- **Xcode 15+** — only required if you have Xcode installed. The Xcode category just shows zero on a Mac without Xcode.
- **SwiftBar** (`brew install --cask swiftbar`) — only required for `make install-swiftbar` (the menu-bar widget).

That's it. Nothing else. No databases, no message queues, no auth provider, no API key — Dustpan runs entirely on what Apple ships.

---

## 🗺️ Pages map

Every URL the Python server responds to.

### Dashboards (pick your version)

| Path | What you'll see |
|---|---|
| `/` | **Main dashboard** — Vite + React + Motion (the canonical UI) |
| `/?legacy=1` | **Vanilla dashboard** — works without `pnpm`, always available |
| `/legacy` | Same as `/?legacy=1` |
| `/?next=1` | 302 redirects to `/next/` |
| `/next/` | **Next.js dashboard** — experimental; build with `make ui-all` |

### JSON API (the dashboard's backbone)

| Path | What it does |
|---|---|
| `/api/status` | `{ free_gb, used_gb, total_gb, used_pct, version }` |
| `/api/tabs` | The tab structure — what categories exist, with sub-tools |
| `/api/report` | History summary: total runs, total GB freed, sparkline data |
| `/api/changelog` | Raw CHANGELOG.md served as Markdown (modal renders this) |
| `/api/category/<id>/scan` | Per-category scan results — totals + per-path sizes by tier |
| `/api/category/<id>/actions` | Per-category action list — every button, its cost annotation |

### Live streams (Server-Sent Events)

| Path | What it streams |
|---|---|
| `/api/live` | The always-on channel: `status` deltas + `running` clean-tracker events |
| `/api/clean-path?category=<>&path=<>` | One-shot stream while a single path cleans |
| `/api/clean-all-safe?category=<>&tier=<>` | Stream while a whole category-tier cleans |
| `/api/clean-everything?tier=<>` | Stream while every category's tier cleans at once |
| `/api/run?category=<>&action=<>` | Stream while a predefined action runs |
| `/api/survey` | Live-streaming comprehensive disk crawl (worktrees, build artifacts, large `node_modules`, foreign-owned paths) |
| `POST /api/ai/chat` | Multi-turn chat with tool-calling — events: `provider_info`, `assistant_text`, `tool_use_start`, `tool_use_result`, `tool_approval_needed`, `assistant_done` |
| `/api/ai/diagnose` | One-shot SADPA diagnosis (the original SADPA panel) |

### AI agent + proposals (Plan 0023, v0.23.0–v0.25.0)

| Path | What it does |
|---|---|
| `/api/ai/status` | Configured providers + Docker mode flag |
| `/api/ai/proposals?status=<>` | List cleaner proposals filed by the AI |
| `/api/ai/proposals/count` | Pending count (sidebar badge) |
| `/api/ai/proposals/<id>/snippet` | Generate paste-ready Python snippet |
| `POST /api/ai/proposals/<id>/accept` | Mark accepted, return snippet |
| `POST /api/ai/proposals/<id>/dismiss` | Mark dismissed |
| `GET /api/settings/agent` | Read `allow_safe_auto` (auto-approve toggle) |
| `POST /api/settings/agent` | Write `allow_safe_auto` |

### Settings + keys

| Path | What it does |
|---|---|
| `GET /api/settings/keys` | List configured providers (no key values) |
| `POST /api/settings/keys` | Save an Anthropic / OpenAI / Perplexity / Groq / Gemini key |
| `DELETE /api/settings/keys/<provider>` | Forget a key |
| `GET /api/settings/ollama` | Ollama URL + model |
| `POST /api/settings/ollama` | Save Ollama settings |

### Static assets

| Path | What it serves |
|---|---|
| `/assets/*` | Vite's hashed JS/CSS chunks (1-year immutable cache) |
| `/next/_next/static/*` | Next.js's hashed chunks (same caching) |

---

## 🔒 Privacy by default

**Nothing leaves your Mac. Ever. Unless you explicitly opt in.**

This is the single non-negotiable rule of Dustpan. Concretely:

### What Dustpan never does

| Thing | Status |
|---|---|
| Analytics / telemetry / "phone home" | ✗ Never. Not even an anonymized usage ping. |
| Cloud sync | ✗ Never. Your scan results stay on your Mac. |
| Account / login / API key | ✗ Never. There is no account. |
| Send your file paths anywhere | ✗ Never. The list of what's on your disk doesn't leave your Mac. |
| Network calls to anything outside `localhost` | ✗ With one exception (below) |

### The single external network call

Once a day, the AppleScript (not the dashboard) checks GitHub Releases for a newer version of Dustpan. That's it. It hits `api.github.com/repos/marvelousempire/xcode-cleanup-shortcut/releases/latest` once per 24 hours, caches the result, and only shows a notification if a newer version exists.

**To turn even that off:**
```sh
DUSTPAN_NO_UPDATE_CHECK=1 make run
# or permanently — edit your shell rc:
export DUSTPAN_NO_UPDATE_CHECK=1
```

### How "localhost-only" actually works

- The Python server binds to `127.0.0.1` (your Mac only) or `0.0.0.0` (your Mac + your Wi-Fi). It never binds to a public interface.
- `make ui` (the default since v0.19.1) uses `0.0.0.0` so other devices on your home Wi-Fi can use the dashboard — but it's still only reachable on your *local* network. Nothing on the internet can reach it.
- `make ui-local` forces `127.0.0.1` — only your Mac can reach it.
- The dashboard can't make outbound calls anywhere except `/api/*` on its own server. Open DevTools and watch the Network tab if you want to verify.

### Auditable end-to-end

Every cleanup action is defined in [`web/cleaners.py`](./web/cleaners.py). Every shell command Dustpan runs is in that file or in [`dustpan.applescript`](./dustpan.applescript). You can read both files in one sitting. There is no compiled binary, no obfuscated code, no remote-loaded payload.

---

## 📦 What's in the box

> **📚 Want a deep-dive on any one feature?** See [`docs/marketing/`](./docs/marketing/) — every shipped feature lives in its own Markdown file with the problem, the solution, mockups, paste-ready channel copy, and FAQs. Start with the [index](./docs/marketing/README.md).

| Feature | What it does | Deep-dive |
|---|---|---|
| 💬 **Chat with SADPA** | Conversational AI agent with tool-calling — BYO Anthropic or OpenAI key | [chat-with-sadpa.md](./docs/marketing/chat-with-sadpa.md) |
| 🔒 **Locked-space recovery** | Finds disk space owned by previous Mac users (Homebrew, old /Users/<name>) | [locked-space-recovery.md](./docs/marketing/locked-space-recovery.md) |
| 🚨 **Emergency Rescue** | Disk-at-zero rescue panel with live in-app terminal | [emergency-rescue.md](./docs/marketing/emergency-rescue.md) |
| 📊 **Space Survey** | Live-streaming filesystem crawl beyond predefined categories | [space-survey.md](./docs/marketing/space-survey.md) |
| 📋 **AI cleaner proposals** | SADPA proposes new cleaners → paste-ready Python snippets | [cleaner-proposals.md](./docs/marketing/cleaner-proposals.md) |
| 💬 **Cost annotations everywhere** | Every cleanup tells you what you'll lose before you click | [every-cleanup-tells-you-the-cost.md](./docs/marketing/every-cleanup-tells-you-the-cost.md) |
| 🧹 **The original Xcode pitch** | The 150-line AppleScript that started it all | [the-original-pitch.md](./docs/marketing/the-original-pitch.md) |
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
| `DUSTPAN_DRY_RUN=1` | Don't delete anything — just measure how much would be freed |
| `DUSTPAN_DEMO=1` | Pretend mode — sleeps instead of deleting (for recording videos) |
| `DUSTPAN_FORCE=1` | Run cleanup even if disk has lots of free space already |
| `DUSTPAN_AUTO_CONFIRM=1` | Skip the "are you sure?" pop-up (only for scripts) |
| `DUSTPAN_TMP_PATTERNS=…` | Customize which `/tmp` files to clean. Set to `""` to skip them entirely. |
| `DUSTPAN_NO_UPDATE_CHECK=1` | Don't ping GitHub to check for new Dustpan releases |
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
   ├─ dustpan.applescript  ← The original cleanup script. Pop-ups + progress bar.
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
| `dustpan.applescript` | The original cleanup script. ~250 lines of Mac automation. |
| `web/server.py` | The web dashboard's server. Plain Python. Routes, SSE, network mode, all in one file. |
| `web/cleaners.py` | **The data layer.** Every category, every path, every action — all defined here. |
| `web/index.html` | The vanilla HTML dashboard. No framework. Works as a fallback. |
| `apps/web/` | The Vite + React dashboard (`@dustpan/web`). |
| `apps/web-next/` | The Next.js dashboard (`@dustpan/web-next`). Experimental. |
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
