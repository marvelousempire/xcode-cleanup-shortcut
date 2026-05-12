# Design System — Cleanup Hub

> The canonical reference for tokens, type, motion, and component patterns used in the dashboard. Captured here so future contributors don't re-derive the decisions.

**Adopted:** v0.11.0 · 2026-05-12
**Source of truth for tokens:** the `:root` block at the top of [`web/index.html`](../web/index.html).

---

## North star

A tool that feels like `htop`, `ripgrep`, or `ffmpeg` — terminal-adjacent, calm, factual. Not a SaaS dashboard. Not a CleanMyMac competitor. The signal is the *data* (free GB, cost annotations, safety tiers), not the choreography.

Three rules that govern every decision below:

1. **The data is the hero.** Color, type, and motion exist to make the numbers legible — not to decorate.
2. **Auditable feels calm.** No gradients-as-marketing, no glow effects, no "AI startup" vibe. The same restraint as the AppleScript moat.
3. **Restraint scales.** Add a token before adding a one-off value. If the token doesn't exist, the design wasn't ready for the component.

---

## Color tokens

The current Apple-blue accent was a fine default but indistinct on a Show-HN thumbnail next to every other Mac-dev tool. The redesign shifts the accent to **deep teal** (precision instrument, water/flow/clean without being literal). Semantic tier colors stay green/amber/red but tuned for confidence over neon.

### Neutrals — warm grayscale (slight blue undertone in dark mode)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg-1` | `#FAFAF7` | `#0B0B0C` | Page background (warm off-white / warm near-black) |
| `--bg-2` | `rgba(255,255,255,0.78)` | `rgba(22,22,24,0.78)` | Frosted card surface (primary) |
| `--bg-3` | `rgba(255,255,255,0.55)` | `rgba(34,34,38,0.55)` | Frosted card surface (recessed / nested) |
| `--border` | `rgba(11,11,12,0.08)` | `rgba(255,255,255,0.10)` | Default hairline |
| `--border-2` | `rgba(11,11,12,0.05)` | `rgba(255,255,255,0.06)` | Faintest divider |
| `--border-strong` | `rgba(11,11,12,0.14)` | `rgba(255,255,255,0.16)` | Hovered/active element border |
| `--text` | `#171719` | `#F4F4F2` | Primary text |
| `--text-dim` | `#5C5C66` | `#9B9BA3` | Secondary text (labels, descriptions) |
| `--text-faint` | `#9999A3` | `#6C6C76` | Tertiary text (paths, hints) |

### Accent — deep teal

| Token | Light | Dark | Use |
|---|---|---|---|
| `--accent` | `#0F766E` | `#2DD4BF` | Primary interactive (buttons, links, focus ring) |
| `--accent-strong` | `#115E59` | `#5EEAD4` | Hover/pressed accent |
| `--accent-soft` | `rgba(15,118,110,0.10)` | `rgba(45,212,191,0.12)` | Accent-tinted backgrounds (active tab, etc.) |

**Why teal, not Apple blue?** Apple-blue dev tools look like every other Apple-blue dev tool. Teal reads as a precision utility (Linear, Things, Tot share this family). Distinct on a thumbnail, calm in context, never associates with marketing-button-blue.

### Semantic — safety tiers

These map 1:1 to `cleaners.py`'s three tiers (`safe`, `probably_safe`, `caution`). The taxonomy is product, not UI — don't rename.

| Token | Light | Dark | Maps to |
|---|---|---|---|
| `--safe` | `#16A34A` | `#22C55E` | `tier: safe` — confident green, not neon |
| `--safe-soft` | `rgba(22,163,74,0.10)` | `rgba(34,197,94,0.14)` | Safe-tinted background |
| `--warn` | `#D97706` | `#FBBF24` | `tier: probably_safe` — warm amber, the "opt-in" tier |
| `--warn-soft` | `rgba(217,119,6,0.10)` | `rgba(251,191,36,0.14)` | Warn-tinted background (cost annotations) |
| `--danger` | `#B91C1C` | `#EF4444` | `tier: caution` + true errors — deep crimson |
| `--danger-soft` | `rgba(185,28,28,0.10)` | `rgba(239,68,68,0.14)` | Danger-tinted background |

**Rule:** never use a semantic color for chrome. `--accent` for interactive elements, semantic colors only when the meaning is semantic.

---

## Typography

System stack throughout — the goal is "looks native on every Mac, no font-fetching jank, no licensing." But used with more discipline than the v0.10 baseline.

### Font families

```css
--font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
--font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
```

Display and sans share a stack today, but the variable is here so we can swap display → a real display face (Inter Display, GT America Mono, etc.) without touching consumers.

### Type scale

| Token | Size | Line-height | Weight | Use |
|---|---|---|---|---|
| `--t-display` | 80px | 1 | 700 | Hero free-GB number (was 72px) |
| `--t-h1` | 24px | 1.2 | 700 | Modal titles, big section headers |
| `--t-h2` | 17px | 1.3 | 600 | Panel headers |
| `--t-h3` | 14px | 1.4 | 600 | Card titles |
| `--t-body` | 13px | 1.55 | 400 | Body text, descriptions |
| `--t-small` | 12px | 1.5 | 500 | Buttons, totals, ga-hint |
| `--t-micro` | 11px | 1.5 | 600 | Tier headings (uppercase), path values |
| `--t-mono` | 11px | 1.45 | 400 | Paths, sizes, output console |

### Numeric rendering

Apply globally where numbers display:

```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1;
```

Tabular nums prevent jiggle when values tween in Phase 3 (the hero free-GB animation, totals counting up).

### Letter-spacing

Display sizes go tighter, body sizes stay neutral, micro labels go wider:

| Size | Tracking |
|---|---|
| Display (≥48px) | `-0.04em` |
| H1–H3 (14–24px) | `-0.01em` |
| Body / small (12–13px) | `0` |
| Micro labels (uppercase) | `0.08em` |

---

## Spacing scale

Base unit: 4px. Multiples only.

| Token | Value | Use |
|---|---|---|
| `--s-1` | 4px | Hairline gap |
| `--s-2` | 8px | Stack-tight gap (icon+label, totals row) |
| `--s-3` | 12px | Default gap inside small components |
| `--s-4` | 16px | Card-to-card gap, button padding-y |
| `--s-5` | 20px | Card inner padding (y) |
| `--s-6` | 24px | Card inner padding (x), section gap |
| `--s-7` | 32px | Hero padding, large section gap |
| `--s-8` | 48px | Page section break |
| `--s-9` | 64px | Hero top/bottom on desktop |
| `--s-10` | 96px | Page bottom (console clearance) |

---

## Radii

| Token | Value | Use |
|---|---|---|
| `--r-sm` | 6px | Inline buttons, code chips, path values |
| `--r-md` | 10px | Standard buttons, tabs, sub-tab pills |
| `--r-lg` | 14px | Cards, tabs container |
| `--r-xl` | 18px | Modals |
| `--r-pill` | 999px | Version badge, status pills |

---

## Elevation

Three levels. Lighter than v0.10's because the frosted-glass blur does the work; shadow is a small reinforcer, not a marketing flourish.

```css
--shadow-sm: 0 1px 2px rgba(11,11,12,0.04), 0 2px 8px rgba(11,11,12,0.03);
--shadow-md: 0 2px 4px rgba(11,11,12,0.05), 0 8px 24px rgba(11,11,12,0.06);
--shadow-lg: 0 8px 16px rgba(11,11,12,0.10), 0 24px 64px rgba(11,11,12,0.18);
```

Dark mode pairs:

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
--shadow-md: 0 2px 4px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.5);
--shadow-lg: 0 8px 16px rgba(0,0,0,0.5), 0 24px 64px rgba(0,0,0,0.7);
```

---

## Motion tokens

Sets the foundation for Phase 3 (Motion micro-interactions). All animations consume these — no one-off numbers in component code.

| Token | Value | Use |
|---|---|---|
| `--d-instant` | 80ms | Button press, focus-ring snap |
| `--d-quick` | 160ms | Hover state, color change |
| `--d-normal` | 220ms | Modal in/out, panel enter/exit, tab switch |
| `--d-slow` | 600ms | Hero number tween, progress-bar fill |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default — feels inevitable, slight overshoot in perception |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | State changes that need symmetry |
| `--spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Cost-banner hover, modal entrance |

**Reduced-motion override.** All animations must respect `@media (prefers-reduced-motion: reduce)` — state changes still happen, durations drop to 0.

---

## Iconography

**Decision: Lucide, inline SVG, 18px, stroke 1.5.** Drop emoji from tab labels.

| Tab | Old (emoji) | New (Lucide) |
|---|---|---|
| Xcode | 🛠 | `hammer` |
| LLMs | 🤖 | `bot` |
| Apps | 🧹 | `app-window` |
| System | 💾 | `hard-drive` |

The logo (Lucide `wand-sparkles`) stays. Stroke width and color come from the host context; no fixed fills.

**Anti-pattern:** mixing emoji glyphs (which inherit the OS emoji renderer) with vector SVGs (which respect color tokens). Pick one. We picked vector.

---

## Component patterns

### Card

```css
background: var(--bg-2);
backdrop-filter: saturate(180%) blur(20px);
border: 1px solid var(--border);
border-radius: var(--r-lg);
box-shadow: var(--shadow-sm);
```

Hierarchy: hero card uses `--bg-2` + `--shadow-md`. Secondary cards use `--bg-2` + `--shadow-sm`. Recessed inner surfaces (path rows, action cards) use `--bg-3` + no shadow.

### Cost banner (the distinctive UX feature)

Currently a thin orange strip below the action description. Lifted in v0.11:

- Sits **above** the action label, not below the description
- Uses `--warn-soft` background + `--warn` left-border (3px) + `--warn` text
- "Cost of doing this" label uses `--t-micro` uppercase
- The cost text uses `--t-body` weight 500
- Modal-version uses the same component centered, scale 1.1× for emphasis

### Modal

- Backdrop: `rgba(11,11,12,0.55)` + `backdrop-filter: blur(8px)` on light; `rgba(0,0,0,0.65)` + blur on dark
- Card: `--bg-1` solid (not frosted — modals shouldn't compete with the page beneath), `--r-xl`, `--shadow-lg`
- Entry: opacity 0→1 + scale 0.96→1 over `--d-normal` with `--spring`

---

## Accessibility floor

- All text/background pairs meet WCAG AA contrast at 4.5:1 minimum. Hero display number on its card background hits AAA.
- Focus ring: 2px solid `--accent` with 2px offset, always visible on keyboard navigation.
- Reduced motion respected for every animation.
- No information conveyed by color alone — semantic tier labels include text ("Safe", "Opt-in", "Caution") alongside the dot/border.

---

## What this replaces

The previous design system (v0.10 and earlier) is captured here for archeology:

- **Accent:** Apple blue `#0A84FF` → now teal `#0F766E`
- **Semantic colors:** Apple-flat saturated greens/oranges/reds (`#30D158` / `#FF9F0A` / `#FF453A`) → confident, slightly dimmed Tailwind-family values
- **Background:** pure `#f5f5f7` → warm off-white `#FAFAF7`
- **Hero number:** 72px → 80px with tighter tracking
- **Tab icons:** emoji glyphs → Lucide vector
- **Cost annotation position:** below description → above label (lifted)

Each change is a deliberate move toward "precision instrument" and away from "SaaS dashboard."
