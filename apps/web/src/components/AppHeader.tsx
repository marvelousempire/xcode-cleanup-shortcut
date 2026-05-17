import { motion } from "motion/react";
import { cn } from "../lib/utils";
import type { DiskStatus } from "../lib/types";

interface Props {
  status: DiskStatus | null;
  onOpenChangelog: () => void;
}

/**
 * Dustpan header — wordmark + LIVE disk meter + version pill.
 *
 * The disk meter is always visible regardless of which tab is active.
 * It updates every 2 s via the /api/live SSE channel (no extra requests).
 * Color coding matches the 5-tier scale in Hero.tsx:
 *   green  ≥ 50 GB free
 *   normal 20–50 GB
 *   yellow 10–20 GB
 *   orange 5–10 GB
 *   red    < 5 GB  (emergency — also shown in DiskAlarmBar)
 */
export function AppHeader({ status, onOpenChangelog }: Props) {
  const free  = status?.free_gb ?? null;
  const total = status?.total_gb ?? 1;
  const usedPct = free !== null ? Math.min(100, Math.max(0, ((total - free) / total) * 100)) : 0;
  const freePct = 100 - usedPct;
  const connected = Boolean(status);
  const port = status?.server_port ?? (typeof window !== "undefined" && window.location.port ? Number(window.location.port) : null);
  const scope = status?.server_scope ?? "localhost";

  // Same 5-tier scale as Hero
  const tier =
    free === null   ? "loading"   :
    free >= 50      ? "good"      :
    free >= 20      ? "ok"        :
    free >= 10      ? "warn"      :
    free >= 5       ? "critical"  :
                      "emergency";

  const barColor =
    tier === "good"      ? "bg-safe"                    :
    tier === "ok"        ? "bg-accent"                  :
    tier === "warn"      ? "bg-warn"                    :
    tier === "critical"  ? "bg-[hsl(25_95%_48%)]"      :
                           "bg-danger";

  const labelColor =
    tier === "good"      ? "text-safe"                  :
    tier === "ok"        ? "text-fg-dim"                :
    tier === "warn"      ? "text-warn"                  :
    tier === "critical"  ? "text-[hsl(25_95%_48%)]"    :
    tier === "emergency" ? "text-danger"                :
                           "text-fg-faint";

  // Show MB when below 1 GB
  const freeLabel =
    free === null   ? "…" :
    free < 1        ? `${Math.round(free * 1024)} MB free` :
    free < 10       ? `${free.toFixed(1)} GB free` :
                      `${Math.round(free)} GB free`;

  return (
    <header className="flex items-center gap-3 mb-5 px-1">
      {/* Wordmark */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="w-[26px] h-[26px] text-accent flex-shrink-0"
      >
        <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
        <path d="m14 7 3 3" />
        <path d="M5 6v4" />
        <path d="M19 14v4" />
        <path d="M10 2v2" />
        <path d="M7 8H3" />
        <path d="M21 16h-4" />
        <path d="M11 3H9" />
      </svg>
      <div className="flex items-baseline gap-2 flex-shrink-0">
        <h1
          className="m-0 font-display font-semibold tracking-[-0.022em] leading-none"
          style={{ fontSize: 22 }}
        >
          Dustpan
        </h1>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-fg-faint leading-none">
          by AVERY GOODMAN
        </span>
      </div>

      {/* ── Live disk meter — always visible on every tab ─────────────── */}
      <div className="flex-1 min-w-0 mx-3 flex items-center gap-2.5" aria-label="Live disk usage">
        {/* Bar */}
        <div
          className="flex-1 min-w-[60px] max-w-[280px] h-[5px] rounded-full overflow-hidden"
          style={{ background: "hsl(var(--border) / 0.22)" }}
        >
          <motion.div
            className={cn("h-full rounded-full", barColor, tier === "emergency" && "animate-pulse")}
            initial={false}
            animate={{ width: `${usedPct}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
          />
        </div>
        {/* Label */}
        <span
          className={cn(
            "flex-shrink-0 text-[11px] font-semibold tabular whitespace-nowrap",
            labelColor,
          )}
        >
          {freeLabel}
        </span>
        {/* Percentage */}
        <span className="flex-shrink-0 text-[11px] text-fg-faint tabular hidden sm:inline">
          {free !== null ? `${Math.round(freePct)}% free` : ""}
        </span>
      </div>

      {/* Changelog + server connection pill */}
      <button
        type="button"
        onClick={onOpenChangelog}
        title="Open changelog and tech stack"
        className="group flex-shrink-0 rounded-full border border-border/20 bg-[hsl(var(--bg-2)/0.78)] px-3 py-1.5 text-left shadow-sm transition-colors duration-150 hover:border-accent hover:bg-bg-3"
      >
        <span className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", connected ? "bg-safe shadow-[0_0_0_3px_hsl(var(--safe)/0.14)]" : "bg-warn animate-pulse")} />
          <span className="text-[11px] font-bold tabular text-fg">{status?.version ?? "…"}</span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint group-hover:text-fg-dim sm:inline">
            {connected ? `${scope} :${port ?? "?"}` : "connecting"}
          </span>
        </span>
      </button>
    </header>
  );
}
