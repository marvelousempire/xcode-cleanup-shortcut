import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { animate, motion, useMotionValue, useTransform, AnimatePresence } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { CATEGORY_TAB_COLORS } from "../lib/categoryColors";
import { fmt } from "../lib/utils";

function stripGlyph(s: string) {
  return s.replace(/^[\p{Extended_Pictographic}\p{Emoji}☀-➿]+\s*/u, "").trim() || s;
}

interface Slice {
  id: string;
  label: string;
  total: number;
  pathCount: number;
  color: string;
}

interface TooltipState {
  visible: boolean;
  slice: Slice | null;
  x: number;
  y: number;
}

/**
 * Compact “where cleanable GB lives” — horizontal stacked bar + legend.
 * Replaces the donut pie: easier to read on TV/laptop, no SVG arc parsing issues.
 */
export function CleanableMixPanel() {
  const { tabs, scans, setActiveTab } = useDashboard();
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, slice: null, x: 0, y: 0 });

  const { slices, grandTotal } = useMemo(() => {
    const out: Slice[] = [];
    let total = 0;
    for (const tab of tabs) {
      if (tab.meta) continue;
      let cat = 0;
      let pathCount = 0;
      if (tab.subcategories?.length) {
        for (const sub of tab.subcategories) {
          const s = scans[sub]?.scan;
          if (s) {
            cat += (s.totals.safe || 0) + (s.totals.probably_safe || 0) + (s.totals.caution || 0);
            for (const tier of ["safe", "probably_safe", "caution"] as const) {
              const g: { paths?: unknown[] } | undefined = (s.groups as Record<string, { paths?: unknown[] }>)?.[tier];
              pathCount += g?.paths?.length || 0;
            }
          }
        }
      } else if (tab.category) {
        const s = scans[tab.category]?.scan;
        if (s) {
          cat = (s.totals.safe || 0) + (s.totals.probably_safe || 0) + (s.totals.caution || 0);
          for (const tier of ["safe", "probably_safe", "caution"] as const) {
            const g: { paths?: unknown[] } | undefined = (s.groups as Record<string, { paths?: unknown[] }>)?.[tier];
            pathCount += g?.paths?.length || 0;
          }
        }
      }
      out.push({
        id: tab.id,
        label: stripGlyph(tab.label),
        total: cat,
        pathCount,
        color: CATEGORY_TAB_COLORS[tab.id] || "#888",
      });
      total += cat;
    }
    return { slices: out, grandTotal: total };
  }, [tabs, scans]);

  const centerMV = useMotionValue(0);
  const centerDisplay = useTransform(centerMV, (v) => (v >= 0.01 ? fmt(v) : "—"));

  useEffect(() => {
    const controls = animate(centerMV, grandTotal, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [grandTotal, centerMV]);

  const barSlices = useMemo(() => slices.filter((s) => s.total > 0), [slices]);

  const showTip = (slice: Slice, e: MouseEvent) => {
    setTooltip({ visible: true, slice, x: e.clientX + 14, y: e.clientY + 14 });
  };
  const moveTip = (e: MouseEvent) => {
    setTooltip((t) => (t.visible ? { ...t, x: e.clientX + 14, y: e.clientY + 14 } : t));
  };
  const hideTip = () => setTooltip((t) => ({ ...t, visible: false }));

  return (
    <div className="pane-pie flex flex-1 flex-col px-3.5 pb-3.5 min-h-0">
      <div className="flex flex-1 flex-col items-stretch justify-center gap-3">
        <div className="text-center">
          <motion.div className="text-[22px] font-bold leading-none tabular tracking-[-0.015em] text-fg">
            {centerDisplay}
          </motion.div>
          <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.08em] text-fg-faint">
            GB cleanable (scanned)
          </div>
        </div>

        {grandTotal < 0.01 ? (
          <div
            className="stacked-bar h-[18px] w-full rounded-full border border-border/15 bg-bg-3/40"
            aria-hidden
          />
        ) : (
          <div
            className="stacked-bar flex h-[18px] w-full max-w-full overflow-hidden rounded-full border border-border/20 shadow-inner"
            style={{ background: "hsl(var(--bg-3) / 0.35)" }}
            role="img"
            aria-label={`Cleanable space mix, ${fmt(grandTotal)} GB total across categories`}
          >
            {barSlices.map((s) => {
              const pct = (s.total / grandTotal) * 100;
              return (
                <button
                  key={s.id}
                  type="button"
                  className="h-full shrink-0 rounded-none border-r border-[hsl(var(--bg-1)/0.35)] last:border-r-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(var(--bg-2))] transition-[filter,transform] duration-150 hover:brightness-105 active:scale-[0.98]"
                  style={{
                    width: `${pct}%`,
                    minWidth: pct > 0 ? "4px" : 0,
                    backgroundColor: s.color,
                    transition: "width 0.45s cubic-bezier(0.22, 1, 0.36, 1), filter 0.15s",
                  }}
                  title={`${s.label} — ${fmt(s.total)} GB (${fmt(pct)}%)`}
                  onClick={() => setActiveTab(s.id)}
                  onMouseEnter={(e) => showTip(s, e)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                />
              );
            })}
          </div>
        )}

        <div className="mix-legend grid w-full grid-cols-2 gap-x-3 gap-y-1 text-[11px] tabular">
          {slices.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveTab(s.id)}
              className="flex items-center gap-1.5 rounded px-1 py-0.5 text-left text-fg-dim transition-colors hover:bg-bg-3 hover:text-fg"
            >
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="flex-1 truncate">{s.label}</span>
              <span className="font-semibold text-fg">{s.total >= 0.01 ? `${fmt(s.total)} GB` : "—"}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {tooltip.visible && tooltip.slice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              transform: `translate(${tooltip.x}px, ${tooltip.y}px)`,
              pointerEvents: "none",
              zIndex: 1000,
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/20 bg-bg-2 px-2.5 py-1 text-[11px] tabular shadow-md"
          >
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: tooltip.slice.color }}
            />
            <strong className="font-semibold text-fg">{tooltip.slice.label}</strong>
            <span className="text-fg-dim">·</span>
            <span className="text-fg">{tooltip.slice.total >= 0.01 ? `${fmt(tooltip.slice.total)} GB` : "—"}</span>
            {grandTotal >= 0.01 && (
              <>
                <span className="text-fg-dim">·</span>
                <span className="text-fg-dim">{fmt((tooltip.slice.total / grandTotal) * 100)}%</span>
              </>
            )}
            {tooltip.slice.pathCount > 0 && (
              <>
                <span className="text-fg-dim">·</span>
                <span className="text-fg-dim">
                  {tooltip.slice.pathCount} path{tooltip.slice.pathCount === 1 ? "" : "s"}
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
