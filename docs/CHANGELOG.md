# Changelog

## [0.27.5] — 2026-05-15 14:45:00 Eastern · *Library atlas on Overview — ~/Library heavy zones with tab jumps*

### Added — **Library atlas** (Overview)

Expandable reference under **Home folder guidance** for the neighborhoods that usually hoard space: **Caches**, **Application Support**, **Containers**, **Group Containers**, **Developer**, **Logs**, **Mobile Documents** (iCloud pillar), and a short **Saved Application State / Preferences** caution. Each block shows the canonical path and **pill buttons** that jump to the right DustPan tab (including **LLM** sub-tabs for Cursor, ChatGPT, and Claude).

**Implementation:** `apps/web/src/components/UserLibraryAtlas.tsx` (new), wired from `HomeFolderAdvice.tsx`.

### kVersion / package bumps

Root `package.json`, `apps/web/package.json`, `apps/web-next/package.json`, `dustpan.applescript` **`kVersion`** → `0.27.5`.

---

## [0.27.4] — 2026-05-15 12:00:00 Eastern · *Changelog + version sync, human-readable release dates in the app, Growth Watch rollup, Home folder reclaim guidance*

### Fixed / Changed — versioning & changelog UX

The **changelog was stuck at [0.20.7]** in `docs/CHANGELOG.md` while the AppleScript/UI stack had drifted forward — `get_version()` (and thus the dashboard badge) reads only the newest `## [x.y.z]` heading, so versions looked wrong everywhere the UI showed them.

Release headers are still canonical (`## [semver] — date Eastern ·`) for parsing, but **Changelog viewer** formats each entry as readable prose (weekday month day, year).

### Previously shipped features now reflected in changelog

Rolling summary — see plans for detail:

- **Plan 0027 — Growth Watch**: `GET /api/growth`, watched paths + startup-disk **used-space** deltas at **~3 min / ~9 min / ~20 min** sliding windows (`/api/live` SSE `growth` event). Overview panel table.
- **Emergency panel**: reclaim tallies from `GET /api/emergency/estimate` (`action_measure` in `cleaners.py`).
- **0024 – 0026** arcs (foreign-owned space, conversational SADPA + proposals, skills extraction).

### Added — guidance when **~/ (user folder)** is the problem

Almost all reclaimable caches live under **`~/Library`** and peers (Xcode, Docker, browsers, iCloud stubs, Containers). DustPan deliberately maps those as **named categories**. New **Overview** callout directs people to Emergency, Space Survey, category tabs, FDA (Full Disk Access) if totals read as zero — so they know where help lives.

### kVersion / package bumps

Root `package.json`, `apps/web/package.json`, `dustpan.applescript` **`kVersion`** → `0.27.4`.

---

## [0.20.7] — 2026-05-13 18:30:00 Eastern · *Overview layout: buttons top → bar chart → banners → 3-pane → history → cards*

### Changed — Overview page layout order

Reordered sections per user direction. Top-to-bottom is now:

1. **Action buttons** (Scan / Clean ALL safe / Clean ALL opt-in) — pinned at the very top, always first
2. **Space breakdown bar chart** (SpaceBarChart with color-coded bars + delete buttons)
3. **Banners** in order: Rescue (low disk) · Permission (FDA) · Habits · Quick Wins
4. **3-pane row** (disk hero · pie chart · activity terminal)
5. **History banner** (total freed across all runs)
6. **Category cards grid**

### kVersion
`0.20.6` → `0.20.7`

---

## [0.20.6] — 2026-05-13 18:00:00 Eastern · *Plan 0009: Disk Doctor — Quick Wins, Rescue Mode, Xcode DocumentationIndex, active diagnosis*

### The problem this solves

The app was passive. When the disk ran out of space, there was nothing visible telling the user what to clean. An engineer had to manually run `du` surveys, discover `DocumentationIndex` was eating 5 GB, and execute cleanup commands by hand. The app should do this automatically.

### Added — 🚨 Rescue Banner (`RescueBanner`)

Fires when free disk falls below 10 GB (or 5% of total). Two modes:

**Before scan:** shows hard-coded "best bet" items — the 5 paths most likely to be large on any Mac (DerivedData, iOS DeviceSupport, DocumentationIndex, browser caches, npm). Each is a button that navigates to the right category. No scan needed to get these suggestions.

**After scan:** shows the actual top 5 items from the doctor report with real measured sizes.

### Added — ✨ Quick Wins panel (`QuickWins`)

After any scan, aggregates **every safe-tier path from every category**, sorts by size descending, and shows the top 10 in a single panel — right below the action buttons in Overview. One-click `↓ Clean` button per item. Done state tracks actual `busy` transition.

This is "what would an expert tell me to delete first?" without navigating any tabs.

### Added — `GET /api/doctor` endpoint

Returns `quick_wins` (all safe paths sorted by size), `rescue_mode` flag, `free_gb`, `free_pct`, `total_cleanable_gb`, `categories_scanned`. Computed from the in-memory scan cache — zero extra scanning. Powers both `RescueBanner` and `QuickWins`.

### Changed — Xcode scanner: `DocumentationIndex` and `DeviceLogs` added

`~/Library/Developer/Xcode/DocumentationIndex` — Xcode's searchable docs cache. **Was not in the scanner at all.** Can be 1–5 GB on any active dev Mac. Xcode rebuilds it the next time you open the documentation viewer.

`~/Library/Developer/Xcode/DeviceLogs` — crash logs from connected devices. Safe to clear; new logs appear when you reconnect.

Both added to Xcode `safe` tier and the `clean-safe` action shell command.

### kVersion
`0.20.5` → `0.20.6`

---

## [0.20.5] — 2026-05-13 17:00:00 Eastern · *HabitBanner for all users, AI Settings copy fixed, SpaceBarChart real Done state, README updated*

### Fixed (gap 1) — HabitBanner hidden behind Docker gate; SQLite users never saw it
### Fixed (gap 2) — AI Settings said "Coming in v0.20.0"; habits shipped in v0.20.4 for everyone
### Fixed (gap 3) — SpaceBarChart Done used setTimeout(3000); now tracks busy true→false via useEffect
### Changed (gap F) — README category table: 13 categories, Space Eaters + iCloud Drive rows added, FDA callout, Finder sidebar safety note

`0.20.4` → `0.20.5`

---

## [0.20.4] — 2026-05-13 16:00:00 Eastern · *Space Eaters auto-populated, color-coded chart with delete buttons, SQLite default persistence, Finder sidebar bug fixed*

### Fixed — Finder sidebar cleared by "Clean System" (critical)

`~/Library/Application Support/com.apple.sharedfilelist` was in System's **safe** tier. This directory contains `FavoriteItems.sfl3` — your **Finder sidebar favorites**. Clicking "Clean all safe" in System wiped the sidebar. Removed from the safe tier entirely. The file is user data, not a cache.

### Changed — Space Eaters: dev caches moved to `safe` tier

npm, pip, Cargo, Gradle, Maven, Go modules, Yarn, pnpm, Ruby gems, CocoaPods, Homebrew downloads were in `probably_safe`. They are pure auto-rebuilt caches — moved to `safe` so "Clean ALL safe" picks them up automatically. Added a **"Clean ALL developer caches"** action that clears all 12 in one shot.

### Added — SQLite default persistence (`web/sqlite_store.py`)

Every `make ui` run now automatically records scan history and computes growth-slope habits — with zero configuration and zero pip installs. Uses Python's built-in `sqlite3`. DB file: `~/Library/Application Support/dustpan/history.db`.

Persistence priority: Postgres (Docker mode) when `DATABASE_URL` is set, SQLite otherwise. Habits, runs, and category snapshots work on both backends via the same interface (`_store.*`).

### Changed — SpaceBarChart: color-coded by % of free disk + per-row clean button

The bar chart now communicates urgency visually:

**Color = percentage of your remaining free disk this category is using:**
- 🟢 Green (0–3%) — low pressure
- 🩵 Teal (3–8%) — fine
- 🔵 Cyan (8–15%) — notice it
- 💙 Blue (15–25%) — getting significant
- 🟡 Yellow (25–40%) — moderate pressure
- 🟠 Orange (40–55%) — high pressure
- 🔴 Red (55%+) — critical

The bar segments (safe / opt-in / caution) all use the stage hue at different opacities. The stats on the right also render in the stage color.

**Per-row clean button:** each row has a `↓ Clean` button styled in the stage color.
- Single-category tabs: triggers `cleanAllTier(catId, "safe")` (confirmation required)
- Multi-subcategory tabs (Creative, LLMs): navigates to the tab so you can clean sub-tools individually
- After cleaning: button shows `✓ Done` in green

### kVersion
`0.20.3` → `0.20.4`

---

## [0.20.3] — 2026-05-13 15:00:00 Eastern · *Plan 0008 — Fix zeros: Full Disk Access detection, Archives/System/iCloud path fixes, clean-button UX*

### Fixed — Root cause of most sections reporting 0 GB

**macOS TCC (`du` permission denial)** was the primary cause.
`_measure_path` previously used `subprocess.check_output(..., stderr=DEVNULL)`.
For any directory protected by macOS Full Disk Access rules — `~/Downloads`,
`~/Library/Containers/*`, `~/Library/Group Containers/*`, Notes, Safari,
device backups, iCloud Drive — `du` exits non-zero with "Operation not permitted".
`DEVNULL` threw that away silently; `CalledProcessError` was caught; `size_kb`
stayed 0. The path existed, the data existed, Dustpan saw 0.

**Fix:** replaced with `subprocess.run(..., capture_output=True)`. Now checks
`returncode` and `stderr` for "Operation not permitted" / "Permission denied".
Each path gets a new `permission_denied: bool` field. `scan_category` returns
`permission_denied_count` and `permission_denied_paths` in every scan response.

### Added — 🔐 Full Disk Access banner (`PermissionBanner`)

When any scanned category has `permission_denied_count > 0`, a banner appears at
the top of the Overview page (and on individual category pages) with:
- List of the specific path labels that were denied (as chips)
- Step-by-step instructions: System Settings → Privacy & Security → Full Disk
  Access → add Terminal/iTerm2/Warp/etc. → quit+reopen → re-scan
- Dismissable via "Got it" (stored in localStorage so it doesn't reappear)

Once Full Disk Access is granted and the app is restarted, affected sections
(Safari, Notes, Downloads, iCloud, backups) will show real sizes.

### Fixed — Archives always reported 0 (no measurement paths)

Archives had `safe=[], probably_safe=[], caution=[]` — zero paths, always 0.
Added `~/Downloads`, `~/Desktop`, `~/Documents` to the `caution` group so users
can see total folder sizes (use the find-based actions for per-extension breakdown).

### Fixed — System had a permanently-0 fake path

`"tm-snapshots"` is not a real filesystem path. `os.path.expanduser("tm-snapshots")`
returns `"tm-snapshots"` unchanged; `os.path.exists` returns False; size stays 0.
Removed from groups; the Time Machine action handles this correctly. Replaced with
`~/Library/Logs` (app logs, 50–200 MB typical).

### Changed — iCloud Drive: Notes + per-app breakdown

Added to iCloud `caution` tier (shows sizes, never auto-deleted):
- **Notes Group Container** — `~/Library/Group Containers/group.com.apple.notes`
  — contains ALL note data including embedded photos and receipt scans. Often 5–30 GB
  for heavy Notes users. This is **separate from Mobile Documents**.
- Notes iCloud sync folder
- Pages / Numbers / Keynote documents (iCloud)
- Reminders local data
- Mail local cache + attachments
- Safari local data

New **actions**: "Show Notes storage breakdown" (measures Group Container + Media
subfolder separately, explains how to turn off Notes local sync) and "Evict iCloud
Pages/Numbers/Keynote local copies" (`brctl evict`, files stay on iCloud).

### Changed — Clean button text

**Before:** when `totals.safe < 0.01` after a scan, button showed "· scan first"
(confusing — user just scanned).

**After:**
- `totals.scanned === 0` → "· scan first" (haven't scanned yet)
- `totals.scanned > 0 && totals.safe < 0.01` → "· all clean ✓" (scanned, nothing to clean)

Same fix applied to `CategoryPanel`'s per-tier buttons.

### kVersion
`0.20.2` → `0.20.3`

---

## [0.20.2] — 2026-05-13 14:30:00 Eastern · *Quick CLI command sheet in README — one-shot terminal commands, no app needed*

### Added — ⚡ Quick CLI section in README

A new prominent README section immediately after Quick Start gives you copy-paste terminal commands for every major cleanup scenario — no Dustpan app, no `git clone`, just open GitHub and grab what you need.

**Sections:**
- **The big one** — single multiline command covering all safe caches (typically frees 5–25 GB)
- **By category table** — 15 rows with target, expected reclaim, and one-line command each: Xcode DerivedData, DeviceSupport, simulators, browsers + WebKit, Telegram, Slack, Discord, Spotify, VS Code, npm, pip, Cargo, Gradle, CocoaPods, Trash
- **All browser caches + WebKit** — complete multiline block for all browsers
- **iCloud Drive eviction** — `brctl evict` block with explanation that files stay on iCloud
- **Scan first** — `du -sh` commands to see what's eating space before deleting (Caches, Application Support, iOS backups, dev caches, biggest files in Downloads/Documents)
- **Safe Xcode full clean** — step-by-step block for pre-build or broken-build cleanup
- **Check your disk** — `df -h /` bookend to measure before/after

Footer note explains these are the same commands Dustpan runs in the dashboard.

### kVersion
`0.20.1` → `0.20.2`

---

## [0.20.1] — 2026-05-13 14:00:00 Eastern · *Plan 0007 — Space Eaters: fix stale browser paths, add Telegram/WhatsApp/Signal/iCloud Drive/iOS backups/dev caches*

### Fixed — Browsers showing 0 GB

Safari moved its cache to a container directory in macOS Ventura+. The old `~/Library/Caches/com.apple.Safari` path is now empty on most Macs. Both paths are now measured so older and newer macOS versions both surface real data.

Also added `~/Library/WebKit` — the **shared offline storage** used by Safari and every WebKit/Electron app (IndexedDB, localStorage, Service Worker caches). This was completely missing. It's commonly 1–3 GB and almost never cleaned.

Chrome now measures both the `Caches/Google/Chrome` directory and the `Application Support` profile caches (Code Cache, GPU cache, Service Worker CacheStorage) which are where the actual disk usage lives on modern macOS.

### Changed — Apps category (complete rewrite)

Focused on non-browser apps. Added:
- **Telegram** — `Group Containers/6N38VWS5BX.ru.keepcoder.Telegram` (media cache, 5–20 GB) + Telegram Desktop
- **Slack** — now measures all three layers: `Cache/`, `Code Cache/`, `Service Worker/`, `GPUCache/` (was only Service Worker)
- **Discord** — now measures `Cache/`, `Code Cache/`, `blob_storage/`, plus the capital-D `Discord/` variant
- **Spotify** — added `PersistentCache/` and `Storage/` (was only the Caches dir)
- **Teams** — added `Code Cache/` and `GPUCache/`
- **VS Code + Cursor** — `Cache/`, `CachedData/`, `GPUCache/`, `workspaceStorage/`, `CachedExtensionVSIXs/`
- **Figma** — full Application Support cache (document previews, offline fonts, 2–5 GB)
- **WhatsApp** and **Signal** (opt-in tier — received media re-downloadable from chat)

### Added — 🔥 Space Eaters tab

New category surfacing the biggest space hoarders that nobody told you about:

- **iOS/iPadOS device backups** (`~/Library/Application Support/MobileSync/Backup`) — one backup per device, 5–50 GB each. Show-only action with sorted size list.
- **Developer caches** (probably-safe tier): npm (~/.npm), pip, Cargo registry+git, Gradle, Maven, Go module cache, Yarn, pnpm store, Ruby gems, CocoaPods
- **Steam game data** — informational size display
- Actions: show iOS backup sizes, show dev cache sizes, clear npm/pip/cargo/gradle individually, show top-25 biggest files in ~/Documents + ~/Desktop

### Added — ☁️ iCloud Drive tab

New category with a key safety insight: `brctl evict` removes the **local copy** of a file but leaves it on iCloud intact. The file re-downloads automatically when opened. This is exactly what macOS "Optimize Mac Storage" does.

- Measures `~/Library/Mobile Documents` (total local iCloud Drive cache)
- Measures `~/Library/CloudStorage` (Monterey+ format)
- Actions:
  - **Show iCloud Drive space by app** — `du -sh` per app container, sorted; plus stub vs local-copy count
  - **Evict iCloud Drive local copies** — runs `brctl evict` on every locally-present file; files become `*.icloud` stubs and re-download on demand
  - **List iCloud stub files** — shows what's already on iCloud-only

### Changed — Tab order

`Space Eaters` and `iCloud Drive` now appear at the top of the sidebar (below Overview) so the highest-value discoveries are immediately visible.

### kVersion
`0.20.0` → `0.20.1`

---

## [0.20.0] — 2026-05-13 13:30:00 Eastern · *Plan 0006 ships — Docker stack + AI engine + habit learning*

### Added — Docker stack (`docker/`)

Five files copied from the `ai-skills-library` canonical template and adapted for Dustpan:

- **`docker/docker-compose.yml`** — `app + db (pgvector/pg16) + caddy` base services; optional `ollama` service activated with `--profile ollama`
- **`docker/Dockerfile`** — multi-stage: Node 20 builds the React app, Python 3.11-slim runs the server (psycopg2-binary + cryptography installed)
- **`docker/Caddyfile`** — HTTPS reverse proxy; `CADDY_HOST` env var switches localhost ↔ production domain; HSTS + security headers
- **`docker/.env.example`** — `POSTGRES_*`, `CADDY_HOST`, `DUSTPAN_MASTER_KEY`, `OLLAMA_URL`, `OLLAMA_MODEL`
- **`docker/go`** — one-shot bootstrap: verify Docker → copy `.env` → stamp git metadata → `docker compose up -d --build --wait` → one-time Caddy trust → open browser → tail logs

Start Dustpan with full AI features: `./docker/go`

### Added — `web/db.py` (database module)

Optional Postgres module — no-op when `DATABASE_URL` is not set or `psycopg2` is not installed. `is_available()` returns `False` gracefully so `make ui` still works unchanged.

- **Connection pool**: `psycopg2.pool.ThreadedConnectionPool` (min=1, max=4)
- **Migrations** (all `IF NOT EXISTS`): `api_keys`, `ollama_settings`, `runs`, `category_snapshots`, `habits`
- **AES-256-GCM encryption** via `cryptography.hazmat.primitives.ciphers.aead.AESGCM`; falls back to plaintext-with-prefix when the package is absent
- **Domain helpers**: `save_api_key`, `get_api_key`, `delete_api_key`, `list_key_providers`, `get_ollama_settings`, `save_ollama_settings`, `record_snapshot`, `record_run`, `compute_habits` (linear regression over 28-day window)

### Added — `web/ai.py` (AI provider dispatch)

Pure `urllib` — no pip installs for the AI module itself. Handles three API surface formats:
- **OpenAI-compatible**: OpenAI (`gpt-4o-mini`), Perplexity, Groq, Ollama (base URL override)
- **Anthropic format**: separate request shape + `x-api-key` + `anthropic-version` headers (`claude-3-haiku-20240307`)
- **Gemini format**: Google's `generateContent` REST API (`gemini-1.5-flash`)
- `build_scan_prompt()` builds a structured disk-summary prompt for the AI

### Added — `web/requirements.txt`

`psycopg2-binary==2.9.9` and `cryptography==42.0.5` — only needed for Docker mode.

### Changed — `web/server.py`

**New endpoints:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/ai/status` | `{docker_mode, providers}` — what the UI checks to decide mode |
| `GET` | `/api/settings/keys` | List of providers with stored keys (no values) |
| `POST` | `/api/settings/keys` | Save encrypted API key |
| `DELETE` | `/api/settings/keys/{provider}` | Remove a key |
| `GET` | `/api/settings/ollama` | Ollama URL + model |
| `POST` | `/api/settings/ollama` | Save Ollama settings |
| `GET` | `/api/habits` | Computed habit records (slope + days to threshold) |
| `GET` | `/api/runs` | Run history (paginated, newest first) |
| `POST` | `/api/ai/summary` | Call configured AI provider, return 2-sentence recommendation, persist to `habits` |

All endpoints return `{"error":"no_db","message":"…"}` with HTTP 501 when DB is not available. **`make ui` path unaffected.**

**Scan hook**: every `GET /api/category/<id>/scan` now calls `db.record_snapshot()` after returning results (no-op without DB).

**Startup**: `db.migrate()` runs at process start (no-op without DB).

### Changed — Frontend

- **`types.ts`** — `AIStatus`, `Habit`, `Run` types added
- **`api.ts`** — `aiStatus()`, `habits()`, `runs()`, `settingsKeys()`, `settingsOllama()`, `saveKey()`, `deleteKey()`, `saveOllama()`, `aiSummary()` calls added
- **`DashboardContext`** — `aiStatus` + `habits` state; loaded on mount; habits refreshed after every `scanEverything`
- **`AISettingsPanel`** — branches on `aiStatus.docker_mode`: Docker mode shows server-backed key rows (enter to update, one-click remove, "stored securely" placeholder); non-Docker mode keeps localStorage rows with the upgrade callout
- **`HabitBanner`** (new) — AnimatePresence chip per category with `days_to_threshold ≤ 14`; shows growth rate + AI recommendation; click navigates to the category; hidden when no Docker mode or no urgent habits
- **`OverviewPanel`** — `HabitBanner` wired above the action buttons

### kVersion
`0.19.9` → `0.20.0`

---

## [0.19.9] — 2026-05-13 13:00:00 Eastern · *Overview redesign: buttons top, 3-pane below, animated space bar chart. New AI & Settings panel (plan 0006 foundation).*

### Changed — Overview layout

The three action buttons (**Re-scan everything**, **Clean ALL safe**, **Clean ALL opt-in**) now sit at the **top** of the Overview page so they're the first thing you see and reach. The 3-pane row (disk hero · pie chart · activity terminal) dropped below them.

### Added — Space breakdown bar chart (`SpaceBarChart`)

A new animated horizontal stacked bar chart appears after the 3-pane row, showing every category's disk footprint at a glance:

- **Left:** category icon + name
- **Middle:** animated stacked bar — green = safe to delete, amber = opt-in, red = caution
- **Right:** total GB + percentage of monitored space
- Bars animate in with a staggered spring entrance (Motion)
- Sorted by total size descending; updates live when a re-scan completes

### Added — AI & Settings panel

A new **AI & Settings** entry appears at the bottom of the sidebar (Sparkles icon). The panel has:

- **Cloud providers:** API key inputs for OpenAI, Anthropic, Perplexity, Groq, Gemini — masked inputs with show/hide toggle, green status dot when saved, per-provider "Get API key →" link, Save + Clear per row
- **Local models (Ollama):** URL + model name fields; clear note that Docker mode (plan 0006) runs Ollama containerized alongside the app
- **How AI will be used:** plain-English description of post-scan summaries, habit-based recommendations, smart manager proposals, and privacy guarantees
- **Docker upgrade callout:** teaser for v0.20.0 encrypted vault + history + habit engine

Keys are stored in `localStorage` for now; plan 0006 moves them to a server-side encrypted vault.

### Added — Plan 0006 (`plans/0006-docker-ai-habits-engine.md`)

Full architecture spec for v0.20.0:
- Docker stack with `app + db + caddy + ollama` services
- PostgreSQL schema: `api_keys` (AES-256-GCM encrypted), `runs`, `category_snapshots`, `habits`
- New Python endpoints: `/api/settings/keys`, `/api/habits`, `/api/runs`, `/api/ai/summary`, `/api/ai/recommend`
- Habit engine: linear regression over 4-week category snapshots → `days_to_threshold` → proactive banner
- Ollama via OpenAI-compatible API; same code path as cloud providers
- Non-Docker `make ui` path unaffected — endpoints return 501 gracefully

### kVersion bump
`0.19.8` → `0.19.9`

---

## [0.19.8] — 2026-05-13 12:30:00 Eastern · *Fix: Re-scan button now shows spinner + "Scanning…" so users can see it running*

### Fixed — Re-scan button had no visual feedback

The Re-scan button (Overview and per-category) ran the scan correctly in the background but showed zero visible feedback — no spinner, no label change, no disabled state. Users couldn't tell the button had done anything. Clean worked fine because it pipes output through the SSE terminal stream; scan is a simple fetch that returned silently.

**What changed:**

- **`DashboardContext`** — new `scanning: boolean` state exposed from context. `scanEverything()` sets `scanning = true` before firing all category scans in parallel, and `scanning = false` when they all complete. Separate from `busy` so clean buttons stay unaffected while a manual re-scan is running.

- **`OverviewPanel`** — Re-scan button is now `disabled={busy || scanning}`, shows a spinning `RefreshCw` icon and the label changes to `"Scanning…"` while the scan is in flight. Status line below the buttons also reads `"Re-scanning N categories in parallel…"` during a re-scan.

- **`CategoryPanel`** — new `localScanning` state (per-component, so independent tabs don't affect each other). `handleRescan` wraps `scanCategory(catId)` with `setLocalScanning(true/false)`. The Re-scan button shows the same spinning icon + `"Scanning…"` label. The auto-scan on first mount is unaffected.

### kVersion bump
`0.19.7` → `0.19.8`

---

## [0.19.7] — 2026-05-13 12:17:00 Eastern · *Terminal theme support — white bg on light, dark bg on dark; WCAG-correct contrast for all status + ANSI colors*

### Changed — `OutputConsole` theme support (plan 0005)

The terminal now reads its colors from CSS custom properties (`--terminal-*`, `--ansi-*`) instead of hardcoded dark-mode hex values. It adapts cleanly to whichever theme is active.

**Light mode:** white (`#FFFFFF`) background, near-black (`#151518`) body text, muted idle placeholder, dark-variant green/amber/red status colors — all tested for ≥ 4.5:1 WCAG AA contrast on white.

**Dark mode:** near-black (`#0A0A0E`) background, near-white (`#F4F4F2`) body text, vivid green/amber/red status colors (unchanged from before).

**Auto mode:** follows the OS system preference, and the in-app Dark/Light/Auto toggle flips the terminal along with the rest of the page.

### Technical detail
- New `--terminal-bg`, `--terminal-fg`, `--terminal-fg-dim`, `--terminal-fg-idle`, `--terminal-border`, `--terminal-ok`, `--terminal-warn`, `--terminal-err`, `--terminal-dim` CSS variables added to `index.css` for all three theme blocks (`:root` light, `[data-theme="dark"]`, `@media (prefers-color-scheme: dark)`).
- New `--ansi-red/green/yellow/blue/magenta/cyan/gray` variables replace the hardcoded ANSI hex colors — two value sets, one per theme.
- `.ansi-fg-*` classes now use `hsl(var(--ansi-*))` instead of literal hex.
- New `.console-ok`, `.console-warn`, `.console-err`, `.console-dim` CSS classes for line-type coloring — used in the JSX instead of `text-[#hex]` arbitrary values.
- `.hl` (search highlight) uses `hsl(var(--ansi-yellow) / 0.28)` for the background so it adapts to either theme.
- Toolbar border + Clear button colors use `hsl(var(--terminal-border))`.
- Inline `placeholder:` Tailwind class replaced with a `style` prop so the placeholder color reads the CSS var at paint time.

### kVersion bump
`0.19.6` → `0.19.7`

---

## [0.19.6] — 2026-05-13 12:02:25 Eastern · *Plan 0004 shipped — Canonical Docker stack template (cloned from claude-chat-reader). Supersedes plan 0003's four-tier tree with one binary rule: state = Docker, no state = no Docker.*

### Added — plan 0004 in `plans/`
- **`plans/0004-canonical-docker-stack-template.md`** — supersedes plan 0003. The user asked for *"the claude reader app... cloned and fully implemented"* as the default for any future app that needs a database. Plan codifies the binary rule, the seven-file template, service inventory, networking, healthchecks, HTTPS via Caddy, and the `./go` one-shot bootstrap.
- **`plans/README.md` index** updated with the new row. Plan 0003's status line annotated `superseded by 0004`.

### Added — canonical Docker stack template in `ai-skills-library`
Pushed to `marvelousempire/ai-skills-library` (PR #5, merged):

- **`rules/library/app-launch-workflow/templates/docker-stack/`** — seven files ready for `cp -r`:
  - `docker-compose.yml` — `app + db (pgvector/pg16) + caddy` services, plus commented optional `watcher` / `metabase` patterns
  - `Dockerfile` — multi-stage `deps → builder → runner [→ watcher]`
  - `Caddyfile` — HTTPS reverse proxy with HSTS + security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
  - `.env.example` — `POSTGRES_*`, `CADDY_HOST`, optional API keys
  - `go` — one-shot bootstrap (Docker check → `.env` copy → `./data/` mkdir → build → up → health-wait → browser open)
  - `Makefile.docker.snippet` — `make go / docker-up / docker-down / docker-logs / backup / restore / reset / export`
  - `README.md` — template usage docs

### Changed — Part 8 of the `app-launch-workflow` skill
- Replaced the v0.19.5 four-tier decision tree (SQLite / Docker Postgres / Homebrew Postgres / embedded-postgres) with a single binary rule: **needs state → Docker; no state → no Docker.**
- Old per-tier Makefile templates removed from the skill body — they're replaced by the one canonical `templates/docker-stack/` reference.
- New sub-sections: "Why this is the right default" · service inventory · bootstrap recipe · HTTPS one-time setup · `make` targets · API surface · data persistence · required README "Data" section.

### Changed — Cursor rule mirror
- `~/.cursor/rules/app-launch-workflow.mdc` Part 8 condensed to the binary rule + bootstrap recipe + `make` targets + HTTPS note.

### Changed — Dustpan README
- New `🐳 Future apps that need state` callout under `🛠️ Under the hood`. Dustpan itself stays stateless — the callout points future-app maintainers at the canonical template so they don't reinvent the stack.

### Why this matters
The previous four-tier tree gave too many escape hatches. Every new project picked a different path; we had three Makefile templates to maintain. The new rule means every DB-needing app starts with the same stack (`app + db + caddy`, HTTPS via Caddy, Postgres+pgvector), the same templates, and the same `./go` UX. One canonical pattern across every project — for humans and AIs reading the code six months from now.

Dustpan itself is unchanged — it's stateless. This is purely a contract for every future app shipped from this org.

---

## [0.19.5] — 2026-05-13 11:06:55 Eastern · *Plan 0003 shipped — Database tier guide for every future app · `app-launch-workflow` skill grew a new Part 8 with per-tier Makefile templates*

### Added — plan 0003 in `plans/`
- **`plans/0003-database-tier-guide-for-future-apps.md`** — the canonical reference for how every future app picks its database. Written before implementation, per the v0.19.4 plans-folder-convention. Decision tree (SQLite / Docker Postgres / Homebrew Postgres / embedded-postgres) + three full Makefile templates + data-location convention + required README "Data" section pattern.
- **`plans/README.md` index** updated with the row.

### Added — Part 8 in the `app-launch-workflow` skill
Pushed to `marvelousempire/ai-skills-library` (commit `5916bfb`):

- **Decision tree** — Personal local tools → SQLite. Multi-user/production-shaped → Docker Postgres. AI/RAG → Postgres + pgvector. "Postgres without Docker" → `embedded-postgres`. The right choice depends on the app; the user UX is identical regardless.
- **Four required `make` targets** for any DB-needing app — `backup` / `restore` / `reset` / `export`. Same user-facing API across tiers; implementations differ per tier.
- **Three full Makefile templates** — Tier 1 (SQLite, zero install), Tier 2 (Docker Compose Postgres), Tier 3 (Homebrew Postgres). Copy-paste into a new app's `Makefile`.
- **Data location convention** — where each tier stores user data on disk, and the rule that `./data/backups/` always lives in the project folder so it can sync to iCloud/Dropbox.
- **Required README "Data" section** for every DB-needing app — documents tier, location, the four make targets, and how to export human-readable.

### Added — Cursor rule mirror
- `~/.cursor/rules/app-launch-workflow.mdc` gets a condensed version of the decision tree + the four make targets + data location table + a pointer to the full skill body.

### Why this matters
The user UX promise is **one line gets you running.** That breaks the moment a user has to `brew install postgresql && createdb foo && psql -c "CREATE EXTENSION pgvector;" && …`. Two solves codified here:

1. **Pick SQLite when possible** — there's no setup. Done.
2. **Wrap Docker behind `make ui`** when SQLite isn't enough — install Docker Desktop once, and from then on every app the user clones uses the same `make ui` pattern. The user never types `docker compose up` themselves.

Dustpan itself is unchanged — it's stateless. This is purely a contract for every future app shipped from this org.

### Why this followed the plans-folder-convention
Plan 0003 was written to `plans/0003-…md` first, indexed in `plans/README.md`, with `Status: in progress`. After this CHANGELOG entry lands, the status line gets flipped to `Status: shipped (commit <merge sha>, v0.19.5)`. Living documentation discipline.

## [0.19.4] — 2026-05-13 10:56:09 Eastern · *README: Requirements + Pages map + Privacy + Quick start refresh · plans/ folder added · global "plans-folder-convention" skill*

### Added — README sections (adopted from `marvelousempire/claude-chat-reader`)
- **🛠️ Requirements** — explicit hardware + software list. Was missing entirely. Hardware: Mac with macOS 14+, 8 GB RAM, Apple Silicon or Intel. Software: macOS 14+, Python 3.9+, bash + make + git (all ship with Xcode Command Line Tools). Plus the optional / category-specific deps clearly labeled.
- **🗺️ Pages map** — every URL the Python server responds to, in three groups: Dashboards (`/`, `/?legacy=1`, `/next/`), JSON API (`/api/status`, `/api/tabs`, `/api/report`, `/api/changelog`, per-category `/api/category/<id>/{scan,actions}`), Live streams (`/api/live`, `/api/clean-path`, `/api/clean-all-safe`, `/api/clean-everything`, `/api/run`), Static assets (`/assets/*`, `/next/_next/static/*`).
- **🔒 Privacy by default** — dedicated section. Lists what Dustpan never does (analytics, telemetry, cloud sync, account, file-path exfil, external network calls — with one exception). Explains the single external call (once-daily GitHub release check, opt-out via `XCODE_CLEANUP_NO_UPDATE_CHECK=1`). Documents how `localhost-only` works at the socket level. Auditability statement.
- **🚀 Quick start polished.** Renamed from "Three lines to start." Now opens with a 3-line clone + `make ui`, then a Local vs Wi-Fi URL table, then the privacy/zero-deps callout, then a `make ui-local` opt-out.

### Added — `plans/` folder in the repo
- **`plans/README.md`** — the convention doc. Filename format, required sections, status discipline, index table.
- **`plans/0001-cleanup-hub-v1-redesign.md`** — the original v1 redesign plan (Phase 1: design system → Phase 2: dashboard restructure → Phase 3: motion micro-interactions → Phase 4: README rewrite). Reconstructed from the prior ~/.claude/plans/ scratch file for the permanent record.
- **`plans/0002-dustpan-readme-under-the-hood.md`** — the v0.19.3 "Under the hood" plan, status `shipped (v0.19.3, commit f22b9a4)`.

### Added — global rule
- New skill **`plans-folder-convention`** pushed to `marvelousempire/ai-skills-library/rules/library/plans-folder-convention/` (commit `9448290`). `alwaysApply: true`. Codifies: every repo gets a `plans/` folder, every substantive change starts as a numbered plan committed there before implementation, plans are immutable (supersede, don't edit), `Status: shipped (commit <sha>, v<version>)` discipline.
- New Cursor rule **`~/.cursor/rules/plans-folder-convention.mdc`** mirrors the skill.

### Why
Maintainer asked two things:
1. *"In the requirements section we need to have the hardware and the software there in the [claude-chat-reader README]. I only see the software."* — Done. Hardware AND software, with category-specific deps clearly labeled.
2. *"I see we have a plan document — we have a rule here in claude and in Cursor that says that every time we create plan documents, we're supposed to copy them and all of their to-do's and put them in the GitHub inside of a plans folder organized as well. Did we do that?"* — Honest answer: no, we hadn't been. The rule wasn't formalized. Now it is — in both the ai-skills-library (alwaysApply) and Cursor's global rules — and Dustpan's own `plans/` folder is now seeded with the two plans we actually have. Future plans get committed here before the work starts.

> **To finish wiring Claude Code** on your Mac: append the section below to `~/.claude/CLAUDE.md` (the security hook prevents automated cross-worktree edits to that file). Once added, every Claude Code session globally will see the rule.
>
> ```
> ## Plans folder convention — enforce on every project
>
> Every substantive change starts as a numbered plan committed to the repo's plans/ folder before implementation.
> Filename: NNNN-snake-case-title.md. Status line at top after shipping.
> Don't edit old plans — supersede with new ones.
> Full reference: ~/Developer/ai-skills-library/rules/library/plans-folder-convention/body.md
> ```

## [0.19.3] — 2026-05-13 10:44:31 Eastern · *README: new "🛠️ Under the hood" section — full per-surface tech stack inventory*

### Added
- **New `🛠️ Under the hood` section in the README**, positioned between `📦 What's in the box` (features) and `🧹 What Dustpan actually cleans` (categories). Mirrors the per-surface tech-stack pattern that `marvelousempire/red-e-play-app/docs/Stack.md` uses — TL;DR summary table at the top, then per-surface deep dives.
- **Six per-surface sections**, each with a `Layer · Tool · What it handles` table + a "Why this stack" paragraph:
  - 🐍 **Backend** (`web/server.py` + `web/cleaners.py`) — Python 3 stdlib, ThreadingTCPServer, SSE, LAN IP discovery via UDP socket trick, subprocess
  - ⚡ **Main dashboard** (`apps/web/`) — React 18.3 + TypeScript 5.7 + Vite 6 + Tailwind 3.4 + Motion 11 + Radix UI 1.x + Lucide 0.469 + Apple SF Pro
  - 📰 **Fallback dashboard** (`web/index.html`) — vanilla HTML + Motion via CDN
  - 🧪 **Experimental dashboard** (`apps/web-next/`) — Next.js 14.2 App Router with static export
  - 🎭 **Cleanup engine** (`xcode-cleanup.applescript`) — native AppleScript with display alerts + progress bars + system notifications
  - 🚀 **Install surfaces** — `xcc` CLI · Apple Shortcut · launchd · SwiftBar · Remote SSH runner
  - 🧰 **Build & tooling** — pnpm 9 workspace, Turbo 2, TypeScript strict, Autoprefixer 10, GitHub Actions CI, auto-release on `main` merge
- **TL;DR table at the top** of the section maps each surface to its stack + a one-line "why" so a contributor can see the whole inventory in 30 seconds without reading every deep-dive.
- **Trailing "When this section changes" callout** establishing the discipline: update inline versions whenever a major dep version changes; the README is now the prototype template for every future app shipped from this org.

### Why
Maintainer: *"We need a 'what's under the hood' section too — and that will give the entire stack we're using. Take a look at the Red-E Play admin dashboard tech stack and see how we want it done here."*

Done. Pattern matches Red-E Play's `docs/Stack.md` 1:1 in structure (TL;DR table → per-surface deep-dives with `Layer · Tool · What it handles` tables → "Why this stack" prose → status discipline at the end). Adapted for Dustpan's six surfaces. Every version number inline matches `apps/web/package.json` and `apps/web-next/package.json` exactly.

This section is the new prototype contract for every future app's tech-stack inventory.

## [0.19.2] — 2026-05-13 10:30:16 Eastern · *README rewritten at 12-year-old reading level + claude-chat-reader presentation wins*

### Changed
- **Entire README rewritten in plain English.** Every technical term is now either explained inline or replaced with a metaphor. No assumed knowledge. A 12-year-old (or a non-developer) can read the whole thing and understand what Dustpan does, why, and how. The previous README assumed familiarity with Docker, pip, SSE, Vite, Turbo, and a dozen other terms that don't help a first-time reader.
- **Every `make` target now has a plain-English explanation in a table** — not just a one-line comment. Example: `make dry-run` → *"Practice mode. Counts up how much space would be freed, but doesn't actually delete anything."*
- **Every category now has a plain-English description** in the "What Dustpan actually cleans" table. Example: *"Xcode — Apple's app for making iPhone/Mac apps. When you build a project it makes a LOT of working files. They pile up over months."*

### Added (presentation polish, inspired by `marvelousempire/claude-chat-reader`)
- **Multi-color badge row** — replaces the all-teal palette. Python blue for backend, Vite purple for build, pnpm orange, license green, macOS gray, "no telemetry" still teal. Releases badge in violet.
- **New blockquote tagline at the top** in parallel structure: *"Your Xcode caches, your Docker volumes, your browser data, your forgotten downloads — every cleanup tells you what it will cost before you click."*
- **`📦 What's in the box` emoji-led feature table** — leads each row with a topical emoji (🥧 📊 🪟 🌗 📶 ⚡ 🚦 💬 🛡️ 🔌) so the feature pitch reads at a glance. Sits above the category table.
- **`🧱 How Dustpan is built` section now has a flow diagram** showing what happens when you click "Clean ALL safe" — browser → `/api/clean-all-safe` → `cleaners.py` → `rm -rf` → SSE stream → activity terminal. The directory-tree view stays underneath.
- **`🐣 What a category looks like in code` section** — shows a real `cleaners.py` `browsers` slice so contributors can see the pattern at a glance. Three keys: `groups` (paths by safety), `actions` (one-click cleanups with `cost` spelled out), `tagline` (the one-liner on the card).
- **`🌐 Running Dustpan on a different Mac` section** — pre-empts the obvious next question. Three options laid out: SSH + `make ui`, `make install-launchd` for hourly auto-clean, single-line SSH cleanup with no install.
- **`🪟 Three versions of the dashboard, one engine` section** — explicit table mapping URL → dashboard variant → when to use it.

### Why
Maintainer: *"make the entire thing read with that level of explaining and words — a 12 year old."* — done. Also adopted the strong elements from the maintainer's `claude-chat-reader` GitHub presentation (variegated badges, emoji-led feature table, flow-diagram architecture, code-shape example, "deploying elsewhere" section) without losing anything from v0.18.9's overhaul.

## [0.19.1] — 2026-05-13 10:21:04 Eastern · *`make ui` now binds localhost + Wi-Fi by default — one command*

### Changed
- **`make ui` now serves on `0.0.0.0` by default** — both the local URL (`http://127.0.0.1:8765`) and the Wi-Fi URL (`http://192.168.X.X:8765`) print at startup. One command. No flag needed to share with another device.
- **`make ui-network` is gone.** The behavior moved into `make ui`. If you had it scripted, just call `make ui` — same outcome.
- **New `make ui-local`** for the opposite case — when you specifically want localhost-only (no Wi-Fi visibility). Sets `XCC_HOST=127.0.0.1`.
- **Server startup message updated.** Default mode now shows both URLs; the warning line was rewritten as informational (the user picked this on purpose) rather than alarmist. Localhost-only mode hints at `make ui` if you want Wi-Fi too.

### Why
Maintainer: *"we just want `make ui` to make the wifi available period. not without. local and wifi included out the box. no need for the option make it all in one."*

The skill in `marvelousempire/ai-skills-library` (`rules/library/app-launch-workflow`) and the Cursor global rule were updated in lockstep so every future app inherits this pattern.

## [0.19.0] — 2026-05-13 10:04:48 Eastern · *Dustpan rebrand — by AVERY GOODMAN — with centered About modal and Apple SF Pro typography*

The product is now **Dustpan** — same code, same functionality, refined identity. The cleanup engine (11 categories, 17 sub-tools, 58 annotated actions, the SSE live channel, the AppleScript, the pie chart, the theme toggle, every safety tier) is unchanged. What changed is the *feel* — name, attribution, typography, and a proper About modal that explains what this is and why it exists.

### Added — Dustpan wordmark + attribution
- **App name: Dustpan** — replaces "Cleanup Hub" everywhere. Header, page title, server startup, README, package.json, both Vite and Next.js apps, vanilla `web/index.html`.
- **Attribution: BY AVERY GOODMAN** — small-caps treatment next to the wordmark in the header, in the About modal, and in the page title (`Dustpan — by AVERY GOODMAN`). Follows the global `learn-mappers-copyright` rule (AVERY GOODMAN always all-caps in user-facing attribution).
- **Apple SF Pro stack made explicit.** New `font-display` Tailwind family resolves to `-apple-system → "SF Pro Display" → "SF Pro" → system-ui` for display text (wordmark, hero numbers, modal titles). Body text continues to use `font-sans` (SF Pro Text). On macOS these resolve to Apple's optical-sized SF Pro Display + Text automatically.
- **Server startup line updated:** `🧹  Dustpan  ·  by AVERY GOODMAN`

### Added — About modal
- **Triggered from the footer "About" button** (replaces the bare repo URL in the footer; the GitHub link stays).
- **Centered using the v0.18.6 flex-overlay pattern** so it sits dead-center at every viewport size, every theme.
- **Premium entrance animation:** spring physics (`stiffness: 180, damping: 22, mass: 0.9`) on `opacity + scale + y` so the modal "lands" rather than "pops." 22-frame curtain on the backdrop.
- **Three explainer sections** in the modal body:
  - **What it is** — disk-cleanup utility for working Macs, 11 categories, cost annotation per action.
  - **Why it exists** — closed-source cleaners hide what they do; Dustpan is auditable end-to-end, safe by default, fast, no Docker / pip / cloud / telemetry, one readable AppleScript and one Python file.
  - **Who built it** — AVERY GOODMAN at Learn Mappers LLC. Free. MIT. Made for developers and creative pros tired of paying rent to free up their own disk.
- **Privacy line:** `🛡 LOCALHOST ONLY — NOTHING LEAVES YOUR MAC`
- **Footer:** version + copyright (`Dustpan v0.19.0 · © 2026 Learn Mappers LLC DBA AVERY GOODMAN · UCC 1-308`).
- Implemented in both UIs: React (`AboutModal.tsx`, Radix Dialog + Motion spring) and vanilla (`web/index.html`, native modal-backdrop + display:flex centering).

### Changed
- **Header wordmark size** lifted from 17px → 22px with a tighter `-0.022em` letter-spacing for a more confident display feel. Inline `BY AVERY GOODMAN` byline rendered at 10px / 0.14em tracking / fg-faint.
- **Footer reorganized:** `About · GitHub · Changelog · MIT · localhost-only` instead of the bare repo URL. Each segment separated by inline middle dots in fg-faint.
- **Page title** in both apps: `Dustpan — by AVERY GOODMAN`.
- **README hero** rebranded to Dustpan with the new tagline `Sweep your Mac clean.`

### Preserved (nothing changed about the engine)
- All 11 categories + 17 sub-tools + 58 actions in `web/cleaners.py` — untouched
- All Python server routes + `/api/live` SSE channel — untouched
- AppleScript cleanup logic — untouched (only kVersion bump)
- Pie chart math, sidebar mini-donuts, theme tokens, terminal pane, scan/clean flows — all working identically
- Network mode, browser auto-open, three-frontend routing — all working as in v0.18.x

### Verified
At 1280×900, both modes:
- Header reads **Dustpan** + small-caps **BY AVERY GOODMAN**
- Footer "About" button opens the modal — pixel-centered (`hCenter: 0px off · vCenter: 0px off`)
- Modal entry uses spring motion, premium feel; backdrop blur active
- Closing modal returns to the dashboard with no scroll jump
- Dark theme: wordmark + byline both legible on dark background, theme toggle still works
- All existing functionality (scans, cleans, SSE, pie clicks, theme switch) unchanged

### Why
Maintainer: *"This app is called dustpan by Avery Goodman at the bottom we need in about that pops up in the middle of course that tells exactly what his app is for and what the intention of it is to serve and why it was created… cinematic smooth motion premium quality font like Apple SF."*

This release does the rebrand half (name + About + wordmark + Apple SF stack). Subsequent v0.19.x patches will refine the rest of the motion language (refined pie spring, theatrical hero count-up, micro-animations on cards) so the feel stays cinematic without ever sacrificing the underlying functionality.

## [0.18.9] — 2026-05-13 09:25:02 Eastern · *README overhaul + repo cleanup*

### Changed
- **README completely rewritten** to reflect everything built since v0.14. Previous README described "four tabs" and called it a dashboard; the new one captures all 11 categories, 17 sub-tools, 58 actions, three frontends, the three-pane Overview layout, SSE live channel, Wi-Fi network mode, the pnpm workspace + Turbo build system, and the complete architecture diagram. Formatted for a compelling GitHub landing page.
- **Explicitly answers "Does it require Docker?"** — the answer is no, clearly stated at the top: *No Docker. No `pip install`. No subscription. No telemetry.* The server is pure Python 3 stdlib. pnpm is optional (falls back to vanilla if absent).
- **Directory cleanup:** `HANDOFF.md` and `PRD.md` moved from repo root into `docs/` so the root only contains what a contributor or user would immediately need (`README`, `LICENSE`, `Makefile`, `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `xcode-cleanup.applescript`, `apps/`, `web/`, `docs/`, `assets/`, `bin/`, `launchd/`, `scripts/`, `swiftbar/`).
- **Repo files table** updated to reflect current layout.

## [0.18.8] — 2026-05-13 08:51:20 Eastern · *network mode (`make ui-network`) + auto-opens browser on start*

### Added
- **`make ui-network`** — builds the Vite app then binds to `0.0.0.0` so any device on your Wi-Fi can reach the dashboard. Prints both the local URL and the LAN URL:
  ```
    🧹  Cleanup Hub

    Local      http://127.0.0.1:8765
    Network    http://192.168.X.X:8765  ← share with devices on your Wi-Fi

    ⚠  NETWORK MODE: every device on your Wi-Fi can scan and delete files.
       Intended for personal home-network use. Stop with Ctrl+C when done.
  ```
  LAN IP is auto-detected via a zero-packet UDP socket trick (connect to 8.8.8.8:80; OS picks the right interface; read back the source address).
- **`XCC_HOST` environment variable** — override the bind address for any make target: `XCC_HOST=0.0.0.0 make ui` or `XCC_HOST=192.168.8.200 make ui` to bind a specific interface.

### Fixed
- **Browser auto-opens with a 400ms delay** after the server binds, ensuring the server is ready to handle the first request before the browser arrives. Previously `webbrowser.open()` was called synchronously before `serve_forever()` — a fast browser could see a connection refused on the first attempt if it landed in the tiny window between the call and the server actually listening. The delay is done on a `threading.Timer` so `serve_forever()` starts immediately and the browser fires 0.4s later.
- **Startup message restyled** to a two-line summary (URL + access mode) instead of a mix of print statements. Shows "run `make ui-network` to expose on Wi-Fi" hint in default localhost mode.

### Security note
Network mode is intentionally opt-in. `make ui` (the default) continues to bind to `127.0.0.1`. The network endpoint runs the same cleanup actions as the local one — anyone who can reach the port can trigger file deletions — so use it on trusted home networks only. Stop with `Ctrl+C` when you're done.

### Make target table (updated)
| Target | Binds to | Build |
|---|---|---|
| `make ui` | 127.0.0.1 (localhost only) | Vite, ~6s |
| `make ui-network` | 0.0.0.0 (all interfaces, shows LAN IP) | Vite, ~6s |
| `make ui-all` | 127.0.0.1 | Vite + Next via Turbo |
| `make ui-legacy` | 127.0.0.1 | None (vanilla shell) |
| `make ui-next` | 127.0.0.1 | Next.js only |
| `make ui-dev` | — | Vite + Next dev servers (HMR) |

## [0.18.7] — 2026-05-13 08:41:31 Eastern · *Activity terminal scrolls inside — no longer stretches the page*

### Fixed
- **The Activity (terminal) pane in the Overview now has a fixed maximum height of 320px.** Previously the terminal body had `maxHeight: undefined` when `fillHeight=true` (the embedded Overview terminal), so each new output line pushed the pane — and the whole Overview — taller. After a long scan or clean, the page could stretch by hundreds of pixels while the hero/pie/cards continued growing below it.
- **Now the terminal caps at 320px and scrolls internally.** Output auto-scrolls to the latest line as before; the pane itself stays fixed-height. The history strip, action buttons, and per-category cards below all stay in place regardless of how much output streams in.
- Fix applied in both UIs: `OutputConsole.tsx` (React, `maxHeight: 320` in embedded mode) and `web/index.html` (vanilla, `.terminal-pane .terminal-body { max-height: 320px }`).

### Verified
At 1280×900 with 40 injected output lines: terminal body `clientHeight: 320`, `scrollHeight: 2335`, `isScrollable: true`. The 3-pane row, history strip, mega-buttons, and category cards remain at fixed positions below.

### Why
Maintainer: *"the terminal screen gets longer when the text is filling it up. it should let me scroll inside instead of stretching the screen out"*

## [0.18.6] — 2026-05-13 08:34:10 Eastern · *fix: Confirm modal centered (same flex-overlay pattern as ChangelogModal)*

### Fixed
- **The "Confirm cleanup" modal (triggered by Clean all safe / Clean opt-in / Clean path / Clean everything buttons) was not centered.** It used `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` on `Dialog.Content` directly — the same off-center pattern the ChangelogModal had before v0.18.1. Applied the same fix: `Dialog.Overlay` is now a flex container (`flex items-center justify-center`) and `Dialog.Content` auto-centers inside it. Verified: `hCenter: 0px off · vCenter: 0px off` at 1280×900.
- This is the last modal that used the old pattern. **All modals now use flex-centered overlays.**

### Why
Maintainer: *"when i clicked the Clean all button — the modal is not centered in view. all of them should be like that — fix them."*

## [0.18.5] — 2026-05-13 08:24:19 Eastern · *`make ui` now builds only the Vite app (~6s) — no more stale build risk*

### Fixed
- **`make ui` previously used `pnpm turbo run build` which rebuilt both the Vite app AND the Next.js static export (~2 min combined).** If Next.js failed or the user killed the terminal early, the server would start serving whatever stale build was already on disk — which was the broken v0.18.3 build with the invisible AnimatePresence main panel. That's what caused the "none of the buttons are clickable / big dark side, only a side ball" reports even after v0.18.4 shipped.
- **`make ui` now runs only `pnpm --filter @cleanup-hub/web build` (~6s) then launches the server.** The Vite app is the canonical UI. The Next.js static export is opt-in.

### New make targets
- `make ui` — build `@cleanup-hub/web` (Vite, ~6s) + serve. **This is the default you want.**
- `make ui-all` — build **both** apps via Turbo then serve. Use when you want `/next/` too.
- `make ui-legacy` — serve vanilla `web/index.html`, no build.
- `make ui-next` — build Next.js only + serve.
- `make ui-dev` — `pnpm turbo run dev` (Vite :5174 + Next :5175 in parallel).

### To recover
```sh
git pull && pnpm install && make ui
```
Wait ~6s for the Vite build, then open `http://127.0.0.1:8765`. Full dashboard — hero, pie, theme toggle, all tabs — visible and clickable.

## [0.18.4] — 2026-05-13 08:06:18 Eastern · *fix: main panel was stuck invisible (opacity 0) — and "theme switch doesn't work" was a symptom of that*

### Fixed
- **The main viewport is no longer invisible.** The panel-switch animation wrapper (`<AnimatePresence mode="wait"><motion.div initial={{opacity:0,x:6}} animate={{opacity:1,x:0}}>`) was leaving the wrapper stuck at its `initial` state on some environments — `opacity: 0; transform: translateX(6px);` — so the entire main column rendered invisible. The maintainer reported *"a big dark side and only a side ball on the left, I see nothing else"* — sidebar visible, nothing else.
- **The theme switch was working, but invisibly.** Clicking Auto/Light/Dark correctly set `data-theme` on `<html>` and wrote to `localStorage` — `prefers-color-scheme` and the explicit-override CSS did the right thing — but the user couldn't *see* any visual change because the entire main panel was at `opacity: 0`. Their inferred "doesn't work" was a downstream symptom of the panel-invisible bug, not the switch logic itself.
- **"Stuck on dark mode"** was the same symptom: when the user clicked Light, the data attribute updated but the invisible main column couldn't render the lighter palette, so it looked stuck.

### Why the wrapper broke
`AnimatePresence mode="wait"` waits for an "exit" animation before mounting the "entering" child. On first mount there's no previous child, so the entering one should animate from `initial` to `animate`. In practice, depending on Motion 11.x's internal scheduling + how often the wrapper's `key` recomputed during the first few renders (it's `activeTab + ":" + (currentSub || "")`, both of which change as `tabs` loads), the animation never advanced. The wrapper froze at `initial`.

### What changed
- Replaced the `<AnimatePresence>` + `<motion.div>` wrapper around the panel switch with a plain `<div key={activeTab + ":" + (currentSub || "")}>`. Tab switches are now instant (no slide-in). That's a minor UX downgrade compared to *"the page is missing,"* and it's a defect class we can't have in a localhost utility.
- Dropped the unused `motion` / `AnimatePresence` imports from `App.tsx`. Individual components (`OverviewPanel`, `PieChart`, `ChangelogModal`, `OutputConsole`, `RunningWidget`, `OnboardingCoachmark`) still use Motion locally — that's not affected by this fix.

### Why this is the right shape of fix
The animation wasn't load-bearing. Tab transitions don't need a slide. The page rendering does. Trading a tiny motion flourish for guaranteed render correctness is the right call. If we want the slide back later, we'll drive it from the entering panel itself (it knows when it mounts), not from a key-based AnimatePresence wrapper that depends on a composite key that mutates during initial data load.

### Verified end-to-end
At 1280×900, fresh load with `localStorage` cleared:
- Page renders the full Overview at opacity 1 — hero, pie (42.9 GB scanned), Activity terminal, history strip, mega-buttons, cards grid.
- Click **Dark** → background turns dark, cards translucent, text light. Theme toggle pill flips.
- Click **Light** → background returns to cream, theme toggle pill flips, Activity terminal stays dark (intentional CLI surface).
- Click a sidebar tab (Xcode/LLMs/Browsers/etc) → the new panel renders instantly. No invisible wrappers.

## [0.18.3] — 2026-05-13 07:50:01 Eastern · *Theme switch in the sidebar — Auto · Light · Dark*

### Added
- **Three-state theme switcher pinned to the bottom of the sidebar** (both React and vanilla UIs). One segmented control: `Auto · Light · Dark`. Each option has its own Lucide icon (Monitor / Sun / Moon) so the chosen state reads at a glance.
- **`Auto` follows the OS** via `prefers-color-scheme: dark`. **`Light` and `Dark` override the OS** by setting `data-theme="light"` or `data-theme="dark"` on `<html>`. The CSS was already wired for both activation paths from v0.14 — this PR adds the UI and the JS to drive it.
- **Preference persists in `localStorage` under `cleanupHub.theme.v18`.** Both UIs read the same key, so the theme follows you across `/` (Vite) and `/legacy` (vanilla) without re-selecting.
- **Pre-paint inline script in `<head>`** applies the saved theme before either UI's markup renders. Avoids the classic "light flash on a dark-mode user's first paint" problem on cold load.

### Changed
- **`web/index.html`** restructured to split the dark-mode tokens between an explicit `:root[data-theme="dark"]` block and an `@media (prefers-color-scheme: dark) :root:not([data-theme="light"]):not([data-theme="dark"])` block. The media query no longer wins when the user has made an explicit choice. Same restructure for the `body` background gradients so the dark-mode gradient follows whichever activation path is active.

### Verified
At 1280×900, all three modes round-trip:
- Default load: `Auto` selected, theme follows OS (the preview environment renders light by default).
- Click `Dark` → `data-theme="dark"` on `<html>`, `localStorage.cleanupHub.theme.v18="dark"`. Background turns dark, cards glass-translucent, text light, mega-buttons brighten.
- Click `Light` → `data-theme="light"`, `localStorage="light"`. Background returns to cream, cards light, the Activity terminal stays dark on purpose (it's a CLI surface).
- Click `Auto` → `data-theme` attribute removed, `localStorage` cleared. Back to following the OS.

### Why
Maintainer: *"fix auto/light/dark mode switch in sidebar too"* — added. Both UIs.

## [0.18.2] — 2026-05-13 07:36:37 Eastern · *layout: don't hide the main panel below 1024px*

### Fixed
- **The main viewport no longer renders below the sidebar on medium-width windows.** Before this, anything narrower than `lg:` (1024px) — a normal 13" laptop, a half-screen window, a smaller monitor — fell back to the Tailwind default (1 column) and stacked the sidebar full-width on top with the main panel below it. Visually that looked like *"the full page is missing except sidebar"* because the actual app content was off-screen, reachable only by scrolling. Added a `md:grid-cols-[220px_1fr]` rule so the 2-column layout kicks in at 768px instead of waiting until 1024px.

### Layout ladder now
- **`< md` (< 768px)**: 1 column — sidebar full width on top, panels scroll below. Mobile/very-narrow stack.
- **`md` to `lg` (768–1024px)**: 2 columns — sidebar + main side-by-side. *(This was the missing case.)*
- **`lg+` (≥ 1024px)**: 2 columns by default, 3 columns when the active tab has subcategories (Sidebar · Main · SidebarRight).

Verified in preview at 600px (stacks correctly), 900px (sidebar + main side-by-side — the broken case is now correct), and 1280px (3-column with right sidebar — no regression).

### Why
Maintainer: *"the app interface is missing the full page except sidebar."* The page wasn't missing — the layout was stacking vertically below 1024px and the user couldn't see that scrolling revealed the rest. Now the 2-column layout starts at 768px, which is what the v0.14 vanilla breakpoint ladder always did. The React port had quietly dropped that intermediate breakpoint when it scaffolded.

## [0.18.1] — 2026-05-12 19:11:26 Eastern · *Changelog modal — centered + typography*

### Fixed
- **Modal now reliably centered.** The React `ChangelogModal` previously positioned itself via `fixed left-1/2 top-1/2` + `translate(-50%,-50%)` directly on `Dialog.Content`. That works in isolation but drifts whenever Radix's own transform stack lands on top of it. Refactored so the `Dialog.Overlay` is itself a `flex items-center justify-center` container and the content auto-centers inside it. Verified: viewport 1280×900 → modal renders at x=280 / y=67.5 / w=720 / h=765 (exact horizontal *and* vertical center).
- **Modal body is now actually readable.** The rendered markdown was hitting browser defaults — no header/body/list/code typography because nothing targeted `.changelog-body`. Added the full type system the vanilla `.modal-body` already had: accent-colored `h2` titles per version, small uppercase-caps `h3` section labels (`ADDED`, `FIXED`, `CHANGED`, etc), tighter paragraph rhythm, disc-style bullet lists with faint markers, monospace `code` chips on `var(--bg-3)`, and an explicit `em { font-style: normal }` so the `*…*` "Why" callouts read as emphasis, not italics.
- The Overlay container is now `overflow-y-auto` so very long changelogs (we're up to 18 versions now) can scroll the page underneath if a user pushes the window short — instead of being clipped at viewport bottom.

### Why
Maintainer: *"the modal changelog is not centered in the screen and the changelog is not easy to read"* — both. Centered, and readable.

Only `apps/web` (the canonical Vite UI) needed the fix; the vanilla `web/index.html` modal styles were already complete.

## [0.18.0] — 2026-05-12 18:13:18 Eastern · *pnpm workspace + Turbo + a Next.js app — three frontends, one Python backend*

Maintainer: *"pnpm turbo next"* — done.

### Added — pnpm workspace
- **Root `package.json`** + **`pnpm-workspace.yaml`** turn the repo into a real workspace. `apps/*` is the workspace glob.
- **Two apps** under `apps/`:
  - **`@cleanup-hub/web`** (the existing Vite + React app, renamed from `cleanup-hub-app` and moved from `web/app/` → `apps/web/` with `git mv` so history is preserved).
  - **`@cleanup-hub/web-next`** (NEW — Next.js 14 with the App Router, configured as a static export so the Python server can ship it without a Node runtime).

### Added — Turbo
- **`turbo.json`** at the root defining the standard pipeline tasks: `build`, `dev`, `typecheck`, `lint`. `build` uses `dependsOn: ["^build"]` so workspace dependencies build first, and declares `dist/**`, `out/**`, `.next/**` as outputs (with `!.next/cache/**` excluded so Turbo's cache doesn't fight Next's).
- Root scripts re-expose Turbo: `pnpm build` / `pnpm dev` / `pnpm typecheck` / `pnpm lint` all delegate to `turbo run ...`.
- Verified: `pnpm turbo run build` produces both `apps/web/dist/` (Vite) and `apps/web-next/out/` (Next) in one pass.

### Added — Next.js app at `apps/web-next/`
- **App Router** (`app/page.tsx`, `app/layout.tsx`, `app/globals.css`) — no `pages/` legacy.
- **`output: "export"`** in `next.config.mjs` — Next emits a fully-static site under `out/` so it can be served by any HTTP server (no Node runtime needed for production).
- **`basePath: "/next"`** + **`assetPrefix: "/next"`** so the Next surface coexists with the Vite app at `/` instead of clashing on root.
- **Tailwind config mirrors `@cleanup-hub/web`**'s token system (HSL custom properties, `--accent`/`--safe`/`--warn`/`--danger`, light + dark `prefers-color-scheme`) so the two apps render identically and we can lift components between them.
- Demo page (`app/page.tsx`) fetches `/api/status` on mount and renders the hero. Proves the Python backend + Next frontend work together end-to-end.

### Added — Python server routes
- **`GET /next/`** → serves `apps/web-next/out/index.html` (no-store; reflects rebuilds on next refresh).
- **`GET /next/_next/static/*`** → serves the Next-emitted hashed chunks with `Cache-Control: public, max-age=31536000, immutable`. Other `/next/*` paths fall through to disk so additional pages (when we add them) work without server changes.
- **`GET /?next=1`** → 302-redirects to `/next/`. Lets `?legacy=1` (vanilla), default (Vite), and `?next=1` (Next) all be reachable via the same root URL.
- `REACT_DIST_CANDIDATES` checks both the new `apps/web/dist/` and the legacy `web/app/dist/` path so a v0.17.x checkout that's already rebuilt locally keeps working.

### Changed
- **Makefile** ergonomics:
  - `make ui` now runs `pnpm turbo run build` (Vite + Next in parallel) then launches the Python server.
  - `make ui-react` builds **just** `@cleanup-hub/web` via `pnpm --filter`.
  - `make ui-next` builds **just** `@cleanup-hub/web-next`.
  - `make ui-legacy` (unchanged) — vanilla UI.
  - **New `make ui-dev`** — `pnpm turbo run dev` to run both frontends in dev mode (Vite on `:5174`, Next on `:5175`) in parallel.
- **`.gitignore`** extended for the new layout: `apps/*/dist/`, `apps/*/out/`, `apps/*/.next/`, `apps/*/node_modules/`, root `node_modules/`, `.turbo/`. Keeps the old `web/app/dist/` ignore for safety.
- `web/server.py` imports `typing.Optional` so the new `_react_dist_dir()` helper stays compatible with Python 3.9 (the in-tree `|`-union syntax requires 3.10).
- `_CTYPE_MAP` mime mapper picks up `.json`, `.html`, `.txt`, `.ico` so Next's emitted asset variety (build manifests, fallback HTML, favicon) serves with correct content types.

### Migration
- **Old build paths still work.** If you have a v0.17.x checkout with `web/app/dist/` already built, the server falls back to that location until you rebuild. After `git pull && pnpm install`, the new `apps/web/dist/` takes precedence.
- **No URL surface change for users.** `/` still serves the canonical UI (now the Vite app from its new home). Vanilla UI at `/legacy` / `?legacy=1` is unchanged. The Next app is opt-in via `?next=1` or `/next/`.

### Verified
End-to-end at 1280x900 via `make ui`:
- `/ → 200` (Vite — 11 sidebar tabs, pie chart, etc.)
- `/?legacy=1 → 200` (vanilla v0.15.0+ shell)
- `/?next=1 → 302` (redirects to `/next/`)
- `/next/ → 200` with `<title>Cleanup Hub · Next</title>`
- `/next/_next/static/css/*.css → 200`
- Next page fetches `/api/status` and renders 12.2 GB free with the shared design tokens. Footer copyright matches the v0.14.2 wording.

Three frontends, one Python backend, one `make ui`.

## [0.17.1] — 2026-05-12 16:55:02 Eastern · *every sidebar tab shows a number now*

### Fixed
- **Sidebar GB stat is now total footprint, not just cleanable.** Previously the left-nav showed `total_cleanable_gb` (safe + opt-in only). Any tab whose safe + opt-in tiers were zero — Docker, Apps, Browsers, Downloads, Creative, Temp files, Archives — went blank, even when caution-tier was multi-GB (Docker.raw is 14.6 GB on a typical dev Mac). Now every tab shows `safe + opt-in + caution`. Docker → **14.6 GB**, the others → **0.0 GB** (instead of going blank).
- **The number renders as soon as the tab has been scanned**, even if it's `0.0 GB`. No more half-blank sidebar column — every row gets a number once data lands.

### Why
Maintainer: *"on the sidebar we need numbers for all of those items. For example Docker is missing the numbers collectively browsers are missing it downloads, creative temp files archives. They only need to be represented by the numbers that they have that can be recovered."*

"What they have that can be recovered" = the full footprint we've surfaced (safe + opt-in + caution). Caution-tier items aren't auto-cleaned, but they're still recoverable manually — Docker.raw via the in-app reset, Trash via Empty Trash, etc. The sidebar number now reflects that total.

Touches `web/index.html`'s `updateVtabStats()` and `web/app/src/components/SidebarLeft.tsx`'s `statFor()` so both UIs stay in sync.

## [0.17.0] — 2026-05-12 16:42:16 Eastern · *four new categories — Browsers · Downloads · Temp files · Archives — plus a largest-files filter + asc/desc sort toggle*

### Added — four new top-level categories
- **Browsers** (`browsers` · emerald). Combined cache/history reclaim across **Chrome / Safari / Firefox / Edge / Brave / Arc / Vivaldi**.
  - *Safe tier*: every browser's cache folder + Code Cache + GPU cache + service-worker CacheStorage (16 paths). Re-fetched on next page load.
  - *Opt-in tier*: history files (sites + autocomplete + download history). Removing keeps you logged in but wipes "did I visit this site?" memory.
  - *Caution tier*: cookies + login data per browser — never auto-deleted. Surfaces sizes so you can review and act manually if you want to log out everywhere.
  - Two predefined actions: **Clean every browser's cache** (one click, wipes the safe tier across all installed browsers) and **Show per-browser disk usage** (informational `du -sh` so you know who's hoarding).

- **Downloads** (`downloads` · orange). Surfaces what's accumulated in `~/Downloads`.
  - Single caution-tier path: `~/Downloads` itself — never auto-deleted (it's your stuff).
  - Four actions: **List Downloads older than 30 days** (read-only, sorted biggest-first), **List .dmg / .pkg installers** (the classic disposable installer scan), **Delete .dmg / .pkg installers** (opt-in), **List 25 biggest files** (top-25 by `du -sh`).

- **Temp files** (`temp` · neutral gray). System + user temp directories that bloat during long uptimes.
  - *Safe tier*: `/private/tmp` orphans, `~/Library/Caches/TemporaryItems`, the bird cache.
  - *Opt-in tier*: `/var/folders/*/T` (per-user system temp), QuickLook thumbnails, Spotlight indexing temp.
  - *Caution tier*: `~/.Trash` and `/.Trashes` on other volumes — surfaced but never auto-emptied.
  - Four actions: **Clean /private/tmp orphans older than 1 day**, **Empty the Trash**, **Show QuickLook thumbnail cache size**, **Clear QuickLook thumbnails**.

- **Archives** (`archives` · brown). Surface large archive files lurking on disk.
  - No static paths — this category is action-driven (the user reviews + decides).
  - Three actions: **Find all archives >100 MB** (walks `~/Downloads`, `~/Desktop`, `~/Documents`, `~/Movies` for .zip/.dmg/.iso/.tar.gz/.tgz/.7z/.rar/.bz2/.xz — sorted biggest-first), **Find archives untouched for 90+ days** (filtered by `atime`), **Delete all .dmg files in `~/Downloads + ~/Desktop`** (opt-in nuke).

### Added — largest-files filter + asc/desc sort toggle
- **Per-category row toolbar** sits above the path table on every category panel. Two control groups:
  - **Min size** (filter): pill row — *All · ≥1 MB · ≥100 MB · ≥1 GB · ≥5 GB*. Hides rows below the threshold (visually filters — no rescan needed). The selected pill highlights teal.
  - **Sort**: *Size · Name · ↓/↑*. Toggle button flips between ascending and descending; defaults to descending by size (the v0.14+ behavior). Sort works inside each tier (safe / opt-in / caution) so safe items stay grouped at the top.
- **State persists across rescans** (vanilla stores in `tabsState.tableState[catId]`, React uses local component state — both work the same way to the user).
- **Empty-state message** when the filter excludes everything: *"No paths match the ≥X filter. Lower the threshold to see more."*

### Added — UI plumbing
- **`TAB_ICONS` entries** for `browsers` (globe), `downloads` (down-arrow tray), `temp` (trash can), `archives` (sealed box). Vanilla uses inline SVGs; React uses Lucide's `Globe`, `Download`, `Trash`, `Archive`.
- **`PIE_COLORS` palette** extended from 6 to 10 entries — emerald (browsers), orange (downloads), neutral gray (temp), brown (archives). Same hue in both implementations for parity.
- **`RunningWidget`'s `CAT_COLORS` map** updated to match so the per-category dots in the header chip line up with the pie slices.

### Server (`cleaners.py`)
- Four new `CATEGORIES` entries, slotted alphabetically-ish into the existing structure.
- `TABS` reordered to: Overview · Xcode · LLMs · Docker · Apps · **Browsers · Downloads** · Creative · **Temp files · Archives** · System. The new tabs sit next to the conceptually-adjacent existing ones (browsers next to apps, downloads next to browsers, temp+archives next to system).
- Total categories: 13 → 17.

### Why
Maintainer: *"add Browsers stuff, add Downloads stuff and temporary files stuff and archives and largest files filter and acending ot decending view too then commit and merge and push it all."* Done.

Verified end-to-end at 1280x1100 — React + vanilla. All four new tabs render in the sidebar with icons + GB stats + mini-donuts. Pie chart legend shows 10 categories. Cards grid shows 9 per-category cards (was 6). Browsers panel populates with 16 safe-tier rows; toolbar's `≥1 MB` filter correctly hides every empty row, leaving just the predefined actions visible.

## [0.16.0] — 2026-05-12 16:26:13 Eastern · *Phase 4 — React app is now the canonical UI (vanilla available behind `/legacy`)*

Closes the last item on the v0.14.2 audit list: gap 6 + elevation J. The React + Vite + Tailwind UI scaffolded across v0.15.0-WIP commits is now built and served by the Python server. Vanilla `web/index.html` lives on as the rollback escape hatch.

### Added
- **`web/server.py` serves `web/app/dist/`.** When `web/app/dist/index.html` exists, `GET /` returns the React HTML shell with cache-control `no-store`, and `GET /assets/*` returns the hashed JS/CSS with `Cache-Control: public, max-age=31536000, immutable`. The vite-emitted hashed filenames make long caching safe — every rebuild invalidates them automatically.
- **`_guess_ctype()` mime mapper** for the assets dir. Stays stdlib-only (no `mimetypes` import) and covers exactly what `vite build` produces: `.js`, `.mjs`, `.css`, `.map`, `.svg`, `.png/.jpg/.jpeg/.webp`, `.woff/.woff2/.ttf`.
- **`/legacy` route** always serves the vanilla `web/index.html` — a one-click rollback path that doesn't require restarting the server.
- **`?legacy=1` query parameter** on `/` forces the vanilla UI even when a React build is present. So someone can pin a bookmark to `http://127.0.0.1:8765/?legacy=1` and keep using the v0.14.2 layout.
- **`XCC_LEGACY_UI=1` environment variable** flips the default for the whole server process. Equivalent to using `make ui-legacy`.
- **`make ui` auto-builds the React app** when `pnpm` is available, then launches the server. Falls back to the vanilla UI gracefully when `pnpm` isn't installed or the build fails — the dashboard stays available even on machines that can't build TypeScript.
- **`make ui-legacy`** target — `XCC_LEGACY_UI=1 python3 web/server.py`. Useful for testing the vanilla path without uninstalling pnpm.
- **`make ui-react`** target — explicit `pnpm install && pnpm build && python3 web/server.py`. For CI/automation where the implicit fallback isn't wanted.
- **`web/app/dist/` and `web/app/node_modules/` added to `.gitignore`.** Build artifacts and the 200MB dependency tree don't belong in the repo.

### Fixed (React WIP, surfaced once the build was actually running)
- **Overview auto-scan now fires.** The React `DashboardContext` had `activeTab` defaulting to `"overview"` via `useState`, which meant `setActiveTab("overview")` was never called on mount — and that's where the auto-scan trigger lived. Added a `useEffect` that runs once when `tabs.length > 0` and re-triggers the scan if the user landed on Overview. The vanilla UI was unaffected (it uses `switchTab` explicitly during `loadTabs`).

### Why
Maintainer asked for "the rest of the gaps and elevations." This is the deploy-layer half that needed its own PR — landing it as a separate `v0.16.0` keeps the v0.15.0 visual + UX work as one reviewable unit and the deploy-story switch as another.

The React build is **0.43 KB HTML + 21.29 KB CSS + 372.76 KB JS** (gzipped: 0.29 + 5.20 + 119.93). That's the entire app — every component, the bundled Motion library, the inlined types — in ~120KB over the wire. Loads in one trip from localhost.

### Verified
End-to-end via `make ui` at 1280x900: server logs the build, Vite emits `dist/`, Python serves the React `<div id="root">` shell, React mounts, `/api/status` returns 11.9 GB free, `/api/live` connects and pushes status deltas, the auto-scan fires, the pie populates with four colored slices summing to 30.3 GB scanned, the sidebar mini-donuts paint, the "Clean ALL safe · 0.9 GB" + "Clean ALL opt-in · 12.6 GB" mega-buttons enable, and the math matches the per-card tier sums.

### Migration path (zero-friction)
- **Already running v0.15.0?** Pull, run `make ui`. If `pnpm` is installed the React UI loads. If not, you still get the v0.15.0 vanilla UI you were using before. Nothing breaks.
- **Don't want the React UI?** `make ui-legacy`, or set `XCC_LEGACY_UI=1`, or append `?legacy=1` to the URL. All three are equivalent.
- **Plan to roll the legacy escape hatch out?** Not in this release — `/legacy` and `?legacy=1` stay supported through at least v0.17.

## [0.15.0] — 2026-05-12 15:59:58 Eastern · *full audit pass — pie polish, sidebar donuts, live SSE channel, terminal search, onboarding*

The maintainer said "knock out the rest of the gaps and elevations." Everything from the v0.14.2 audit landed in one release except Phase 4 (production build → Python server), which is its own follow-up because it changes the deploy story.

### Added — pie chart (elevations A, B, C, D + gap 7)
- **Hover tooltip on every slice.** Cursor-following chip showing `{category} · {GB} · {N paths}`. Pulls the path count straight from the scan's `groups[tier].paths` so the number is real.
- **Click-and-drill animation.** Clicking a slice (or its legend entry) `transform: scale(1.08)`'s the slice outward for 160ms before the tab transition runs. Reads as cause-and-effect instead of an instant jump.
- **Spring-tween on slice angle changes.** When a scan completes and the layout shifts, the SVG paths tween via Motion's `M.animate` from their previous angles to the new ones over 600ms (cubic-bezier 0.22, 1, 0.36, 1). New slices start collapsed (start === end) at their insertion point and grow from nothing.
- **Ghost slice + center number tween on cleans.** When the grand total *decreases* (something got cleaned), the previous pie layout renders as a 55%-opacity ghost group underneath, then fades to 0 opacity over 550ms. Simultaneously the center number tweens from its old value to the new value via `M.animate`. Visceral confirmation that the clean worked.
- **`arcPath` 100% edge case fixed.** A single category at 100% used to draw `M cx cy L sx sy A r r 0 1 1 sx sy Z` (start === end) which renders as nothing in some SVG engines. Now detected and replaced with a single `<circle>` element of the slice's color.
- **`#pie-tooltip`** is appended to `<body>` once and reused (no re-create churn on hover).

### Added — sidebar mini-donuts (elevation H)
- **Every left-nav tab now has a 16x16 donut** rendered inline next to its GB stat. Three concentric stroke-dasharray arcs visualize the safe/opt-in/caution split for that tab. Hidden until the tab has scanned data so first-load doesn't show six empty grey rings.
- **`paintVtabMiniDonut()`** is called from `updateVtabStats()` so the donuts refresh on every scan completion alongside the GB labels.

### Added — `/api/live` SSE channel (gap 2 + elevation F)
- **New server endpoint.** `GET /api/live` opens a long-lived SSE connection that pushes:
  - `{event: "status", data: <get_status() payload>}` on disk-status deltas (polls server-side every 2s, only emits when the JSON signature changes).
  - `{event: "running", data: [{token, category, kind, started_at}, ...]}` on changes to the running-cleans registry.
- **`:keepalive` SSE comment** every 25s so proxies/middleboxes don't idle-close the connection.
- **Auto-reconnect with backoff** on the client side (1s → 1.6s → 2.6s → … capped at 15s) so a server restart heals without a hard reload.
- **The 15s `setInterval(loadStatus, 15000)` poll is gone.** The hero free-GB number now ticks in real time when *anything* outside the app frees disk (e.g. macOS purging a snapshot, another browser tab running a clean, a Time Machine sweep).

### Added — running-cleans widget (elevation G)
- **New widget in the app header** (`#running-widget`). Hidden when nothing is running. When one or more clean SSE streams are in flight, shows: a spinning ring + "**N** cleans running" + per-category colored dots (using the same `PIE_COLORS` palette). Each dot tooltips the category id + active count.
- **Pulsing teal box-shadow** at 1.8s cadence so it reads as live without becoming visual noise.
- **Server-side `_RUNNING_CLEANS` registry** with a thread lock. Every `_stream_clean_*` and `_stream_action` method `_register_clean`s on entry and `_unregister_clean`s in a `finally` block — exception-safe.

### Added — terminal search + ANSI (elevation E)
- **Search box in the Activity pane toolbar** (`#terminal-search`). Filters visible lines as you type — non-matching lines get `.filtered-out` (opacity 0.18) instead of being removed, so the line numbering stays consistent. Matches are highlighted with a yellow `.hl` span.
- **`Ctrl+F` / `Cmd+F` global shortcut** focuses the search box when the Overview tab is active. Escape clears the filter and blurs.
- **`Clear` button** next to the search empties both terminals + resets the filter to the idle placeholder.
- **Minimal ANSI escape parser.** Handles `\e[3xm` / `\e[9xm` fg colors + `\e[1m` bold + `\e[0m` reset. Maps codes to `.ansi-fg-red/green/yellow/blue/magenta/cyan/gray` and `.ansi-bold` CSS classes. 256-color and RGB modes pass through as plain text. Covers 95% of `rm -rf`, `docker`, and `pip` output.
- **`parseAnsi()` + `buildLineWithHighlight()` helpers** decouple ANSI tokenizing from search-match wrapping so both work together without double-escaping.

### Added — first-visit onboarding coachmark (elevation I)
- **Single coachmark** that pulses an accent-tinted box-shadow around the Overview pie pane the first time the new layout loads. Label: *"New: click a slice to drill in"* on a teal pill above the pane.
- **Dismisses** on a click on the pie or legend, OR after 12s, whichever comes first. Sets `cleanupHub.coachmark.v15` in `localStorage` so it never shows again.
- **Re-anchors on window resize** so it stays aligned with the pie pane through layout shifts.

### Changed
- **`renderOverviewGrid()` wraps `renderPie()` in try/catch** so a pie-chart bug never aborts the per-category card grid render.
- **`paintVtabMiniDonut()` uses `setAttribute("hidden", "")` / `removeAttribute("hidden")`** instead of the JS `.hidden` property — the latter is unreliable on SVG elements in some browsers.
- **`appendLine()` stores raw text on `dataset.raw`** so the search filter can re-run against the original (post-ANSI-strip) text without re-parsing the rendered children.
- **`applyTerminalFilter()`** re-renders existing lines through `buildLineWithHighlight()` when the query changes, so highlight spans stay in sync.

### Why
Maintainer: *"merge everything commit and push first and then we knock out the rest of the gaps and eleveations."* PRs #8 + #9 merged (v0.14.1 + v0.14.2 on `main`). This release is the post-merge audit pass — every visual/UX gap and elevation surfaced after v0.14.2 shipped in one go, except Phase 4 which is a deploy-layer refactor.

## [0.14.2] — 2026-05-12 15:05:24 Eastern · *Overview 3-pane top — hero · pie · terminal — plus copyright footer*

### Added
- **3-pane top in Overview** replacing the single hero card. Three sibling cards across the top of the Overview panel:
  - **Left — Hero.** Free GB count + progress bar + "Factory-fresh without losing your stuff" lockup. Same content as before, narrower padding to share the row.
  - **Middle — `Where the disk is going` donut pie.** SVG donut where each slice is one top-level tab (Xcode teal · LLMs violet · Docker sky-blue · Apps amber · Creative pink · System slate). Slice size = `safe + opt-in + caution` per tab (the full footprint we've scanned). Center number = total GB scanned. Click a slice or a legend entry to jump to that tab. Hidden when nothing has been scanned yet; shows an empty ring as a placeholder.
  - **Right — `Activity` terminal.** The output console now lives here for Overview-triggered cleans. Always visible (not collapsed). Shows an italic "Idle — nothing is running. Hit Scan or Clean to see live output." placeholder when empty; lines stream in as cleans run. Bottom `#output` element stays as the fallback target for non-overview cleans, and `appendLine` writes to both targets so the output is in sync wherever you happen to be looking.
- **Per-category pie color palette** keyed to top-level tab id (`PIE_COLORS`).
- **`renderPie()`** + `arcPath()` helpers — pure-SVG donut, no chart library. Called from `renderOverviewGrid()` so the pie refreshes on every scan completion.
- **Footer copyright row** below the existing footer line: `© 2026 Learn Mappers LLC DBA AVERY GOODMAN · All rights reserved · Intellectual property · UCC 1-308`. Follows the global `learn-mappers-copyright` rule (AVERY GOODMAN rendered in all caps, UCC 1-308 reservation included).

### Changed
- `#output` element wrapped in `#output-host-bottom` so the bottom output container is symmetric with the new `#output-host-top` (inside the terminal pane).
- `appendLine()` now writes to both `#output` and `#output-host-top` so cleanups triggered from any tab show output in whichever pane the user is viewing — and hides the idle placeholder on first line.
- `clearOutput()` helper added to reset both outputs back to the idle placeholder state.
- `buildOverviewPanel()` HTML restructured for the 3-pane layout. The history strip, mega-button row, and per-category card grid remain in the same order below.
- Footer markup wrapped in `.footer-row` divs so the copyright sits cleanly on its own line; copyright row uses `.footer-copyright` with `--text-faint` and slightly smaller type so it reads as legal-stamp not primary content.

### Why
Maintainer: *"The top part with the number split that whole section with that same part but share it with the part that's at the bottom now that little terminal so you'll have the terminal on one side and you'll have like the total free on the other side and in fact, make three spaces put the one in the middle to be like a pie of all of the areas and how much they're taking up on the disc."* Plus: *"the app is made by Learn Mappers LLC DBA Avery Goodman 2026 copyright intellectual property ucc 1-308."*

The pie answers the disk-going-where question at a glance — Docker.raw being 14.8 GB out of 16.8 GB scanned is now a single sky-blue wedge dominating the donut, not a number you have to find in a panel.

## [0.14.1] — 2026-05-12 14:44:02 Eastern · *fix: Overview card totals now match the "Clean ALL" buttons*

### Fixed
- **Overview cards no longer conflate tiers.** Each card now shows two prominent numbers stacked — **`X GB safe`** (green) and **`Y GB opt-in`** (amber) — instead of a single ambiguous "cleanable" headline that combined the two. Caution-tier moves to a smaller informational line below ("X GB caution (surface only)") since the dashboard never auto-cleans that tier.

  **Why it matters:** the math is now obvious at a glance. Sum the green numbers down the card column → that's what the `Clean ALL safe` button will free. Sum the amber numbers → that's what `Clean ALL opt-in` will free. Before this change the card said "5.1 GB cleanable" while the button said "0.0 GB", and the user reasonably assumed the button was undercounting. Both numbers were correct; they were just measuring different tiers. The fix removes the conflation.

### Why
Maintainer: "I see each category Xcode LLM's Docker they all have the amount of gigabytes that are cleanable. If I add all of those boxes up together, the button clean all safe should be the total amount of all those claimable cleanable." Math now works: card sums per tier equal the corresponding button GB total.

## [0.14.0] — 2026-05-12 13:47:59 Eastern · *Overview tab + three-column shell — sidebar nav, sub-nav, focused viewport*

The shell redesign the maintainer asked for. Tabs migrate to a left sidebar; sub-items (LLMs + Creative) move to a right sidebar; the center becomes a dedicated focus viewport for the active panel. A new **Overview** tab is the default landing — it pre-scans every category and renders a per-category summary grid + the hero + the global mega-buttons.

### Added
- **`Overview` tab** as the new default landing. Auto-runs `scanEverything()` on first activation, populating six per-category summary cards in parallel. Each card shows: icon + name + cleanable GB + tagline + per-tier breakdown (safe / opt-in / caution) + click-to-open hint. Clicking a card switches to that tab. The hero (free GB + promise lockup) + history strip live inside Overview, not floating above.
- **Left sidebar — vertical tab nav.** Seven tabs (Overview · Xcode · LLMs · Docker · Apps · Creative · System) as a sticky vertical column. Each tab shows its Lucide icon + label + a live cleanable-GB stat that updates as scans complete. Active tab gets a teal background + teal left-border + teal icon.
- **Right sidebar — vertical sub-nav.** Appears only when the active tab has subcategories (LLMs · Creative). Lists each sub-tool with its own cleanable-GB stat. Clicking a sub-tool switches the center viewport. Hidden otherwise; the center expands to fill.
- **Single-pane sub-panel pattern.** Subcategories no longer render as stacked cards — only one sub-panel is active at a time, driven by the right sidebar selection. Way less scroll, way more focus on the data you actually care about.
- **`overview` entry in `cleaners.py`'s `TABS`** marked `meta: True` (no real cleanup category — UI-only). Server passes it through; dashboard renders the special Overview panel.
- **`updateVtabStats()`** keeps the left-nav stats live during scans (each tab's cleanable-GB updates as data lands).
- **Responsive breakpoints.** Desktop (>1024px): three columns. Tablet (720–1024px): two columns (sub-items become an inline pill bar at top of viewport). Mobile (<720px): single column, left nav becomes a horizontal scroll strip.

### Changed
- **`web/index.html` shell completely restructured.** The container is now `app-shell` with `app-grid` (CSS grid: 220px / 1fr / 220px). Header sits above; output console + footer sit below.
- **Hero card moved into Overview.** It used to be always-visible above the tabs; now it lives inside the Overview panel as part of the welcome experience. The other tabs (Xcode / Docker / Apps / System) skip straight to their own data — no hero distracting from the focus content.
- **First-run gate removed.** With Overview being a scanning home by default, the "Show me what's worth cleaning" CTA was redundant. The `cleanupHub.hasVisited` localStorage flag is no longer read or set.
- **`tweenHeroNumber` snap-baseline.** The hero count-up now snap-sets the target value immediately, then animates on top. Fixes a class of edge cases where `requestAnimationFrame` is throttled (background tabs, headless browsers) and the animated frames never fire — the value stays correct regardless.
- **`loadStatus()` split** into `loadStatus` (data fetch) + `paintHero` (DOM render). Lets the Overview panel re-paint the hero on mount even when status data has already loaded before the DOM was built.

### Preserved
- Six cleanup categories + 13 actual sub-categories (Overview is purely meta). 122 paths, 35+ cost-annotated actions.
- All install surfaces (Web UI · Shortcut · CLI · launchd · SwiftBar · SSH).
- Three safety tiers (safe / probably_safe / caution).
- 127.0.0.1 localhost binding, zero pip/npm server-side deps.
- Real-time SSE console, in-app changelog modal, live version pill.
- Custom cost-modal with the cost annotation as the visual centerpiece.
- Docker.raw size callout in the Docker panel header.
- All v0.13 hardening: pre-flight volume check, buildx split, per-catalog Lightroom preview cleanup, dual CacheClip locations, Final Cut + Logic + Blender + OBS support.

### Why
Maintainer: *"we actually need an overview tab that pre-scans everything and displays everything on that first launch and we also need those tabs to go on the side left and then if they have any sub items, the sub items will come up in a sub menu on the right side bar to make the center information and focus view port for the content and displays. being generated."*

## [0.13.0] — 2026-05-12 13:11:52 Eastern · *full gap-audit + elevation pass — closes every open follow-up from v0.11+v0.12*

The maintainer asked for everything in the audit list — gaps + elevations — and got it.

### Added — new Creative sub-cards
- **Final Cut Pro** sub-card. Per-library actions that walk every `~/Movies/*.fcpbundle`: clear *Render Files*, clear *Transcoded Media* (proxies + optimized), clear `~/Movies/Final Cut Backups`. Library structure + edits + imported media are never touched.
- **Logic Pro** sub-card. Per-app + waveform + Plug-In Settings caches. Apple Loops surfaced informationally (5–20 GB but reinstallable — the safe reclaim path is in-app, not Finder).
- **Blender** sub-card. Per-version Cycles cache cleanup that walks `~/Library/Application Support/Blender/*/cache`. Plus `/tmp/blender_autosave` cleanup for crash orphans.
- **OBS Studio** sub-card. Logs + crashes + browser-source Chromium cache. User config (scenes, profiles) explicitly surfaced as caution-tier read-only.

### Added — Docker hardening
- **`docker system df -v` informational action.** Top of the Docker action stack. The summary the OS doesn't surface anywhere else.
- **Pre-flight volume check.** Lists every volume + every *unattached* volume *before* the aggressive prune runs — with the size of each. So "you're about to wipe `postgres-data` and `redis-data`" is a visible decision, not a surprise.
- **Build cache split out** into its own action (`docker buildx prune -af`). Was originally bundled into the safe-prune; the next build runs from scratch after this, so it deserves its own opt-in click.
- **Docker.raw size callout** in the Docker panel header. After a scan, if Docker.raw is found, a warn-tinted callout shows its size + a pointer to the reset-the-VM action. The biggest hog on most dev Macs, now unmissable.

### Added — Adobe / Lightroom hardening
- **Per-catalog Lightroom preview cleanup action.** Walks `~/Pictures/Lightroom/*` and removes only `Previews.lrdata` / `*.lrpreviewstore` / `Helper.lrdata` per catalog. The `.lrcat` files (your catalog — irreplaceable) are *never* touched.
- **Lightroom folder-stats action.** Informational. Fast `du -sh -d 0` so a 500 GB photo library doesn't lock the UI.
- **Clear Adobe app caches** description sharpened to spell out the overlap: this action touches `~/Library/Caches/Adobe/*` (which includes Lightroom's *non-catalog* caches); your `~/Pictures/Lightroom` catalog is never affected by it.

### Added — DaVinci Resolve hardening
- **Both CacheClip locations** are now scanned + cleaned in the same action. Legacy `~/Movies/CacheClip` + the Resolve-18+ `~/Movies/Blackmagic Design/DaVinci Resolve/CacheClip`. No more wondering which version we cover.

### Added — README + Makefile + docs
- **README hero subtitle** extended: now mentions Docker / Adobe / DaVinci / Final Cut / Logic alongside the previous "LLM tool caches, browser caches, system junk" — with an honest "50–150 GB on a working creative-pro Mac" range.
- **README "What it finds" table** updated to six tabs, with the Creative tab broken down into its six sub-cards.
- **`make clean-docker`** target — safe-prune from the CLI with the same y/N gate + cost preamble + summary the dashboard runs. One shortcut as a proof of concept; the dashboard remains the canonical UX.
- **`docs/Feature Ledger.md`** updated with all v0.11 + v0.12 + v0.13 features (rows 25a–25k + 31a–31g) and the new `docs/Design-System.md` + `docs/Redesign-Brief.md` doc entries.
- **`docs/Issue-Log.md`** updated with two new entries: the preview-server-cwd gotcha + the port-collision-with-maintainer's-make-ui gotcha.

### Caveats (honest limitations)
- Docker, Adobe, DaVinci, Final Cut, Logic, Blender, OBS path syntax was verified by reading recent versions' documentation + spot-checking what existed on this Mac. Only Docker has a real install on the verification machine (Docker.raw is 12.1 GB and the callout fires). Anyone running the dashboard on a creative-pro Mac will be the first to validate the Adobe / DaVinci / FCP / Logic / Blender / OBS paths against real data — please open an issue if anything misses.
- The Demo GIF (Issue #2) is still open — a manual screen-recording task, not automatable from this session.

### Why
Maintainer: "build them all." Every numbered gap (1–8) and every lettered elevation (A–H, minus the recording task) from the v0.12 audit is landed.

## [0.12.0] — 2026-05-12 12:55:20 Eastern · *Docker, Adobe, DaVinci Resolve — three new categories*

Three of the biggest disk hogs on a working Mac that v0.10 didn't cover.

### Added
- **Docker tab** — own top-level category. The Docker.raw VM disk routinely sits at 30–60 GB on dev machines.
  - **Safe:** Docker Desktop logs · buildx build cache · CLI plugins cache · diagnostics · telemetry queue.
  - **Caution (surface only):** the Docker.raw file itself in both new and legacy locations, plus the Group Containers state directory.
  - **Actions:**
    - *Prune Docker — safe.* `docker container prune` + `image prune` (dangling only) + `network prune` + `buildx prune -af`. Volumes left alone — DB data stays safe.
    - *Nuke ALL unused Docker.* `docker system prune -a --volumes -f`. Cost annotation makes the volume-wipe risk unmissable.
    - *How to actually shrink Docker.raw* (informational). Pruning shrinks the contents, not the .raw file — surfaces the Docker Desktop reset path + a CLI alternative.
    - *Clear Docker Desktop logs + diagnostics.*
- **Creative tab** — stacked-card panel containing Adobe + DaVinci Resolve (same pattern as LLMs).
  - **Adobe sub-card.** Targets the biggest reclaim on a video editor's Mac: the shared Premiere/AE Media Cache. Plus per-app disk caches (Premiere · AE · Photoshop · Bridge · Acrobat · Creative Cloud), Camera Raw cache, and a deliberately *non-deleting* Lightroom info action so the catalog is never at risk.
  - **DaVinci Resolve sub-card.** Render Cache · Optimized Media · CacheClip proxies as the safe trio. Gallery Stills + Fusion disk cache as opt-in. Projects + disk database in caution (surfaced for review only).

### Changed
- `cleaners.py` `TABS` array now has six entries: `xcode · llms · docker · apps · creative · system`. The redesigned UI absorbs them automatically — no server.py changes needed.
- New Lucide tab icons for Docker (container glyph) and Creative (palette glyph), matching the v0.11 icon system.
- `LLM_PROVIDER_LABELS` renamed to `SUB_LABELS` since it now also holds the Adobe / DaVinci pre-scan display names.

### Preserved
- Cost annotation on every new action — including the explicit volume-wipe warning on `docker system prune -a --volumes` and the explicit catalog-protection note on the Lightroom action.
- Three-tier safety taxonomy applied to every new path. No new tier semantics; the new categories slot into the existing model.
- The redesigned UI (v0.11.0 in this PR) renders the new tabs with zero structural change.

### Why
Maintainer follow-up to v0.11.0: "we need to add a Docker Section in there too. I forgot Docker was another Huge one, and Adobe too. and DaVinci Resolve too." Three of the most common 10+ GB hogs on a working Mac that weren't in v0.10's surface.

## [0.11.0] — 2026-05-12 12:45:29 Eastern · *v1 redesign — design system, restructure, Motion polish, README rewrite*

The redesign called for in `docs/Redesign-Brief.md`. One feature branch, four phases, every preserve-list item intact.

### Added
- **`docs/Design-System.md`** — canonical token reference (colors, type, spacing, radii, elevation, motion). Captures the decisions so future contributors don't re-derive them.
- **Teal accent** (`#0F766E` light / `#2DD4BF` dark) replaces Apple blue. Distinct from every other Apple-blue dev tool on a Show-HN thumbnail; calm precision-instrument family (Linear, Things, Tot share it). Semantic tier colors retuned for confidence over neon.
- **Cumulative-freed history strip** below the hero — surfaces "you've freed N GB across M runs" on every visit, sourced live from `/api/report`. Promoted from the buried footer.
- **"Factory-fresh without losing your stuff" promise lockup** with a shield icon, visible on the hero card every session. The safety claim now lives in the UI, not just the README.
- **First-run progressive disclosure flow.** A new visitor sees a single "Scan every category" CTA instead of the three-button mega-bar. Once they scan or click "Skip the tour," the returning-user state activates and persists (localStorage `cleanupHub.hasVisited`). Power users get zero regression.
- **Custom confirm modal** replacing every `window.confirm()` call. The cost annotation is now the visual centerpiece of the confirm — the distinctive UX feature finally earns its moment. Backdrop blur + spring scale-in (220ms).
- **Motion (motion.dev) loaded via CDN** as a single ES-module import, pinned to `motion@11.18.0`. Zero-deps server-side promise preserved. Graceful degradation: every animation call is wrapped; CDN failure leaves the UI fully functional with instant state changes.
- **Motion micro-interactions** per the brief's animation table: hero number count-up tween (600ms ease-out), progress-bar spring fill, tab fade+slide, success pulse on successful clean, staggered path-row entrance after scan, line-by-line SSE console reveal, cost-banner translate on hover.
- **`prefers-reduced-motion` honoured globally** — all animations collapse to instant state changes for users who've opted out.
- **Lucide tab icons** (Xcode hammer-down, LLMs bot, Apps app-window, System hard-drive) replacing the emoji glyphs. One icon system, no font-renderer drift.

### Changed
- **Cost annotation lifted** to the top of every action card (was buried below the description). Now the first thing the eye lands on — with a left-border in `--warn`, an info-icon, and a small `COST OF DOING THIS` uppercase label.
- **LLM tab pattern** — Claude/Cursor/ChatGPT now render as three stacked cards in a single panel. Sub-tab navigation removed. One click per provider instead of two.
- **Hero number** sized up from 72px to 80px with tighter `-0.04em` tracking. `font-variant-numeric: tabular-nums` applied globally so the tween doesn't jiggle.
- **Caution-tier note style** — the informational red-tier note now uses a `--danger-soft` background instead of a flat grey, visually distinguishing "review manually" sections at a glance.
- **README rewritten** — tighter hero ("Reclaim 10–25 GB Xcode is hoarding. One click.") with a subtitle that surfaces the cost-annotation + no-telemetry promises. Install matrix collapsed into two `<details>` groups ("I want a GUI" / "I want a CLI"). Comparison table vs CleanMyMac / DevCleaner / `rm -rf` surfaced from the internal positioning doc — the competitive moat made tangible.
- **Hardcoded category list deleted** at the JS layer — was duplicating `/api/tabs`. Now derived from the server response (`tabsState.allCategories`). Flagged in `docs/Redesign-Brief.md` as brittleness; fixed in this pass.

### Fixed
- JS module syntax-checked with `node --check` before commit — the v0.8.2 ghost (Issue-Log 2026-05-12 11:17 ET) doesn't reach `main` again.

### Preserved (the moats — non-negotiable)
- All 6 install surfaces (Web UI · Shortcut · CLI · launchd · SwiftBar · SSH) still work; `cleaners.py` and `xcode-cleanup.applescript` are unchanged.
- Three safety tiers (`safe`/`probably_safe`/`caution`) — taxonomy and behavior identical.
- `127.0.0.1` localhost binding, zero pip/npm server-side deps.
- Real-time SSE console — now with subtle line-by-line fade, no behavioral change.
- Live CHANGELOG version badge + in-app changelog modal.

### Why
The maintainer authored `docs/Redesign-Brief.md` explicitly for this moment ("redesign this entire app based on the knowledge, skills, and tools available"). Four-phase plan ratified in plan mode; this PR is the merge.

## [0.10.1] — 2026-05-12 12:20:57 Eastern · *expressed intent on Motion (motion.dev) + 21st.dev hero patterns*

### Added
- **`docs/Redesign-Brief.md` — new "Explicit external references" section** before "What's working — preserve these". Names two external resources the next session must treat as authoritative for the redesign:
  - **[Motion (motion.dev)](https://motion.dev)** — formerly Framer Motion, repo at [`motiondivision/motion`](https://github.com/motiondivision/motion). Install paths for React (`motion/react`), vanilla JS (`motion`), and Vue (`motion-v`) documented. Hello-world examples included verbatim from the README.
  - **[21st.dev/community/components/s/hero](https://21st.dev/community/components/s/hero)** — 284 hero components for React/Tailwind. Used as inspiration; pick 2–3 patterns that align with the locked positioning.
- **Architectural decision the next session must make** — Path A (Motion via CDN, stay vanilla, zero-deps preserved) vs Path B (full React/Vite/Tailwind/Motion migration). Default recommendation: Path A. Both spelled out with trade-offs.
- **Concrete animation use-case table** — 8 elements of the dashboard (hero count-up, progress-bar spring fill, tab switch, confirm modal, SSE console reveal, cost banner, success pulse, per-path stagger) mapped to specific Motion primitives.
- **emil-design-eng tone reminder** — every animation must be subtle. If a user *notices* an animation, it's wrong. Signal is the data, not the choreography.

### Changed
- `HANDOFF.md` skill toolkit section now lists Motion + 21st.dev as authoritative external references alongside the `ui-ux-pro-max` + `emil-design-eng` skills.

### Why
User: "be sure to express intent on https://21st.dev/community/components/s/hero and https://motion.dev of whatever the github for framer motion we have says to do." The Redesign Brief now names these explicitly so the next session uses them by default instead of re-deriving an animation strategy.

## [0.10.0] — 2026-05-12 12:17:14 Eastern · *fresh-session handoff — HANDOFF rewrite + Redesign Brief*

Targeted at the next phase: a fresh Claude Code session that needs to redesign the app cold using the full skill toolkit and ai-skills-library rules.

### Added
- **`docs/Redesign-Brief.md`** — 195-line action document for the next session. Covers: what to preserve vs reconsider, the design-skill chain (`ui-ux-pro-max` → `emil-design-eng`), the marketing-skill chain (`page-cro` → `copywriting`), a suggested 60-minute starting workflow, "done" + "done well" success criteria, and open questions to surface vs decide on the spot.

### Changed
- **`HANDOFF.md` fully rewritten** as a true bridge document for fresh-session bootstrapping:
  - TL;DR + 60-second read order
  - Current pipeline state per `dev-discipline` rule
  - The 58-skill toolkit inventory with use-cases per family
  - Operating-rules reference (links to `marvelousempire/ai-skills-library/rules/library`)
  - File-by-file map of the repo
  - Outstanding work numbered for traceability
  - "How to ship from here" and "How to redesign from here" pointers

### Why
User: "I'm gonna start a new session and then I expect it to know everything so it needs to be kind of like a handoff sheet because I'm gonna get that new session to redesign this entire app based on that knowledge, skills and tools set." These two docs are designed to make that next-session bootstrap take 60 seconds, with the design + marketing skill chain explicitly laid out so the new session doesn't re-derive anything.

## [0.9.0] — 2026-05-12 11:57:12 Eastern · *rules compliance — canonical CHANGELOG, Feature Ledger, Issue Log*

Brings this repo into compliance with the design rules at `marvelousempire/ai-skills-library/rules/` (`dev-discipline`, `changelog-and-versioning`, `go-live-path`).

### Changed
- **CHANGELOG moved** to `docs/CHANGELOG.md` (per `changelog-and-versioning` rule). Root `CHANGELOG.md` is now a symlink so any existing links stay valid. `/api/changelog` endpoint updated to read from the new path.
- **Every header rewritten** to the canonical format: `## [0.x.y] — YYYY-MM-DD HH:MM:SS Eastern · *short tagline*`. Timestamps come from each tag's actual commit time. Going forward, every release gets a real timestamp and a tagline.
- **`property kVersion`** in `xcode-cleanup.applescript` bumped from `"0.4"` (stale since v0.5.0) to `"0.9.0"`. The runtime version-check that talks to GitHub now correctly identifies the shipped version.
- **Branch + PR workflow** — this v0.9.0 itself is the first release shipped on a feature branch with a real PR (`cleanup/v0.9.0-rules-compliance`). Direct-to-main commits were fine for the rapid prototype phase; from here on, every non-trivial change goes through a PR per the `dev-discipline` rule.

### Added
- **`docs/Feature Ledger.md`** — per-feature status grid (✅ shipped / ✔️ partial / 🔜 next / ❌ deferred). Covers six install surfaces, every web-UI feature, all six cleanup categories, the auto-release infrastructure, and the v0.10+ wishlist.
- **`docs/Issue-Log.md`** — backfilled with 10 real near-misses from this build session: duplicate-const JS error, `/Applications` path scan inflation, cross-worktree edit hook fights, broken footer GH URL, two CHANGELOG drift incidents, stale browser cache, sequential `du` scans, port collisions, AppleScript reserved-word ("line") error, 8-space indent regressions from heredoc python edits. Each entry has the symptom, the diagnosis, the fix, and what would have prevented it.

### Why
User asked: "are you following the design guides and rules from the ai-skills-library." Honest answer at the time was "partially" — the changelog format diverged, no Feature Ledger or Issue Log existed, and most commits skipped PRs. This release closes those gaps.

## [0.8.6] — 2026-05-12 11:44:50 Eastern · *in-app changelog modal + backfilled missing entries*

### Added
- **In-app changelog modal** — click the version badge in the top-right (or "Changelog" in the footer) to open the full changelog in a frosted-glass modal. Renders the markdown headings, bullets, `inline code`, **bold**, and *italic* with Apple-style spacing. Closes on ✕, Esc, or backdrop click.
- **`/api/changelog`** endpoint — serves `CHANGELOG.md` raw as `text/markdown`.
- **Version badge is now a `<button>`** with hover affordance, signaling it's interactive.

### Fixed
- **Backfilled missing CHANGELOG entries:**
  - **v0.4.3** — `.agents/product-marketing-context.md` (shipped 2026-05-08, never documented)
  - **v0.8.2** — duplicate `scanBtn` const hotfix (shipped earlier today, never documented)
- **Footer GitHub link** — was `https://github.com/marvelousempire/marvelousempire/xcode-cleanup-shortcut` (double org). Fixed to the correct URL.

### Verified
- Every git tag (`v0.1` … `v0.8.6`) now has a matching `## vX.Y.Z` heading in `CHANGELOG.md`. From now on, this should be true — the dashboard's version badge reads from the CHANGELOG, so it'll be visibly wrong if I ship a version without updating the changelog.

## [0.8.5] — 2026-05-12 11:39:52 Eastern · *dynamic version badge reads from CHANGELOG*

### Fixed
- **Version badge** in the top-right of the dashboard now reflects the actual shipped version. Previously hardcoded to `v0.7`, it stayed stale through v0.7.0 → v0.8.4.

### Added
- **`/api/status` now includes `version`**, read live from the first `## vX.Y.Z` heading in `CHANGELOG.md`. The JS updates the badge on every status poll (every 15s), so the displayed version is always the version of the server you're actually talking to.

## [0.8.4] — 2026-05-12 11:36:18 Eastern · *dynamic port discovery — fall back when 8765 busy*

### Added
- **Automatic port discovery** — if the preferred port (default 8765, override with `XCC_UI_PORT`) is already in use, the server now tries the next 19 consecutive ports before falling back to an OS-assigned ephemeral port. The terminal prints which port it actually bound to:
  ```
  ⚠  Port 8765 is busy — using 8766 instead.
  🧹  Cleanup Hub web UI → http://127.0.0.1:8766
  ```
  The browser auto-opens to the correct URL. No more "Address already in use" crashes when you forget to Ctrl-C the previous instance.

### Why
User: "can we make it so the port is dynamically assigned in case that port is busy already." Yes.

## [0.8.3] — 2026-05-12 11:24:53 Eastern · *parallel du via ThreadPoolExecutor — scans 10–30× faster*

### Performance
- **Parallel scanning** — `scan_category` now uses a 6-thread `ThreadPoolExecutor` for the `du -sk` calls. `du` is I/O bound, so 6 paths can scan simultaneously without contention. Measured on the maintainer's machine: scan times dropped from minutes to seconds.
  - Xcode (20 paths incl. DerivedData/DeviceSupport): ~2 sec
  - LLMs/Claude/Cursor/ChatGPT: 30–210 ms each
  - Apps: 250 ms
  - System: 20 ms
  - "Scan everything" (6 categories in parallel via JS): ~2 sec total (gated by Xcode, the slowest)
- Scan response now includes `scan_ms` for the per-category wallclock — useful for "why is X slow" diagnostics.

### Why
User: "why does it take so long to load stats from each one?" — answer: the original implementation ran every `du -sk` sequentially. Threading was the fix.

## [0.8.2] — 2026-05-12 11:17:08 Eastern · *hotfix — duplicate scanBtn const broke dashboard JS*

### Fixed
- **`SyntaxError: Cannot declare a const variable twice: scanBtn`** on page load. A leftover `const scanBtn` declaration from the v0.8.0 refactor killed the entire `<script>` block, leaving the UI stuck on "Checking disk…". The duplicate is removed; the existing `scanBtn` from the top of `scanAndRender()` is reused.

### Added
- **Per-category scan progress** during "⚡ Scan everything" — the hint line now updates `1/6 → 2/6 → … → 6/6` as each parallel scan resolves, so the user sees forward motion instead of a static "Scanning…" string.

## [0.8.1] — 2026-05-12 11:14:14 Eastern · *global Clean ALL safe mega-button across every category*

### Added
- **Mega action bar** above the tabs with three global buttons:
  - **⚡ Scan everything** — fires scans for all 6 categories in parallel, populates every tab at once. Shows a per-tab breakdown in the hint line afterward (`🛠 Xcode 5.0 GB · 🤖 Claude 10.7 GB · …`).
  - **✨ Clean ALL safe · X.X GB** — wipes every safe-tier path across every category in one pass. Disabled until "Scan everything" runs first; label always shows total reclaim potential.
  - **⚠ Clean ALL opt-in · X.X GB** — same, for the probably-safe tier (Simulator app data, Claude Desktop state, browser-cache opt-ins, etc.).
- **`/api/clean-everything?tier={safe,probably_safe}`** server endpoint — streams the cleanup of every path in the chosen tier across every category. Logs to CSV as `clean-everything-{tier}`.

### Why
User: "Want me to also add a 'Clean all safe across every tab' mega-button at the very top (above the tabs)?" → "yes please". One-click factory-fresh across Xcode/LLMs/Apps/System without touching anything in the caution tier.

## [0.8.0] — 2026-05-12 11:10:16 Eastern · *per-path clean buttons + top action bar*

### Added
- **Per-path inline `[Clean]` button** on every scan result row (for paths in the safe + probably-safe tiers, only if non-empty). Click the button next to a path to wipe just that path — no need to run a predefined action that batches multiple paths together.
- **Top-of-tab action bar** with three buttons:
  - `Scan` / `Re-scan` (primary) — refreshes the scan
  - `Clean all safe · X.X GB` — wipes every safe-tier path in this category at once
  - `Clean opt-in · X.X GB` — wipes every probably-safe path in this category at once
  Both clean buttons display the freed-GB potential in their label and are disabled when there's nothing to clean.
- **`/api/clean-path`** server endpoint — streams the cleanup of a single path via SSE. Validates the path against the category's safe/probably-safe groups (security: rejects arbitrary path injection).
- **`/api/clean-all-safe?tier={safe,probably_safe}`** server endpoint — iterates every path in the chosen tier of a category, streams progress per path.

### Changed
- Predefined-action cards moved below the scan results (was: above). Per-tab top-action-bar is now the primary surface; predefined actions are for special cases (`xcrun simctl erase all`, `brew cleanup -s`, etc.) that aren't simple `rm -rf`.
- "Re-scan" button removed from the bottom of the scan list (it's at the top now, replacing the original "Scan" button after first run).

### Why
User feedback: "where you ask what would be cleaned right there, we have little buttons that we could activate or deploy any one of those steps just by pressing the button next to it. Put the deep scan button at the top next to the other buttons." This change makes every individual cache reachable with one click, and moves the scan action to the top where you'd expect it next to the clean-all buttons.

## [0.7.0] — 2026-05-12 11:01:30 Eastern · *multi-category Cleanup Hub — Xcode / LLMs / Apps / System*

### Major: from one tool to four tabs

This release turns the web UI from "Xcode cleanup" into a multi-category cleanup hub. Four tabs, each with its own scan + actions + cost-of-deletion notes:

- **🛠 Xcode** (existing, reorganized as one tab)
- **🤖 LLMs** — with sub-tabs for Claude, Cursor, ChatGPT
- **🧹 Apps** — browsers (Chrome/Safari/Firefox/Brave/Arc), chat apps (Slack/Discord/Zoom/Teams), Spotify, Homebrew downloads, `~/Downloads/*.dmg`, Trash
- **💾 System** — icon cache, Spotlight parser, help/CloudKit/iCloud Drive caches, Time Machine local snapshots, diagnostic reports, old macOS installers

### Added
- **`web/cleaners.py`** — single source of truth for all categories, paths, actions, and cost annotations. ~370 LOC, ~70 paths, 20+ actions across 6 categories (xcode, llms-claude, llms-cursor, llms-chatgpt, apps, system).
- **Cost annotations** — every action has a `cost` field shown in the UI with an orange "Cost of doing this:" banner. Tells the user *exactly* what they lose. Examples: "First build after cleanup takes ~30s longer", "Chrome reloads pages from origin on next visit. Bookmarks/passwords safe", "Hard reset: you sign out of Claude Desktop and re-sign-in. Cloud conversation history re-syncs."
- **Three safety tiers per tab**: ✓ Safe (regenerable, low-cost) / ⚠ Probably safe (opt-in, bigger reclaim) / ⛔ Caution (surfaces sizes only, never auto-deletes).
- **`reset-claude-desktop` action** — explicit opt-in for the (often 10+ GB) Claude Desktop app state with full cost disclosure.
- **Time Machine local snapshot deletion** — finds and clears local APFS snapshots (typically 5–20 GB of "purgeable" disk).
- **Old macOS installer detection** + sudo-required actions surfaced informationally (web UI doesn't elevate).
- **Tabbed UI** in `web/index.html` — top-level tabs with sub-tabs (LLMs has 3). Vanilla JS, no framework.
- **Per-run logging** of UI-triggered cleanups to the CSV history (`mode=real-ui-<category>-<action>`).

### Changed
- **Server refactored** — `web/server.py` now imports `cleaners.py` for all category data. Endpoints unified under `/api/category/<id>/{scan,actions}` and `/api/run?category=&action=`. Old `/api/sizes`, `/api/deep-scan` endpoints removed (no external users — clean break).
- **README headline broadened** — "Reclaim 10–40 GB your Mac is hoarding — Xcode, LLM tools, apps, system" (was Xcode-only).
- Footer tagline now: "factory-fresh without losing your stuff."

### Philosophy
The app's design rule, baked into the UI: tell the user what each cleanup costs before they click. Cleanup actions are categorized by reversibility and impact. The goal is a fast, clean computer — not a factory wipe.

## [0.6.0] — 2026-05-12 10:40:58 Eastern · *deep scan + README quickstart rewrite*

### Added
- **Deep scan** in the web UI — exhaustive scan of ~20 Xcode-adjacent locations, grouped into three categories with safety semantics:
  - **Safe** (13 paths) — same caches basic mode cleans + iOS Device Logs, Snapshots, IB caches, Xcode Products, visionOS DeviceSupport, CoreSimulator Cryptex. Cleanable by the basic "Clean now" button or a dedicated "Clear Xcode extras" deep action.
  - **Probably safe — opt in** (4 paths) — Simulator app data (5+ GB typical), Instruments traces, CocoaPods cache + specs. Each gets its own action button: "Erase all simulator app data" (`xcrun simctl erase all`), "Clear Instruments traces", "Clear CocoaPods caches".
  - **Caution — review manually** (3 paths) — Xcode Archives, iOS device backups, Provisioning Profiles. Size only, never auto-deleted.
- **`/api/deep-scan`** + **`/api/deep-action`** + **`/api/deep-actions`** server endpoints
- **"Run deep scan" button** in the UI between "What would be cleaned" and "Your cleanup history"; each category renders with its own color, a one-line note explaining the safety semantics, the path list with sizes, and (where applicable) opt-in action buttons that stream output via SSE just like basic mode.

### Changed
- **README rewritten** with `make ui` as the **recommended** install path (⭐) at the top of the install matrix.
- New **"60-second quickstart"** section right under the badges — just three commands (`git clone`, `cd`, `make ui`) plus a one-paragraph explanation of which buttons to press. No prerequisites, no AppleScript paste, no CLI install needed for first run.
- Web UI section now documents the deep scan with a category-by-category breakdown of what each finds.

### Why
User feedback: "I ran it and only 4 things were checked... nothing came back as being deleted so we want a deep dive because I know there's more space Xcode is just taking." Basic mode handles 7 known-safe caches; deep mode covers 13+ safe + 4 opt-in + 3 caution paths.

## [0.5.0] — 2026-05-12 10:22:23 Eastern · *web UI dashboard ships*

### Added
- **Web UI** (`make ui`) — a localhost-only browser dashboard at `http://127.0.0.1:8765`. Zero dependencies (pure Python stdlib `http.server` + a single HTML file with vanilla JS).
  - Big live disk-free indicator (color-coded by pressure)
  - Per-path size breakdown (bar chart) of every cleanup target
  - Three one-click actions: Dry run / Clean now / Force clean
  - Live output streaming via Server-Sent Events (real-time, no polling)
  - Sparkline of cleanup history pulled from `~/Library/Logs/xcode-cleanup-history.csv`
  - Apple-style design (SF font stack, system colors, frosted-glass cards, dark-mode auto)
- **`web/server.py`** — ~150 LOC HTTP server with 4 endpoints: `/api/status`, `/api/sizes`, `/api/report`, `/api/stream` (SSE). Bound to `127.0.0.1` only — never network-reachable.
- **`web/index.html`** — single-file UI, ~280 lines including CSS + JS. No build step, no framework, no npm.
- **`make ui`** Makefile target — opens the browser automatically.

## [0.4.4] — 2026-05-11 18:46:50 Eastern · *docs/Launch-Plan.md via launch-strategy skill*

### Added
- **`docs/Launch-Plan.md`** — full public-launch playbook generated via the `launch-strategy` skill from coreyhaines31/marketingskills, reading from `.agents/product-marketing-context.md` for positioning.
  - Pre-launch checklist + launch-day timeline (T-1d through T+24h)
  - Ready-to-paste copy for: **Show HN** (title + URL + anchor first-comment), **r/iOSProgramming**, **r/swift**, **iOS dev Mastodon** (3-post thread), **X/Twitter** (2-tweet sequence)
  - Engagement playbook (what to do in the first 30min on every channel, what to absolutely not do, tone reminders)
  - **Hit/Steady/Flop** scenario plans with what to do in each — including issue triage, PR review readiness, and how to diagnose a flop before re-launching
  - **7-day follow-up plan** day by day
  - Metrics tracking template
  - Product Hunt deferred to v1.0 (low ROI for a dev utility at launch)
  - Pointers into the next marketing-skill chain (`customer-research`, `page-cro`, `programmatic-seo`, `email-sequence`)

## [0.4.3] — 2026-05-11 18:37:41 Eastern · *product-marketing-context.md positioning doc*

### Added
- **`.agents/product-marketing-context.md`** — 230-line product positioning document auto-drafted via the `product-marketing-context` skill from coreyhaines31/marketingskills. Captures product overview, target audience (solo iOS founders + indie devs + small-team mobile engineers + build-server maintainers), JTBD, problems/pain, competitive landscape, differentiation, objections, switching dynamics (JTBD Four Forces), customer language (verbatim from real conversations), brand voice, proof points, and goals. Every future marketing-skill call (copywriting, page-cro, aso-audit, launch-strategy, customer-research, …) reads this first instead of guessing.

## [0.4.2] — 2026-05-11 18:30:53 Eastern · *README hero rewritten via copywriting skill*

### Changed
- **README hero rewritten** using the `copywriting` skill from coreyhaines31/marketingskills. New headline ("Reclaim 10–25 GB Xcode is hoarding. One click.") leads with the specific outcome and uses customer-language ("hoarding"). Subhead names what's wiped + the trust-anchor (skips Archives). "Why bother" section replaces the feature list with five benefits framed against alternatives (manual rm, CleanMyMac, dev guesswork). Install table moved above-the-fold so first-time visitors see the path-to-value in the first screen.

### Why
Before: engineering-voice spec sheet. After: conversion-shaped landing page. Same product, clearer story.

## [0.4.1] — 2026-05-11 18:25:53 Eastern · *Shortcuts paste-ready blocks + pure-shell remote-cleanup.sh*

### Added
- **`scripts/remote-cleanup.sh`** — pure-shell cleanup that doesn't depend on AppleScript, `osascript`, or a UI session. Safe to run over SSH, in CI, or anywhere headless. Honors `--dry-run` / `--force` flags + `XCODE_CLEANUP_*` env vars; appends a `real-ssh` row to the CSV history when not in dry-run.
- **`docs/SHORTCUTS.md`** — paste-ready blocks for Apple Shortcuts' Run Shell Script and Run Script Over SSH actions, with field-by-field parameter values for macOS 26 / Shortcuts 12.4, four script variants per action (self-updating, repo-pinned, CLI-via-xcc, fully inline), gotchas table, and three suggested whole-Shortcut compositions ("Clean all my Macs", "Babysit the build server", "Pre-flight before TestFlight upload").

### Changed
- README links to `docs/SHORTCUTS.md` from the install section.

## [0.4] — 2026-05-11 18:17:28 Eastern · *all 8 elevations — xcc CLI, launchd, SwiftBar, update check, CSV report, auto-release workflow*

Closes all 7 remaining elevations from the post-v0.2 gap-audit.

### Added
- **`bin/xcc` CLI wrapper** — `xcc --dry-run`, `xcc --force`, `xcc --history`, `xcc --report`, `xcc --patterns '...'`. Installable via `make install-cli` (symlinks to `~/.local/bin/xcc`). Covers users who don't want to touch Shortcuts at all. *(Elevation C)*
- **launchd agent** — `launchd/com.marvelousempire.xcode-cleanup.plist` runs the cleanup hourly in the background. Threshold-gated so it no-ops when disk is healthy. Install/uninstall via `make install-launchd` / `make uninstall-launchd`. *(Elevation E)*
- **SwiftBar plugin** — `swiftbar/xcode-cleanup.30m.sh` shows free disk space in the menu bar (`🧹 12GB` / `🚨` red / `✨` green) with click-to-cleanup actions. `make install-swiftbar`. *(Elevation G)*
- **Daily update check** — script fetches the latest release tag from the GitHub Releases API once per day (cached at `~/Library/Caches/xcode-cleanup-version-cache`) and fires a `display notification` if newer. Opt-out: `XCODE_CLEANUP_NO_UPDATE_CHECK=1`. *(Elevation F)*
- **CSV history log** — `~/Library/Logs/xcode-cleanup-history.csv` gets a row per run: `timestamp,mode,freed_gb,before_gb,after_gb`. *(Elevation H)*
- **`scripts/report.py`** + **`make report`** — Unicode-block sparkline of freed-GB across recent real cleanup runs, plus min/max/avg/total stats. *(Elevation H)*
- **`make package-shortcut`** — signs an exported `.shortcut` bundle in Anyone Mode for distribution via `shortcuts sign`. *(Elevation B)*
- **`.github/workflows/release.yml`** — auto-creates a git tag + GitHub Release whenever a commit message on `main` starts with `vX.Y.Z:`. Pulls release notes from the matching CHANGELOG section. *(Elevation A)*
- **Retroactive tags + releases** for v0.1, v0.2, v0.2.1.

### Changed
- Makefile grows 7 new targets: `install-cli`, `uninstall-cli`, `install-launchd`, `uninstall-launchd`, `install-swiftbar`, `uninstall-swiftbar`, `package-shortcut`, `report`. `make help` displays them all.
- README gains an "Install options" matrix + sections per install path. PRD lists F20–F27 with ✅ status.

## [0.3] — 2026-05-08 12:15:34 Eastern · *gap-fill release: CI, env-var overrides, history log*

### Added
- **`XCODE_CLEANUP_TMP_PATTERNS=...`** — override the default `/tmp` orphan globs. Empty string skips phase 4 entirely. Repo is now useful to non-maintainer users without editing source.
- **History log** at `~/Library/Logs/xcode-cleanup.log` — every run (real, dry-run, or demo) appends one line: `timestamp | mode | freed GB | before GB | after GB`.
- **`make history`** Makefile target — prints the last 20 log entries.
- **CI workflow** `.github/workflows/check.yml` — runs `make check` on every push and PR (macos-latest runner). README has the badge.
- **README hero** — centered Lucide `wand-sparkles` icon (Apple blue), title, tagline, 5 shields.io badges (MIT, macOS 14+, Xcode 15+, AppleScript, CI status).
- **`assets/icon.svg` + `assets/icon-hero.svg` + `assets/ATTRIBUTION.md`** — ISC-licensed icon assets and Lucide attribution.

### Changed
- README "Customize" section explicitly flags the Red-E Play `/tmp` patterns as example-only and documents the env-var override.
- Retroactive git tags + GitHub Releases for v0.1, v0.2, v0.2.1.

## [0.2.1] — 2026-05-08 12:06:21 Eastern · *AUTO_CONFIRM + visible demo notifications*

### Added
- **`XCODE_CLEANUP_AUTO_CONFIRM=1`** — skips the confirmation alert. Intended for scripted screen-recording (so the alert doesn't block the capture timeline). Real users should leave this off — the alert is the safety gate before destructive deletion.
- **Demo mode now fires per-phase `display notification` banners** so the recording catches a visible 4-step sequence instead of silent sleeps.

## [0.2] — 2026-05-08 08:59:23 Eastern · *dry-run, demo, force flags + Makefile*

### Added
- **Dry-run mode** — `XCODE_CLEANUP_DRY_RUN=1` measures what would be freed without deleting anything. Reports `Would free ~X.X GB` via notification.
- **Demo mode** — `XCODE_CLEANUP_DEMO=1` simulates phases with sleeps instead of deleting. Used for capturing the README progress-bar GIF.
- **Force mode** — `XCODE_CLEANUP_FORCE=1` skips the 50 GB free threshold check, useful for testing or running on demand even when the disk looks healthy.
- **Per-phase size measurement** — each phase uses `du -sk` before deletion, so dry-run can report total bytes touched.
- **Makefile** — `make help` lists targets: `run`, `dry-run`, `demo`, `force`, `install-shortcut`, `uninstall-shortcut`, `shortcut-run`, `record-demo`, `check`, `size-report`.
- **`assets/RECORDING.md`** — instructions for capturing the progress-bar GIF.

### Changed
- Script title in the progress bar updates to `(Dry Run)` or `(Demo)` based on the active flag.
- README documents the Makefile and the new flags.

## [0.1] — 2026-05-08 11:40:10 Eastern · *initial Xcode-cleanup AppleScript ships*

Initial release. One-button macOS Shortcut that reclaims Xcode disk space (DerivedData, DeviceSupport, SwiftPM caches, unavailable simulators, /tmp orphans) with a native progress bar, threshold-gated confirmation, and final notification.
