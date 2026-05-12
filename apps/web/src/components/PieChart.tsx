import { useEffect, useRef, useState, useMemo } from "react";
import { animate, useMotionValue, useTransform, motion, AnimatePresence } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { fmt } from "../lib/utils";

// Per-category color palette — matches the vanilla v0.15.0 PIE_COLORS map.
const PIE_COLORS: Record<string, string> = {
  xcode: "#0F766E",     // teal — same as accent
  llms: "#7C3AED",      // violet
  docker: "#0EA5E9",    // sky
  apps: "#F59E0B",      // amber
  browsers: "#10B981",  // emerald (v0.17.0)
  downloads: "#F97316", // orange (v0.17.0)
  creative: "#EC4899",  // pink
  temp: "#A3A3A3",      // neutral (v0.17.0)
  archives: "#92400E",  // brown (v0.17.0)
  system: "#64748B",    // slate
};

function stripGlyph(s: string) {
  return s.replace(/^[\p{Extended_Pictographic}\p{Emoji}☀-➿]+\s*/u, "").trim() || s;
}

// SVG donut arc helper. Angles in radians. The donut is rotated -90deg via CSS
// so angle 0 visually starts at 12 o'clock and slices progress clockwise.
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const sx = cx + r * Math.cos(startAngle);
  const sy = cy + r * Math.sin(startAngle);
  const ex = cx + r * Math.cos(endAngle);
  const ey = cy + r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey} Z`;
}

interface Slice {
  id: string;
  label: string;
  total: number;
  pathCount: number;
  color: string;
}

interface PrevAngles { [id: string]: { start: number; end: number } }

function computeCumulativeAngles(slices: Slice[], grandTotal: number): PrevAngles {
  const out: PrevAngles = {};
  if (grandTotal < 0.01) return out;
  let a = 0;
  for (const s of slices) {
    if (s.total <= 0) continue;
    const frac = s.total / grandTotal;
    const end = a + frac * Math.PI * 2;
    out[s.id] = { start: a, end };
    a = end;
  }
  return out;
}

interface TooltipState {
  visible: boolean;
  slice: Slice | null;
  x: number;
  y: number;
}

export function PieChart() {
  const { tabs, scans, setActiveTab } = useDashboard();
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, slice: null, x: 0, y: 0 });
  const [explodedId, setExplodedId] = useState<string | null>(null);
  const lastStateRef = useRef<{ slices: Slice[]; grandTotal: number }>({ slices: [], grandTotal: 0 });
  const [ghosts, setGhosts] = useState<{ id: string; d: string; color: string }[] | null>(null);

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
              pathCount += (g?.paths?.length || 0);
            }
          }
        }
      } else if (tab.category) {
        const s = scans[tab.category]?.scan;
        if (s) {
          cat = (s.totals.safe || 0) + (s.totals.probably_safe || 0) + (s.totals.caution || 0);
          for (const tier of ["safe", "probably_safe", "caution"] as const) {
            const g: { paths?: unknown[] } | undefined = (s.groups as Record<string, { paths?: unknown[] }>)?.[tier];
            pathCount += (g?.paths?.length || 0);
          }
        }
      }
      out.push({
        id: tab.id,
        label: stripGlyph(tab.label),
        total: cat,
        pathCount,
        color: PIE_COLORS[tab.id] || "#888",
      });
      total += cat;
    }
    return { slices: out, grandTotal: total };
  }, [tabs, scans]);

  // Tween the center number from previous → current via a Motion value.
  const centerMV = useMotionValue(0);
  const centerDisplay = useTransform(centerMV, (v) => (v >= 0.01 ? fmt(v) : "—"));
  useEffect(() => {
    const controls = animate(centerMV, grandTotal, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [grandTotal, centerMV]);

  // Detect a cleanup (total decreased) and stage ghost slices for fade-out.
  // Elevation D — visceral "something just got cleaned" confirmation.
  useEffect(() => {
    const prev = lastStateRef.current;
    if (prev.grandTotal > grandTotal + 0.05) {
      const prevAngles = computeCumulativeAngles(prev.slices, prev.grandTotal);
      const g = prev.slices
        .filter((s) => s.total > 0)
        .map((s) => ({
          id: s.id,
          d: arcPath(50, 50, 42, prevAngles[s.id].start, prevAngles[s.id].end),
          color: s.color,
        }));
      setGhosts(g);
      const t = setTimeout(() => setGhosts(null), 700);
      return () => clearTimeout(t);
    }
    lastStateRef.current = { slices, grandTotal };
  }, [slices, grandTotal]);

  // Cumulative target angles for the new layout.
  const targetAngles = useMemo(() => computeCumulativeAngles(slices, grandTotal), [slices, grandTotal]);

  // Visible non-zero slices.
  const visibleSlices = slices.filter((s) => s.total > 0);
  const isOneHundredPercent = visibleSlices.length === 1 && grandTotal >= 0.01;

  // Click handler — click-and-drill explode (elevation B) then route.
  const handleClick = (id: string) => {
    setExplodedId(id);
    setTimeout(() => {
      setExplodedId(null);
      setActiveTab(id);
    }, 160);
  };

  // Hover handlers for the tooltip (elevation A).
  const showTip = (slice: Slice, e: React.MouseEvent) => {
    setTooltip({ visible: true, slice, x: e.clientX + 14, y: e.clientY + 14 });
  };
  const moveTip = (e: React.MouseEvent) => {
    setTooltip((t) => (t.visible ? { ...t, x: e.clientX + 14, y: e.clientY + 14 } : t));
  };
  const hideTip = () => setTooltip((t) => ({ ...t, visible: false }));

  return (
    <div className="flex flex-1 flex-col items-center px-3.5 pb-3.5">
      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          className="block"
          style={{ width: 168, height: 168, transform: "rotate(-90deg)" }}
          aria-hidden
        >
          {grandTotal < 0.01 ? (
            <circle cx={50} cy={50} r={42} fill="none" stroke="hsl(0 0% 50% / 0.18)" strokeWidth={2} />
          ) : (
            <>
              {/* Ghost slices fading out (elevation D). */}
              {ghosts && (
                <g>
                  {ghosts.map((g) => (
                    <motion.path
                      key={`ghost-${g.id}`}
                      d={g.d}
                      fill={g.color}
                      initial={{ opacity: 0.55 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ))}
                </g>
              )}

              {/* Real slices — single-100%-slice gets a circle (gap 7). */}
              {isOneHundredPercent ? (
                <motion.circle
                  cx={50}
                  cy={50}
                  r={42}
                  fill={visibleSlices[0].color}
                  style={{
                    cursor: "pointer",
                    transformOrigin: "50px 50px",
                    transform: explodedId === visibleSlices[0].id ? "scale(1.08)" : "scale(1)",
                    transition: "transform 0.16s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  onClick={() => handleClick(visibleSlices[0].id)}
                  onMouseEnter={(e) => showTip(visibleSlices[0], e)}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                />
              ) : (
                visibleSlices.map((slice) => {
                  const ta = targetAngles[slice.id];
                  if (!ta) return null;
                  return (
                    <motion.path
                      key={slice.id}
                      // Animate the `d` attribute by setting target each render
                      // (Motion interpolates via initial → animate on key match).
                      initial={{ d: arcPath(50, 50, 42, ta.start, ta.end) }}
                      animate={{ d: arcPath(50, 50, 42, ta.start, ta.end) }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      fill={slice.color}
                      style={{
                        cursor: "pointer",
                        transformOrigin: "50px 50px",
                        transform: explodedId === slice.id ? "scale(1.08)" : "scale(1)",
                        transition: "transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), filter 0.18s",
                      }}
                      whileHover={{ filter: "brightness(1.06)" }}
                      onClick={() => handleClick(slice.id)}
                      onMouseEnter={(e) => showTip(slice, e)}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}
                    />
                  );
                })
              )}
              <circle cx={50} cy={50} r={22} style={{ fill: "hsl(var(--bg-2))" }} />
            </>
          )}
        </svg>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          style={{ transform: "translateY(4px)" }}
        >
          <motion.div className="text-[22px] font-bold leading-none tabular tracking-[-0.015em] text-fg">
            {centerDisplay}
          </motion.div>
          <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.08em] text-fg-faint">
            GB scanned
          </div>
        </div>
      </div>

      <div className="mt-3 grid w-full grid-cols-2 gap-x-3 gap-y-1 text-[11px] tabular">
        {slices.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleClick(s.id)}
            className="flex items-center gap-1.5 rounded px-1 py-0.5 text-left text-fg-dim transition-colors hover:bg-bg-3 hover:text-fg"
          >
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 truncate">{s.label}</span>
            <span className="font-semibold text-fg">{s.total >= 0.01 ? `${fmt(s.total)} GB` : "—"}</span>
          </button>
        ))}
      </div>

      {/* Hover tooltip (elevation A). Portaled via inline fixed positioning so it
          escapes the pie pane's overflow:hidden when the cursor leaves the SVG. */}
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
            {tooltip.slice.pathCount > 0 && (
              <>
                <span className="text-fg-dim">·</span>
                <span className="text-fg-dim">{tooltip.slice.pathCount} path{tooltip.slice.pathCount === 1 ? "" : "s"}</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
