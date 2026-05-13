import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { TabIcon } from "./icons";
import { fmt } from "../lib/utils";

function stripGlyph(s: string) {
  return s.replace(/^[\p{Extended_Pictographic}\p{Emoji}☀-➿]+\s*/u, "").trim() || s;
}

// ── Color system ─────────────────────────────────────────────────────────────
//
// Color is driven by what % of your REMAINING free disk the category is using.
// "Am I almost out of space because of this thing?" — that's what matters.
//
//  0– 3%  green   → low pressure
//  3– 8%  teal    → fine
//  8–15%  cyan    → notice it
// 15–25%  blue    → getting significant
// 25–40%  yellow  → moderate pressure
// 40–55%  orange  → high pressure
// 55%+    red     → critical

interface StageInfo {
  /** HSL as a usable CSS string, e.g. "hsl(142 71% 45%)" */
  hsl: string;
  /** Same but at ~30% lightness — used for the bar track glow/gradient */
  soft: string;
  label: string;
}

function getStage(pctOfFree: number): StageInfo {
  if (pctOfFree < 3)  return { hsl: "hsl(142 71% 45%)", soft: "hsl(142 71% 45% / 0.20)", label: "low" };
  if (pctOfFree < 8)  return { hsl: "hsl(160 75% 42%)", soft: "hsl(160 75% 42% / 0.22)", label: "fine" };
  if (pctOfFree < 15) return { hsl: "hsl(195 80% 50%)", soft: "hsl(195 80% 50% / 0.22)", label: "notice" };
  if (pctOfFree < 25) return { hsl: "hsl(215 80% 60%)", soft: "hsl(215 80% 60% / 0.22)", label: "watch" };
  if (pctOfFree < 40) return { hsl: "hsl(45  95% 55%)", soft: "hsl(45  95% 55% / 0.22)", label: "moderate" };
  if (pctOfFree < 55) return { hsl: "hsl(28  95% 55%)", soft: "hsl(28  95% 55% / 0.22)", label: "high" };
  return              { hsl: "hsl(0   84% 60%)", soft: "hsl(0   84% 60% / 0.22)", label: "critical" };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SpaceBarChart() {
  const { tabs, scans, status, cleanAllTier, setActiveTab, busy } = useDashboard();
  // Per-row clean state: "idle" | "cleaning" | "done"
  const [rowState, setRowState] = useState<Record<string, "idle" | "cleaning" | "done">>({});

  const freeGb = status?.free_gb ?? 1; // avoid /0

  const rows = useMemo(() => {
    const out: Array<{
      tabId: string;
      label: string;
      catId: string | null;       // null = multi-sub tab
      subcategories: string[];    // populated for multi-sub
      safe: number;
      optin: number;
      caution: number;
      total: number;
    }> = [];

    for (const tab of tabs) {
      if (tab.meta) continue;
      let safe = 0, optin = 0, caution = 0;
      const subcategories: string[] = [];

      if (tab.subcategories) {
        for (const sub of tab.subcategories) {
          const s = scans[sub]?.scan;
          if (s) {
            safe   += s.totals.safe           || 0;
            optin  += s.totals.probably_safe  || 0;
            caution+= s.totals.caution        || 0;
            subcategories.push(sub);
          }
        }
      } else if (tab.category) {
        const s = scans[tab.category]?.scan;
        if (s) {
          safe   = s.totals.safe           || 0;
          optin  = s.totals.probably_safe  || 0;
          caution= s.totals.caution        || 0;
          subcategories.push(tab.category);
        }
      }

      const total = safe + optin + caution;
      const scanned = tab.subcategories
        ? tab.subcategories.some((sub) => !!scans[sub])
        : !!scans[tab.category ?? ""];
      if (!scanned) continue;

      out.push({
        tabId: tab.id,
        label: stripGlyph(tab.label),
        catId: tab.category ?? null,
        subcategories,
        safe, optin, caution,
        total,
      });
    }

    return out.sort((a, b) => b.total - a.total);
  }, [tabs, scans]);

  if (rows.length === 0) return null;

  const maxTotal  = rows[0]?.total ?? 1;
  const grandTotal= rows.reduce((s, r) => s + r.total, 0);

  function handleClean(row: typeof rows[number]) {
    // For multi-subcategory tabs navigate to the tab — individual tier buttons
    // are there. For single-category tabs, trigger cleanAllTier directly.
    if (row.subcategories.length > 1) {
      setActiveTab(row.tabId);
      return;
    }
    const catId = row.subcategories[0] ?? row.catId;
    if (!catId || row.safe < 0.001) return;

    // setRowState to "cleaning", then "done" after clean callback
    setRowState((prev) => ({ ...prev, [row.tabId]: "cleaning" }));
    cleanAllTier(catId, "safe");
    // "done" is set after the clean callback fires (approximated here via setTimeout)
    // A proper done signal would require cleanAllTier to accept a callback.
    setTimeout(() => {
      setRowState((prev) => ({ ...prev, [row.tabId]: "done" }));
    }, 3000);
  }

  return (
    <section
      className="glass mb-4 rounded-lg border border-border/20 p-5 shadow-sm"
      aria-label="Space breakdown by category"
    >
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
        Space breakdown — color = % of free disk
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.map((row, idx) => {
          const pctOfFree = freeGb > 0 ? (row.total / freeGb) * 100 : 0;
          const pctOfTotal = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
          const barPct     = maxTotal > 0 ? (row.total / maxTotal) * 100 : 0;
          const stage      = getStage(pctOfFree);

          // Per-segment widths within the bar
          const safePct   = row.total > 0 ? (row.safe    / row.total) * 100 : 0;
          const optinPct  = row.total > 0 ? (row.optin   / row.total) * 100 : 0;
          const cautPct   = row.total > 0 ? (row.caution / row.total) * 100 : 0;

          const state     = rowState[row.tabId] ?? "idle";
          const canClean  = row.safe >= 0.001 && !busy && state !== "cleaning";
          const isDone    = state === "done";
          const isCleaning= state === "cleaning" && busy;

          // For multi-sub tabs, the clean button navigates instead of deleting
          const isMultiSub= row.subcategories.length > 1;

          return (
            <div key={row.tabId} className="flex items-center gap-3">
              {/* Label */}
              <div className="flex w-[120px] flex-shrink-0 items-center gap-1.5 truncate">
                <TabIcon tabId={row.tabId} className="h-3.5 w-3.5 flex-shrink-0 text-accent" />
                <span className="truncate text-[12px] font-medium text-fg-dim">{row.label}</span>
              </div>

              {/* Bar track */}
              <div
                className="relative flex-1 h-5 overflow-hidden rounded-sm"
                style={{ background: stage.soft }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 flex overflow-hidden rounded-sm"
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ delay: 0.04 * idx, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Stacked colour segments, all tinted to stage hue */}
                  {row.safe > 0 && (
                    <div className="h-full" style={{ width: `${safePct}%`, background: stage.hsl, opacity: 0.90 }} />
                  )}
                  {row.optin > 0 && (
                    <div className="h-full" style={{ width: `${optinPct}%`, background: stage.hsl, opacity: 0.60 }} />
                  )}
                  {row.caution > 0 && (
                    <div className="h-full" style={{ width: `${cautPct}%`,  background: stage.hsl, opacity: 0.35 }} />
                  )}
                </motion.div>
              </div>

              {/* Stats */}
              <motion.div
                className="w-[90px] flex-shrink-0 text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.04 * idx + 0.4, duration: 0.25 }}
              >
                <span className="text-[12px] font-semibold tabular" style={{ color: stage.hsl }}>
                  {fmt(row.total)} GB
                </span>
                <span className="ml-1 text-[10px] tabular text-fg-faint">
                  {pctOfTotal.toFixed(0)}%
                </span>
              </motion.div>

              {/* Clean button */}
              <motion.button
                type="button"
                disabled={!canClean && !isMultiSub && !isDone}
                onClick={() => handleClean(row)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.04 * idx + 0.5, duration: 0.2 }}
                title={
                  isDone          ? "Cleaned ✓"
                  : isCleaning    ? "Cleaning…"
                  : isMultiSub    ? `Open ${row.label} tab to clean by sub-tool`
                  : row.safe < 0.001 ? "Nothing safe to clean"
                  : `Clean ${fmt(row.safe)} GB safe from ${row.label}`
                }
                className="flex-shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all disabled:cursor-not-allowed"
                style={{
                  background: isDone
                    ? "hsl(142 71% 45% / 0.15)"
                    : canClean || isMultiSub
                    ? `${stage.hsl.replace(")", " / 0.15)")}`
                    : "hsl(var(--bg-3) / 0.6)",
                  color: isDone
                    ? "hsl(142 71% 45%)"
                    : canClean || isMultiSub
                    ? stage.hsl
                    : "hsl(var(--fg-faint))",
                  border: `1px solid ${isDone
                    ? "hsl(142 71% 45% / 0.35)"
                    : canClean || isMultiSub
                    ? `${stage.hsl.replace(")", " / 0.35)")}`
                    : "hsl(var(--border) / 0.15)"}`,
                  opacity: !canClean && !isMultiSub && !isDone ? 0.45 : 1,
                }}
              >
                {isDone        ? "✓ Done"
                : isCleaning   ? "…"
                : isMultiSub   ? "Open →"
                : row.safe >= 0.001 ? "↓ Clean"
                : "—"}
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/10 pt-2.5 text-[10px] text-fg-faint">
        {[
          { pct: 0,  label: "Low (0–3%)"    },
          { pct: 10, label: "Notice (8–15%)"},
          { pct: 30, label: "Watch (25–40%)"},
          { pct: 50, label: "High (40–55%)" },
          { pct: 65, label: "Critical (55%+)"},
        ].map(({ pct, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-4 rounded-sm"
              style={{ background: getStage(pct).hsl }}
            />
            {label}
          </span>
        ))}
        <span className="ml-auto tabular">
          {fmt(grandTotal)} GB monitored · {fmt(freeGb)} GB free
        </span>
      </div>
    </section>
  );
}
