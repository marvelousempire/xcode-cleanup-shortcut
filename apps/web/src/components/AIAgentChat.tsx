import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { streamChat, ChatStreamHandle } from "../lib/streamChat";
import { cn } from "../lib/utils";
import { ProposalsInbox } from "./ProposalsInbox";

/**
 * AIAgentChat — Plan 0023.
 *
 * Conversational SADPA agent. Multi-turn chat with tool-calling against
 * DustPan's safe endpoints. Action tools (cleanups) show an approval card
 * before executing.
 *
 * Data flow:
 *   user input → POST /api/ai/chat with messages
 *   ← SSE events: provider_info, assistant_text, tool_use_start, tool_use_result,
 *                 tool_approval_needed (closes stream), assistant_done, error
 *   on approval → re-POST with messages + pending_tool_results
 */

// ── Types ─────────────────────────────────────────────────────────────────────

type Turn =
  | { kind: "user";       text: string }
  | { kind: "assistant";  text: string;  streaming?: boolean }
  | { kind: "tool";       id: string; name: string; input: any; result?: any; status: "running"|"done"|"error" }
  | { kind: "approval";   id: string; name: string; input: any; summary: string; desc: string; cost: string; status: "pending"|"approved"|"rejected" }
  | { kind: "system";     text: string;  level?: "info"|"warn"|"error" };

interface PendingApproval {
  id:      string;
  name:    string;
  input:   any;
  summary: string;
  desc:    string;
  cost:    string;
}

// Conversation messages sent to the server (Anthropic/OpenAI message format)
type ChatMessage =
  | { role: "user";       content: string | any[] }
  | { role: "assistant";  content: string | any[]; tool_calls?: any[] }
  | { role: "tool";       tool_call_id: string; content: string };

const STARTER_PROMPTS = [
  "What's eating my disk right now?",
  "Find merged worktrees I can prune",
  "Show me everything bigger than 5 GB",
  "What did I clean last week?",
  "Run a deep audit and rank what to delete",
];

// ── Component ────────────────────────────────────────────────────────────────

export function AIAgentChat() {
  const { status, aiStatus, setActiveTab, refreshProposalsCount } = useDashboard();

  const [turns,    setTurns]    = useState<Turn[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState("");
  const [busy,     setBusy]     = useState(false);
  const [providerInfo, setProviderInfo] = useState<{provider: string; model: string; tool_use_supported?: boolean} | null>(null);
  const [allowSafeAuto, setAllowSafeAuto] = useState(false);
  const [proposalSignal, setProposalSignal] = useState(0);  // bump → ProposalsInbox reloads

  const streamRef    = useRef<ChatStreamHandle | null>(null);
  const pendingMsgs  = useRef<ChatMessage[] | null>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);

  // Pull persisted allow_safe_auto setting on mount
  useEffect(() => {
    fetch("/api/settings/agent")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.allow_safe_auto) setAllowSafeAuto(true); })
      .catch(() => { /* ignore */ });
  }, []);

  // Auto-scroll on new turns
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [turns]);

  // Cleanup stream on unmount
  useEffect(() => () => streamRef.current?.close(), []);

  const hasToolCapableKey = (aiStatus?.providers ?? []).some(p => p === "anthropic" || p === "openai");

  // ── Send a user message ──────────────────────────────────────────────────

  const send = useCallback((text: string) => {
    if (!text.trim() || busy) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setTurns(prev => [...prev, { kind: "user", text }]);
    setInput("");
    setBusy(true);

    // Add a placeholder assistant turn we'll fill in as text streams in
    const assistantIdx = turns.length + 1;  // +1 for the user we just added
    setTurns(prev => [...prev, { kind: "assistant", text: "", streaming: true }]);

    streamRef.current?.close();
    streamRef.current = streamChat(
      { messages: newMessages, allow_safe_auto: allowSafeAuto },
      (msg) => handleStreamEvent(msg, newMessages, assistantIdx),
      (err) => {
        setTurns(prev => [...prev, { kind: "system", text: `Connection error: ${err.message}`, level: "error" }]);
        setBusy(false);
      },
    );
  }, [busy, messages, allowSafeAuto, turns.length]);

  // ── Resume after approval ────────────────────────────────────────────────

  const resumeWithApproval = useCallback((approved: { id: string; approved: boolean; result?: any }[]) => {
    if (busy) return;
    const msgsToSend = pendingMsgs.current ?? messages;
    setBusy(true);

    streamRef.current?.close();
    streamRef.current = streamChat(
      {
        messages: msgsToSend,
        pending_tool_results: approved,
        allow_safe_auto: allowSafeAuto,
      },
      (msg) => handleStreamEvent(msg, msgsToSend, turns.length),
      (err) => {
        setTurns(prev => [...prev, { kind: "system", text: `Connection error: ${err.message}`, level: "error" }]);
        setBusy(false);
      },
    );
  }, [busy, messages, allowSafeAuto, turns.length]);

  // ── Handle individual SSE events ─────────────────────────────────────────

  const handleStreamEvent = useCallback((msg: { event: string; data: any }, baseMsgs: ChatMessage[], assistantIdx: number) => {
    const { event, data } = msg;

    switch (event) {
      case "provider_info": {
        setProviderInfo({
          provider: data.provider,
          model: data.model ?? "",
          tool_use_supported: data.tool_use_supported,
        });
        if (data.tool_use_supported === false) {
          setTurns(prev => [...prev, {
            kind: "system",
            text: `${data.provider} doesn't support tool-use in DustPan. Configure an Anthropic or OpenAI key in Settings for the full chat.`,
            level: "warn",
          }]);
        }
        break;
      }
      case "assistant_text": {
        const text = (data.text ?? "").trim();
        if (!text) break;
        setTurns(prev => {
          const next = [...prev];
          // Find the last streaming assistant and append, or create a new one
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].kind === "assistant" && (next[i] as any).streaming) {
              next[i] = { kind: "assistant", text: ((next[i] as any).text ?? "") + (((next[i] as any).text) ? "\n\n" : "") + text, streaming: true };
              return next;
            }
          }
          next.push({ kind: "assistant", text, streaming: true });
          return next;
        });
        break;
      }
      case "assistant_text_delta": {
        // v0.27 — token-by-token streaming. Append to the current streaming
        // assistant bubble character-for-character (no \n\n join).
        const chunk = data.text ?? "";
        if (!chunk) break;
        setTurns(prev => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].kind === "assistant" && (next[i] as any).streaming) {
              next[i] = { ...next[i] as any, text: ((next[i] as any).text ?? "") + chunk, streaming: true };
              return next;
            }
          }
          next.push({ kind: "assistant", text: chunk, streaming: true });
          return next;
        });
        break;
      }
      case "tool_use_start": {
        setTurns(prev => [...prev, { kind: "tool", id: data.id, name: data.name, input: data.input ?? {}, status: "running" }]);
        break;
      }
      case "tool_use_result": {
        setTurns(prev => prev.map(t =>
          t.kind === "tool" && t.id === data.id
            ? { ...t, status: data.ok === false ? "error" : "done", result: data.result ?? data }
            : t
        ));
        // If the AI just persisted a new cleaner proposal, refresh the inbox + sidebar badge
        if (data.name === "propose_new_cleaner" && data.ok !== false) {
          setProposalSignal(s => s + 1);
          refreshProposalsCount();
        }
        break;
      }
      case "tool_approval_needed": {
        // Save current message state so we can resume after approval
        pendingMsgs.current = baseMsgs;
        setTurns(prev => [...prev, {
          kind: "approval",
          id:      data.id,
          name:    data.name,
          input:   data.input ?? {},
          summary: data.summary ?? `Run ${data.name}`,
          desc:    data.desc ?? "",
          cost:    data.cost ?? "",
          status:  "pending",
        }]);
        setBusy(false);  // Stream closes — we wait for user
        break;
      }
      case "assistant_done": {
        // Mark final assistant as no longer streaming
        setTurns(prev => prev.map(t =>
          t.kind === "assistant" && (t as any).streaming
            ? { ...t, streaming: false }
            : t
        ));
        setBusy(false);
        // Update full message history from server's final state... but we don't
        // have it here. For Ship 1 we accept that the next user message rebuilds
        // context from our local mirror — fine since the local mirror is the
        // user-facing source of truth anyway.
        // Build a simple assistant message representation locally.
        setMessages(prev => {
          const lastAssistantText = turnsLastAssistantText();
          if (lastAssistantText) {
            return [...prev, { role: "assistant", content: lastAssistantText }];
          }
          return prev;
        });
        break;
      }
      case "error": {
        setTurns(prev => [...prev, { kind: "system", text: data.message ?? "Unknown error", level: "error" }]);
        setBusy(false);
        break;
      }
    }
  }, [refreshProposalsCount]);

  // Helper — read last streaming assistant text out of state
  const turnsLastAssistantText = useCallback((): string => {
    let result = "";
    setTurns(prev => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].kind === "assistant") {
          result = (prev[i] as any).text ?? "";
          break;
        }
      }
      return prev;
    });
    return result;
  }, []);

  // ── Approval click handlers ──────────────────────────────────────────────

  const approveCall = (turn: Extract<Turn, { kind: "approval" }>) => {
    setTurns(prev => prev.map(t =>
      t.kind === "approval" && t.id === turn.id ? { ...t, status: "approved" } : t
    ));
    resumeWithApproval([{ id: turn.id, approved: true }]);
  };

  const rejectCall = (turn: Extract<Turn, { kind: "approval" }>) => {
    setTurns(prev => prev.map(t =>
      t.kind === "approval" && t.id === turn.id ? { ...t, status: "rejected" } : t
    ));
    resumeWithApproval([{ id: turn.id, approved: false }]);
  };

  const toggleAutoApprove = async () => {
    const newVal = !allowSafeAuto;
    setAllowSafeAuto(newVal);
    try {
      await fetch("/api/settings/agent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ allow_safe_auto: newVal }),
      });
    } catch { /* ignore */ }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const free  = status?.free_gb ?? 0;
  const total = status?.total_gb ?? 228;

  if (!hasToolCapableKey) {
    return (
      <div className="rounded-lg border border-warn/30 bg-[hsl(var(--warn)/0.06)] p-6 text-center">
        <div className="text-[24px] mb-2">🔑</div>
        <div className="text-[14px] font-bold text-fg mb-1">Add an Anthropic or OpenAI key to chat</div>
        <p className="text-[12px] text-fg-dim max-w-md mx-auto leading-[1.6] mb-4">
          The conversational SADPA agent needs tool-use support — currently only Anthropic and OpenAI provide it.
          Configure a key in Settings → AI, then come back.
        </p>
        <button type="button"
          onClick={() => setActiveTab("settings")}
          className="rounded-md border border-accent/30 bg-[hsl(var(--accent)/0.1)] text-accent hover:bg-[hsl(var(--accent)/0.2)] px-4 py-2 text-[13px] font-semibold">
          → Open Settings
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full" style={{ minHeight: "60vh" }}>
      {/* ── Header ── */}
      <div className="rounded-lg border border-border/20 bg-[hsl(var(--bg-2)/0.6)] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[18px]" aria-hidden>💬</span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-fg">Chat with SADPA</div>
            <div className="text-[11px] text-fg-faint truncate">
              {providerInfo
                ? <>Using <span className="text-fg-dim font-mono">{providerInfo.provider}</span> {providerInfo.model && <>/ {providerInfo.model}</>}</>
                : "Multi-turn agent · uses real measurements · sandboxed filesystem peek"}
            </div>
          </div>
          <div className="flex-shrink-0 text-[10px] text-fg-faint tabular-nums">
            {free.toFixed(1)} GB free / {total.toFixed(0)} GB
          </div>
        </div>

        {/* Auto-approve toggle */}
        <label className="mt-2 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowSafeAuto}
            onChange={toggleAutoApprove}
            className="rounded"
          />
          <span className="text-[11px] text-fg-dim">
            Trust the AI to run safe-tier cleanups without asking
          </span>
        </label>
      </div>

      {/* ── Conversation log ── */}
      <div ref={scrollRef}
        className="flex-1 rounded-lg border border-border/15 bg-[hsl(var(--bg-1)/0.4)] p-3 overflow-y-auto"
        style={{ minHeight: "300px", maxHeight: "calc(100vh - 320px)" }}>

        {turns.length === 0 && (
          <div className="text-center py-8">
            <div className="text-[26px] mb-3">🤖</div>
            <div className="text-[13px] font-semibold text-fg mb-1">Ready when you are.</div>
            <p className="text-[12px] text-fg-dim max-w-md mx-auto leading-[1.6] mb-5">
              Ask SADPA anything about your disk. It can measure paths, run scans,
              and execute pre-vetted cleanups — with your approval.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {STARTER_PROMPTS.map(p => (
                <button key={p} type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-border/25 bg-[hsl(var(--bg-2)/0.6)] hover:bg-[hsl(var(--bg-3)/0.7)] px-3 py-1.5 text-[11px] text-fg-dim hover:text-fg transition-colors">
                  💡 {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {turns.map((turn, idx) => (
              <TurnView
                key={idx}
                turn={turn}
                onApprove={() => turn.kind === "approval" && approveCall(turn)}
                onReject={()  => turn.kind === "approval" && rejectCall(turn)}
                onNavigate={(tabId) => setActiveTab(tabId)}
              />
            ))}
          </AnimatePresence>
          {busy && (
            <div className="flex items-center gap-2 text-[11px] text-fg-faint">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
              SADPA is thinking…
            </div>
          )}
        </div>
      </div>

      {/* ── Proposals inbox ── */}
      <ProposalsInbox refreshSignal={proposalSignal} />

      {/* ── Input ── */}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="rounded-lg border border-border/20 bg-[hsl(var(--bg-2)/0.6)] p-2 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" && (e.metaKey || e.ctrlKey)) ||
                (e.key === "Enter" && !e.shiftKey)) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask SADPA something — 'what's eating my disk?', 'show me xcode caches', 'clean my downloads folder'…"
          rows={2}
          disabled={busy}
          className="flex-1 resize-none rounded-md bg-transparent border-0 px-2 py-1.5 text-[13px] text-fg placeholder:text-fg-faint focus:outline-none disabled:opacity-50"
        />
        <button type="submit"
          disabled={busy || !input.trim()}
          className="self-end rounded-md border border-accent/30 bg-[hsl(var(--accent)/0.1)] text-accent hover:bg-[hsl(var(--accent)/0.2)] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-[12px] font-semibold transition-colors">
          {busy ? "…" : "Send"}
        </button>
      </form>
      <div className="text-[10px] text-fg-faint text-center -mt-1">
        ⌘+Enter to send · The agent's tool calls show below as collapsed chips
      </div>
    </div>
  );
}

// ── Per-turn renderers ────────────────────────────────────────────────────────

function TurnView({
  turn, onApprove, onReject, onNavigate,
}: {
  turn:       Turn;
  onApprove:  () => void;
  onReject:   () => void;
  onNavigate: (tabId: string) => void;
}) {
  switch (turn.kind) {
    case "user":
      return (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="self-end max-w-[85%] rounded-lg border border-accent/25 bg-[hsl(var(--accent)/0.08)] px-3 py-2">
          <div className="text-[13px] text-fg whitespace-pre-wrap">{turn.text}</div>
        </motion.div>
      );

    case "assistant":
      return (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-[92%] rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.5)] px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-faint">SADPA</span>
            {turn.streaming && <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
          </div>
          <div className="text-[13px] text-fg whitespace-pre-wrap leading-[1.6]">
            {renderMarkdownLite(turn.text)}
          </div>
        </motion.div>
      );

    case "tool":
      return <ToolChip turn={turn} onNavigate={onNavigate} />;

    case "approval":
      return <ApprovalCard turn={turn} onApprove={onApprove} onReject={onReject} />;

    case "system":
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={cn(
            "self-center max-w-[80%] rounded-md border px-3 py-1.5 text-[11px]",
            turn.level === "error" ? "border-danger/30 bg-[hsl(var(--danger)/0.07)] text-danger" :
            turn.level === "warn"  ? "border-warn/30 bg-[hsl(var(--warn)/0.07)] text-warn" :
                                     "border-border/20 bg-[hsl(var(--bg-2)/0.4)] text-fg-dim",
          )}>
          {turn.text}
        </motion.div>
      );
  }
}

function ToolChip({ turn, onNavigate }: { turn: Extract<Turn, { kind: "tool" }>; onNavigate: (t: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const summary = formatToolSummary(turn);
  const dotCls =
    turn.status === "running" ? "bg-accent animate-pulse" :
    turn.status === "error"   ? "bg-danger" : "bg-safe";

  // Special render for navigate
  if (turn.name === "navigate_to_tab" && turn.status === "done" && turn.input?.tab_id) {
    return (
      <div className="self-start rounded-md border border-accent/25 bg-[hsl(var(--accent)/0.06)] px-3 py-1.5 flex items-center gap-2">
        <span className="text-[11px] text-fg-dim">SADPA suggests:</span>
        <button type="button" onClick={() => onNavigate(turn.input.tab_id)}
          className="text-[12px] font-semibold text-accent hover:underline">
          → Open {turn.input.tab_id}
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
      className="self-start rounded-md border border-border/15 bg-[hsl(var(--bg-2)/0.4)] overflow-hidden max-w-[92%]">
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left">
        <span className={cn("inline-block w-1.5 h-1.5 rounded-full flex-shrink-0", dotCls)} />
        <span className="text-[11px] font-mono text-fg-dim flex-1 truncate">🔧 {turn.name}</span>
        <span className="text-[11px] text-fg-faint">{summary}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          className={cn("w-3 h-3 text-fg-faint flex-shrink-0 transition-transform", expanded && "rotate-180")}>
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-border/10">
            <div className="px-3 py-2 grid gap-1 text-[10px]">
              {Object.keys(turn.input ?? {}).length > 0 && (
                <>
                  <span className="text-fg-faint">Input:</span>
                  <pre className="font-mono text-fg-dim whitespace-pre-wrap break-all m-0">{JSON.stringify(turn.input, null, 2)}</pre>
                </>
              )}
              {turn.result !== undefined && (
                <>
                  <span className="text-fg-faint mt-1">Result:</span>
                  <pre className="font-mono text-fg-dim whitespace-pre-wrap break-all m-0 max-h-48 overflow-y-auto">{JSON.stringify(turn.result, null, 2)}</pre>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ApprovalCard({
  turn, onApprove, onReject,
}: {
  turn:      Extract<Turn, { kind: "approval" }>;
  onApprove: () => void;
  onReject:  () => void;
}) {
  const pending = turn.status === "pending";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border-2 px-4 py-3 max-w-[95%]",
        turn.status === "approved" ? "border-safe/30 bg-[hsl(var(--safe)/0.05)]" :
        turn.status === "rejected" ? "border-border/20 bg-[hsl(var(--bg-2)/0.4)] opacity-70" :
                                     "border-warn/40 bg-[hsl(var(--warn)/0.07)]",
      )}>
      <div className="flex items-start gap-3">
        <span className="text-[18px] mt-0.5" aria-hidden>
          {turn.status === "approved" ? "✓" : turn.status === "rejected" ? "✕" : "⚠️"}
        </span>
        <div className="flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-warn mb-1">
            {turn.status === "approved" ? "Approved — running" :
             turn.status === "rejected" ? "Rejected" :
                                          "SADPA wants to run this"}
          </div>
          <div className="text-[13px] font-bold text-fg mb-1">{turn.summary}</div>
          {turn.desc && <p className="text-[12px] text-fg-dim leading-[1.6] mb-1.5">{turn.desc}</p>}
          {turn.cost && (
            <p className="text-[12px] text-warn leading-[1.6] mb-2">
              <strong className="font-semibold">Cost:</strong> {turn.cost}
            </p>
          )}
          {pending && (
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={onApprove}
                className="rounded-md border border-safe/30 bg-[hsl(var(--safe)/0.1)] text-safe hover:bg-[hsl(var(--safe)/0.2)] px-3 py-1.5 text-[12px] font-semibold transition-colors">
                ✓ Approve
              </button>
              <button type="button" onClick={onReject}
                className="rounded-md border border-border/25 bg-[hsl(var(--bg-3)/0.5)] text-fg-dim hover:text-fg px-3 py-1.5 text-[12px] font-semibold transition-colors">
                ✕ Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatToolSummary(turn: Extract<Turn, { kind: "tool" }>): string {
  if (turn.status === "running") return "running…";
  if (turn.status === "error")    return "error";
  const r = turn.result ?? {};
  // Common shapes
  if (typeof r.size_gb === "number") return `${r.size_gb.toFixed(1)} GB`;
  if (typeof r.free_gb === "number") return `${r.free_gb.toFixed(1)} GB free`;
  if (Array.isArray(r.entries))       return `${r.entries.length} entries`;
  if (Array.isArray(r.targets))       return `${r.targets.length} targets`;
  if (Array.isArray(r.quick_wins))    return `${r.quick_wins.length} quick wins`;
  if (Array.isArray(r.categories))    return `${r.categories.length} categories`;
  if (typeof r.freed_gb === "number") return `freed ${r.freed_gb.toFixed(1)} GB`;
  return "done";
}

/** Minimal markdown — only code blocks, bold, and inline code. Avoids pulling a full markdown library. */
function renderMarkdownLite(text: string): React.ReactNode {
  if (!text) return null;
  // Split on triple-backtick fences
  const blocks = text.split(/```/);
  return blocks.map((block, i) => {
    if (i % 2 === 1) {
      // Code block — strip first line if it's a language hint
      const lines = block.split("\n");
      const body = lines[0].match(/^[a-zA-Z]+$/) ? lines.slice(1).join("\n") : block;
      return (
        <pre key={i} className="my-2 rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.8)] px-3 py-2 font-mono text-[11px] text-fg-dim overflow-x-auto whitespace-pre">
          {body}
        </pre>
      );
    }
    // Inline: bold + inline code
    return <span key={i}>{renderInline(block)}</span>;
  });
}

function renderInline(text: string): React.ReactNode {
  // Match **bold** or `code` segments
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} className="font-semibold text-fg">{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("`") && p.endsWith("`")) {
      return <code key={i} className="font-mono text-[12px] px-1 py-0.5 rounded bg-[hsl(var(--bg-1)/0.7)] text-fg-dim">{p.slice(1, -1)}</code>;
    }
    return <span key={i}>{p}</span>;
  });
}
