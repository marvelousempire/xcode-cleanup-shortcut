import type { PerformanceProcess } from "../../lib/types";
import { fmt } from "../../lib/utils";

export function ProcessLeaderboard({ rows }: { rows: PerformanceProcess[] }) {
  return (
    <div className="max-h-[420px] overflow-auto">
      <div className="grid grid-cols-[64px_minmax(0,1fr)_72px_82px] gap-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
        <span>PID</span><span>Process</span><span>CPU</span><span>RAM</span>
      </div>
      {rows.map((proc) => (
        <div key={`${proc.pid}-${proc.name}`} className="grid grid-cols-[64px_minmax(0,1fr)_72px_82px] gap-2 border-t border-border/10 py-2 text-[12px]">
          <span className="tabular text-fg-faint">{proc.pid}</span>
          <span className="truncate font-medium text-fg">{proc.name}</span>
          <span className="tabular text-fg-dim">{fmt(proc.cpu_pct)}%</span>
          <span className="tabular text-fg-dim">{fmt(proc.rss_mb)} MB</span>
        </div>
      ))}
    </div>
  );
}
