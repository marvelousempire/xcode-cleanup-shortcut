# Changelog

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
