import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { ShieldCheck } from "./icons";
import { fmt, cn } from "../lib/utils";
import type { DiskStatus } from "../lib/types";

interface Props {
  status: DiskStatus | null;
  /** When `embedded`, the hero drops its own border/shadow/background — the
   * parent pane in the Overview 3-pane top owns those. Padding is also tighter
   * so the hero shares the row with the pie + terminal cleanly. */
  embedded?: boolean;
}

export function Hero({ status, embedded = false }: Props) {
  const free = status?.free_gb ?? 0;
  const total = status?.total_gb ?? 0;
  const used = status?.used_gb ?? 0;
  const pct = status?.used_pct ?? 0;

  // 5-tier urgency scale — calibrated so 0.67 GB free looks completely
  // different from 15 GB free (previously both landed in "danger").
  const tier = !status
    ? "loading"
    : free >= 50
      ? "good"          // green  ≥ 50 GB
      : free >= 20
        ? "ok"          // normal 20–50 GB
        : free >= 10
          ? "warn"      // yellow 10–20 GB
          : free >= 5
            ? "critical"  // orange 5–10 GB
            : "emergency"; // red + pulse < 5 GB

  // Tween the displayed free-GB number.
  const heroValue = useMotionValue(free);
  const display = useTransform(heroValue, (v) => fmt(v));
  useEffect(() => {
    if (status == null) return;
    const controls = animate(heroValue, free, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [free, status, heroValue]);

  const widthPct = Math.min(100, Math.max(0, pct));

  return (
    <section
      className={cn(
        "text-center",
        embedded
          ? "px-6 pb-5 pt-7"
          : "glass rounded-lg shadow-md p-9 pt-10 pb-7",
      )}
    >
      <div
        className={cn(
          "font-bold leading-none tabular tracking-[-0.04em] transition-colors",
          embedded ? "text-[56px]" : "text-[80px]",
          tier === "good" && "text-safe",
          tier === "ok" && "text-fg",
          tier === "warn" && "text-warn",
          tier === "critical" && "text-[hsl(var(--warn))]",
          tier === "emergency" && "text-danger animate-pulse",
          tier === "loading" && "text-fg-faint",
        )}
      >
        {status == null ? (
          "—"
        ) : (
          <motion.span>{display}</motion.span>
        )}
        <span
          className={cn(
            "font-medium text-fg-dim tracking-[-0.01em]",
            embedded ? "ml-1 text-[22px]" : "ml-1.5 text-[30px]",
          )}
        >
          GB free
        </span>
      </div>

      <div className="mt-3 text-[13px] text-fg-dim tabular">
        {status
          ? `${fmt(used, 0)} GB used of ${fmt(total, 0)} GB · ${fmt(pct, 0)}%`
          : "Checking disk…"}
      </div>

      <div className="mt-5 h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--border) / 0.18)" }}>
        <motion.div
          className={cn(
            "h-full",
            tier === "warn" ? "bg-warn"
          : tier === "critical" ? "bg-[hsl(var(--warn))]"
          : tier === "emergency" ? "bg-danger"
          : tier === "good" ? "bg-safe"
          : "bg-accent",
          )}
          initial={{ width: "0%" }}
          animate={{ width: widthPct + "%" }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>

      <div className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-fg-faint uppercase tracking-[0.04em]">
        <ShieldCheck className="w-3 h-3 text-safe" aria-hidden />
        Factory-fresh without losing your stuff
      </div>
    </section>
  );
}
