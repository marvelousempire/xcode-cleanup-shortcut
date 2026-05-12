import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { ShieldCheck } from "./icons";
import { fmt, cn } from "../lib/utils";
import type { DiskStatus } from "../lib/types";

interface Props {
  status: DiskStatus | null;
}

export function Hero({ status }: Props) {
  const free = status?.free_gb ?? 0;
  const total = status?.total_gb ?? 0;
  const used = status?.used_gb ?? 0;
  const pct = status?.used_pct ?? 0;

  const tier = !status
    ? "loading"
    : free >= 50
      ? "good"
      : free >= 20
        ? "warn"
        : "danger";

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
    <section className="glass rounded-lg shadow-md p-9 pt-10 pb-7 text-center">
      <div
        className={cn(
          "font-bold leading-none tabular tracking-[-0.04em] text-[80px] transition-colors",
          tier === "good" && "text-safe",
          tier === "warn" && "text-warn",
          tier === "danger" && "text-danger",
          tier === "loading" && "text-fg-faint",
        )}
      >
        {status == null ? (
          "—"
        ) : (
          <motion.span>{display}</motion.span>
        )}
        <span className="ml-1.5 text-[30px] font-medium text-fg-dim tracking-[-0.01em]">
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
            tier === "warn" ? "bg-warn" : tier === "danger" ? "bg-danger" : "bg-accent",
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
