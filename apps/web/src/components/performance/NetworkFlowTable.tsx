import type { PerformanceNetworkRow } from "../../lib/types";

export function NetworkFlowTable({ title, rows }: { title: string; rows: PerformanceNetworkRow[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-faint">{title}</div>
      <div className="max-h-[360px] overflow-auto rounded-md border border-border/10">
        {rows.length ? rows.map((row, idx) => (
          <div key={`${row.pid}-${row.name}-${idx}`} className="border-b border-border/10 px-3 py-2 last:border-b-0">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12px] font-semibold text-fg">{row.command}</span>
              <span className="text-[10px] tabular text-fg-faint">pid {row.pid}</span>
            </div>
            <div className="mt-0.5 truncate text-[10px] tabular text-fg-dim">{row.name}</div>
          </div>
        )) : (
          <div className="px-3 py-6 text-center text-[12px] text-fg-faint">No rows visible.</div>
        )}
      </div>
    </div>
  );
}
