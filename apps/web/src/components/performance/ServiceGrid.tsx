import type { PerformanceService } from "../../lib/types";
import { cn } from "../../lib/utils";

export function ServiceGrid({ services }: { services: PerformanceService[] }) {
  return (
    <div className="space-y-2">
      {services.map((svc) => (
        <div key={svc.id} className="rounded-md border border-border/10 bg-[hsl(var(--bg-3)/0.42)] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-fg">{svc.label}</div>
              <div className="truncate text-[11px] tabular text-fg-faint">{svc.host}{svc.port ? `:${svc.port}` : ""} · {svc.scope}</div>
            </div>
            <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold tabular", svc.reachable ? "bg-safe/15 text-safe" : "bg-bg-1 text-fg-faint")}>{svc.status}</span>
          </div>
          {svc.details?.length ? (
            <pre className="mt-2 max-h-28 overflow-auto rounded bg-[hsl(var(--bg-1)/0.7)] p-2 text-[10px] leading-[1.4] text-fg-dim">{svc.details.join("\n")}</pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}
