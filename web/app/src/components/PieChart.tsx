import { useMemo } from "react";
import { motion } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { fmt } from "../lib/utils";

// Per-category color palette — matches the vanilla v0.14.2 `PIE_COLORS` map so
// the two implementations look identical when both are running. Each top-level
// tab gets one distinct hue.
const PIE_COLORS: Record<string, string> = {
  xcode: "#0F766E",    // teal — same as accent
  llms: "#7C3AED",     // violet
  docker: "#0EA5E9",   // sky
  apps: "#F59E0B",     // amber
  creative: "#EC4899", // pink
  system: "#64748B",   // slate
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

export function PieChart() {
  const { tabs, scans, setActiveTab } = useDashboard();

  const { slices, grandTotal } = useMemo(() => {
    const out: { id: string; label: string; total: number; color: string }[] = [];
    let total = 0;
    for (const tab of tabs) {
      if (tab.meta) continue;
      let cat = 0;
      if (tab.subcategories?.length) {
        for (const sub of tab.subcategories) {
          const s = scans[sub]?.scan;
          if (s) cat += (s.totals.safe || 0) + (s.totals.probably_safe || 0) + (s.totals.caution || 0);
        }
      } else if (tab.category) {
        const s = scans[tab.category]?.scan;
        if (s) cat = (s.totals.safe || 0) + (s.totals.probably_safe || 0) + (s.totals.caution || 0);
      }
      out.push({
        id: tab.id,
        label: stripGlyph(tab.label),
        total: cat,
        color: PIE_COLORS[tab.id] || "#888",
      });
      total += cat;
    }
    return { slices: out, grandTotal: total };
  }, [tabs, scans]);

  // Build the SVG arc path list — only slices with non-zero totals show up as
  // visible wedges; everything else still appears in the legend with "—".
  const paths: { id: string; d: string; color: string }[] = [];
  {
    const cx = 50, cy = 50, r = 42;
    let angle = 0;
    for (const slice of slices) {
      if (slice.total <= 0 || grandTotal < 0.01) continue;
      const frac = slice.total / grandTotal;
      const endAngle = angle + frac * Math.PI * 2;
      paths.push({ id: slice.id, d: arcPath(cx, cy, r, angle, endAngle), color: slice.color });
      angle = endAngle;
    }
  }

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
            // Empty state — thin grey ring placeholder so the pane never looks broken.
            <circle cx={50} cy={50} r={42} fill="none" stroke="hsl(0 0% 50% / 0.18)" strokeWidth={2} />
          ) : (
            <>
              {paths.map((p) => (
                <motion.path
                  key={p.id}
                  d={p.d}
                  fill={p.color}
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveTab(p.id)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
              {/* donut hole */}
              <circle cx={50} cy={50} r={22} style={{ fill: "hsl(var(--bg-2))" }} />
            </>
          )}
        </svg>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          style={{ transform: "translateY(4px)" }}
        >
          <div className="text-[22px] font-bold leading-none tabular tracking-[-0.015em] text-fg">
            {grandTotal >= 0.01 ? fmt(grandTotal) : "—"}
          </div>
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
  );
}
