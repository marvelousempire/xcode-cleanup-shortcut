import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api, type Proposal, type AppleScriptArtifacts } from "../lib/api";
import { cn } from "../lib/utils";

/**
 * ProposalsInbox — Plan 0023 Ship 2.
 *
 * Shows the AI's pending cleaner proposals at the bottom of the Chat with
 * SADPA panel. Each proposal:
 *   - Renders the AI's reasoning + the proposed paths + suggested tiers
 *   - Has [✓ Accept] which generates a paste-ready Python snippet
 *   - Has [✕ Dismiss] which marks it as dismissed (kept for history)
 *
 * Accept NEVER auto-edits cleaners.py. The snippet is shown for the user to
 * copy and paste into source themselves. The file is hand-curated.
 */

const TIER_LABEL = {
  safe:           "Safe",
  probably_safe:  "Opt-in",
  caution:        "Caution",
} as const;

const TIER_CLASS = {
  safe:           "border-safe/30 bg-[hsl(var(--safe)/0.08)]   text-safe",
  probably_safe:  "border-warn/30 bg-[hsl(var(--warn)/0.08)]   text-warn",
  caution:        "border-danger/30 bg-[hsl(var(--danger)/0.08)] text-danger",
} as const;

export function ProposalsInbox({
  refreshSignal,
}: {
  /** Bump to force a re-fetch (chat panel does this whenever a propose_new_cleaner tool returns). */
  refreshSignal?: number;
}) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<"pending" | "accepted" | "dismissed" | "all">("pending");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.proposals(filter === "all" ? undefined : filter);
      setProposals(r.proposals);
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { reload(); }, [reload, refreshSignal]);

  const pendingCount = proposals.filter(p => p.status === "pending").length;

  return (
    <div className="rounded-lg border border-border/20 bg-[hsl(var(--bg-2)/0.5)] p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[14px] font-bold text-fg">📋 AI Cleaner Proposals</span>
        {pendingCount > 0 && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full border border-accent/30 bg-[hsl(var(--accent)/0.1)] text-accent">
            {pendingCount} pending
          </span>
        )}
        <div className="flex-1" />
        <div className="flex gap-1">
          {(["pending", "accepted", "dismissed", "all"] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] transition-colors",
                filter === f
                  ? "bg-[hsl(var(--accent)/0.15)] text-accent"
                  : "text-fg-faint hover:text-fg-dim",
              )}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-fg-dim mb-3 leading-[1.6]">
        When SADPA finds a cache or directory DustPan doesn't yet know about, or a recurring task that would feel better as a one-tap script, it proposes a {" "}
        <strong className="text-fg">cleaner</strong> or <strong className="text-fg">AppleScript</strong> here. Accept generates paste-ready files you can drop into <code className="font-mono text-fg">cleaners.py</code> or <code className="font-mono text-fg">applescripts/</code>. DustPan never auto-edits source — both surfaces are hand-curated.
      </p>

      {loading && proposals.length === 0 && (
        <div className="text-[12px] text-fg-faint text-center py-4">Loading…</div>
      )}

      {!loading && proposals.length === 0 && (
        <div className="text-center py-6">
          <div className="text-[22px] mb-1">🔍</div>
          <div className="text-[12px] font-semibold text-fg mb-0.5">No {filter === "all" ? "" : filter} proposals</div>
          <div className="text-[11px] text-fg-faint">
            Ask SADPA to explore your machine — if it finds something DustPan should know about, it'll propose a cleaner here.
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        <div className="flex flex-col gap-2.5">
          {proposals.map(p => (
            <ProposalCard key={p.id} proposal={p} onChanged={reload} />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}

function ProposalCard({ proposal, onChanged }: { proposal: Proposal; onChanged: () => void }) {
  const [busy,        setBusy]        = useState(false);
  const [snippet,     setSnippet]     = useState<string | null>(null);
  const [artifacts,   setArtifacts]   = useState<AppleScriptArtifacts | null>(null);
  const [expanded,    setExpanded]    = useState(proposal.status === "pending");

  const isApplescript = proposal.kind === "applescript" || !!proposal.script_body;

  const onAccept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.acceptProposal(proposal.id);
      setSnippet(r.snippet);
      if (r.applescript) setArtifacts(r.applescript);
      onChanged();
    } catch (e) {
      setSnippet(`Failed to accept: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onDismiss = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.dismissProposal(proposal.id);
      onChanged();
    } catch { /* ignore */ }
    finally { setBusy(false); }
  };

  const onShowSnippet = async () => {
    try {
      const r = await api.proposalSnippet(proposal.id);
      setSnippet(r.snippet);
      if (r.applescript) setArtifacts(r.applescript);
    } catch (e) {
      setSnippet(`Failed to load snippet: ${(e as Error).message}`);
    }
  };

  const statusCls = {
    pending:    "border-warn/40 bg-[hsl(var(--warn)/0.05)]",
    accepted:   "border-safe/30 bg-[hsl(var(--safe)/0.04)]",
    dismissed:  "border-border/20 bg-[hsl(var(--bg-2)/0.4)] opacity-65",
  }[proposal.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn("rounded-md border-2 overflow-hidden", statusCls)}
    >
      {/* Summary row */}
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left">
        <span className="text-[16px]" aria-hidden>
          {proposal.status === "accepted"  ? "✓" :
           proposal.status === "dismissed" ? "✕" : "💡"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-fg truncate">{proposal.name}</div>
          <div className="text-[11px] text-fg-faint truncate">
            → {proposal.category_id_suggested} category · {proposal.paths.length} path{proposal.paths.length !== 1 ? "s" : ""}
          </div>
        </div>
        <span className={cn(
          "flex-shrink-0 text-[10px] font-semibold uppercase tracking-[0.05em] px-2 py-0.5 rounded-full border",
          proposal.status === "pending"   ? "border-warn/40 text-warn" :
          proposal.status === "accepted"  ? "border-safe/30 text-safe" :
                                            "border-border/25 text-fg-faint",
        )}>
          {proposal.status}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          className={cn("h-4 w-4 flex-shrink-0 text-fg-faint transition-transform", expanded && "rotate-180")}>
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/10">
            <div className="p-3 flex flex-col gap-3">

              {proposal.rationale && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-faint mb-1">Why</div>
                  <p className="text-[12px] text-fg-dim leading-[1.6] m-0">{proposal.rationale}</p>
                </div>
              )}

              {proposal.cost_to_user && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-faint mb-1">Cost to user</div>
                  <p className="text-[12px] text-fg-dim leading-[1.6] m-0">{proposal.cost_to_user}</p>
                </div>
              )}

              {/* Cleaner proposals: show the per-tier path table */}
              {!isApplescript && proposal.paths.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-faint mb-1.5">Proposed paths</div>
                  <div className="rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.7)] overflow-hidden">
                    {proposal.paths.map((p, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-[11px]",
                        i > 0 && "border-t border-border/10",
                      )}>
                        <span className={cn(
                          "flex-shrink-0 text-[9px] font-semibold uppercase tracking-[0.05em] px-1.5 py-0.5 rounded border",
                          TIER_CLASS[p.tier],
                        )}>{TIER_LABEL[p.tier]}</span>
                        <span className="flex-1 min-w-0">
                          <span className="text-fg font-semibold">{p.label}</span>
                          <span className="text-fg-faint font-mono ml-2">{p.path}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AppleScript proposals: preview the script before acceptance */}
              {isApplescript && proposal.script_body && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-faint">
                      🍎 Proposed AppleScript {proposal.file_name && <code className="font-mono ml-1 text-fg-dim">{proposal.file_name}</code>}
                    </span>
                  </div>
                  <pre className="rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.7)] px-3 py-2 font-mono text-[11px] text-fg-dim whitespace-pre-wrap m-0 max-h-64 overflow-y-auto">{proposal.script_body}</pre>
                </div>
              )}

              {!isApplescript && proposal.shell && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-faint mb-1">Custom shell action</div>
                  <pre className="rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.7)] px-3 py-2 font-mono text-[11px] text-fg-dim whitespace-pre-wrap m-0 break-all">{proposal.shell}</pre>
                </div>
              )}

              {/* ── AppleScript artifacts: script + doc, each with own Copy ── */}
              {artifacts && (
                <div className="flex flex-col gap-3">
                  <ArtifactBlock
                    label="🍎 Paste into this file"
                    pathHint={artifacts.script_path}
                    body={artifacts.script}
                    maxHeight={320}
                  />
                  <ArtifactBlock
                    label="📝 Paste into this file"
                    pathHint={artifacts.doc_path}
                    body={artifacts.doc}
                    maxHeight={260}
                  />
                  <p className="text-[10px] text-fg-faint leading-[1.5]">
                    Both files are paste-ready. Drop them into the suggested paths, run <code className="font-mono">make check</code> to verify the AppleScript compiles, then commit.
                  </p>
                </div>
              )}

              {/* Cleaner snippet (single text blob) */}
              {!isApplescript && snippet !== null && (
                <ArtifactBlock
                  label="Paste-ready snippet for"
                  pathHint="cleaners.py"
                  body={snippet}
                  maxHeight={260}
                />
              )}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {proposal.status === "pending" && (
                  <>
                    <button type="button" onClick={onAccept} disabled={busy}
                      className="rounded-md border border-safe/30 bg-[hsl(var(--safe)/0.1)] text-safe hover:bg-[hsl(var(--safe)/0.2)] disabled:opacity-50 px-3 py-1.5 text-[12px] font-semibold transition-colors">
                      {isApplescript ? "✓ Accept & generate script + doc" : "✓ Accept & generate snippet"}
                    </button>
                    <button type="button" onClick={onDismiss} disabled={busy}
                      className="rounded-md border border-border/25 bg-[hsl(var(--bg-3)/0.5)] text-fg-dim hover:text-fg disabled:opacity-50 px-3 py-1.5 text-[12px] font-semibold transition-colors">
                      ✕ Dismiss
                    </button>
                  </>
                )}
                {proposal.status === "accepted" && snippet === null && !artifacts && (
                  <button type="button" onClick={onShowSnippet}
                    className="rounded-md border border-accent/30 bg-[hsl(var(--accent)/0.1)] text-accent hover:bg-[hsl(var(--accent)/0.2)] px-3 py-1.5 text-[12px] font-semibold transition-colors">
                    {isApplescript ? "📋 Show script + doc again" : "📋 Show snippet again"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Paste-ready code block with a labelled header, the suggested target path,
 * and a Copy button. Used by both cleaner snippets and AppleScript artifacts.
 */
function ArtifactBlock({
  label, pathHint, body, maxHeight = 256,
}: {
  label:     string;
  pathHint:  string;
  body:      string;
  maxHeight?: number;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-faint">
          {label} <code className="font-mono ml-1 text-fg-dim normal-case tracking-normal">{pathHint}</code>
        </span>
        <button type="button" onClick={copy}
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded transition-colors",
            copied
              ? "bg-[hsl(var(--safe)/0.15)] text-safe"
              : "bg-[hsl(var(--accent)/0.15)] text-accent hover:bg-[hsl(var(--accent)/0.25)]",
          )}>
          {copied ? "✓ Copied" : "📋 Copy"}
        </button>
      </div>
      <pre className="rounded-md border border-accent/25 bg-[hsl(var(--bg-1)/0.85)] px-3 py-2 font-mono text-[11px] text-fg-dim whitespace-pre-wrap break-all m-0 overflow-y-auto"
           style={{ maxHeight: `${maxHeight}px` }}>{body}</pre>
    </div>
  );
}
