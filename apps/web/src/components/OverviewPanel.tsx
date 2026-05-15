import { motion } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { Hero } from "./Hero";
import { CleanableMixPanel } from "./CleanableMixPanel";
import { OutputConsole } from "./OutputConsole";
import { SpaceBarChart } from "./SpaceBarChart";
import { HabitBanner } from "./HabitBanner";
import { PermissionBanner } from "./PermissionBanner";
import { QuickWins } from "./QuickWins";
import { RescueBanner } from "./RescueBanner";
import { GrowthWatch } from "./GrowthWatch";
import { HomeFolderAdvice } from "./HomeFolderAdvice";
import { History, RefreshCw, CheckCheck, AlertTriangle, ChevronRight, TabIcon } from "./icons";
import { cn, fmt } from "../lib/utils";

function stripGlyph(s: string) {
  return s.replace(/^[\p{Extended_Pictographic}\p{Emoji}☀-➿]+\s*/u, "").trim() || s;
}

export function OverviewPanel() {
  const { status, history, tabs, scans, allCategories, scanEverything, cleanEverywhere, setActiveTab, busy, scanning } = useDashboard();

  const totals = allCategories.reduce(
    (acc, c) => {
      const s = scans[c]?.scan;
      if (!s) return acc;
      acc.safe += s.totals.safe || 0;
      acc.optin += s.totals.probably_safe || 0;
      acc.scanned += 1;
      return acc;
    },
    { safe: 0, optin: 0, scanned: 0 },
  );
  const cleanable = totals.safe + totals.optin;

  return (
    <div>
      {/* ── 1. Action buttons — pinned at top, always first ───────────────── */}
      <section className="glass mb-4 rounded-lg border border-border/20 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={busy || scanning}
            onClick={() => scanEverything()}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-md border border-border/20 bg-[hsl(var(--bg-2)/0.55)] px-4 py-2.5 text-[13px] font-semibold transition-colors hover:border-accent disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", scanning && "animate-spin")} />
            {scanning ? "Scanning…" : totals.scanned > 0 ? "Re-scan everything" : "Scan everything"}
          </button>
          <button
            type="button"
            disabled={busy || totals.safe < 0.001}
            onClick={() => cleanEverywhere("safe")}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent bg-accent px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_hsl(var(--accent)/0.20)] transition-all hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-45"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Clean ALL safe {totals.safe >= 0.01
              ? `· ${fmt(totals.safe)} GB`
              : totals.scanned > 0 ? "· all clean ✓" : "· scan first"}
          </button>
          <button
            type="button"
            disabled={busy || totals.optin < 0.001}
            onClick={() => cleanEverywhere("probably_safe")}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-md border border-border/20 bg-[hsl(var(--bg-2)/0.55)] px-4 py-2.5 text-[13px] font-semibold tabular transition-colors hover:border-accent disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Clean ALL opt-in {totals.optin >= 0.01
              ? `· ${fmt(totals.optin)} GB`
              : totals.scanned > 0 ? "· all clean ✓" : "· scan first"}
          </button>
        </div>
        <div className="mt-2.5 text-[12px] leading-[1.55] tabular text-fg-dim">
          {scanning ? (
            <>Re-scanning {allCategories.length} categories in parallel…</>
          ) : totals.scanned === 0 ? (
            "Scanning every category in parallel…"
          ) : totals.scanned < allCategories.length ? (
            <>Scanning {allCategories.length} categories… <strong className="font-semibold text-fg">{totals.scanned}/{allCategories.length}</strong></>
          ) : cleanable < 0.01 ? (
            <><strong className="font-semibold text-fg">You're clean.</strong> Nothing to reclaim across all {allCategories.length} categories.</>
          ) : (
            <><strong className="font-semibold text-fg">{fmt(cleanable)} GB cleanable</strong> across {allCategories.length} categories. Click a card below to drill in, or use the buttons above.</>
          )}
        </div>
      </section>

      {/* User-folder guidance (~ / Library) */}
      <HomeFolderAdvice />

      {/* ── 2. 3-pane: hero · cleanable mix · terminal ───────────────────── */}
      <div className="mb-3.5 grid gap-3.5 overview-top">
        <div className="overflow-hidden rounded-lg border border-border/15 shadow-md" style={{ background: "hsl(var(--bg-2))" }}>
          <Hero status={status} embedded />
        </div>
        <div className="flex flex-col overflow-hidden rounded-lg border border-border/15 shadow-sm" style={{ background: "hsl(var(--bg-2))" }}>
          <div className="px-4 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
            Cleanable space by category
          </div>
          <CleanableMixPanel />
        </div>
        <div className="flex flex-col overflow-hidden rounded-lg border border-border/15 shadow-sm" style={{ background: "hsl(var(--bg-2))" }}>
          <div className="px-4 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
            Activity
          </div>
          <div className="flex flex-1 flex-col px-3 pb-3">
            <OutputConsole embedded fillHeight withToolbar />
          </div>
        </div>
      </div>

      {/* ── 3. History banner ────────────────────────────────────────────── */}
      {history?.real_runs ? (
        <div
          className="mt-1 mb-4 flex items-center justify-center gap-2 rounded-full border border-border/10 px-4 py-2.5 text-[12px] tabular"
          style={{ background: "hsl(var(--bg-2) / 0.55)" }}
        >
          <History className="h-3.5 w-3.5 text-accent" aria-hidden />
          <span className="text-fg-dim">
            You've freed <strong className="font-semibold text-fg">{fmt(history.total_freed_gb)} GB</strong> across{" "}
            <strong className="font-semibold text-fg">{history.real_runs}</strong> run
            {history.real_runs === 1 ? "" : "s"}.
          </span>
        </div>
      ) : null}

      {/* ── 4. Space breakdown bar chart ─────────────────────────────────── */}
      <SpaceBarChart />

      {/* ── 4b. Plan 0027 — short-window growth (3m / 9m / 20m) ───────────── */}
      <GrowthWatch />

      {/* ── 5. Banners — rescue (disk low) · permission (FDA) · habits · quick wins */}
      <RescueBanner />
      <PermissionBanner />
      <HabitBanner />
      <QuickWins />

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {tabs.filter((t) => !t.meta).map((tab, idx) => {
          let safe = 0, optin = 0, caution = 0;
          let tagline = "";
          let scanned = false;
          if (tab.subcategories) {
            for (const sub of tab.subcategories) {
              const s = scans[sub]?.scan;
              if (!s) continue;
              scanned = true;
              safe += s.totals.safe || 0;
              optin += s.totals.probably_safe || 0;
              caution += s.totals.caution || 0;
            }
            tagline = `${tab.subcategories.length} sub-tools`;
          } else if (tab.category) {
            const s = scans[tab.category]?.scan;
            if (s) {
              scanned = true;
              safe = s.totals.safe || 0;
              optin = s.totals.probably_safe || 0;
              caution = s.totals.caution || 0;
              tagline = stripGlyph(s.tagline || "");
            }
          }
          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * idx, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.99 }}
              className="group w-full rounded-md border border-border/15 p-4 px-4.5 text-left transition-colors hover:border-accent shadow-sm"
              style={{ background: "hsl(var(--bg-2) / 0.78)" }}
            >
              <div className="mb-2 flex items-center gap-2.5">
                <TabIcon tabId={tab.id} className="h-4.5 w-4.5 text-accent" />
                <span className="text-[14px] font-semibold tracking-[-0.005em]">{stripGlyph(tab.label)}</span>
              </div>
              <div className="mb-3.5 text-[12px] leading-[1.5] text-fg-dim">{tagline || "—"}</div>
              {!scanned ? (
                <div className="text-[13px] font-medium text-fg-faint">scanning…</div>
              ) : safe < 0.001 && optin < 0.001 && caution < 0.001 ? (
                <div className="text-[13px] font-medium text-fg-faint">nothing to clean</div>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5 font-bold tabular tracking-[-0.015em] leading-[1.25] text-safe">
                    <span className="text-[22px]">{fmt(safe)}</span>
                    <span className="text-[12px] font-medium text-fg-dim">GB safe</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 font-bold tabular tracking-[-0.015em] leading-[1.25] text-warn">
                    <span className="text-[22px]">{fmt(optin)}</span>
                    <span className="text-[12px] font-medium text-fg-dim">GB opt-in</span>
                  </div>
                  {caution >= 0.01 && (
                    <div className="mt-1.5 flex items-baseline gap-1.5 text-[11px] font-medium text-fg-faint">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger opacity-70" />
                      <span><strong className="font-semibold">{fmt(caution)}</strong> GB caution (surface only)</span>
                    </div>
                  )}
                </>
              )}
              <div className="mt-3 flex items-center justify-end gap-1 text-[11px] text-fg-faint transition-colors group-hover:text-accent">
                Open <ChevronRight className="h-3 w-3" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

