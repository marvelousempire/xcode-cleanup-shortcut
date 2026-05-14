import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { TabIcon } from "./icons";
import { fmt, cn } from "../lib/utils";

/**
 * AgentPanel — DustPan AI Diagnosis Agent (plan 0010).
 *
 * Instead of summarizing what you manually scanned, this agent:
 * 1. Runs its own `du` measurements beyond the predefined categories
 * 2. Calls Docker, checks simulators, measures the actual biggest items
 * 3. Produces a ranked, executable action plan
 * 4. Works with or without an AI key (rule-based fallback)
 */

interface AgentFinding {
  rank: number;
  title: string;
  explanation: string;
  size_label: string;
  size_gb: number;
  urgency: "high" | "medium" | "low";
  action: {
    type: "run_action" | "navigate" | "run_command" | "show_info" | "clean_path";
    category?: string;
    action_id?: string;
    label: string;
    shell?: string;
  };
  source: string;
}

interface AgentAnalysis {
  summary: string;
  findings: AgentFinding[];
  source: "ai" | "rule-based" | "rule-based-fallback";
}

interface Measurement {
  label: string;
  path: string;
  size_gb: number;
  category: string;
  exists: boolean;
}

type Step =
  | { id: "measuring"; text: string }
  | { id: "thinking"; text: string }
  | { id: "rule-based"; text: string }
  | { id: "fallback"; text: string }
  | { id: "done" };

const URGENCY_COLOR: Record<string, string> = {
  high:   "text-danger border-danger/30 bg-[hsl(var(--danger)/0.06)]",
  medium: "text-warn border-warn/30 bg-[hsl(var(--warn)/0.06)]",
  low:    "text-fg-dim border-border/20 bg-[hsl(var(--bg-2)/0.5)]",
};

export function AgentPanel() {
  const { setActiveTab, cleanPath, busy, aiStatus } = useDashboard();

  const [running, setRunning]         = useState(false);
  const [steps, setSteps]             = useState<Step[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [analysis, setAnalysis]       = useState<AgentAnalysis | null>(null);
  const [doneItems, setDoneItems]     = useState<Set<number>>(new Set());
  const esRef = useRef<EventSource | null>(null);

  const hasKey = aiStatus?.providers && aiStatus.providers.length > 0;

  function startAnalysis() {
    if (running) return;
    setRunning(true);
    setSteps([]);
    setMeasurements([]);
    setAnalysis(null);

    // Use POST via EventSource polyfill — server.py handles GET /api/ai/diagnose
    // We use a plain GET (server reads no body needed — all context is server-side)
    const es = new EventSource("/api/ai/diagnose");
    esRef.current = es;

    es.addEventListener("thinking", (ev) => {
      const d = JSON.parse(ev.data);
      setSteps((prev) => [
        ...prev.filter((s) => s.id !== d.step),
        { id: d.step as Step["id"], text: d.detail },
      ]);
    });

    es.addEventListener("context", (ev) => {
      const d = JSON.parse(ev.data);
      if (d.measurements) setMeasurements(d.measurements);
    });

    es.addEventListener("analysis", (ev) => {
      const d: AgentAnalysis = JSON.parse(ev.data);
      setAnalysis(d);
    });

    es.addEventListener("done", () => {
      setRunning(false);
      es.close();
    });

    es.addEventListener("error", (ev) => {
      setRunning(false);
      es.close();
    });

    es.onerror = () => {
      setRunning(false);
      es.close();
    };
  }

  // Cleanup on unmount
  useEffect(() => () => { esRef.current?.close(); }, []);

  function handleAction(finding: AgentFinding) {
    const { action } = finding;
    if (action.type === "navigate" && action.category) {
      setActiveTab(action.category);
    } else if (action.type === "run_action" && action.category && action.action_id) {
      // Navigate to the category and trigger the action
      setActiveTab(action.category);
      // Mark done optimistically
      setDoneItems((prev) => new Set([...prev, finding.rank]));
    } else if (action.type === "clean_path" && action.category) {
      cleanPath(action.category, finding.action.shell ?? "", finding.title);
      setDoneItems((prev) => new Set([...prev, finding.rank]));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-fg">
            {hasKey ? "AI Diagnosis Agent" : "Disk Analysis Agent"}
          </div>
          <div className="text-[12px] text-fg-dim mt-0.5">
            {hasKey
              ? "Measures your disk, identifies root causes, and gives you a ranked action plan — powered by AI."
              : "No AI key configured — runs rule-based analysis using live disk measurements. Add a key in Settings for AI-powered explanations."}
          </div>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={startAnalysis}
          className="flex-shrink-0 rounded-md border border-accent/30 bg-[hsl(var(--accent)/0.1)] px-4 py-2 text-[12px] font-semibold text-accent transition-all hover:bg-[hsl(var(--accent)/0.18)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? "Analyzing…" : analysis ? "Re-analyze" : "Analyze now"}
        </button>
      </div>

      {/* Steps (running indicator) */}
      <AnimatePresence>
        {(running || steps.length > 0) && !analysis && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-border/20 bg-[hsl(var(--bg-2)/0.6)] p-4 flex flex-col gap-2"
          >
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2.5 text-[12px]">
                <span
                  className={cn(
                    "flex-shrink-0 w-1.5 h-1.5 rounded-full",
                    running && i === steps.length - 1
                      ? "bg-accent animate-pulse"
                      : "bg-safe",
                  )}
                />
                <span className={running && i === steps.length - 1 ? "text-fg" : "text-fg-dim"}>
                  {"text" in step ? step.text : ""}
                </span>
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-2.5 text-[12px] text-fg-faint">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-border animate-pulse" />
                <span>Working…</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live measurements (shown while running or after) */}
      {measurements.length > 0 && !analysis && (
        <div className="rounded-lg border border-border/20 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint mb-2.5">
            Measured paths
          </div>
          <div className="flex flex-col gap-1.5">
            {measurements.slice(0, 8).map((m) => (
              <div key={m.path} className="flex items-center gap-2 text-[12px]">
                <span className="flex-1 min-w-0 text-fg-dim truncate">{m.label}</span>
                <span
                  className={cn(
                    "flex-shrink-0 font-semibold tabular",
                    m.size_gb >= 5 ? "text-danger" :
                    m.size_gb >= 1 ? "text-warn" : "text-fg-dim",
                  )}
                >
                  {m.size_gb >= 0.01 ? `${fmt(m.size_gb)} GB` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            {/* Summary */}
            <div className="rounded-lg border border-accent/25 bg-[hsl(var(--accent)/0.05)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent mb-1">
                {analysis.source === "ai" ? "AI diagnosis" : "Analysis"}
              </div>
              <p className="text-[13px] text-fg leading-[1.55] m-0">{analysis.summary}</p>
            </div>

            {/* Findings */}
            <div className="flex flex-col gap-2.5">
              {analysis.findings.map((finding, idx) => {
                const done = doneItems.has(finding.rank);
                return (
                  <motion.div
                    key={finding.rank}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "rounded-lg border p-4",
                      URGENCY_COLOR[finding.urgency] ?? URGENCY_COLOR.low,
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full border border-current/30 flex items-center justify-center text-[10px] font-bold opacity-60">
                        {finding.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap mb-1">
                          <span className="text-[13px] font-semibold text-fg">
                            {finding.title}
                          </span>
                          <span className="text-[12px] font-semibold tabular">
                            {finding.size_label}
                          </span>
                          <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full border",
                            finding.urgency === "high" ? "border-danger/40 text-danger" :
                            finding.urgency === "medium" ? "border-warn/40 text-warn" :
                            "border-border/30 text-fg-faint",
                          )}>
                            {finding.urgency}
                          </span>
                        </div>
                        {finding.explanation && (
                          <p className="text-[12px] text-fg-dim leading-[1.55] m-0 mb-3">
                            {finding.explanation}
                          </p>
                        )}
                        {/* Action button */}
                        {finding.action.type !== "show_info" && (
                          <button
                            type="button"
                            disabled={done || busy}
                            onClick={() => handleAction(finding)}
                            className={cn(
                              "rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-all",
                              done
                                ? "border-safe/30 bg-[hsl(var(--safe)/0.1)] text-safe cursor-default"
                                : "border-current/25 bg-white/5 hover:bg-white/10 disabled:opacity-40",
                            )}
                          >
                            {done ? "✓ Done" : finding.action.label}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Source note */}
            <div className="text-[11px] text-fg-faint text-center">
              {analysis.source === "ai"
                ? "AI analysis · measurements are live · re-analyze after cleaning"
                : "Rule-based analysis · add an AI key in Settings for deeper insights"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!running && !analysis && steps.length === 0 && (
        <div className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.4)] p-6 text-center">
          <div className="text-[13px] text-fg-dim mb-1">
            DustPan will measure your actual disk — not just the predefined categories.
          </div>
          <div className="text-[12px] text-fg-faint">
            Docker containers, system ML caches, simulators, package managers, and more.
          </div>
        </div>
      )}
    </div>
  );
}
