# Redesign Brief — Cleanup Hub

> Written for a fresh Claude Code session that's been asked to **"redesign this entire app based on the knowledge, skills, and tools available."** Reads after `HANDOFF.md` and the README. Everything below assumes you've already done the 60-second bootstrap.

**Authored:** 2026-05-12 (v0.10.0)
**Status:** Open — the redesign work has not started.

---

## The ask, in one paragraph

The app works (v0.10.0, 58 skills available, six install surfaces, ~70 paths cleaned, every action has a cost annotation). What it doesn't yet have is *polish.* The maintainer's intent: leverage the full toolkit now available — especially the **visual design** skills (`ui-ux-pro-max`, `emil-design-eng`) and the **marketing** chain (`product-marketing-context` → `customer-research` → `copywriting` → `page-cro`) — to take the app from "competent localhost dashboard" to **a tool you'd recommend to another developer.** The redesign covers visual identity, information architecture, interaction polish, and the README. The underlying cleanup logic stays.

---

## Before you touch a single line

### Read (in this order)

1. `HANDOFF.md` — current state (you should already have done this)
2. `README.md` — the user-facing pitch as it stands today
3. `.agents/product-marketing-context.md` — locked positioning. **Do not re-derive these decisions** — they came from the `product-marketing-context` skill and represent the maintainer's confirmed product POV
4. `docs/Feature Ledger.md` — what's shipped (so you don't rebuild it) and what's deferred (so you don't accidentally implement a deferred thing)
5. `docs/Issue-Log.md` — last 10 near-misses; respect the lessons (e.g. **don't ship JS without a syntax check**, **don't add `/Applications` as a cleanup path**, **don't merge from inside the merging worktree**)
6. `web/cleaners.py` — the data model. Whatever UI you design has to render *this* shape. Reading the file teaches you the safety tiers, action structure, and cost-annotation format.
7. `web/index.html` — the current UI. ~600 lines. Know what's already in place before you touch it.

### Run the app

```sh
cd ~/Developer/xcode-cleanup-shortcut && git pull && make ui
```

Sit with the UI for 5 minutes. Click through every tab. Run a dry-run. Click the version badge. **Form your own first-impression critique** before reading any opinion below — that critique is more valuable than another voice's.

### Verify the skill toolkit is loaded

```sh
ls ~/.claude/skills | wc -l
```

Should be **≥58**. If it's lower, run `bash ~/.claude/sync-skills-library.sh` first. If `ui-ux-pro-max` and `emil-design-eng` aren't in the list, the library symlinks are missing — also fixed by that command.

---

## The toolkit you have

### Design skills (use these, in this order)

1. **`ui-ux-pro-max`** — comprehensive system-level guide. Use for: color palette decisions, font pairings, layout grid choices, spacing scale, chart types, accessibility checks. **Invoke first** to lock the global design language before touching components.
2. **`emil-design-eng`** — Emil Kowalski's design-engineering philosophy. Use for: animation curves, micro-interactions, the small invisible details that separate "fine" from "feels great" (e.g. number transitions, hover states, the precise easing on the SSE output console reveal). **Invoke after** `ui-ux-pro-max` has set the foundation, when you're at the polish phase.

### Marketing skills (chain them)

The chain is documented in `HANDOFF.md`. Most likely useful right now:

- **`page-cro`** — review the README + dashboard hero structurally (above-the-fold, social proof, objection handling, CTA strength). Different from `copywriting`, which is about words; `page-cro` is about the page's job.
- **`copywriting`** — if `page-cro` surfaces copy that should change. The current hero was written via this skill in v0.4.2 ("Reclaim 10–40 GB your Mac is hoarding…"). It can be re-run for the dashboard, button labels, cost annotations, etc.
- **`copy-editing`** — after a copywriting pass; sweep for tone consistency, weakly-worded CTAs, marketing fluff.
- **`launch-strategy`** — already in `docs/Launch-Plan.md`. If the redesign meaningfully changes the product, re-run this.
- **`customer-research`** — at any point if you want to ground a decision in verbatim VoC. Currently sourced from this conversation thread; could be expanded by mining iOS-dev forums / Reddit / HN comments on adjacent tools (CleanMyMac, DevCleaner).

### Operating rules (already enforced — just keep following them)

- `dev-discipline` — branch first, no orphan branches, explicit `git add`, name pipeline stages
- `changelog-and-versioning` — canonical headers in `docs/CHANGELOG.md`
- `go-live-path` — say how to see it live, every time

Source: [`marvelousempire/ai-skills-library/rules/library/`](https://github.com/marvelousempire/ai-skills-library/tree/main/rules/library)

---

## Explicit external references — use these

### Animation library: Motion (motion.dev)

**Use [Motion](https://motion.dev) — formerly Framer Motion — as the animation foundation.** It is the canonical motion library for the modern web. The repo is [`motiondivision/motion`](https://github.com/motiondivision/motion). The README says:

> Framer Motion is now Motion. Import from `motion/react` instead of `framer-motion`.

**Install paths:**

| Stack | Package | Import |
|---|---|---|
| React | `npm install motion` | `import { motion } from "motion/react"` |
| Vanilla JS / vanilla web | `npm install motion` (or CDN via jsDelivr/UNPKG) | `import { animate, scroll, inView, stagger } from "motion"` |
| Vue | `npm install motion-v` | `import { motion } from "motion-v"` |

**Hello-world patterns from the README:**

```javascript
// React
import { motion } from "motion/react"
function Component() {
  return <motion.div animate={{ x: 100 }} />
}

// Vanilla JS
import { animate } from "motion"
animate("#box", { x: 100 })
```

**Core primitives to lean on** (per the motion.dev landing page):

- **Independent transforms** — animate `x`, `y`, `rotateZ` independently, not as a matrix
- **`AnimatePresence`** — declarative exit animations
- **Spring physics** — natural motion (default for most transitions)
- **Layout animations** — automatic FLIP for layout changes (`layout` prop on React, `animate()` with `layout` option on vanilla)
- **Gestures** — `hover`, `press`, `drag` as first-class declarative props
- **Variants + stagger** — orchestrate multi-element animations
- **`scroll()`** — scroll-driven animations
- **`inView()`** — fire animations when an element enters the viewport

### Architectural decision the next session must make (then state in the PR)

The current app is **vanilla JS + Python stdlib, zero dependencies**. Motion is npm-installed (or CDN). Two paths forward:

| Path | What changes | Trade-off |
|---|---|---|
| **A. Motion via CDN, stay vanilla** | Add a single `<script type="module">` import from `cdn.jsdelivr.net/npm/motion/+esm`. No build step. No npm. Use `motion`'s vanilla-JS API: `animate()`, `scroll()`, `inView()`, `stagger()`. Keep the `web/index.html` single-file structure. | Preserves the "zero-deps, `make ui` and you're running" promise. Trade-off: no JSX, no React component model. Imperative animation code instead of declarative `<motion.div>`. |
| **B. Migrate to React + Vite + Tailwind + Motion** | New `web/` structure: `web/src/`, `package.json`, build via Vite. Server.py still serves the built `dist/` HTML/JS. Use `motion/react` declaratively. | Full Motion API + 21st.dev hero components (which are React/Tailwind) drop straight in. Trade-off: breaks zero-deps. `make ui` needs `npm install` + `npm run build` first. Bigger install surface for new users. |

**Default recommendation: Path A.** It preserves the moat. Use Motion One's vanilla JS API and recreate 21st.dev hero patterns in vanilla HTML/CSS. Only switch to Path B if the maintainer explicitly says "yes, take the dep."

### Hero patterns: 21st.dev/community/components/s/hero

[21st.dev](https://21st.dev/community/components/s/hero) hosts **284 hero components for React and Tailwind CSS**. Use as **inspiration, not direct copy** (unless we pick Path B above).

**How to mine it for the redesign:**

1. Browse the gallery (sort by popularity / by category)
2. Pick **2–3 patterns** that align with `.agents/product-marketing-context.md`'s positioning:
   - "Reclaim 10–40 GB your Mac is hoarding" — a *number-forward* hero (big GB count + tight subhead)
   - "Auditable, free, MIT" — a *trust-forward* hero (badges, screenshots, "no telemetry" callout)
   - "Six install paths" — a *capability-grid* hero (small icons, fast scan of what the tool offers)
3. Sketch each pattern as a vanilla HTML structure (or React if Path B)
4. Run the resulting hero through `page-cro` and `copywriting` skills to validate

**Specifically forbidden** in hero choices:
- Gradient-flooded "AI startup" backgrounds (we're not selling AI; we're selling restraint)
- Floating SaaS-y mockups with fake screens
- Heavy hero illustrations (heavy = slow = wrong tone for a *cleanup* tool)
- Anything that looks like CleanMyMac's marketing site (deliberate anti-pattern per the product-marketing-context)

### Animation use cases — concrete starter list

For the dashboard redesign specifically, here's where to apply Motion (whether vanilla-API or React-API):

| Element | Animation | Suggested Motion primitive |
|---|---|---|
| Hero GB number (`10.1 GB free` → `28.3 GB free` after a clean) | Smooth count-up / count-down, ~600ms ease-out | `animate(node, { textContent: targetNumber }, { duration: 0.6, ease: "easeOut" })` with a custom interpolator, OR `useSpring` (React) |
| Disk-usage progress bar fill | Spring-based fill on first paint and after every scan | `animate(bar, { width: pct + "%" }, { type: "spring", stiffness: 120 })` |
| Tab switching | Fade + subtle x-translate (4–8px) | `<AnimatePresence>` with `motion.div initial={{opacity:0, x:8}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-8}}` |
| Action confirm modal (currently a `confirm()`!) | Backdrop blur in, card scale 0.96→1 + opacity, 220ms ease-out | `motion.div initial={{opacity:0, scale:0.96}} animate={{opacity:1, scale:1}} transition={{duration:0.22}}` |
| SSE output console reveal | Slide-down + fade, layout-animated as new lines append | `<motion.div layout>` on the console; each new line gets `initial={{opacity:0, y:-4}} animate={{opacity:1, y:0}}` |
| Cost-of-doing-this banner | Subtle pulse on hover/focus to draw the eye | `whileHover={{scale: 1.01}}` with a stiff spring |
| "Done. Freed X.X GB" success | Brief green pulse on the hero number + banner | `keyframes` from `1 → 1.05 → 1` over 280ms with a green color flash |
| Per-path row entrance | Stagger them in as scan results arrive | `stagger(0.03)` across the rows |

**emil-design-eng note**: every one of those animations should be **subtle**. The signal in our app is the data, not the choreography. If an animation makes a user *notice it,* it's wrong. The animations exist to make state transitions feel inevitable, not to entertain.

---

## What's working — preserve these

Don't redesign these *away.* They are the product:

| Element | Why it stays |
|---|---|
| **Six install surfaces** (Web UI · Shortcut · CLI · launchd · SwiftBar · SSH) — one source script | This is the moat. Most cleaners give you one path; we give six. Don't collapse them in the redesign. |
| **Three safety tiers** (`safe` / `probably_safe` / `caution`) | The "factory-fresh without losing your stuff" promise depends on this taxonomy. Visualize it differently if you want, but don't merge the tiers. |
| **Cost-of-doing-this annotations** on every action | The most distinctive UX feature. CleanMyMac doesn't tell you what you lose. We do. Make this *more* prominent in the redesign, not less. |
| **Localhost-only server** (`127.0.0.1` binding) | A trust foundation. Never bind to `0.0.0.0`. The README emphasizes this. Keep it. |
| **Auditable AppleScript** (~250 lines, one file, readable in 5 minutes) | The trust moat vs CleanMyMac. The README headline mentions this directly. |
| **Zero dependencies** for the web UI (`http.server` stdlib, no pip / npm / Docker) | Means anyone can run it the minute after `git clone`. Don't introduce a build step. |
| **Real-time SSE output console** | Users *see* what's being deleted as it happens. Don't replace with a spinner-and-done pattern. |
| **Version badge reads from CHANGELOG live** | Self-reinforcing: a missed CHANGELOG entry is visible in the UI. Keep this loop. |
| **In-app changelog modal** | Click the version badge → see the full history. Don't bury it. |

---

## What's worth reconsidering

Open questions for the redesign. Each is genuinely open — confirm direction with the maintainer if material.

### Visual identity

- **Hero number color**: currently `red <20 GB`, `orange <50 GB`, `green >50 GB`. The thresholds are right, but the colors are basic system colors. `ui-ux-pro-max` may recommend a richer palette with consistent semantic meaning across all surfaces (e.g. for the SwiftBar plugin, the README badges, the dashboard chart bars, the action button hover states).
- **Typography**: currently `-apple-system` stack everywhere. Works on Mac, but bland. `ui-ux-pro-max` may suggest a hero font with proper kerning + a numeric-tabular font for sizes. Worth a serious pass.
- **Frosted glass cards**: a solid call, but every card has it. Consider hierarchy — hero glass at 0.72 opacity, secondary glass at 0.5 opacity. `emil-design-eng` is where this lives.
- **Icon set**: currently the Lucide `wand-sparkles` for the app logo; tab labels use emoji (🛠 🤖 🧹 💾). Mixing emoji + SVG icon is rough. Pick one system.

### Information architecture

- **4 tabs at the top** (Xcode · LLMs · Apps · System). Works. But the LLM sub-tabs (Claude / Cursor / ChatGPT) live *inside* the LLMs tab, requiring two clicks. Consider: are sub-tabs the right pattern, or should each LLM tool be a tile/card in a single LLM grid?
- **The global "Clean ALL safe" mega-button** is a power-user feature. New users might be intimidated. Consider a friendlier first-time flow ("Show me what you'd clean" → reveal results → "Now clean the safe stuff").
- **Cleanup history sparkline** is at the bottom and easy to miss. Consider promoting it (top-right counter? hover stat in the hero?) — it's a real proof point ("this tool has freed me 47 GB across 12 runs").
- **Caution-tier paths** (Archives, iOS backups, provisioning profiles) get a section but no action — they're informational. The "what to do about it" copy could be sharper.

### Interaction polish (where `emil-design-eng` earns its keep)

- **Number transitions**: the disk-free GB number jumps when scans complete. Should *tween* — count up/down smoothly. ~600ms ease-out.
- **Tab switching**: instant today. A subtle fade or slide reveals which tab loaded vs which was already cached.
- **Action confirm dialog**: uses the browser's `confirm()` modal. Looks like 2008. Replace with a custom modal that *itself* shows the cost annotation prominently.
- **SSE output reveal**: the console slides in when an action starts. Easing is OK but the transition into "done" state could pulse green briefly.
- **Hover states on path rows**: currently nothing. A subtle row-highlight + cursor change on the `[Clean]` button would help discoverability.

### README

- **Hero** was rewritten in v0.4.2. Re-read it cold. Does it pass the 5-second test? Could a user reading the first 100 words decide "yes, install this" or "no thanks"?
- **No GIF in the README** — Issue #2. Capturing this is genuinely valuable; visual proof carries more weight than a paragraph of bullet points.
- **Install matrix has 6 rows** — that's a lot. Consider a 2-column collapsible: "I want a GUI" (Shortcut, Web UI, SwiftBar) / "I want a CLI" (xcc, launchd, SSH).
- **Comparison table** ("vs CleanMyMac / DevCleaner / manual rm") isn't in the README but lives in `.agents/product-marketing-context.md`. Worth surfacing — it's the competitive moat made tangible.

### Architecture (only if you're feeling brave)

- **Vanilla JS + Python stdlib** is a deliberate constraint. Don't break it without a real reason. Switching to React would balloon the install footprint by 100x and break the "zero dependencies" promise.
- **`cleaners.py` is the only source of cleanup truth.** If you add categories, add them there — the UI is a downstream consumer.
- **One source script** (AppleScript) drives the Shortcut path. The web UI uses `scripts/remote-cleanup.sh` (pure shell). The CLI wraps the AppleScript via `osascript`. Don't fragment this; if a new install surface emerges, route it through one of the existing two scripts.

---

## A suggested first 60 minutes

(Adapt freely. This isn't a prescription, it's a starting point.)

**0–5 min:** Bootstrap. Read order above. Run the app. Form a first-impression list of 5–10 things that feel rough.

**5–15 min:** Invoke `ui-ux-pro-max` with the brief: "redesign the system-level visual language for a localhost macOS cleanup dashboard. Current implementation uses Apple system colors + system font stack + frosted-glass cards + emoji tab labels. Audience: working iOS/macOS developers. See `.agents/product-marketing-context.md` for positioning. What palette, typography, and spacing system should this tool use?" Skill output → write to `docs/Design-System.md`.

**15–25 min:** Invoke `page-cro` on the existing README. Have it audit the structure (above-fold, social proof, objection handling, CTA strength). Skill output → comments / open issues / direct fixes.

**25–35 min:** Invoke `emil-design-eng` with a list of specific micro-interactions worth tightening (from "Interaction polish" above). Pick the 3–5 highest-leverage ones; implement them.

**35–45 min:** Apply the design system from step 2 to the dashboard. Touch CSS variables, swap to the recommended font, update the color palette across hero / progress bars / buttons / cost annotations. Test in dark mode.

**45–55 min:** Run `make ui` again. Compare to the screenshot you took at minute 0. Note what's notably better and what's still rough. Commit so far on a `feature/redesign-v1` branch.

**55–60 min:** Open a draft PR. Don't merge yet. Note the trade-offs you made and any open questions for the maintainer.

---

## What "done" looks like

The redesign is done when:

1. **The README's first 5 seconds make the case better than v0.10.0's.** Test by asking someone who hasn't seen it.
2. **The dashboard feels confident** — no fight between the hero number, the tab buttons, the action buttons. The visual hierarchy reads in <1 second.
3. **Cost annotations are unmissable.** That's our distinctive UX feature; the redesign should celebrate it, not bury it.
4. **The "factory-fresh without losing your stuff" promise** is visible in the UI (not just the README copy). Suggested: a small lockup or footer line that reminds the user every session.
5. **At least one micro-interaction** demonstrates Emil-tier polish (number tween, button micro-bounce, success pulse — pick one and nail it).
6. **The same 6 install surfaces work, the cleanup logic is unchanged, the safety tiers are preserved.** No regression in capability.
7. **CHANGELOG entry follows the canonical format**, version bumped, kVersion synced, PR merged, auto-release tagged.

---

## What "done well" looks like

Beyond the bar above:

- A short demo video or GIF in the README (Issue #2 finally closed)
- An updated `docs/Launch-Plan.md` reflecting the v1.0 positioning
- A `docs/Design-System.md` capturing what `ui-ux-pro-max` decided so future contributors don't re-derive it
- Real `customer-research` against iOS-dev forum threads about CleanMyMac, DevCleaner, "Xcode disk full" — verbatim VoC in `.agents/product-marketing-context.md`
- One unsolicited GitHub Star from a non-friend within 7 days of the redesign launching

---

## Open questions for the maintainer (ask before deep work)

These shouldn't block you from starting, but confirm direction before sinking >2 hours:

1. **Is this still a "tool for solo iOS devs," or is the redesign meant to broaden to "tool for any macOS dev"?** Affects the LLM-tab framing (Claude/Cursor/ChatGPT are universal) vs the Xcode-tab framing (specifically Apple-platform devs).
2. **Is a real domain in scope?** Repo currently lives at `github.com/marvelousempire/xcode-cleanup-shortcut`. If the redesign goes well, a `cleanup-hub.app` (or similar) landing page becomes interesting. Out of scope for v1 redesign; flag for v2.
3. **Native macOS app, eventually?** SwiftUI + same cleaners.py via embedded Python? Signed + notarized .app for the Mac App Store? **Deferred** per current product-marketing-context (deliberately not a Mac app — open-source AppleScript is the moat). Worth re-confirming.
4. **Color identity**: Apple blue (`#0A84FF`) is the current accent. Stay there, or shift to something more brand-distinctive? `ui-ux-pro-max` will have an opinion either way.

---

## Final note for the next session

You have everything you need. The library has the skills. The repo has the state. The rules say how to ship. The brief tells you where to focus.

**Don't ask the maintainer "where do I start?" — start.** The 60-minute workflow above gives you forward motion. If you need a decision the maintainer hasn't made, surface it as an open question and proceed with a defensible default.

Welcome to the codebase. Make it beautiful.
