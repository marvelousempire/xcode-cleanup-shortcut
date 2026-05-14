import type { ReactNode } from "react";
import { useDashboard } from "../state/DashboardContext";
import { TabIcon, Sparkles } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { cn, fmt } from "../lib/utils";

function stripGlyph(s: string) {
  return s.replace(/^[\p{Extended_Pictographic}\p{Emoji}☀-➿]+\s*/u, "").trim() || s;
}

export function SidebarLeft() {
  const { tabs, activeTab, setActiveTab, scans, pendingProposals } = useDashboard();

  // v0.17.1: show total recoverable footprint per tab (safe + opt-in + caution).
  // Previously this returned only `total_cleanable_gb` (safe + opt-in), which
  // blanked the sidebar number for any tab whose safe-tier reclaim was zero
  // even when caution-tier was multi-GB (Docker.raw, ~/Downloads, Trash, etc).
  const statFor = (tabId: string): number => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return 0;
    const sumOne = (catId: string): number => {
      const s = scans[catId]?.scan;
      if (!s) return 0;
      return (s.totals.safe || 0) + (s.totals.probably_safe || 0) + (s.totals.caution || 0);
    };
    if (tab.subcategories) {
      return tab.subcategories.reduce((sum, sub) => sum + sumOne(sub), 0);
    }
    if (tab.category) return sumOne(tab.category);
    return 0;
  };

  // Has this tab been scanned at all? Drives whether we render the GB value
  // (even if 0.0 GB) or leave the slot blank waiting for data.
  const scannedFor = (tabId: string): boolean => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return false;
    if (tab.subcategories) return tab.subcategories.some((sub) => !!scans[sub]);
    if (tab.category) return !!scans[tab.category];
    return false;
  };

  // Per-tier sums for the mini-donut next to each tab (elevation H).
  const tierSumsFor = (tabId: string): { safe: number; optin: number; caution: number } => {
    const tab = tabs.find((t) => t.id === tabId);
    let safe = 0, optin = 0, caution = 0;
    if (!tab) return { safe, optin, caution };
    if (tab.subcategories) {
      for (const sub of tab.subcategories) {
        const s = scans[sub]?.scan;
        if (s) {
          safe += s.totals.safe || 0;
          optin += s.totals.probably_safe || 0;
          caution += s.totals.caution || 0;
        }
      }
    } else if (tab.category) {
      const s = scans[tab.category]?.scan;
      if (s) {
        safe = s.totals.safe || 0;
        optin = s.totals.probably_safe || 0;
        caution = s.totals.caution || 0;
      }
    }
    return { safe, optin, caution };
  };

  return (
    <aside className="sticky top-5 self-start">
      <nav className="glass rounded-lg border border-border/20 p-1.5 flex flex-col gap-0.5 shadow-sm">
        <div className="px-3 py-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
          Categories
        </div>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const gb = tab.meta ? 0 : statFor(tab.id);
          const scanned = !tab.meta && scannedFor(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-md border-l-[3px] border-transparent px-3 py-2.5 pl-[11px] text-left text-[13px] font-semibold transition-colors",
                active
                  ? "text-accent-strong border-l-accent"
                  : "text-fg-dim hover:bg-bg-3 hover:text-fg",
              )}
              style={active ? { background: "hsl(var(--accent) / 0.10)" } : undefined}
            >
              <TabIcon
                tabId={tab.id}
                className={cn("h-4 w-4 flex-shrink-0", active ? "text-accent" : "text-fg-faint")}
              />
              <span className="flex-1 truncate">{stripGlyph(tab.label)}</span>
              {/* v0.17.1: show the GB stat as soon as the tab has been scanned,
                  even when it's 0.0 GB — every row in the sidebar gets a number
                  column instead of half the rows going blank. */}
              {scanned && (
                <span className={cn("text-[11px] font-medium tabular", active ? "text-accent" : "text-fg-faint")}>
                  {fmt(gb)} GB
                </span>
              )}
              {!tab.meta && <MiniDonut sums={tierSumsFor(tab.id)} />}
            </button>
          );
        })}
        {/* SADPA + Emergency + Settings — hard-coded footer, not server-driven */}
        <div className="mt-1.5 border-t border-border/10 pt-1.5 flex flex-col gap-0.5">
          {/* Chat with SADPA — conversational agent w/ tool-use */}
          <SidebarFooterBtn
            label="💬 Chat with SADPA"
            active={activeTab === "ai-chat"}
            onClick={() => setActiveTab("ai-chat")}
            icon={null}
            badge={pendingProposals}
          />
          {/* AppleScripts library — native-UI one-tap scripts */}
          <SidebarFooterBtn
            label="🍎 Scripts"
            active={activeTab === "applescripts"}
            onClick={() => setActiveTab("applescripts")}
            icon={null}
          />
          {/* Space Survey — SADPA's full filesystem crawl */}
          <SidebarFooterBtn
            label="📊 Space Survey"
            active={activeTab === "survey"}
            onClick={() => setActiveTab("survey")}
            icon={null}
          />
          {/* Emergency Rescue — shown prominently; auto-activated by SADPA */}
          <SidebarFooterBtn
            label="🚨 Emergency Rescue"
            active={activeTab === "emergency"}
            onClick={() => setActiveTab("emergency")}
            icon={null}
          />
          {/* Smart Auto-Detector Protector Agent (SADPA) */}
          <button
            type="button"
            onClick={() => setActiveTab("agent")}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md border-l-[3px] border-transparent px-3 py-2.5 pl-[11px] text-left text-[13px] font-semibold transition-colors",
              activeTab === "agent"
                ? "text-accent-strong border-l-accent"
                : "text-fg-dim hover:bg-bg-3 hover:text-fg",
            )}
            style={activeTab === "agent" ? { background: "hsl(var(--accent) / 0.10)" } : undefined}
          >
            <Sparkles
              className={cn("h-4 w-4 flex-shrink-0", activeTab === "agent" ? "text-accent" : "text-fg-faint")}
            />
            <span className="flex-1 truncate">SADPA Agent</span>
          </button>
          {/* Settings */}
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md border-l-[3px] border-transparent px-3 py-2.5 pl-[11px] text-left text-[13px] font-semibold transition-colors",
              activeTab === "settings"
                ? "text-accent-strong border-l-accent"
                : "text-fg-dim hover:bg-bg-3 hover:text-fg",
            )}
            style={activeTab === "settings" ? { background: "hsl(var(--accent) / 0.10)" } : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
              strokeLinecap="round" strokeLinejoin="round" aria-hidden
              className={cn("h-4 w-4 flex-shrink-0", activeTab === "settings" ? "text-accent" : "text-fg-faint")}>
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span className="flex-1 truncate">Settings</span>
          </button>
        </div>

        {/* v0.18.3 — Auto / Light / Dark theme switcher sits at the bottom of
            the category nav. The CSS already supports both the
            prefers-color-scheme media query and the [data-theme] attribute,
            so this just toggles the attribute (and localStorage). */}
        <div className="border-t border-border/10 pt-1.5">
          <ThemeToggle />
        </div>
      </nav>
    </aside>
  );
}

// 16x16 inline donut showing safe/opt-in/caution split for a tab (elevation H).
// Hidden when the tab has no scanned data so first-load doesn't show six grey
// rings before any data is back. Three stroke-dasharray segments around r=13.
/** Simple footer button for non-category tabs (Emergency, SADPA, Settings). */
function SidebarFooterBtn({
  label, active, onClick, icon, badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode | null;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md border-l-[3px] border-transparent px-3 py-2.5 pl-[11px] text-left text-[13px] font-semibold transition-colors",
        active
          ? "text-accent-strong border-l-accent"
          : "text-fg-dim hover:bg-bg-3 hover:text-fg",
      )}
      style={active ? { background: "hsl(var(--accent) / 0.10)" } : undefined}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex-shrink-0 text-[10px] font-bold tabular-nums px-1.5 py-0 rounded-full bg-accent text-white"
          style={{ minWidth: 16, textAlign: "center", lineHeight: "16px" }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function MiniDonut({ sums }: { sums: { safe: number; optin: number; caution: number } }) {
  const { safe, optin, caution } = sums;
  const total = safe + optin + caution;
  if (total < 0.01) return null;

  const r = 13;
  const C = 2 * Math.PI * r;
  const segments = [
    { v: safe,    color: "hsl(var(--safe))" },
    { v: optin,   color: "hsl(var(--warn))" },
    { v: caution, color: "hsl(var(--danger))" },
  ];
  let offset = 0;

  return (
    <svg width={16} height={16} viewBox="0 0 32 32" className="ml-1 flex-shrink-0 opacity-90" aria-hidden>
      <circle cx={16} cy={16} r={r} fill="none" stroke="hsl(var(--border) / 0.5)" strokeWidth={4} />
      {segments.map((seg, i) => {
        if (seg.v <= 0) return null;
        const len = (seg.v / total) * C;
        const el = (
          <circle
            key={i}
            cx={16}
            cy={16}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={4}
            strokeLinecap="butt"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 16 16)"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}
