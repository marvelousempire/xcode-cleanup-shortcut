import { fmt } from "../../lib/utils";

export function MetricSparkline({ label, values, valueSuffix = "" }: { label: string; values: number[]; valueSuffix?: string }) {
  const width = 180;
  const height = 46;
  const max = Math.max(...values, 1);
  const points = values.length
    ? values.map((value, idx) => {
        const x = values.length === 1 ? 0 : (idx / (values.length - 1)) * width;
        const y = height - (value / max) * height;
        return `${x},${y}`;
      }).join(" ")
    : "";
  const current = values.at(-1) ?? 0;

  return (
    <div className="rounded-md border border-border/10 bg-[hsl(var(--bg-3)/0.35)] p-3">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="font-semibold uppercase tracking-[0.08em] text-fg-faint">{label}</span>
        <span className="font-bold tabular text-fg">{fmt(current)}{valueSuffix}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full overflow-visible">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} className="text-accent" />
      </svg>
    </div>
  );
}
