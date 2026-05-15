# Plan 0028 — Full-viewport responsive dashboard shell

## Context — why this change, what prompted it, intended outcome

The dashboard lived inside `max-width: 1280px`, so large monitors and TVs wasted horizontal space. The goal is to use the browser viewport aggressively while keeping layouts fluid: sidebars and main content rebalance via CSS grid tracks (not fixed canvas sizes), Overview panes shrink and stack at smaller breakpoints without horizontal overflow, and the shell establishes a repeatable pattern for future dashboards (“full bleed alarm bar, padded content, footer anchored on short pages”).

## Approach — the ONE approach we're picking, concrete

- Replace the constrained center column with a **full-width** shell: horizontal padding scales with breakpoints (`sm` / `xl` / `2xl`), **no artificial max-width** on primary content.
- Wrap the shell in **`min-height: 100dvh`** with a **`flex`** column so the **footer stays at the bottom** when content is short, while long tabs still extend the document and scroll naturally.
- Use **fluid sidebar tracks**: `clamp(…rem, vw, …rem)` + `minmax(0, 1fr)` for the center so Ultrawide and TV widths give space to the main column, small laptops keep readable side rails.
- Harden **`overview-top`** with **`minmax(0, …fr)`** column definitions so grids never force overflow off the viewport.
- Set **`html` / `body` / `#root`** minimum height to **`100dvh`** so standalone webview/embed behavior matches browsers.

## Critical files — paths created/modified

- `plans/0028-full-viewport-responsive-dashboard-shell.md` — this document
- `plans/README.md` — index row
- `apps/web/src/App.tsx` — shell layout, grid track classes, footer placement vs modals
- `apps/web/src/index.css` — root height + Overview grid track safety

## Verification — how we'll know it worked

- **Literal command:** `cd apps/web && pnpm exec tsc --noEmit`  
  **Expected output:** exit code `0`.

- **Manual:** Resize the window from ~360px wide to fullscreen on a large display; at `md` and `lg` breakpoints sidebars appear without clipping; Overview three-pane collapses to two then one column; no persistent horizontal scrollbar (except deliberate wide content inside terminals).

## Out of scope

- Retrofitting **every panel** with internal `min-height: 0` split panes or scroll regions (would be per-panel follow-ups).
- A new global Cursor rule for “all dashboards” (can be proposed separately).
