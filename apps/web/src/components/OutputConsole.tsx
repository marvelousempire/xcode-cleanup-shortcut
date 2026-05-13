import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { cn } from "../lib/utils";

interface Props {
  /** When `embedded`, the terminal is always rendered (no collapse animation)
   * with an idle placeholder when there's no output. Used inside the Overview
   * 3-pane top where the terminal is part of the layout. */
  embedded?: boolean;
  className?: string;
  /** When set, the terminal body fills its parent's height. */
  fillHeight?: boolean;
  /** When true, render the v0.15.0 toolbar (search input + Clear). The bottom
   * console doesn't show it — only the embedded Overview terminal. */
  withToolbar?: boolean;
}

// Minimal ANSI parser — covers \e[3xm + \e[9xm fg colors + \e[1m bold + \e[0m
// reset. 256-color and RGB modes fall through as plain text. Good enough for
// our localhost utility's output.
const ANSI_FG: Record<string, string> = {
  "30": "ansi-fg-gray", "31": "ansi-fg-red", "32": "ansi-fg-green",
  "33": "ansi-fg-yellow", "34": "ansi-fg-blue", "35": "ansi-fg-magenta",
  "36": "ansi-fg-cyan", "37": "ansi-fg-gray", "90": "ansi-fg-gray",
  "91": "ansi-fg-red", "92": "ansi-fg-green", "93": "ansi-fg-yellow",
  "94": "ansi-fg-blue", "95": "ansi-fg-magenta", "96": "ansi-fg-cyan",
};

function parseAnsi(text: string): { text: string; classes: string[] }[] {
  if (!text || text.indexOf("\x1b[") === -1) return [{ text, classes: [] }];
  const out: { text: string; classes: string[] }[] = [];
  let classes: string[] = [];
  const re = /\x1b\[([0-9;]*)m/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), classes: [...classes] });
    const codes = (m[1] || "0").split(";");
    for (const code of codes) {
      if (code === "0" || code === "") classes = [];
      else if (code === "1") { if (!classes.includes("ansi-bold")) classes.push("ansi-bold"); }
      else if (ANSI_FG[code]) classes = classes.filter((c) => !c.startsWith("ansi-fg-")).concat([ANSI_FG[code]]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ text: text.slice(last), classes: [...classes] });
  return out;
}

// Render one line: ANSI-colored segments, with optional highlight wraps around
// matches of `query`. Returns React nodes — no innerHTML, no XSS.
function renderLine(text: string, query: string): React.ReactNode[] {
  const segments = parseAnsi(text);
  const out: React.ReactNode[] = [];
  const lower = query.toLowerCase();
  let key = 0;
  for (const seg of segments) {
    const cls = seg.classes.join(" ");
    if (!query) {
      out.push(<span key={key++} className={cls || undefined}>{seg.text}</span>);
      continue;
    }
    const t = seg.text;
    let i = 0;
    while (i < t.length) {
      const found = t.toLowerCase().indexOf(lower, i);
      if (found === -1) {
        out.push(<span key={key++} className={cls || undefined}>{t.slice(i)}</span>);
        break;
      }
      if (found > i) {
        out.push(<span key={key++} className={cls || undefined}>{t.slice(i, found)}</span>);
      }
      out.push(
        <span key={key++} className={cn("hl", cls || undefined)}>{t.slice(found, found + query.length)}</span>,
      );
      i = found + query.length;
    }
  }
  return out;
}

export function OutputConsole({ embedded = false, className, fillHeight = false, withToolbar = false }: Props) {
  const { output, outputVisible } = useDashboard();
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  // Cmd+F / Ctrl+F focuses the search box when this console has a toolbar.
  useEffect(() => {
    if (!withToolbar) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "f" || e.key === "F") && (e.metaKey || e.ctrlKey)) {
        if (!searchRef.current) return;
        e.preventDefault();
        searchRef.current.focus();
        searchRef.current.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [withToolbar]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [output.length]);

  const filteredFlags = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return output.map(() => true);
    return output.map((l) => l.text.toLowerCase().includes(q));
  }, [output, query]);

  const body = (
    <div
      ref={scrollRef}
      className="overflow-y-auto px-5 py-4 font-mono text-[12px] leading-[1.6]"
      style={{
        // v0.18.7 — always cap the height so the terminal scrolls inside
        // instead of stretching the parent pane (and the whole page).
        // fillHeight keeps the min-height so the pane doesn't collapse when
        // idle; the max-height is the hard cap regardless of output volume.
        maxHeight: fillHeight ? 320 : 360,
        minHeight: fillHeight ? 180 : undefined,
        color: "#F4F4F2",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {output.length === 0 ? (
        <span className="italic text-[#6B6B73]">
          Idle — nothing is running. Hit Scan or Clean to see live output.
        </span>
      ) : (
        output.map((line, i) => (
          <motion.span
            key={line.id}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: filteredFlags[i] ? 1 : 0.18, y: 0 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "block",
              line.cls === "ok" && "text-[#22C55E]",
              line.cls === "warn" && "text-[#FBBF24]",
              line.cls === "err" && "text-[#EF4444]",
              line.cls === "dim" && "text-[#9B9BA3]",
            )}
          >
            {renderLine(line.text, query.trim())}
          </motion.span>
        ))
      )}
    </div>
  );

  const toolbar = withToolbar ? (
    <div
      className="flex items-center gap-1.5 border-b px-2 py-1"
      style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
    >
      <input
        ref={searchRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setQuery(""); searchRef.current?.blur(); }
        }}
        placeholder="Filter lines… (Ctrl+F)"
        className="flex-1 border-0 bg-transparent px-1 py-0.5 font-mono text-[11px] text-[#F4F4F2] outline-none placeholder:text-[#6B6B73]"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setQuery("")}
        className="rounded border px-2 py-0.5 text-[10px] text-[#9B9BA3] transition-colors hover:text-[#F4F4F2]"
        style={{ borderColor: "rgba(255,255,255,0.12)" }}
        title="Clear filter"
      >
        Clear
      </button>
    </div>
  ) : null;

  if (embedded) {
    return (
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-md border border-white/[0.06]",
          fillHeight && "h-full flex-1",
          className,
        )}
        style={{ background: "hsl(240 5% 4% / 0.92)" }}
      >
        {toolbar}
        {body}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {outputVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={cn("mt-5 overflow-hidden rounded-lg border border-white/[0.06]", className)}
          style={{ background: "hsl(240 5% 4% / 0.92)" }}
        >
          {body}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
