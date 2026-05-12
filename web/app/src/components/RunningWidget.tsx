import { motion, AnimatePresence } from "motion/react";
import { useDashboard } from "../state/DashboardContext";

// Per-category color palette — must mirror PieChart.tsx's PIE_COLORS so the
// header dots visually correspond to pie slices for the same category.
const CAT_COLORS: Record<string, string> = {
  xcode: "#0F766E",
  llms: "#7C3AED",
  docker: "#0EA5E9",
  apps: "#F59E0B",
  creative: "#EC4899",
  system: "#64748B",
  ALL: "#0F766E",
};

// Map the server's category-id (often a sub-category like "llms-claude") back
// to its top-level tab id for color lookup.
function topLevelFor(cat: string): string {
  if (cat === "ALL") return "ALL";
  if (cat.startsWith("llms-")) return "llms";
  if (cat.startsWith("creative-")) return "creative";
  return cat;
}

export function RunningWidget() {
  const { runningCleans } = useDashboard();
  const list = runningCleans || [];

  // Group by top-level category for the visible dot row.
  const byCat = new Map<string, number>();
  for (const r of list) {
    const id = topLevelFor(r.category);
    byCat.set(id, (byCat.get(id) || 0) + 1);
  }

  return (
    <AnimatePresence>
      {list.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="ml-3.5 inline-flex items-center gap-2 rounded-full border border-border/20 bg-bg-2 px-2.5 py-1 text-[11px] tabular text-fg-dim shadow-sm"
          style={{ boxShadow: "0 0 0 4px hsl(var(--accent) / 0.10)" }}
          aria-live="polite"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border border-border/60"
            style={{
              borderTopColor: "hsl(var(--accent))",
              animation: "spin 0.9s linear infinite",
            }}
            aria-hidden
          />
          <span>
            <strong className="font-semibold text-fg">{list.length}</strong>{" "}
            clean{list.length === 1 ? "" : "s"} running
          </span>
          <span className="inline-flex items-center gap-[3px]">
            {[...byCat.entries()].map(([cat, n]) => (
              <span
                key={cat}
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: CAT_COLORS[cat] || "#888" }}
                title={`${cat}: ${n} active`}
              />
            ))}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
