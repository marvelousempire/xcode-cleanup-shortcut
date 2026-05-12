import { motion } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { Hero } from "./Hero";
import { History, RefreshCw, CheckCheck, AlertTriangle, ChevronRight, TabIcon } from "./icons";
import { cn, fmt } from "../lib/utils";

function stripGlyph(s: string) {
  return s.replace(/^[\p{Extended_Pictographic}\p{Emoji}☀-➿]+\s*/u, "").trim() || s;
}

export function OverviewPanel() {
  const { status, history, tabs, scans, allCategories, scanEverything, cleanEverywhere, setActiveTab, busy } = useDashboard();

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
      <Hero status={status} />

      {history?.real_runs ? (
        <div
          className="mt-3 mb-4 flex items-center justify-center gap-2 rounded-full border border-border/10 px-4 py-2.5 text-[12px] tabular"
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

      <section className="glass mb-4 rounded-lg border border-border/20 p-5 shadow-sm">
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => scanEverything()}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-md border border-border/20 bg-[hsl(var(--bg-2)/0.55)] px-4 py-2.5 text-[13px] font-semibold transition-colors hover:border-accent disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {totals.scanned > 0 ? "Re-scan everything" : "Scan everything"}
          </button>
          <button
            type="button"
            disabled={busy || totals.safe < 0.001}
            onClick={() => cleanEverywhere("safe")}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent bg-accent px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_hsl(var(--accent)/0.20)] transition-all hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-45"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Clean ALL safe {totals.safe >= 0.01 ? `· ${fmt(totals.safe)} GB` : "· scan first"}
          </button>
          <button
            type="button"
            disabled={busy || totals.optin < 0.001}
            onClick={() => cleanEverywhere("probably_safe")}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-md border border-border/20 bg-[hsl(var(--bg-2)/0.55)] px-4 py-2.5 text-[13px] font-semibold tabular transition-colors hover:border-accent disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Clean ALL opt-in {totals.optin >= 0.01 ? `· ${fmt(totals.optin)} GB` : "· scan first"}
          </button>
        </div>
        <div className="mt-3 text-[12px] leading-[1.55] tabular text-fg-dim">
          {totals.scanned === 0 ? (
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

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {tabs.filter((t) => !t.meta).map((tab, idx) => {
          let cleanableGb = 0, safe = 0, optin = 0, caution = 0;
          let tagline = "";
          let scanned = false;
          if (tab.subcategories) {
            for (const sub of tab.subcategories) {
              const s = scans[sub]?.scan;
              if (!s) continue;
              scanned = true;
              cleanableGb += s.total_cleanable_gb || 0;
              safe += s.totals.safe || 0;
              optin += s.totals.probably_safe || 0;
              caution += s.totals.caution || 0;
            }
            tagline = `${tab.subcategories.length} sub-tools`;
          } else if (tab.category) {
            const s = scans[tab.category]?.scan;
            if (s) {
              scanned = true;
              cleanableGb = s.total_cleanable_gb || 0;
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
              <div className="mb-2.5 flex items-center gap-2.5">
                <TabIcon tabId={tab.id} className="h-4.5 w-4.5 text-accent" />
                <span className="text-[14px] font-semibold tracking-[-0.005em]">{stripGlyph(tab.label)}</span>
              </div>
              <div className={cn(
                "mb-1 text-[28px] font-bold tabular leading-[1.1] tracking-[-0.02em]",
                cleanableGb >= 0.01 ? "text-accent" : "text-fg-faint",
              )}>
                {cleanableGb >= 0.01 ? (
                  <>{fmt(cleanableGb)} <span className="text-[14px] font-medium text-fg-dim">GB cleanable</span></>
                ) : scanned ? (
                  <span className="text-[14px] font-medium">nothing to clean</span>
                ) : (
                  <span className="text-[14px] font-medium">scanning…</span>
                )}
              </div>
              <div className="mb-3 text-[12px] leading-[1.5] text-fg-dim">{tagline || "—"}</div>
              <div className="flex flex-wrap gap-3 text-[11px] tabular text-fg-dim">
                <DotPill tone="safe">safe <strong className="font-semibold text-fg">{fmt(safe)}</strong></DotPill>
                <DotPill tone="warn">opt-in <strong className="font-semibold text-fg">{fmt(optin)}</strong></DotPill>
                <DotPill tone="danger">caution <strong className="font-semibold text-fg">{fmt(caution)}</strong></DotPill>
              </div>
              <div className="mt-2.5 flex items-center justify-end gap-1 text-[11px] text-fg-faint transition-colors group-hover:text-accent">
                Open <ChevronRight className="h-3 w-3" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function DotPill({ tone, children }: { tone: "safe" | "warn" | "danger"; children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5",
      tone === "safe" && "text-safe",
      tone === "warn" && "text-warn",
      tone === "danger" && "text-danger",
    )}>
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        tone === "safe" && "bg-safe",
        tone === "warn" && "bg-warn",
        tone === "danger" && "bg-danger",
      )} />
      {children}
    </span>
  );
}
