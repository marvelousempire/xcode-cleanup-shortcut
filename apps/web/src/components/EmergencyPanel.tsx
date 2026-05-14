import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { cn } from "../lib/utils";

/**
 * EmergencyPanel — DustPan's disk-at-zero rescue screen (plan 0011, v0.21.5).
 *
 * Real-time calculation pipeline (v0.21.5 fix):
 *   • Buttons call runActionDirect() — no confirm dialog (cards already explain everything)
 *   • onDone(freed_gb) callback wires directly to the SSE "done" event in handleStream
 *   • Per-card freed counter shows actual GB recovered, not a fake timer
 *   • Session total accumulates across commands in real time
 *   • Disk bar shows live before/after delta as each command completes
 *   • Elapsed timer per command starts on click, stops on SSE done
 *
 * Data flow:
 *   click → runActionDirect → /api/run SSE → done{freed_gb} → setFreedMap + sessionTotal
 *   /api/live SSE (2s poll) → status.free_gb → disk bar updates continuously
 *   immediate: api.status() forced after each done event (in handleStream)
 */

const COMMANDS = [
  {
    id:      "emergency-deriveddata",
    num:     "①",
    label:   "Xcode Build Cache (DerivedData)",
    shell:   "rm -rf ~/Library/Developer/Xcode/DerivedData/*",
    what:    "Xcode's scratch pad — saves build work so the next build is faster.",
    happens: "One slightly slower Xcode build (~30s). Nothing else changes.",
    typical: "5–20 GB",
    readOnly: false,
  },
  {
    id:      "emergency-devicesupport",
    num:     "②",
    label:   "Xcode Device Debug Files (iOS DeviceSupport)",
    shell:   "rm -rf ~/Library/Developer/Xcode/'iOS DeviceSupport'/*",
    what:    "One folder per iPhone model per iOS version. Downloaded when you plugged in a device. Piles up for years.",
    happens: "1–2 min re-download next time you plug a device in.",
    typical: "2–8 GB",
    readOnly: false,
  },
  {
    id:      "emergency-mediaanalysisd",
    num:     "③",
    label:   "macOS Photo Recognition Cache",
    shell:   "rm -rf ~/Library/Containers/com.apple.mediaanalysisd/Data/Library/*\nrm -rf ~/Library/Containers/com.apple.mediaanalysisd/Data/tmp/*",
    what:    "The AI brain macOS builds from Photos to recognize faces and scenes. Your actual photos are untouched.",
    happens: "Face recognition re-learns in the background over a few hours.",
    typical: "2–5 GB",
    readOnly: false,
  },
  {
    id:      "emergency-documentationindex",
    num:     "④",
    label:   "Xcode Documentation Index",
    shell:   "rm -rf ~/Library/Developer/Xcode/DocumentationIndex/*",
    what:    "Xcode's searchable copy of Apple's developer docs.",
    happens: "Rebuilds in seconds next time you open the Xcode docs viewer.",
    typical: "1–5 GB",
    readOnly: false,
  },
  {
    id:      "emergency-docker-prune",
    num:     "⑤",
    label:   "Docker: Remove Unused Images & Containers",
    shell:   "docker system prune -f",
    what:    "Removes unused blueprints and stopped containers from inside Docker. Running containers are completely safe.",
    happens: "Re-pull a removed image later if needed (1–5 min).",
    typical: "2–20 GB",
    readOnly: false,
  },
  {
    id:      "emergency-find-foreign-owned",
    num:     "🔒",
    label:   "Find space locked by previous users",
    shell:   "Scans /opt/homebrew, /usr/local/Homebrew, and /Users/<old-accounts> for things owned by another user.\nReports each finding with size + the exact sudo command to recover.",
    what:    "On Macs that were used by multiple people (or migrated from another account), huge amounts of disk space can be locked behind a previous user's UID. The classic case is Homebrew installed by 'olivia' — your current account literally can't manage it. Often 5–50 GB across /opt/homebrew + old /Users/<name> dirs.",
    happens: "Nothing — this is read-only. It just tells you what's locked and gives you the exact `sudo chown` or `sudo rm` command to paste into Terminal.",
    typical: "varies",
    readOnly: true,
  },
  {
    id:      "emergency-takeover-homebrew",
    num:     "🍺",
    label:   "Get the Homebrew takeover command",
    shell:   "Prints: sudo chown -R $(whoami) /opt/homebrew",
    what:    "If /opt/homebrew is owned by someone other than you (common after a Mac migration), this prints the exact one-liner that hands ownership over. Doesn't run sudo — macOS requires the password prompt in Terminal directly.",
    happens: "Nothing runs from here — output is just the command to copy. After you paste it into Terminal and enter your Mac password, brew works under your account.",
    typical: "—",
    readOnly: true,
  },
  {
    id:       "emergency-check-disk",
    num:      "⑥",
    label:    "Check Disk Space Right Now",
    shell:    "df -h /",
    what:     "Shows exactly how full your disk is. Nothing is deleted.",
    happens:  "Read-only.",
    typical:  "—",
    readOnly: true,
  },
] satisfies Array<{
  id: string; num: string; label: string; shell: string;
  what: string; happens: string; typical: string; readOnly: boolean;
}>;

// ── Types ─────────────────────────────────────────────────────────────────────

interface CardState {
  status:    "idle" | "running" | "done";
  freed_gb:  number;          // actual freed GB from SSE done event
  startedAt: number | null;   // Date.now() when started
  elapsed_s: number;          // seconds from start → done
}

// ── Hook: per-command elapsed timer ──────────────────────────────────────────

function useElapsed(startedAt: number | null, done: boolean) {
  const [elapsed, setElapsed] = useState(0);
  // Tick every second while running
  useState(() => {
    if (!startedAt || done) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(iv);
  });
  return elapsed;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EmergencyPanel() {
  const { status, runActionDirect, busy } = useDashboard();

  // Snapshot the free_gb at mount so we can show delta
  const [baselineFree] = useState(() => status?.free_gb ?? 0);

  // Per-card state: keyed by command id
  const [cards, setCards] = useState<Record<string, CardState>>(() =>
    Object.fromEntries(COMMANDS.map(c => [c.id, {
      status: "idle", freed_gb: 0, startedAt: null, elapsed_s: 0,
    }]))
  );

  // Session accumulator — sum of all freed_gb from done events
  const [sessionFreed, setSessionFreed] = useState(0);

  // Current live free space
  const free    = status?.free_gb ?? 0;
  const total   = status?.total_gb ?? 228;
  const usedPct = total > 0 ? Math.min(100, Math.round(((total - free) / total) * 100)) : 0;

  // Delta gained since panel opened (from live status, NOT from done events — truth source)
  const liveDelta = Math.max(0, free - baselineFree);

  const freeLabel = free < 1
    ? `${Math.round(free * 1024)} MB`
    : `${free.toFixed(1)} GB`;

  const allCleanupDone = COMMANDS
    .filter(c => !c.readOnly)
    .every(c => cards[c.id]?.status === "done");

  // ── Handlers ────────────────────────────────────────────────────────────────

  const runOne = useCallback((cmd: typeof COMMANDS[number]) => {
    if (busy || cards[cmd.id]?.status !== "idle") return;

    setCards(prev => ({
      ...prev,
      [cmd.id]: { ...prev[cmd.id], status: "running", startedAt: Date.now() },
    }));

    runActionDirect(
      "emergency",
      cmd.id,
      cmd.label,
      (freed_gb) => {
        // This fires from the actual SSE "done" event — not a setTimeout
        const elapsed = Math.floor((Date.now() - (cards[cmd.id]?.startedAt ?? Date.now())) / 1000);
        setCards(prev => ({
          ...prev,
          [cmd.id]: { status: "done", freed_gb, startedAt: prev[cmd.id]?.startedAt ?? null, elapsed_s: elapsed },
        }));
        setSessionFreed(prev => prev + freed_gb);
      },
    );
  }, [busy, cards, runActionDirect]);

  const runAll = useCallback(() => {
    if (busy) return;
    // Mark all cleanup commands as running, then fire the combined action
    const now = Date.now();
    setCards(prev => {
      const next = { ...prev };
      for (const c of COMMANDS) {
        if (!c.readOnly && next[c.id].status === "idle") {
          next[c.id] = { ...next[c.id], status: "running", startedAt: now };
        }
      }
      return next;
    });
    runActionDirect(
      "emergency",
      "emergency-run-all",
      "Run All Emergency Commands",
      (freed_gb) => {
        const elapsed = Math.floor((Date.now() - now) / 1000);
        setCards(prev => {
          const next = { ...prev };
          for (const c of COMMANDS) {
            if (!c.readOnly) {
              next[c.id] = { status: "done", freed_gb: 0, startedAt: now, elapsed_s: elapsed };
            }
          }
          return next;
        });
        setSessionFreed(freed_gb);
      },
    );
  }, [busy, runActionDirect]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header: alarm state + live disk metrics ── */}
      <div className={cn(
        "rounded-lg border p-5",
        free < 1
          ? "border-danger/40 bg-[hsl(var(--danger)/0.07)]"
          : "border-warn/40 bg-[hsl(var(--warn)/0.07)]",
      )}>

        {/* Title row */}
        <div className="flex items-start gap-3 mb-4">
          <span className="text-[22px] mt-0.5" aria-hidden>{free < 1 ? "🚨" : "⚠️"}</span>
          <div className="flex-1">
            <div className={cn(
              "text-[14px] font-bold",
              free < 1 ? "text-danger" : "text-warn",
            )}>
              {free < 1 ? "Disk at absolute zero" : "Disk critically low"}
            </div>
            <div className="text-[12px] text-fg-dim mt-0.5">
              Each button below streams live output to the terminal. No confirm dialogs — the cards explain exactly what runs.
            </div>
          </div>
        </div>

        {/* ── Live metrics row ── */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <MetricCell
            label="Free right now"
            value={freeLabel}
            sub={`${usedPct}% used`}
            highlight={free < 1 ? "danger" : free < 10 ? "warn" : "safe"}
          />
          <MetricCell
            label="Freed this session"
            value={liveDelta > 0 ? `+${liveDelta.toFixed(1)} GB` : "—"}
            sub={sessionFreed > 0 ? `${sessionFreed.toFixed(1)} GB across ${Object.values(cards).filter(c => c.status === "done").length} commands` : "run a command below"}
            highlight={liveDelta > 0 ? "safe" : "dim"}
          />
          <MetricCell
            label="Commands done"
            value={`${Object.values(cards).filter(c => c.status === "done").length} / ${COMMANDS.length}`}
            sub={allCleanupDone ? "all cleanup done" : "tap ▶ Run this below"}
            highlight={allCleanupDone ? "safe" : "dim"}
          />
        </div>

        {/* ── Animated disk bar — shows live free% ── */}
        <div className="mb-1">
          <div className="flex justify-between text-[10px] text-fg-faint mb-1">
            <span>Used: {(total - free).toFixed(1)} GB</span>
            <span>Total: {total.toFixed(0)} GB</span>
          </div>
          <div className="relative h-[8px] rounded-full overflow-hidden"
            style={{ background: "hsl(var(--border)/0.18)" }}>
            {/* Freed delta overlay — shows what was recovered */}
            {liveDelta > 0 && (
              <motion.div
                className="absolute top-0 right-0 h-full bg-safe/40 rounded-r-full"
                initial={{ width: 0 }}
                animate={{ width: `${(liveDelta / total) * 100}%` }}
                transition={{ type: "spring", stiffness: 60, damping: 18 }}
              />
            )}
            {/* Used bar */}
            <motion.div
              className={cn(
                "h-full rounded-full",
                free < 1 ? "bg-danger animate-pulse" : free < 10 ? "bg-warn" : "bg-fg-faint",
              )}
              animate={{ width: `${usedPct}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 20 }}
            />
          </div>
          {liveDelta > 0 && (
            <div className="text-[10px] text-safe mt-1 text-right">
              ↑ +{liveDelta.toFixed(1)} GB recovered
            </div>
          )}
        </div>

        {/* ── Run All button ── */}
        <div className="mt-4">
          <button
            type="button"
            disabled={busy || allCleanupDone}
            onClick={runAll}
            className={cn(
              "w-full rounded-md border px-4 py-2.5 text-[13px] font-bold transition-all",
              allCleanupDone
                ? "border-safe/30 bg-[hsl(var(--safe)/0.1)] text-safe cursor-default"
                : "border-danger/40 bg-danger text-white hover:bg-[hsl(var(--danger)/0.85)] disabled:opacity-40 shadow-[0_2px_12px_hsl(var(--danger)/0.3)]",
            )}
          >
            {allCleanupDone
              ? `✓ All done — ${liveDelta.toFixed(1)} GB recovered`
              : busy
                ? "Running… (output streaming below)"
                : "▶▶ Run All Emergency Commands Now"}
          </button>
          {!allCleanupDone && !busy && (
            <p className="text-[11px] text-fg-faint mt-1.5 text-center">
              Or run each command one at a time below — output streams live to the terminal.
            </p>
          )}
        </div>
      </div>

      {/* ── Command cards ── */}
      <div className="flex flex-col gap-3">
        {COMMANDS.map((cmd, idx) => {
          const card = cards[cmd.id] ?? { status: "idle", freed_gb: 0, startedAt: null, elapsed_s: 0 };
          return (
            <CommandCard
              key={cmd.id}
              cmd={cmd}
              card={card}
              idx={idx}
              busy={busy}
              onRun={() => runOne(cmd)}
            />
          );
        })}
      </div>

      <div className="text-center text-[11px] text-fg-faint pb-2">
        Freed GB per card comes from the live shell exit — not an estimate.
        The disk bar updates within 100ms of each command completing.
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCell({
  label, value, sub, highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight: "danger" | "warn" | "safe" | "dim";
}) {
  const valCls = {
    danger: "text-danger",
    warn:   "text-warn",
    safe:   "text-safe",
    dim:    "text-fg-dim",
  }[highlight];

  return (
    <div className="rounded-md border border-border/15 bg-[hsl(var(--bg-2)/0.6)] px-3 py-2.5">
      <div className="text-[10px] text-fg-faint uppercase tracking-[0.06em] mb-1">{label}</div>
      <div className={cn("text-[15px] font-bold tabular-nums", valCls)}>{value}</div>
      <div className="text-[10px] text-fg-faint mt-0.5 leading-tight">{sub}</div>
    </div>
  );
}

function CommandCard({
  cmd, card, idx, busy, onRun,
}: {
  cmd: typeof COMMANDS[number];
  card: CardState;
  idx: number;
  busy: boolean;
  onRun: () => void;
}) {
  const running = card.status === "running";
  const done    = card.status === "done";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.22 }}
      className={cn(
        "rounded-lg border p-4 transition-colors duration-300",
        done    ? "border-safe/30 bg-[hsl(var(--safe)/0.05)]" :
        running ? "border-accent/25 bg-[hsl(var(--accent)/0.04)]" :
                  "border-border/20 bg-[hsl(var(--bg-2)/0.55)]",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Number badge */}
        <div className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-[13px] font-bold mt-0.5",
          done    ? "border-safe/40 text-safe" :
          running ? "border-accent/40 text-accent animate-pulse" :
                    "border-border/30 text-fg-dim",
        )}>
          {done ? "✓" : cmd.num}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + typical + readOnly badge */}
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

          {/* What / what happens */}
          <p className="text-[12px] text-fg-dim leading-[1.6] m-0 mb-1">
            <strong className="font-semibold text-fg">What is this?</strong>{" "}
            {cmd.what}
          </p>
          <p className="text-[12px] text-fg-dim leading-[1.6] m-0 mb-3">
            <strong className="font-semibold text-fg">If you delete it:</strong>{" "}
            {cmd.happens}
          </p>

          {/* Shell preview */}
          <div className="mb-3 rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.8)] px-3 py-2 font-mono text-[11px] text-fg-dim whitespace-pre-wrap">
            {cmd.shell}
          </div>

          {/* Bottom row: button + real-time result */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              disabled={busy || done}
              onClick={onRun}
              className={cn(
                "rounded-md border px-4 py-1.5 text-[12px] font-semibold transition-all",
                done
                  ? "border-safe/30 bg-[hsl(var(--safe)/0.1)] text-safe cursor-default"
                  : running
                    ? "border-accent/30 bg-[hsl(var(--accent)/0.08)] text-accent cursor-default"
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

            {/* Real-time result — only from actual SSE done event */}
            <AnimatePresence>
              {done && card.freed_gb > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-[13px] font-bold text-safe tabular-nums">
                    +{card.freed_gb.toFixed(1)} GB freed
                  </span>
                  {card.elapsed_s > 0 && (
                    <span className="text-[11px] text-fg-faint">
                      in {card.elapsed_s}s
                    </span>
                  )}
                </motion.div>
              )}
              {done && card.freed_gb === 0 && card.status === "done" && !cmd.readOnly && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px] text-fg-faint"
                >
                  (already empty or OS not yet flushed)
                </motion.span>
              )}
            </AnimatePresence>

            {/* Elapsed timer while running */}
            {running && card.startedAt && (
              <RunningTimer startedAt={card.startedAt} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Live elapsed timer — ticks every second, stops when parent sets done */
function RunningTimer({ startedAt }: { startedAt: number }) {
  const [secs, setSecs] = useState(0);
  // Use a ref-based interval that updates state
  useState(() => {
    const iv = setInterval(() => {
      setSecs(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  });
  return (
    <span className="text-[11px] text-fg-faint tabular-nums">{secs}s elapsed</span>
  );
}
