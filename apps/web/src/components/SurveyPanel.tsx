import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { streamSSE } from "../lib/api";
import { useDashboard } from "../state/DashboardContext";
import { cn } from "../lib/utils";

/**
 * SurveyPanel — SADPA's comprehensive live-streaming disk space survey (plan 0022).
 *
 * Goes beyond predefined categories: dynamically crawls the filesystem for:
 *   - Known high-value paths (Docker.raw, DerivedData, DeviceSupport, Cursor, pnpm, npm, brew…)
 *   - Claude Code worktrees (.claude/worktrees/) across all projects
 *   - Stale build artifacts (.next, .next-local, dist) in ~/Developer
 *   - Large node_modules (> 500 MB) outside predefined paths
 *
 * Real-time: targets appear as they're found (SSE stream from /api/survey).
 * No predefined-scan dependency — works even if you've never clicked "Scan" anywhere.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SurveyTarget {
  id:                 string;
  label:              string;
  path:               string;
  size_gb:            number;
  category:           string;
  confidence:         "easy" | "check_first" | "caution" | "takeover";
  confidence_label:   string;
  notes:              string;
  action?:            string;
  action_id?:         string;
  rebuild:            string;
  source:             "known" | "dynamic";
  /** Worktree-specific: per-sub-dir breakdown */
  sub_worktrees?:     Array<{ name: string; size_gb: number; merged: boolean }>;
  merged_count?:      number;
  /** Foreign-ownership-specific (plan 0024) */
  owner?:             string;
  owner_uid?:         number;
  owner_exists?:      boolean;
  takeover_command?:  string;
}

interface NotWorthItItem {
  id:      string;
  label:   string;
  path:    string;
  size_gb: number;
  why:     string;
}

interface SurveyDone {
  targets:        SurveyTarget[];
  not_worth_it:   NotWorthItItem[];
  total_gb:       number;
  free_gb:        number;
  total_gb_disk:  number;
  elapsed_s:      number;
  target_count:   number;
}

type Phase =
  | "idle"
  | "running"
  | "done";

const CONFIDENCE_CONFIG = {
  easy: {
    label: "Easy",
    desc:  "Safe to delete — rebuilds automatically",
    cls:   "border-safe/30 bg-[hsl(var(--safe)/0.1)] text-safe",
    dot:   "bg-safe",
  },
  check_first: {
    label: "Check first",
    desc:  "Verify you don't need this before deleting",
    cls:   "border-warn/30 bg-[hsl(var(--warn)/0.1)] text-warn",
    dot:   "bg-warn",
  },
  caution: {
    label: "Caution",
    desc:  "Use the specific tool — do not delete directly",
    cls:   "border-danger/30 bg-[hsl(var(--danger)/0.1)] text-danger",
    dot:   "bg-danger",
  },
  takeover: {
    label: "Takeover",
    desc:  "Locked by a previous user — needs sudo password in Terminal",
    cls:   "border-accent/40 bg-[hsl(var(--accent)/0.12)] text-accent-strong",
    dot:   "bg-accent",
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function SurveyPanel() {
  const { status, setActiveTab } = useDashboard();

  const [phase,       setPhase]       = useState<Phase>("idle");
  const [targets,     setTargets]     = useState<SurveyTarget[]>([]);
  const [notWorthIt,  setNotWorthIt]  = useState<NotWorthItItem[]>([]);
  const [progress,    setProgress]    = useState("");
  const [elapsed,     setElapsed]     = useState(0);
  const [doneData,    setDoneData]    = useState<SurveyDone | null>(null);
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const esRef   = useRef<ReturnType<typeof streamSSE> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  // ── Start survey ──────────────────────────────────────────────────────────

  const startSurvey = useCallback(() => {
    // Reset
    setTargets([]);
    setNotWorthIt([]);
    setProgress("Starting…");
    setDoneData(null);
    setExpanded(null);
    setElapsed(0);
    setPhase("running");
    startRef.current = Date.now();

    // Elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    esRef.current = streamSSE(
      "/api/survey",
      (msg) => {
        if (msg.event === "progress") {
          setProgress((msg.data as { msg: string }).msg ?? "");
        } else if (msg.event === "target") {
          const t = msg.data as SurveyTarget;
          setTargets(prev => {
            const next = [...prev, t];
            next.sort((a, b) => b.size_gb - a.size_gb);
            return next;
          });
        } else if (msg.event === "not_worth_it") {
          setNotWorthIt(msg.data as NotWorthItItem[]);
        } else if (msg.event === "done") {
          clearInterval(timerRef.current!);
          setDoneData(msg.data as SurveyDone);
          setNotWorthIt((msg.data as SurveyDone).not_worth_it ?? []);
          setProgress("Complete");
          setPhase("done");
        }
      },
      () => {
        clearInterval(timerRef.current!);
        setProgress("Connection lost — try again");
        setPhase("idle");
      },
    );
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const free      = status?.free_gb ?? 0;
  const total     = status?.total_gb ?? 228;
  const usedPct   = total > 0 ? Math.min(100, Math.round(((total - free) / total) * 100)) : 0;
  const freeLabel = free < 1 ? `${Math.round(free * 1024)} MB` : `${free.toFixed(1)} GB`;

  const totalFound = targets.reduce((s, t) => s + t.size_gb, 0);

  // Split easy vs needs-review for recommended order
  const easyTargets      = targets.filter(t => t.confidence === "easy");
  const reviewTargets    = targets.filter(t => t.confidence !== "easy" && t.confidence !== "takeover");
  const takeoverTargets  = targets.filter(t => t.confidence === "takeover");
  const takeoverTotalGb  = takeoverTargets.reduce((s, t) => s + t.size_gb, 0);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="rounded-lg border border-border/20 bg-[hsl(var(--bg-2)/0.6)] p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-[22px] mt-0.5" aria-hidden>📊</span>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-fg">Space Survey</div>
            <div className="text-[12px] text-fg-dim mt-0.5">
              Crawls your entire filesystem — not just predefined categories. Finds worktrees,
              stale builds, large caches, and anything else taking space across all your projects.
            </div>
          </div>
        </div>

        {/* Disk status row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <MetricTile label="Free" value={freeLabel} sub={`${usedPct}% used`}
            cls={free < 1 ? "text-danger" : free < 10 ? "text-warn" : "text-fg"} />
          <MetricTile label="Found so far" value={totalFound > 0 ? `${totalFound.toFixed(1)} GB` : "—"}
            sub={`${targets.length} target${targets.length !== 1 ? "s" : ""}`}
            cls={totalFound > 5 ? "text-warn" : "text-fg"} />
          <MetricTile label="Status"
            value={phase === "running" ? `${elapsed}s` : phase === "done" ? `${doneData?.elapsed_s ?? 0}s` : "—"}
            sub={phase === "running" ? progress : phase === "done" ? `${doneData?.target_count} targets found` : "not started"}
            cls="text-fg-dim" />
        </div>

        {/* Disk bar */}
        <div className="h-[6px] rounded-full overflow-hidden mb-4"
          style={{ background: "hsl(var(--border)/0.18)" }}>
          <motion.div
            className={cn("h-full rounded-full",
              free < 1 ? "bg-danger animate-pulse" : free < 10 ? "bg-warn" : "bg-fg-faint")}
            animate={{ width: `${usedPct}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
          />
        </div>

        {/* CTA */}
        {phase === "idle" && (
          <button type="button" onClick={startSurvey}
            className="w-full rounded-md border border-accent/30 bg-[hsl(var(--accent)/0.1)] text-accent hover:bg-[hsl(var(--accent)/0.2)] px-4 py-2.5 text-[13px] font-bold transition-all">
            🔍 Start Full Space Survey
          </button>
        )}
        {phase === "running" && (
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-md border border-border/20 bg-[hsl(var(--bg-1)/0.6)] px-3 py-2 text-[12px] text-fg-dim">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse mr-2" />
              {progress || "Scanning…"}
            </div>
            <button type="button"
              onClick={() => { esRef.current?.close?.(); clearInterval(timerRef.current!); setPhase("done"); }}
              className="rounded-md border border-border/20 px-3 py-2 text-[12px] text-fg-dim hover:text-fg transition-colors">
              Stop
            </button>
          </div>
        )}
        {phase === "done" && (
          <button type="button" onClick={startSurvey}
            className="w-full rounded-md border border-border/20 bg-[hsl(var(--bg-1)/0.5)] text-fg-dim hover:text-fg hover:bg-[hsl(var(--bg-3)/0.5)] px-4 py-2 text-[12px] font-semibold transition-all">
            ↺ Re-scan
          </button>
        )}
      </div>

      {/* ── 🔒 Locked by previous users — prominent above everything else ── */}
      <AnimatePresence>
        {takeoverTargets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border-2 border-accent/40 bg-[hsl(var(--accent)/0.06)] p-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-[22px] mt-0.5" aria-hidden>🔒</span>
              <div className="flex-1">
                <div className="text-[14px] font-bold text-accent-strong">
                  Locked by previous users — {takeoverTotalGb.toFixed(1)} GB recoverable
                </div>
                <div className="text-[12px] text-fg-dim mt-0.5 leading-[1.6]">
                  Disk space owned by user accounts that aren't yours. DustPan can't
                  touch this — macOS file permissions protect it — but each one can be
                  unlocked with a single Terminal command. Tap a card below for the
                  exact command and what it does.
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {takeoverTargets.map((t, idx) => (
                <TakeoverCard key={t.id} target={t} rank={idx + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Recommended order — shown after done ── */}
      <AnimatePresence>
        {phase === "done" && targets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-safe/25 bg-[hsl(var(--safe)/0.04)] p-4"
          >
            <div className="text-[13px] font-bold text-fg mb-3">
              ✅ Recommended cleanup order — biggest wins, lowest risk first
            </div>
            <ol className="flex flex-col gap-1.5">
              {easyTargets.slice(0, 6).map((t, i) => (
                <li key={t.id} className="flex items-start gap-2 text-[12px]">
                  <span className="text-fg-faint tabular-nums mt-0.5 w-5 flex-shrink-0">{i + 1}.</span>
                  <div>
                    <span className="font-semibold text-fg">{t.label}</span>
                    <span className="text-fg-faint ml-2">{t.size_gb.toFixed(1)} GB</span>
                    {t.action_id && (
                      <button type="button"
                        onClick={() => setActiveTab("emergency")}
                        className="ml-2 text-accent text-[11px] hover:underline">
                        → Emergency panel
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {reviewTargets.length > 0 && (
                <>
                  <li className="text-[11px] text-fg-faint mt-1 ml-7">
                    Then, after reviewing:
                  </li>
                  {reviewTargets.slice(0, 3).map((t, i) => (
                    <li key={t.id} className="flex items-start gap-2 text-[12px] ml-5">
                      <span className="text-fg-faint tabular-nums mt-0.5 w-5 flex-shrink-0">
                        {easyTargets.slice(0, 6).length + i + 1}.
                      </span>
                      <div>
                        <span className="font-semibold text-fg">{t.label}</span>
                        <span className="text-fg-faint ml-2">{t.size_gb.toFixed(1)} GB</span>
                      </div>
                    </li>
                  ))}
                </>
              )}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Live target table ── */}
      <AnimatePresence>
        {targets.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-faint">
                Targets found — ranked by size
              </div>
              {phase === "running" && (
                <div className="text-[11px] text-fg-faint animate-pulse">
                  {targets.length} so far…
                </div>
              )}
            </div>

            {targets.filter(t => t.confidence !== "takeover").map((t, idx) => (
              <SurveyTargetCard
                key={t.id}
                target={t}
                rank={idx + 1}
                expanded={expanded === t.id}
                onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
                onGoToCategory={() => setActiveTab(t.category)}
                onGoToEmergency={() => setActiveTab("emergency")}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* ── Empty state ── */}
      {phase === "idle" && targets.length === 0 && (
        <div className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.4)] p-8 text-center">
          <div className="text-[32px] mb-3">🔍</div>
          <div className="text-[13px] font-semibold text-fg mb-1">
            Nothing scanned yet
          </div>
          <div className="text-[12px] text-fg-dim max-w-sm mx-auto">
            Hit "Start Full Space Survey" above. The scanner crawls every known cache location
            AND searches your developer folders for worktrees, build artifacts, and oversized
            node_modules. Takes 15–45 seconds. Results appear live as found.
          </div>
        </div>
      )}

      {/* ── "Probably not worth touching" section ── */}
      <AnimatePresence>
        {phase === "done" && notWorthIt.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-border/20 bg-[hsl(var(--bg-2)/0.4)] p-4"
          >
            <div className="text-[13px] font-bold text-fg mb-1">
              🚫 Probably not worth touching
            </div>
            <div className="text-[11px] text-fg-dim mb-3">
              These look big but macOS rebuilds them automatically — you'd get the space back
              temporarily then lose it again as the OS re-populates. Not worth the churn.
            </div>
            <div className="flex flex-col gap-2.5">
              {notWorthIt.map(item => (
                <div key={item.id}
                  className="rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.6)] p-3">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[12px] font-semibold text-fg">{item.label}</span>
                    <span className="text-[11px] text-fg-faint tabular-nums">{item.size_gb.toFixed(1)} GB</span>
                  </div>
                  <p className="text-[11px] text-fg-dim leading-[1.6] m-0">{item.why}</p>
                  <div className="text-[10px] text-fg-faint font-mono mt-1.5 break-all">{item.path}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confidence legend */}
      {phase === "done" && targets.length > 0 && (
        <div className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.4)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-faint mb-2">
            Confidence key
          </div>
          <div className="flex flex-col gap-1.5">
            {(Object.entries(CONFIDENCE_CONFIG) as Array<[keyof typeof CONFIDENCE_CONFIG, typeof CONFIDENCE_CONFIG[keyof typeof CONFIDENCE_CONFIG]]>).map(([key, cfg]) => (
              <div key={key} className="flex items-start gap-2">
                <div className={cn("w-2 h-2 rounded-full mt-1 flex-shrink-0", cfg.dot)} />
                <div>
                  <span className="text-[11px] font-semibold text-fg">{cfg.label} — </span>
                  <span className="text-[11px] text-fg-dim">{cfg.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricTile({ label, value, sub, cls }: {
  label: string; value: string; sub: string; cls: string;
}) {
  return (
    <div className="rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.7)] px-3 py-2.5">
      <div className="text-[10px] text-fg-faint uppercase tracking-[0.06em] mb-1">{label}</div>
      <div className={cn("text-[14px] font-bold tabular-nums", cls)}>{value}</div>
      <div className="text-[10px] text-fg-faint mt-0.5 leading-tight">{sub}</div>
    </div>
  );
}

function SurveyTargetCard({
  target, rank, expanded, onToggle, onGoToCategory, onGoToEmergency,
}: {
  target:           SurveyTarget;
  rank:             number;
  expanded:         boolean;
  onToggle:         () => void;
  onGoToCategory:   () => void;
  onGoToEmergency:  () => void;
}) {
  const cfg = CONFIDENCE_CONFIG[target.confidence];
  const sizeStr = target.size_gb >= 10
    ? `${Math.round(target.size_gb)} GB`
    : `${target.size_gb.toFixed(1)} GB`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-lg border transition-colors",
        expanded ? "border-border/30" : "border-border/15",
        "bg-[hsl(var(--bg-2)/0.55)]",
      )}
    >
      {/* Summary row — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {/* Rank */}
        <span className="text-[12px] text-fg-faint tabular-nums w-5 flex-shrink-0">
          {rank}
        </span>

        {/* Size badge */}
        <div className={cn(
          "flex-shrink-0 text-[12px] font-bold tabular-nums w-14 text-right",
          target.size_gb > 10 ? "text-danger" :
          target.size_gb > 3  ? "text-warn"   : "text-fg-dim",
        )}>
          {sizeStr}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-fg truncate">{target.label}</div>
          <div className="text-[11px] text-fg-faint truncate">{target.path}</div>
        </div>

        {/* Confidence badge */}
        <div className={cn(
          "flex-shrink-0 text-[10px] font-semibold uppercase tracking-[0.05em] px-2 py-0.5 rounded-full border",
          cfg.cls,
        )}>
          {cfg.label}
        </div>

        {/* Source badge */}
        {target.source === "dynamic" && (
          <div className="flex-shrink-0 text-[10px] text-fg-faint border border-border/20 px-1.5 py-0.5 rounded">
            discovered
          </div>
        )}

        {/* Chevron */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          className={cn("h-4 w-4 flex-shrink-0 text-fg-faint transition-transform", expanded && "rotate-180")}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/10">
              {/* Notes */}
              <p className="text-[12px] text-fg-dim leading-[1.7] mb-3 whitespace-pre-line">{target.notes}</p>

              {/* Sub-worktree breakdown — shown when available */}
              {target.sub_worktrees && target.sub_worktrees.length > 0 && (
                <div className="mb-3">
                  <div className="text-[11px] font-semibold text-fg-dim uppercase tracking-[0.05em] mb-1.5">
                    Individual worktrees
                  </div>
                  <div className="rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.7)] overflow-hidden">
                    {target.sub_worktrees.slice(0, 10).map((wt, i) => (
                      <div key={wt.name}
                        className={cn(
                          "flex items-center gap-3 px-3 py-1.5 text-[11px]",
                          i > 0 && "border-t border-border/10",
                          wt.merged ? "bg-[hsl(var(--safe)/0.04)]" : "",
                        )}>
                        <span className="flex-1 font-mono text-fg-dim truncate">{wt.name}</span>
                        <span className="tabular-nums text-fg-faint">{wt.size_gb.toFixed(1)} GB</span>
                        {wt.merged && (
                          <span className="text-[10px] font-semibold text-safe border border-safe/25 px-1.5 py-0.5 rounded-full">
                            merged ✓
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {target.merged_count !== undefined && target.merged_count > 0 && (
                    <div className="text-[11px] text-safe mt-1.5">
                      ✓ {target.merged_count} already merged into origin/main — safe to prune immediately
                    </div>
                  )}
                </div>
              )}

              {/* Rebuild cost */}
              <div className="flex items-start gap-2 mb-3">
                <span className="text-[11px] text-fg-faint mt-0.5">Cost to rebuild:</span>
                <span className="text-[11px] text-fg">{target.rebuild}</span>
              </div>

              {/* Shell command preview */}
              {target.action && (
                <div className="mb-3 rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.8)] px-3 py-2 font-mono text-[11px] text-fg-dim whitespace-pre-wrap break-all">
                  {target.action}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {target.action_id && (
                  <button type="button" onClick={onGoToEmergency}
                    className="rounded-md border border-danger/25 bg-[hsl(var(--danger)/0.08)] text-danger hover:bg-[hsl(var(--danger)/0.15)] px-3 py-1.5 text-[12px] font-semibold transition-colors">
                    → Open Emergency Rescue
                  </button>
                )}
                <button type="button" onClick={onGoToCategory}
                  className="rounded-md border border-border/20 bg-[hsl(var(--bg-3)/0.5)] text-fg-dim hover:text-fg px-3 py-1.5 text-[12px] font-semibold transition-colors">
                  → {target.category.charAt(0).toUpperCase() + target.category.slice(1)} category
                </button>
              </div>

              {/* Full path */}
              <div className="mt-3 text-[10px] text-fg-faint font-mono break-all">{target.path}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── TakeoverCard — special rendering for foreign-ownership targets (plan 0024) ──

function TakeoverCard({ target, rank }: { target: SurveyTarget; rank: number }) {
  const [copied, setCopied]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cmd = target.takeover_command ?? target.action ?? "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select-and-show
      setCopied(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-md border border-accent/30 bg-[hsl(var(--bg-2)/0.6)] overflow-hidden"
    >
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
        <span className="text-[12px] text-fg-faint tabular-nums w-5 flex-shrink-0">{rank}</span>
        <div className="flex-shrink-0 text-[13px] font-bold tabular-nums w-14 text-right text-accent-strong">
          {target.size_gb >= 10 ? `${Math.round(target.size_gb)} GB` : `${target.size_gb.toFixed(1)} GB`}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-fg truncate">{target.label}</div>
          <div className="text-[11px] text-fg-faint truncate font-mono">{target.path}</div>
        </div>
        {target.owner && (
          <div className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-[0.05em] px-2 py-0.5 rounded-full border border-accent/30 text-accent-strong">
            owner: {target.owner}{!target.owner_exists ? " (gone)" : ""}
          </div>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          className={cn("h-4 w-4 flex-shrink-0 text-fg-faint transition-transform", expanded && "rotate-180")}>
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/10">
              <p className="text-[12px] text-fg-dim leading-[1.7] mb-3 whitespace-pre-line">{target.notes}</p>

              {/* The actual command */}
              <div className="rounded-md border border-accent/25 bg-[hsl(var(--bg-1)/0.85)] overflow-hidden mb-3">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/10 bg-[hsl(var(--bg-2)/0.5)]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-faint">
                    Run this in Terminal
                  </span>
                  <button type="button" onClick={copy}
                    className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded transition-colors",
                      copied
                        ? "bg-[hsl(var(--safe)/0.15)] text-safe"
                        : "bg-[hsl(var(--accent)/0.15)] text-accent hover:bg-[hsl(var(--accent)/0.25)]",
                    )}>
                    {copied ? "✓ Copied" : "📋 Copy"}
                  </button>
                </div>
                <pre className="px-3 py-2 font-mono text-[11px] text-fg-dim whitespace-pre-wrap break-all m-0">{cmd}</pre>
              </div>

              {/* Recovery summary */}
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-1">
                <div className="rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.6)] px-2 py-1.5">
                  <div className="text-fg-faint text-[10px] uppercase tracking-[0.05em] mb-0.5">Recoverable</div>
                  <div className="font-bold text-accent-strong tabular-nums">{target.size_gb.toFixed(1)} GB</div>
                </div>
                <div className="rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.6)] px-2 py-1.5">
                  <div className="text-fg-faint text-[10px] uppercase tracking-[0.05em] mb-0.5">Cost</div>
                  <div className="text-fg-dim leading-tight">{target.rebuild}</div>
                </div>
              </div>

              <p className="text-[10px] text-fg-faint mt-2 leading-[1.5]">
                ⓘ DustPan can't run sudo commands — macOS requires you to type your password in Terminal directly.
                Copy the command, paste it into Terminal, and macOS will prompt you for your Mac password.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
