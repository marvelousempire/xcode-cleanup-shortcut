Status: shipped — landed across v0.11.x, v0.12.x, v0.13.x. Subsequent v0.14.x – v0.19.x kept extending the same design-system + dashboard-restructure + motion-polish chain.

---

# Plan 0001 — Cleanup Hub v1 Redesign

> *(This plan predates the `plans/` folder convention. Captured here from
> `~/.claude/plans/redesign-this-app-harmonic-starlight.md` for the record.
> Future plans live in this folder from day one.)*

## Context

**Why this plan existed.** v0.10.0 shipped substance — 58 actions, 5 install
surfaces, 70+ paths, 3 safety tiers, cost annotations on every action,
in-app changelog modal, live version badge. What it didn't have was *polish*.
This plan took it from a "competent localhost dashboard" to **a tool a working
iOS dev would recommend to another working iOS dev**.

**Stack constraint (preserved through every later phase too):** Vanilla JS +
Python stdlib + Motion via CDN. Preserves the zero-deps moat. `make ui` works
the second after `git clone`, no install step.

**Preserve, non-negotiable:** 6 install surfaces · 3-tier taxonomy
(`safe`/`probably_safe`/`caution`) · cost annotations · `127.0.0.1` localhost
binding (later expanded to 0.0.0.0 default in v0.19.1) · auditable AppleScript
· zero deps on the server side · real-time SSE console · live-CHANGELOG version
badge · in-app changelog modal · single source of truth in `cleaners.py`.

## Approach

Four phases, each yielding an independently shippable PR. No phase mutates
`cleaners.py` or `server.py` beyond what's needed for new asset routes.

### Phase 1 — Design system foundation (shipped v0.11.0)

1. Invoke `ui-ux-pro-max` skill with positioning + current state + audience
   (working iOS/macOS devs) + constraint (single-file vanilla HTML, dark-mode
   auto).
2. Ask for: color palette (semantic + accent + neutrals, light/dark pairs),
   typography (display + body + tabular numeric), spacing scale, radius scale,
   shadow/elevation, motion tokens (easing curves, durations), iconography
   decision.
3. Write the output to `docs/Design-System.md` as canonical reference.
4. Translate tokens to CSS custom properties at the top of `web/index.html`.
   Same selectors, new values. No structural HTML changes yet.
5. Verify in light + dark mode side-by-side; the change should read as
   "richer, calmer" not "completely different".

### Phase 2 — Dashboard restructure (shipped v0.11.1)

**Files:** `web/index.html` (mainly markup + structural CSS). Possibly
`web/server.py` only if a new asset route is needed.

1. **Hero.** Big-number-forward — free-GB count fills the hero. Add a
   "factory-fresh without losing your stuff" lockup beneath. Cumulative-freed
   counter (from `/api/report`) moves into hero as microcopy.
2. **First-run progressive disclosure.** Single CTA "Show me what you'd clean"
   for new visitors. Mega-button for returning users. Gated by
   `localStorage.cleanupHub.hasVisited`.
3. **LLM sub-tabs.** Brief flags two clicks as friction. Resolution: collapse
   to side-by-side provider cards in one panel. Removes sub-tab navigation.
4. **Cost annotations.** Lift them visually — make the cost block the *first*
   thing the eye lands on. Use design-system's `warning` token.
5. **Caution-tier paths.** Rewrite copy through the `copywriting` skill with
   sharper "what to do about this" guidance.
6. **Footer.** Promote cleanup-history sparkline. Move it into a small
   persistent strip just below the hero.
7. **Icon system.** Pick one — default inline SVGs from Lucide (already
   partially used). Drop the emoji-tab-labels.

**DOM contracts to preserve:** `#free-gb`, `#free-label`, `#progress-fill`,
`#tabs`, `#panels`, `.panel[data-panel="..."]`, `#scan-<cat>`, `#actions-<cat>`,
`.path-row[data-cat][data-path][data-label]`, `[data-action][data-category]`,
`#output`, `.output-line.{ok,warn,err,dim}`, `#version`, `#changelog-modal`,
`#changelog-body`, `#changelog-close`, `#footer-changelog`, `#btn-scan-all`,
`#btn-clean-all-safe`, `#btn-clean-all-optin`, `#ga-hint`.

### Phase 3 — Motion micro-interactions (shipped v0.11.2)

Apply `emil-design-eng` philosophy: subtle, inevitable, never noticed-as-animation.

| # | Element | Motion primitive |
|---|---|---|
| 1 | Hero GB number on scan/clean completion | Custom interpolator on `textContent`, `{ duration: 0.6, ease: "easeOut" }` |
| 2 | Progress bar fill | `animate(bar, { width: pct + "%" }, { type: "spring", stiffness: 120 })` |
| 3 | Tab switching | Fade + 4–8px x-translate |
| 4 | Action confirm modal | Backdrop blur fade-in, card scales 0.96 → 1 over 220ms, cost prominent |
| 5 | SSE console reveal + new-line append | Console slides down + fades in on first line |
| 6 | Per-path row entrance after scan | `stagger(0.03)` cascade |
| 7 | "Done. Freed X.X GB" success | Brief green pulse + success banner |
| 8 | Cost banner micro-state | `whileHover` equivalent — stiff spring scale 1 → 1.01 |

**Discipline:** if any animation makes a user *notice it*, it's wrong.
Reduced-motion respected — `matchMedia('(prefers-reduced-motion: reduce)')`
wraps every animate() call.

### Phase 4 — README + go-live (shipped v0.11.3)

1. Invoke `page-cro` on the current README — structural critique.
2. Invoke `copywriting` for the new hero. Constraint: "Reclaim 10–25 GB Xcode
   is hoarding" as the canonical one-liner (later evolved into the Dustpan
   tagline "Sweep your Mac clean.").
3. Collapse 6-row install matrix into "GUI / CLI" split with `<details>`.
4. Surface the comparison table (vs CleanMyMac / DevCleaner / manual rm).
5. Run `copy-editing` post-rewrite. No exclamation points. No "easy". No
   "streamline/optimize/magical".

## Critical files

| File | Phase | Why it matters |
|---|---|---|
| `web/index.html` | 1, 2, 3 | The dashboard. Single-file. Tokens at lines 8–39, structural markup 57–449, JS 506–948. |
| `web/cleaners.py` | — | Untouched. Data layer. The redesign is a downstream renderer. |
| `web/server.py` | maybe 3 | Only if we add `/assets/motion-fallback.js` for air-gapped use. Default: no change. |
| `docs/Design-System.md` | 1 | New file. Captures `ui-ux-pro-max` output. |
| `docs/Redesign-Brief.md` | — | Authoritative input. Read again before each phase. |
| `README.md` | 4 | Hero rewrite + install-matrix collapse + comparison-table surface. |
| `docs/CHANGELOG.md` | every phase | Canonical header per `changelog-and-versioning` rule. |
| `xcode-cleanup.applescript` | every phase | `property kVersion` bump matches CHANGELOG header. |

## Verification

Run after **each phase**, not just at the end.

1. `make ui` — server binds to `127.0.0.1:8765`.
2. First-run flow — clear localStorage, reload, single CTA → scan → cleanup CTA.
3. Returning-user flow — reload with flag set, three mega-buttons visible.
4. Tab switching — observe fade + slight x-translate. No flicker.
5. LLMs tab — three providers as side-by-side cards in one panel.
6. Per-path clean — custom modal (not browser confirm), cost annotation prominent, SSE streams, completes.
7. Caution-tier sections — sharper copy. No caution-tier path is auto-cleanable.
8. Reduced motion — enable in System Settings → animations instant.
9. Dark mode — new palette readable, semantic colors distinguishable.
10. Version badge → changelog modal — opens, ESC closes.
11. CLI + Shortcut paths still work — regression check on `cleaners.py` untouched promise.
12. `make check` — passes.

## What "done" looked like (and was achieved)

1. README first-5-seconds beat v0.10.0 ✓
2. Dashboard visual hierarchy reads in <1s ✓
3. Cost annotations are unmissable ✓
4. Safety promise visible in UI, not just README ✓
5. At least one Emil-tier micro-interaction nails it (cost-modal scale-in) ✓
6. All 6 install surfaces work · cleanup logic unchanged · 3 safety tiers preserved ✓
7. CHANGELOG canonical-format · version bumps · auto-release tagged ✓

Subsequent releases (v0.14.x – v0.19.x) extended the same chain: the Overview
tab, the live SSE channel, the running-cleans widget, the Browsers/Downloads/
Temp/Archives categories, the pnpm workspace + Turbo + Next.js apps, the
Dustpan rebrand. All trace back to the design language laid down here.
