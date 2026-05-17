import { cn, fmt } from "../../lib/utils";

export interface GaugeBreakdownItem {
  label: string;
  value: number;
  detail?: string;
}

export function PressureGauge({ label, value, detail, breakdown = [] }: { label: string; value: number; detail: string; breakdown?: GaugeBreakdownItem[] }) {
  const tone = value >= 90 ? "danger" : value >= 70 ? "warn" : "safe";
  return (
    <div className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.78)] p-4 shadow-sm">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">{label}</div>
      <div className={cn("text-[28px] font-bold tabular tracking-[-0.03em]", tone === "safe" && "text-safe", tone === "warn" && "text-warn", tone === "danger" && "text-danger")}>
        {fmt(value)}%
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[hsl(var(--bg-3))]">
        <div className={cn("h-full rounded-full", tone === "safe" && "bg-safe", tone === "warn" && "bg-warn", tone === "danger" && "bg-danger")} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <div className="mt-2 text-[12px] text-fg-dim">{detail}</div>
      <MeterList items={breakdown} />
    </div>
  );
}

export function MeterList({ items }: { items: GaugeBreakdownItem[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {items.slice(0, 5).map((item) => {
        const value = Math.max(0, Math.min(item.value, 100));
        const tone = value >= 90 ? "danger" : value >= 70 ? "warn" : "safe";
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
              <span className="min-w-0 truncate font-medium text-fg-dim">{item.label}</span>
              <span className="shrink-0 tabular text-fg-faint">{item.detail ?? `${fmt(value)}%`}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--bg-3))]">
              <div
                className={cn("h-full rounded-full", tone === "safe" && "bg-safe", tone === "warn" && "bg-warn", tone === "danger" && "bg-danger")}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
