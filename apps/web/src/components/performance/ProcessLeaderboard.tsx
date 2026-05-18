import type { PerformanceProcess } from "../../lib/types";
import { fmt } from "../../lib/utils";

export function ProcessLeaderboard({ rows }: { rows: PerformanceProcess[] }) {
  return (
    <div className="max-h-[340px] overflow-auto">
      <div className="grid grid-cols-[52px_minmax(0,1fr)_88px_120px_112px] gap-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
        <span>PID</span><span>Process</span><span>Owner</span><span>CPU</span><span>RAM</span>
      </div>
      {rows.slice(0, 18).map((proc) => (
        <div key={`${proc.pid}-${proc.name}`} className="grid grid-cols-[52px_minmax(0,1fr)_88px_120px_112px] gap-2 border-t border-border/10 py-1.5 text-[12px]">
          <span className="tabular text-fg-faint">{proc.pid}</span>
          <span className="truncate font-medium text-fg" title={proc.command}>{proc.name}</span>
          <span className="truncate text-[10px] text-fg-faint">{proc.user ?? "unknown"}</span>
          <Meter value={proc.cpu_pct} label={`${fmt(proc.cpu_pct)}%`} />
          <Meter value={Math.min(proc.mem_pct || proc.rss_mb / 64, 100)} label={`${fmt(proc.rss_mb)} MB`} />
        </div>
      ))}
    </div>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  const width = Math.max(3, Math.min(value, 100));
  return (
    <div>
      <div className="mb-1 text-[10px] tabular text-fg-dim">{label}</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--bg-3))]">
        <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
