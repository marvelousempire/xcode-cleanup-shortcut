import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api, type AppleScriptEntry } from "../lib/api";
import { cn } from "../lib/utils";

/**
 * AppleScriptsPanel — Plan 0025.
 *
 * In-app surface for the AppleScript library that lives at applescripts/.
 * Until v0.27 these scripts were only discoverable by reading the repo;
 * now the dashboard lists them with per-card actions:
 *   ▶ Run          — POST /api/applescripts/<name>/run (detached osascript)
 *   📋 Copy script  — GET /api/applescripts/<name>/body  → clipboard
 *   📂 Reveal      — POST /api/applescripts/<name>/reveal (open -R in Finder)
 *   📄 View doc    — toggle inline markdown preview from /api/applescripts/<name>/doc
 *
 * SADPA can propose new scripts via propose_new_applescript (review-inbox
 * pattern). When accepted, the paste-ready artifacts land on disk and a
 * fresh entry appears here on next reload.
 */

export function AppleScriptsPanel() {
  const [entries, setEntries] = useState<AppleScriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [philosophy, setPhilosophy] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.applescripts()
      .then(r => {
        if (cancelled) return;
        setEntries(r.scripts);
        setPhilosophy(r.philosophy);
        setLoading(false);
      })
      .catch(e => {
        if (cancelled) return;
        setError(`Couldn't load the AppleScript library: ${(e as Error).message}`);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="rounded-lg border border-border/20 bg-[hsl(var(--bg-2)/0.6)] p-5">
        <div className="flex items-start gap-3">
          <span className="text-[22px] mt-0.5" aria-hidden>🍎</span>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-fg">AppleScript Library</div>
            <div className="text-[12px] text-fg-dim mt-0.5 leading-[1.6]">
              Native macOS scripts for one-tap actions — disk status dialogs, quick rescue progress bars, locked-space recovery. Every script uses <code className="font-mono">display alert</code> / <code className="font-mono">progress</code> / <code className="font-mono">display notification</code>, never <code className="font-mono">echo</code>.
            </div>
            {philosophy && (
              <p className="text-[11px] text-fg-faint mt-2 italic leading-[1.6]">
                {philosophy}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <a href="https://github.com/marvelousempire/dustpan/tree/main/applescripts"
                target="_blank" rel="noreferrer"
                className="text-accent hover:underline">📚 Library on GitHub →</a>
              <span className="text-fg-faint">·</span>
              <span className="text-fg-faint">
                Install with: <code className="font-mono text-fg-dim">make install-applescripts</code> (copies to ~/Library/Application Scripts/ for Shortcuts.app)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.4)] p-6 text-center text-[12px] text-fg-faint">
          Loading the library…
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-[hsl(var(--danger)/0.07)] p-4 text-[12px] text-danger">
          {error}
        </div>
      )}

      {/* Script cards */}
      <AnimatePresence initial={false}>
        <div className="flex flex-col gap-2.5">
          {entries.map((entry, idx) => (
            <ScriptCard
              key={entry.name}
              entry={entry}
              idx={idx}
              expanded={expanded === entry.name}
              onToggle={() => setExpanded(expanded === entry.name ? null : entry.name)}
            />
          ))}
        </div>
      </AnimatePresence>

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.4)] p-8 text-center">
          <div className="text-[26px] mb-2">🍎</div>
          <div className="text-[13px] font-semibold text-fg mb-1">Library is empty</div>
          <p className="text-[12px] text-fg-dim max-w-md mx-auto">
            No `.applescript` files found in <code className="font-mono">applescripts/</code>.
            Ask SADPA to propose one — it'll suggest a native-UI script and put the body + doc into your review inbox.
          </p>
        </div>
      )}
    </div>
  );
}

function ScriptCard({
  entry, idx, expanded, onToggle,
}: {
  entry:    AppleScriptEntry;
  idx:      number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [running, setRunning]  = useState(false);
  const [copied, setCopied]    = useState(false);
  const [docOpen, setDocOpen]  = useState(false);
  const [docBody, setDocBody]  = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const onRun = async () => {
    setRunning(true);
    try {
      await api.applescriptRun(entry.name);
      flash("▶ Launched — script's dialogs/progress appear in their own macOS window.");
    } catch (e) {
      flash(`Couldn't launch: ${(e as Error).message}`);
    } finally {
      setTimeout(() => setRunning(false), 800);
    }
  };

  const onCopy = async () => {
    try {
      const body = await api.applescriptBody(entry.name);
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      flash("📋 Script body copied to clipboard.");
    } catch (e) {
      flash(`Copy failed: ${(e as Error).message}`);
    }
  };

  const onReveal = async () => {
    try {
      await api.applescriptReveal(entry.name);
      flash("📂 Opened in Finder.");
    } catch (e) {
      flash(`Reveal failed: ${(e as Error).message}`);
    }
  };

  const onToggleDoc = async () => {
    if (!docOpen && docBody === null) {
      try {
        const body = await api.applescriptDoc(entry.name);
        setDocBody(body);
      } catch (e) {
        setDocBody(`Couldn't load doc: ${(e as Error).message}`);
      }
    }
    setDocOpen(!docOpen);
  };

  // Color-code the status
  const statusCls =
    entry.status.includes("Shipped") ? "border-safe/30 text-safe" :
    entry.status.includes("Proposed") ? "border-warn/30 text-warn" :
                                        "border-border/25 text-fg-dim";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03, duration: 0.2 }}
      className="rounded-lg border border-border/20 bg-[hsl(var(--bg-2)/0.55)] overflow-hidden"
    >
      <button type="button" onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 text-left">
        <span className="text-[16px] mt-0.5">📄</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
            <span className="text-[13px] font-semibold text-fg">{entry.title}</span>
            {entry.type && (
              <span className="text-[10px] uppercase tracking-[0.05em] text-fg-faint">{entry.type}</span>
            )}
          </div>
          <div className="text-[11px] text-fg-faint font-mono truncate">{entry.script_path}</div>
        </div>
        {entry.status && (
          <span className={cn(
            "flex-shrink-0 text-[10px] font-semibold uppercase tracking-[0.05em] px-2 py-0.5 rounded-full border",
            statusCls,
          )}>
            {entry.status.length > 28 ? entry.status.slice(0, 26) + "…" : entry.status}
          </span>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          className={cn("h-4 w-4 flex-shrink-0 text-fg-faint transition-transform mt-1", expanded && "rotate-180")}>
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/10"
          >
            <div className="p-4 flex flex-col gap-3">
              {entry.intent && (
                <p className="text-[12px] text-fg-dim leading-[1.7] m-0">{entry.intent}</p>
              )}

              {/* Per-card action buttons */}
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={onRun} disabled={running}
                  className="rounded-md border border-accent/30 bg-[hsl(var(--accent)/0.1)] text-accent hover:bg-[hsl(var(--accent)/0.2)] disabled:opacity-50 px-3 py-1.5 text-[12px] font-semibold transition-colors">
                  {running ? "Launching…" : "▶ Run this script"}
                </button>
                <button type="button" onClick={onCopy}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                    copied
                      ? "border-safe/30 bg-[hsl(var(--safe)/0.1)] text-safe"
                      : "border-border/25 bg-[hsl(var(--bg-3)/0.5)] text-fg-dim hover:text-fg",
                  )}>
                  {copied ? "✓ Copied" : "📋 Copy script body"}
                </button>
                <button type="button" onClick={onReveal}
                  className="rounded-md border border-border/25 bg-[hsl(var(--bg-3)/0.5)] text-fg-dim hover:text-fg px-3 py-1.5 text-[12px] font-semibold transition-colors">
                  📂 Reveal in Finder
                </button>
                {entry.doc_path && (
                  <button type="button" onClick={onToggleDoc}
                    className="rounded-md border border-border/25 bg-[hsl(var(--bg-3)/0.5)] text-fg-dim hover:text-fg px-3 py-1.5 text-[12px] font-semibold transition-colors">
                    {docOpen ? "📄 Hide doc" : "📄 View doc"}
                  </button>
                )}
              </div>

              {/* Feedback toast */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-md border border-accent/25 bg-[hsl(var(--accent)/0.06)] px-3 py-2 text-[11px] text-accent"
                  >
                    {feedback}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Inline doc preview */}
              <AnimatePresence>
                {docOpen && docBody !== null && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <pre className="rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.7)] px-3 py-2.5 font-mono text-[11px] text-fg-dim whitespace-pre-wrap break-all m-0 max-h-96 overflow-y-auto">
                      {docBody}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
