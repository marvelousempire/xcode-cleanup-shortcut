Status: shipped (v0.19.3, commit f22b9a4)

---

# Dustpan README — add "🛠️ Under the Hood" tech-stack section

## Context

**Why now.** Dustpan's README explains *what* it does (features in `📦 What's in the box`) and *what it cleans* (the 11 category table) and *how to use it* (every `make` target in plain English). What it does NOT yet explain is **what we built it with**.

The maintainer just looked at `marvelousempire/red-e-play-app`'s `docs/Stack.md` + admin dashboard tech-stack doc and noticed Dustpan is missing the equivalent. They want it added — not just as a courtesy list of libraries, but as the **full per-surface tech inventory** so any AI agent or contributor reading the README knows immediately what frontend, what backend, what animation lib, what icons, what build tools, what version of each.

**Bigger picture:** the maintainer treats Dustpan's README as the **prototype template** for every future app they ship. Adding this section sets the precedent: every future app gets a `🛠️ Under the Hood` section in exactly this shape.

**Red-E Play's pattern** (from `docs/Stack.md`):
- A TL;DR table — surface · framework · hosting · "why this stack"
- Per-surface deep-dives grouped by area (iOS app · backend · admin dashboard · marketing site · AI/RAG · infra · dev tooling)
- Per-row format: `tool name (bold or backticks)` · "what it handles" · "why" notes
- Version numbers in-line (e.g. *Next.js 15 (App Router)*, *React 19*, *Framer Motion 11*)
- File-path links into the actual source (e.g. ``[`backend/src/lib/sentry.js`](path)``)
- Status markers — ✅ Live · 🔜 · 🟡 In progress · *(available, unused)*
- "When to update this doc" discipline section at the end

---

## Approach

Add **one new section** to `README.md` titled `## 🛠️ Under the hood`, positioned between `📦 What's in the box` (features) and `🧹 What Dustpan actually cleans` (categories). That placement gives readers: *what it does → what it's built with → what it cleans → how to use it.*

The section follows Red-E Play's structural pattern, adapted for Dustpan's six surfaces.

### Section layout

#### 1. TL;DR summary table — surfaces at a glance

```
| Surface | Stack | Why this stack |
|---|---|---|
| 🐍 Backend | Python 3 stdlib (http.server + threading) | Ships on every Mac. Zero pip installs. Auditable in one file. |
| ⚡ Main dashboard | Vite + React 18 + TypeScript + Tailwind + Motion | Fast build (~6s), live HMR for dev, premium animation feel |
| 📰 Fallback dashboard | Vanilla HTML + Motion via CDN | Works without pnpm. Always available. Same API contracts. |
| 🧪 Experimental UI | Next.js 14 (App Router, static export) | Future surface; statically exported so backend stays Python |
| 🎭 Cleanup engine | AppleScript + macOS shell | Native pop-ups, progress bars, notifications. Runs without server. |
| 🚀 Install surfaces | Shortcut · CLI · launchd · SwiftBar · SSH | One source, five ways to invoke it |
```

#### 2. Per-surface deep dives

Each surface gets a sub-section (`### 🐍 Backend (web/server.py + web/cleaners.py)` etc.) with two parts:

**Stack table** — every layer with tool, version, what it handles:
```
| Layer | Tool | What it handles |
|---|---|---|
| Runtime | Python 3.9+ (stdlib only) | HTTP + threading + SSE streams |
| Web | `http.server.BaseHTTPRequestHandler` | Routing, response writing |
| Concurrency | `ThreadingTCPServer` + `threading.Lock` | One thread per request, lock-protected running-cleans registry |
| Streaming | Server-Sent Events (`text/event-stream`) | `/api/live` channel + per-clean output streams |
| Subprocess | `subprocess.Popen` + `subprocess.run` | Shells out to `rm`, `du`, `find`, `xcrun`, `docker`, `osascript` |
```

**Why this stack** — short prose explaining the constraint each surface was built around.

#### 3. The six per-surface sections

Each follows the same shape. Concrete content:

##### 🐍 Backend (`web/server.py` + `web/cleaners.py`)
- Runtime: Python 3.9+ stdlib only (`http.server`, `socketserver`, `subprocess`, `threading`, `socket`)
- Concurrency: `ThreadingTCPServer` + thread-safe registry
- Streaming: SSE (`text/event-stream`) on `/api/live`, `/api/clean-path`, `/api/run`, etc.
- Network: localhost (`127.0.0.1`) or all-interfaces (`0.0.0.0`) via `XCC_HOST`
- LAN discovery: zero-packet UDP socket to 8.8.8.8 → reveals primary interface
- Data layer: `cleaners.py` — 11 categories, 17 sub-tools, 58 actions, single source of truth
- Static serving: `apps/web/dist/` (Vite) + `apps/web-next/out/` (Next) + `web/index.html` (vanilla)
- Why this stack: ships on every Mac, no pip install, the whole server is auditable in ~700 lines

##### ⚡ Main dashboard (`apps/web/` = `@cleanup-hub/web`)
- Framework: React 18.3 + TypeScript 5.7
- Build: Vite 6 (production bundle: ~120 KB JS gzipped, ~6 KB CSS gzipped, builds in ~6s)
- Styling: Tailwind CSS 3.4 + Tailwind CSS Animate
- Tokens: HSL CSS custom properties (light + dark + `[data-theme]` override)
- Typography: Apple SF Pro Display + SF Pro Text (via `-apple-system, BlinkMacSystemFont, "SF Pro Display"...`)
- Animation: Motion 11 (`motion/react`) — springs, layout-aware tweens, AnimatePresence
- Components: Radix UI primitives — `@radix-ui/react-dialog`, `react-scroll-area`, `react-separator`, `react-tooltip`, `react-slot`
- Icons: Lucide React 0.469
- Utility libs: `clsx`, `tailwind-merge`, `class-variance-authority` (cn helper + variant patterns)
- State: hand-rolled `DashboardContext` with `useState` + `useEffect` (no Redux/Zustand — context is sufficient)
- Real-time: native `EventSource` subscribed to `/api/live` with backoff reconnect
- Theme: pre-paint inline `<script>` in `index.html` applies localStorage theme before React mounts (no flash)
- Why this stack: fast cold build, HMR for dev, premium feel via Motion, Apple-native typography

##### 🧪 Experimental dashboard (`apps/web-next/` = `@cleanup-hub/web-next`)
- Framework: Next.js 14 (App Router, static export — `output: "export"`)
- Tailwind: same token system as `apps/web` (mirrored, not shared)
- basePath: `/next` so it coexists with the Vite app at root
- Build output: pre-rendered HTML + `_next/static/*` chunks (no Node runtime needed)
- Why this stack: future surface; static export keeps Python backend as the only runtime

##### 📰 Fallback dashboard (`web/index.html`)
- No build step — single HTML file with inline CSS + ES module `<script>`
- Animation: Motion 11 loaded from `cdn.jsdelivr.net/npm/motion@11.18.0/+esm` (graceful degrade if CDN unreachable)
- Icons: inline SVGs (Lucide source)
- Same DOM contracts as Vite app (same `/api/*` calls)
- Why this stack: works the second after `git clone` with no `pnpm install`. Demo/airgap path.

##### 🎭 Cleanup engine (`xcode-cleanup.applescript`)
- Language: AppleScript ~250 lines
- Native UI: `display alert`, `display notification`, `progress total steps`
- Shell-out: `do shell script` for `rm -rf`, `du`, `xcrun simctl`
- Logging: appends to `~/Library/Logs/xcode-cleanup.log` + a CSV consumed by `scripts/report.py`
- Update check: once-daily `curl` to GitHub Releases API (cached 24h)
- Why this stack: native macOS feel, runs without a server, scriptable from anywhere

##### 🚀 Install surfaces
- **`xcc` CLI** — `bin/xcc` wrapper installed by `make install-cli`
- **Apple Shortcut** — `make install-shortcut` registers the AppleScript with Shortcuts.app
- **launchd** — `launchd/com.example.xcode-cleanup.plist` for hourly auto-clean
- **SwiftBar plugin** — `swiftbar/Xcode_Cleanup.5m.sh` for menu-bar widget
- **Remote SSH** — `scripts/remote-cleanup.sh` curl-pipe-to-bash runner
- Why this stack: one cleanup logic, five ergonomic entry points

##### 🧰 Build & tooling
- Package manager: pnpm 9 workspace (`apps/*` glob)
- Monorepo orchestration: Turbo 2 (`turbo run build` / `dev` / `typecheck` / `lint`)
- TypeScript: 5.7 strict mode (`tsc --noEmit` in CI + every build)
- PostCSS: Autoprefixer 10 + Tailwind 3.4
- Build pipeline: Vite production (`vite build`), Next.js static export (`next build` with `output: "export"`)
- Dev experience: Vite HMR (`:5174`) + Next dev (`:5175`) in parallel via `make ui-dev` / `pnpm turbo run dev`
- CI: GitHub Actions workflow (`.github/workflows/check.yml`) runs AppleScript syntax + Python imports + TS strict check
- Auto-release: every merge to `main` auto-tags a release via PR title parsing
- Why this stack: fast, type-safe, parallel builds, no Docker/Node runtime needed in production

#### 4. Trailing "When this doc changes" line

Following Red-E Play's pattern — one short paragraph noting that this section gets updated whenever a dependency is added/removed or a major version of any tool changes. Treat it as a living document.

---

## Critical files

| File | Change |
|---|---|
| `README.md` | Add `## 🛠️ Under the hood` section between `📦 What's in the box` and `🧹 What Dustpan actually cleans` (~120-160 lines added) |
| `xcode-cleanup.applescript` | `property kVersion` bump from `0.19.2` → `0.19.3` |
| `docs/CHANGELOG.md` | New `## [0.19.3]` header with section description |

No code/server/cleaners changes. README + version bump only.

---

## Reusable utilities (don't rebuild)

- **Existing badge palette** (multi-color from v0.19.2) — reuse the same colors for the Under the Hood section if any sub-headers need them
- **Existing `🧱 How Dustpan is built` section** — keep as-is; the new section sits ABOVE it and is complementary (the new section is "what we used"; the existing section is "how it flows through the engine when you click")
- **The existing repo `📦 What's in the box` emoji-led pattern** — mirror the same row-leading-emoji style

---

## Verification

After writing, verify:
1. `grep -c "## " README.md` shows the new section is exactly one new heading.
2. The TL;DR table renders cleanly in GitHub preview — six rows, all aligned.
3. Each per-surface sub-section follows the same shape: stack table + "Why this stack" paragraph.
4. All version numbers match what's actually in `apps/web/package.json` (React 18.3, Vite 6, Tailwind 3.4, Motion 11, Lucide 0.469, Radix UI as listed) — `grep -E "^(\s*\")(react|vite|tailwind|motion|lucide|@radix)" apps/web/package.json` confirms.
5. `make check` passes (AppleScript syntax + Python imports).
6. CHANGELOG entry uses the canonical format from the `changelog-and-versioning` rule.

Then commit + push + PR + merge as `v0.19.3` so the auto-release workflow tags it. Single commit on the feature branch; squash-merge into main.

---

## Trade-offs

- **Section length.** The new section adds ~140 lines to the README. Acceptable: the README is the prototype for every future app's GitHub presentation, and the maintainer explicitly wants the full stack visible there. If it grows beyond ~200 lines in the future, split the deep-dives into `docs/Stack.md` and keep just the TL;DR table in the README — Red-E Play uses exactly that pattern.

- **Versions drift.** The version numbers inline (React 18.3, Vite 6, etc.) will drift over time. The "When this doc changes" trailing note codifies the discipline: bump the version inline whenever a `package.json` major changes.

- **No code change.** This is a documentation-only PR. The kVersion bump matches the CHANGELOG version per the `changelog-and-versioning` rule even though no functional code moved. Convention beats consistency here.
