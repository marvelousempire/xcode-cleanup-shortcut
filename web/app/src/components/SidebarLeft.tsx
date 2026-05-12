import { useDashboard } from "../state/DashboardContext";
import { TabIcon } from "./icons";
import { cn, fmt } from "../lib/utils";

function stripGlyph(s: string) {
  return s.replace(/^[\p{Extended_Pictographic}\p{Emoji}☀-➿]+\s*/u, "").trim() || s;
}

export function SidebarLeft() {
  const { tabs, activeTab, setActiveTab, scans } = useDashboard();

  // Aggregate cleanable GB per tab.
  const statFor = (tabId: string): number => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return 0;
    if (tab.subcategories) {
      return tab.subcategories.reduce((sum, sub) => sum + (scans[sub]?.scan.total_cleanable_gb ?? 0), 0);
    }
    if (tab.category) return scans[tab.category]?.scan.total_cleanable_gb ?? 0;
    return 0;
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
              {!tab.meta && gb >= 0.01 && (
                <span className={cn("text-[11px] font-medium tabular", active ? "text-accent" : "text-fg-faint")}>
                  {fmt(gb)} GB
                </span>
              )}
              {!tab.meta && <MiniDonut sums={tierSumsFor(tab.id)} />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// 16x16 inline donut showing safe/opt-in/caution split for a tab (elevation H).
// Hidden when the tab has no scanned data so first-load doesn't show six grey
// rings before any data is back. Three stroke-dasharray segments around r=13.
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
