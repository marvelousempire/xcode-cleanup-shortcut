Status: in progress

# Plan 0005 — Terminal theme support (white on light / dark on dark)

## Context

**Why this change.** The `OutputConsole` component has always used hardcoded dark
colors (`hsl(240 5% 4% / 0.92)` background, `#F4F4F2` text, `rgba(255,255,255,0.06)`
border) regardless of which theme is active. In light mode the terminal looks like
an alien implant — a nearly-black rectangle sitting inside a white page. The user
asked for the terminal to match the active theme:

> *"I want the Terminal to be white in the background on light mode and I want it
> to be dark in the background on dark mode for the theme. Make sure you get the
> text contrast correct as well. White text on black background and vice versa on
> the other."*

**What must not regress.** ANSI-colored output (ok = green, warn = amber, err = red,
dim = muted) must remain readable on both backgrounds. Several ANSI colors that
look fine on a near-black background fail WCAG AA contrast on white — those need
dark-mode variants.

## Approach

### A — New CSS variables for the terminal surface

Add a `--terminal-*` token family to `apps/web/src/index.css` inside the existing
`:root` (light) and `[data-theme="dark"], html.dark` (dark) blocks, mirrored in
the `@media (prefers-color-scheme: dark)` block.

**Light mode (`apps/web/src/index.css` `:root`):**
```css
--terminal-bg:      0 0% 100%;          /* white   */
--terminal-fg:      240 4% 9%;          /* #151518 — same as --fg */
--terminal-fg-dim:  240 5% 38%;         /* same as --fg-dim */
--terminal-fg-idle: 240 5% 52%;         /* placeholder, filter-dim */
--terminal-border:  240 5% 88%;         /* light gray border */
--terminal-ok:      142 71% 29%;        /* dark green  — 4.6:1 on white ✓ */
--terminal-warn:    32 95% 35%;         /* dark amber  — 4.5:1 on white ✓ */
--terminal-err:     0 75% 42%;          /* dark red    — 5.2:1 on white ✓ */
--terminal-dim:     240 5% 50%;         /* muted gray */
/* ANSI FG — light variants with sufficient contrast on white */
--ansi-red:         0 75% 42%;
--ansi-green:       142 71% 29%;
--ansi-yellow:      32 95% 35%;
--ansi-blue:        221 83% 45%;
--ansi-magenta:     270 67% 47%;
--ansi-cyan:        191 97% 33%;
--ansi-gray:        240 5% 42%;
```

**Dark mode (same vars, different values):**
```css
--terminal-bg:      240 5% 4%;          /* #0A0A0E — current value */
--terminal-fg:      60 9% 95%;          /* #F4F4F2 — current value */
--terminal-fg-dim:  240 5% 62%;
--terminal-fg-idle: 240 4% 42%;
--terminal-border:  0 0% 18%;           /* subtle dark border */
--terminal-ok:      142 71% 45%;        /* bright green on dark ✓ */
--terminal-warn:    43 96% 56%;         /* bright amber on dark ✓ */
--terminal-err:     0 84% 60%;          /* bright red on dark ✓ */
--terminal-dim:     240 4% 42%;
/* ANSI FG — dark variants (vivid, high contrast on near-black) */
--ansi-red:         0 84% 60%;
--ansi-green:       142 71% 45%;
--ansi-yellow:      43 96% 56%;
--ansi-blue:        213 93% 67%;
--ansi-magenta:     270 76% 70%;
--ansi-cyan:        186 94% 59%;
--ansi-gray:        240 4% 60%;
```

### B — Update ANSI CSS classes

Replace the hardcoded hex values in `index.css` with CSS-variable references:

```css
.ansi-fg-red    { color: hsl(var(--ansi-red));     }
.ansi-fg-green  { color: hsl(var(--ansi-green));   }
.ansi-fg-yellow { color: hsl(var(--ansi-yellow));  }
.ansi-fg-blue   { color: hsl(var(--ansi-blue));    }
.ansi-fg-magenta{ color: hsl(var(--ansi-magenta)); }
.ansi-fg-cyan   { color: hsl(var(--ansi-cyan));    }
.ansi-fg-gray   { color: hsl(var(--ansi-gray));    }
```

Add four semantic terminal status classes for the line-type coloring:

```css
.console-ok   { color: hsl(var(--terminal-ok));  }
.console-warn { color: hsl(var(--terminal-warn));}
.console-err  { color: hsl(var(--terminal-err)); }
.console-dim  { color: hsl(var(--terminal-dim)); }
```

### C — Update OutputConsole.tsx

Replace every hardcoded color with the new CSS variables:

| Where | Before | After |
|---|---|---|
| container `style.background` (both paths) | `"hsl(240 5% 4% / 0.92)"` | `"hsl(var(--terminal-bg))"` |
| container `className` border | `border-white/[0.06]` | `"border-[hsl(var(--terminal-border))]"` |
| body `style.color` | `"#F4F4F2"` | `"hsl(var(--terminal-fg))"` |
| idle placeholder `style` / className | `text-[#6B6B73]` inline | `className="console-dim italic"` |
| toolbar border `style.borderColor` | `rgba(255,255,255,0.06)` | `"hsl(var(--terminal-border))"` |
| toolbar bg `style.background` | `rgba(255,255,255,0.02)` | `"hsl(var(--terminal-bg) / 0.6)"` (or transparent) |
| toolbar input `text-[#F4F4F2]` | literal class | `"text-[hsl(var(--terminal-fg))]"` → use inline style instead |
| toolbar placeholder `placeholder:text-[#6B6B73]` | literal class | replace with `style` on input |
| toolbar button text `text-[#9B9BA3]` | literal class | `console-dim` class |
| toolbar button hover `hover:text-[#F4F4F2]` | literal class | `hover:text-[hsl(var(--terminal-fg))]` → keep for now, or use `hover:opacity-100` |
| line `line.cls === "ok"` | `"text-[#22C55E]"` | `"console-ok"` |
| line `line.cls === "warn"` | `"text-[#FBBF24]"` | `"console-warn"` |
| line `line.cls === "err"` | `"text-[#EF4444]"` | `"console-err"` |
| line `line.cls === "dim"` | `"text-[#9B9BA3]"` | `"console-dim"` |

The highlight span `.hl` (search match) already uses a yellow-ish color — add a
light-mode-compatible version:

```css
/* index.css */
.hl { background: hsl(var(--ansi-yellow) / 0.25); color: inherit; border-radius: 2px; }
```

### D — Border tweak for embedded variant

The embedded terminal currently uses `border border-white/[0.06]` which is
invisible on a white background. Change to `border-[hsl(var(--terminal-border))]`
using an inline style or arbitrary value that reads the CSS var.

## Critical files

| File | Change |
|---|---|
| `apps/web/src/index.css` | Add `--terminal-*` and `--ansi-*` tokens to light/dark/media blocks. Update ANSI classes. Add `.console-ok/warn/err/dim`. Update `.hl`. |
| `apps/web/src/components/OutputConsole.tsx` | Replace all hardcoded colors with CSS-variable references. |
| `xcode-cleanup.applescript` | `kVersion` 0.19.6 → 0.19.7 |
| `docs/CHANGELOG.md` | New `[0.19.7]` entry |
| `plans/0005-terminal-theme-support.md` | This plan |
| `plans/README.md` | Add index row for 0005 |

## Verification

1. `make check` passes (AppleScript syntax check).
2. `make ui` builds without TypeScript errors.
3. **Visual — light mode:** terminal background is white, body text is near-black,
   idle placeholder is legible gray, green/amber/red status lines are dark enough
   to read.
4. **Visual — dark mode:** terminal background is near-black, body text is
   near-white, status lines are vivid.
5. **Visual — auto (system):** switching macOS system theme flips the terminal.
6. **Visual — theme toggle:** clicking the in-app Dark/Light/Auto toggle flips
   the terminal along with the rest of the page.
7. No regression on ANSI output (output from a real scan shows colored lines in
   both themes).
