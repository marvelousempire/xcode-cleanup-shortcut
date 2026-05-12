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
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
