import type { PerformanceBottleneck } from "../../lib/types";
import { cn } from "../../lib/utils";

export function BottleneckRadar({ items, onOpenTab }: { items: PerformanceBottleneck[]; onOpenTab: (tab: string) => void }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {items.map((item) => (
        <button
          key={`${item.title}-${item.severity}`}
          type="button"
          onClick={() => item.target_tab && onOpenTab(item.target_tab)}
          className={cn(
            "rounded-lg border p-4 text-left shadow-sm transition-colors",
            item.severity === "critical" && "border-danger/30 bg-danger/10 hover:border-danger/60",
            item.severity === "warning" && "border-warn/30 bg-warn/10 hover:border-warn/60",
            item.severity === "info" && "border-border/15 bg-[hsl(var(--bg-2)/0.55)] hover:border-accent/40",
          )}
        >
          <div className="mb-1 text-[12px] font-bold text-fg">{item.title}</div>
          <div className="text-[12px] leading-[1.55] text-fg-dim">{item.detail}</div>
        </button>
      ))}
    </div>
  );
}
