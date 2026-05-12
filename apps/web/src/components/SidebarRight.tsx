import { useDashboard } from "../state/DashboardContext";
import { cn, fmt } from "../lib/utils";

const SUB_LABELS: Record<string, string> = {
  "llms-claude": "Claude",
  "llms-cursor": "Cursor",
  "llms-chatgpt": "ChatGPT",
  "creative-adobe": "Adobe",
  "creative-davinci": "DaVinci Resolve",
  "creative-finalcut": "Final Cut Pro",
  "creative-logic": "Logic Pro",
  "creative-blender": "Blender",
  "creative-obs": "OBS Studio",
};

function stripGlyph(s: string) {
  return s.replace(/^[\p{Extended_Pictographic}\p{Emoji}☀-➿]+\s*/u, "").trim() || s;
}

export function SidebarRight() {
  const { tabs, activeTab, activeSub, setActiveSub, scans } = useDashboard();
  const tab = tabs.find((t) => t.id === activeTab);
  if (!tab?.subcategories?.length) return null;
  const currentSub = activeSub[tab.id] || tab.subcategories[0];

  return (
    <aside className="sticky top-5 self-start">
      <nav className="glass rounded-lg border border-border/20 p-1.5 flex flex-col gap-0.5 shadow-sm">
        <div className="px-3 py-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
          {stripGlyph(tab.label)}
        </div>
        {tab.subcategories.map((sub) => {
          const active = currentSub === sub;
          const gb = scans[sub]?.scan.total_cleanable_gb ?? 0;
          return (
            <button
              key={sub}
              type="button"
              onClick={() => setActiveSub(tab.id, sub)}
              className={cn(
                "flex items-center gap-2.5 rounded-md border-l-[3px] border-transparent px-3 py-2 pl-[11px] text-left text-[12px] font-semibold transition-colors",
                active
                  ? "text-accent-strong border-l-accent"
                  : "text-fg-dim hover:bg-bg-3 hover:text-fg",
              )}
              style={active ? { background: "hsl(var(--accent) / 0.10)" } : undefined}
            >
              <span className="flex-1 truncate">{SUB_LABELS[sub] || sub}</span>
              {gb >= 0.01 && (
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

export { SUB_LABELS };
