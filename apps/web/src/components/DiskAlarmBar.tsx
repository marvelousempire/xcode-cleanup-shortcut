import { motion, AnimatePresence } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { fmt } from "../lib/utils";

/**
 * DiskAlarmBar — full-width emergency strip above EVERYTHING in the app.
 *
 * Shows whenever disk free is below a threshold. Three severity levels:
 *   EMERGENCY (< 5 GB or < 5%)  — red, pulsing, "Your Mac is at risk"
 *   CRITICAL  (< 10 GB or < 10%) — orange, "Running very low"
 *   WARNING   (< 20 GB or < 15%) — yellow, subtle reminder
 *
 * Always visible — does not depend on which tab is active. This is the fix
 * for the app being silent about a disk that is 95% full.
 */
export function DiskAlarmBar() {
  const { status, setActiveTab } = useDashboard();

  if (!status) return null;

  const free  = status.free_gb;
  const total = status.total_gb;
  const pct   = total > 0 ? (free / total) * 100 : 100;
  const used  = 100 - pct;

  // Free label — show MB when below 1 GB so it doesn't round to "0.0 GB"
  const freeLabel = free < 1
    ? `${Math.round(free * 1024)} MB`
    : `${fmt(free)} GB`;

  type Level = "emergency" | "critical" | "warning" | null;

  const level: Level =
    free < 5  || pct < 5  ? "emergency" :
    free < 10 || pct < 10 ? "critical"  :
    free < 20 || pct < 15 ? "warning"   :
    null;

  if (!level) return null;

  const cfg = {
    emergency: {
      bg:      "bg-danger",
      text:    "text-white",
      icon:    "🚨",
      label:   `DISK ALMOST FULL — ${freeLabel} FREE (${Math.round(used)}% USED)`,
      sub:     "Your Mac will slow down and may stop working. Clean something now.",
      pulse:   true,
    },
    critical: {
      bg:      "bg-[hsl(25_95%_48%)]",
      text:    "text-white",
      icon:    "⚠️",
      label:   `Disk running very low — ${freeLabel} free (${Math.round(used)}% used)`,
      sub:     "Free up space now before your Mac stops accepting new files.",
      pulse:   false,
    },
    warning: {
      bg:      "bg-warn",
      text:    "text-[hsl(0_0%_10%)]",
      icon:    "⚠️",
      label:   `Low disk space — ${freeLabel} free`,
      sub:     "Consider cleaning now before space gets critical.",
      pulse:   false,
    },
  }[level];

  return (
    <AnimatePresence>
      <motion.div
        key={level}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <div
          className={`${cfg.bg} ${cfg.text} ${cfg.pulse ? "animate-pulse" : ""} w-full`}
        >
          <div className="mx-auto max-w-[1280px] px-6 py-2.5 flex items-center gap-3 flex-wrap">
            {/* Icon + message */}
            <span className="text-[15px] flex-shrink-0" aria-hidden>{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-bold tracking-[-0.01em]">
                {cfg.label}
              </span>
              <span className="ml-2 text-[12px] opacity-80 hidden sm:inline">
                {cfg.sub}
              </span>
            </div>

            {/* Live usage bar */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-[120px] h-[6px] rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/80 transition-all duration-700"
                  style={{ width: `${Math.min(100, used)}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold tabular opacity-90 w-8 text-right">
                {Math.round(used)}%
              </span>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => setActiveTab(level === "emergency" ? "emergency" : "overview")}
              className="flex-shrink-0 rounded-md bg-white/20 hover:bg-white/30 border border-white/30 px-3 py-1.5 text-[12px] font-semibold transition-colors"
            >
              {level === "emergency" ? "Open Emergency Rescue →" : "Clean now →"}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
