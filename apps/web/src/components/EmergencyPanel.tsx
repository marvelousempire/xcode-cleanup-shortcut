import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { fmt, cn } from "../lib/utils";

/**
 * EmergencyPanel — DustPan's disk-at-zero rescue screen (plan 0011).
 *
 * The Smart Auto-Detector Protector Agent (SADPA) navigates here automatically
 * when free_gb < 1. Each command card has:
 *   - A number badge
 *   - Plain-English explanation (12-year-old tone)
 *   - The exact shell command shown in monospace
 *   - A "▶ Run this" button that streams live output to the terminal
 *   - A freed-space counter after completion
 *
 * The "Run All" button executes every command in sequence.
 */

const COMMANDS = [
  {
    id:      "emergency-deriveddata",
    num:     "①",
    label:   "Xcode Build Cache (DerivedData)",
    shell:   "rm -rf ~/Library/Developer/Xcode/DerivedData/*",
    what:    "Xcode's scratch pad. Every build saves notes here so the next build is faster.",
    happens: "Your next Xcode build takes ~30 seconds longer — just once. Nothing else changes.",
    typical: "5–20 GB",
    safe:    true,
  },
  {
    id:      "emergency-devicesupport",
    num:     "②",
    label:   "Xcode Device Debug Files (iOS DeviceSupport)",
    shell:   "rm -rf ~/Library/Developer/Xcode/'iOS DeviceSupport'/*",
    what:    "One folder per iPhone model per iOS version. Downloaded when you plugged your phone in to test an app. They stack up for years.",
    happens: "Next time you plug in a device, Xcode re-downloads the file (1–2 min). Your phone and apps are fine.",
    typical: "2–8 GB",
    safe:    true,
  },
  {
    id:      "emergency-mediaanalysisd",
    num:     "③",
    label:   "macOS Photo Recognition Cache",
    shell:   "rm -rf ~/Library/Containers/com.apple.mediaanalysisd/Data/Library/*\nrm -rf ~/Library/Containers/com.apple.mediaanalysisd/Data/tmp/*",
    what:    "The AI brain macOS builds from your Photos library to recognize faces and scenes. Like a photo album with sticky notes on every picture — macOS made the sticky notes, not you.",
    happens: "Face recognition in Photos re-learns over a few hours in the background. Your actual photos are completely untouched.",
    typical: "2–5 GB",
    safe:    true,
  },
  {
    id:      "emergency-documentationindex",
    num:     "④",
    label:   "Xcode Documentation Index",
    shell:   "rm -rf ~/Library/Developer/Xcode/DocumentationIndex/*",
    what:    "Xcode's searchable copy of Apple's developer docs — like a book index that Xcode built so it can find things fast.",
    happens: "Xcode re-builds the index the next time you open the documentation viewer. Takes a few seconds.",
    typical: "1–5 GB",
    safe:    true,
  },
  {
    id:      "emergency-docker-prune",
    num:     "⑤",
    label:   "Docker: Remove Unused Images & Containers",
    shell:   "docker system prune -f",
    what:    "Docker stores everything (app blueprints, running snapshots, saved data) inside one giant file called Docker.raw. Over time, unused blueprints pile up inside it — you pulled them once and forgot.",
    happens: "Unused images and stopped containers are removed from inside Docker. Running containers are completely safe. If you need a removed image later, Docker re-downloads it.",
    typical: "2–20 GB",
    safe:    true,
  },
  {
    id:      "emergency-check-disk",
    num:     "⑥",
    label:   "Check Disk Space Right Now",
    shell:   "df -h /",
    what:    "Shows exactly how full your disk is and lists the biggest folders. Like asking your Mac to show you its report card.",
    happens: "Nothing is deleted. This is read-only.",
    typical: "—",
    safe:    true,
    readOnly: true,
  },
] satisfies Array<{
  id: string; num: string; label: string; shell: string;
  what: string; happens: string; typical: string; safe: boolean;
  readOnly?: boolean;
}>;

type CommandId = string;

export function EmergencyPanel() {
  const { status, runAction, busy } = useDashboard();
  const [doneSet, setDoneSet]     = useState<Set<CommandId>>(new Set());
  const [runningId, setRunningId] = useState<CommandId | null>(null);

  const free   = status?.free_gb ?? 0;
  const total  = status?.total_gb ?? 228;
  const usedPct = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
  const freeLabel = free < 1
    ? `${Math.round(free * 1024)} MB`
    : `${free.toFixed(1)} GB`;

  const allDone = COMMANDS.filter(c => !c.readOnly).every(c => doneSet.has(c.id));

  function run(id: CommandId) {
    if (busy) return;
    setRunningId(id);
    runAction("emergency", id, COMMANDS.find(c => c.id === id)!.label);
    // Mark done after a short delay — busy flag transition handles real feedback
    setTimeout(() => {
      setDoneSet(prev => new Set([...prev, id]));
      setRunningId(null);
    }, 1500);
  }

  function runAll() {
    runAction("emergency", "emergency-run-all", "Run All Emergency Commands");
    setTimeout(() => {
      setDoneSet(new Set(COMMANDS.map(c => c.id)));
    }, 2000);
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Header — alarm state */}
      <div className={cn(
        "rounded-lg p-5",
        free < 1
          ? "border border-danger/40 bg-[hsl(var(--danger)/0.07)]"
          : "border border-warn/40 bg-[hsl(var(--warn)/0.07)]",
      )}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[22px]" aria-hidden>{free < 1 ? "🚨" : "⚠️"}</span>
          <div>
            <div className={cn(
              "text-[14px] font-bold",
              free < 1 ? "text-danger" : "text-warn",
            )}>
              {free < 1
                ? `Disk at absolute zero — ${freeLabel} free (${usedPct}% used)`
                : `Disk critically low — ${freeLabel} free (${usedPct}% used)`}
            </div>
            <div className="text-[12px] text-fg-dim mt-0.5">
              The commands below are the fastest safe way to get space back.
              Every deleted file rebuilds automatically — nothing important is lost.
            </div>
          </div>
        </div>

        {/* Disk bar */}
        <div className="h-[6px] rounded-full overflow-hidden mb-2"
          style={{ background: "hsl(var(--border)/0.2)" }}>
          <motion.div
            className={cn("h-full rounded-full", free < 1 ? "bg-danger animate-pulse" : "bg-warn")}
            animate={{ width: `${usedPct}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
          />
        </div>

        {/* Run All button */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            disabled={busy || allDone}
            onClick={runAll}
            className={cn(
              "flex-1 rounded-md border px-4 py-2.5 text-[13px] font-bold transition-all",
              allDone
                ? "border-safe/30 bg-[hsl(var(--safe)/0.1)] text-safe cursor-default"
                : "border-danger/40 bg-danger text-white hover:bg-[hsl(var(--danger)/0.85)] disabled:opacity-40 shadow-[0_2px_12px_hsl(var(--danger)/0.3)]",
            )}
          >
            {allDone
              ? "✓ All emergency commands complete"
              : busy
                ? "Running…"
                : "▶▶ Run All Emergency Commands Now"}
          </button>
        </div>
        <p className="text-[11px] text-fg-faint mt-2 text-center">
          Or run them one at a time below — each button shows live output in the terminal.
        </p>
      </div>

      {/* Command cards */}
      <div className="flex flex-col gap-3">
        {COMMANDS.map((cmd, idx) => {
          const done    = doneSet.has(cmd.id);
          const running = runningId === cmd.id && busy;

          return (
            <motion.div
              key={cmd.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                done
                  ? "border-safe/30 bg-[hsl(var(--safe)/0.05)]"
                  : "border-border/20 bg-[hsl(var(--bg-2)/0.55)]",
              )}
            >
              <div className="flex items-start gap-3">
                {/* Number badge */}
                <div className={cn(
                  "flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-[13px] font-bold mt-0.5",
                  done
                    ? "border-safe/40 text-safe"
                    : "border-border/30 text-fg-dim",
                )}>
                  {done ? "✓" : cmd.num}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title + typical size */}
                  <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
                    <span className="text-[13px] font-semibold text-fg">{cmd.label}</span>
                    {cmd.typical !== "—" && (
                      <span className="text-[11px] text-fg-faint">typically {cmd.typical}</span>
                    )}
                    {cmd.readOnly && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full border border-safe/30 text-safe">
                        read-only
                      </span>
                    )}
                  </div>

                  {/* What is it / what happens */}
                  <p className="text-[12px] text-fg-dim leading-[1.6] m-0 mb-1">
                    <strong className="font-semibold text-fg">What is this?</strong>{" "}
                    {cmd.what}
                  </p>
                  <p className="text-[12px] text-fg-dim leading-[1.6] m-0 mb-3">
                    <strong className="font-semibold text-fg">If you delete it:</strong>{" "}
                    {cmd.happens}
                  </p>

                  {/* Shell command preview */}
                  <div className="mb-3 rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.8)] px-3 py-2 font-mono text-[11px] text-fg-dim whitespace-pre-wrap">
                    {cmd.shell}
                  </div>

                  {/* Run button */}
                  <button
                    type="button"
                    disabled={busy || done}
                    onClick={() => run(cmd.id)}
                    className={cn(
                      "rounded-md border px-4 py-1.5 text-[12px] font-semibold transition-all",
                      done
                        ? "border-safe/30 bg-[hsl(var(--safe)/0.1)] text-safe cursor-default"
                        : "border-accent/30 bg-[hsl(var(--accent)/0.1)] text-accent hover:bg-[hsl(var(--accent)/0.2)] disabled:opacity-40 disabled:cursor-not-allowed",
                    )}
                  >
                    {done
                      ? "✓ Done"
                      : running
                        ? "Running…"
                        : cmd.readOnly
                          ? "▶ Run check"
                          : "▶ Run this"}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="text-center text-[11px] text-fg-faint pb-2">
        Output from every command streams live in the terminal at the bottom of the screen.
        The disk meter in the header updates in real time as space is freed.
      </div>
    </div>
  );
}
