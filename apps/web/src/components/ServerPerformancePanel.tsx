import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { PerformancePayload, PerformanceRecommendation } from "../lib/types";
import { useDashboard } from "../state/DashboardContext";
import { cn, fmt } from "../lib/utils";
import { AlertTriangle, Cpu, Monitor, RefreshCw, ShieldCheck } from "./icons";

export function ServerPerformancePanel() {
  const { setActiveTab } = useDashboard();
  const [payload, setPayload] = useState<PerformancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      const next = await api.performance();
      setPayload(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load performance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const iv = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(iv);
  }, []);

  const onlineCount = useMemo(
    () => payload?.services.filter((svc) => svc.reachable).length ?? 0,
    [payload?.services],
  );

  const recommendations = payload?.activity.recommendations ?? [];

  return (
    <div className="space-y-4">
      <section className="glass rounded-lg border border-border/20 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
              <Monitor className="h-3.5 w-3.5" />
              Server Performance
            </div>
            <h1 className="text-[24px] font-bold tracking-[-0.025em] text-fg">
              Mac activity, network, and service control center
            </h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.6] text-fg-dim">
              Observe first: iStat-style machine pressure, Little Snitch-style connection visibility,
              service reachability, package-manager activity, and cleanup recommendations. Destructive
              actions stay in Cleaning behind DustPan approval gates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/20 bg-[hsl(var(--bg-2)/0.65)] px-3 py-2 text-[12px] font-semibold text-fg-dim transition-colors hover:border-accent hover:text-fg disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
        {error ? <div className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</div> : null}
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Disk free"
          value={payload ? `${fmt(payload.system.disk.free_gb)} GB` : "..."}
          detail={payload ? `${fmt(payload.system.disk.used_pct)}% used of ${fmt(payload.system.disk.total_gb)} GB` : "Loading"}
          tone={(payload?.system.disk.free_gb ?? 99) < 10 ? "danger" : (payload?.system.disk.free_gb ?? 99) < 25 ? "warn" : "safe"}
        />
        <MetricCard
          label="CPU load"
          value={payload ? `${fmt(payload.system.load.load_pct)}%` : "..."}
          detail={payload ? `1m ${payload.system.load.load_1} / ${payload.system.load.cpu_count} cores` : "Loading"}
          tone={(payload?.system.load.load_pct ?? 0) > 90 ? "danger" : (payload?.system.load.load_pct ?? 0) > 65 ? "warn" : "safe"}
        />
        <MetricCard
          label="Memory used"
          value={payload ? `${fmt(payload.system.memory.used_pct)}%` : "..."}
          detail={payload ? `${Math.round(payload.system.memory.free_mb)} MB free` : "Loading"}
          tone={(payload?.system.memory.used_pct ?? 0) > 90 ? "danger" : (payload?.system.memory.used_pct ?? 0) > 75 ? "warn" : "safe"}
        />
        <MetricCard
          label="Services online"
          value={payload ? `${onlineCount}/${payload.services.length}` : "..."}
          detail={payload ? `${payload.host}${payload.lan_ip ? ` / ${payload.lan_ip}` : ""}` : "Loading"}
          tone={onlineCount > 0 ? "safe" : "warn"}
        />
      </div>

      {recommendations.length ? (
        <section className="grid gap-2 md:grid-cols-2">
          {recommendations.map((rec) => (
            <RecommendationCard key={rec.title} rec={rec} onOpenTab={setActiveTab} />
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.55)] px-4 py-3 text-[13px] text-fg-dim">
          No critical workstation recommendations right now.
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Known Services" subtitle="Local first, remote checks only for allowlisted targets">
          <div className="space-y-2">
            {(payload?.services ?? []).map((svc) => (
              <div key={svc.id} className="rounded-md border border-border/10 bg-[hsl(var(--bg-3)/0.42)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-fg">{svc.label}</div>
                    <div className="truncate text-[11px] tabular text-fg-faint">
                      {svc.host}{svc.port ? `:${svc.port}` : ""} · {svc.scope}
                    </div>
                  </div>
                  <StatusPill online={svc.reachable} label={svc.status} />
                </div>
                {svc.details?.length ? (
                  <pre className="mt-2 max-h-28 overflow-auto rounded bg-[hsl(var(--bg-1)/0.7)] p-2 text-[10px] leading-[1.4] text-fg-dim">
                    {svc.details.join("\n")}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top Processes" subtitle="Sorted by CPU first, then resident memory">
          <div className="max-h-[420px] overflow-auto">
            <TableHeader cols={["PID", "Process", "CPU", "RAM"]} />
            {(payload?.processes ?? []).map((proc) => (
              <div key={`${proc.pid}-${proc.name}`} className="grid grid-cols-[64px_minmax(0,1fr)_72px_82px] gap-2 border-t border-border/10 py-2 text-[12px]">
                <span className="tabular text-fg-faint">{proc.pid}</span>
                <span className="truncate font-medium text-fg">{proc.name}</span>
                <span className="tabular text-fg-dim">{fmt(proc.cpu_pct)}%</span>
                <span className="tabular text-fg-dim">{fmt(proc.rss_mb)} MB</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Network Monitor" subtitle="Little Snitch-style visibility without silent blocking">
          <div className="grid gap-3 lg:grid-cols-2">
            <NetworkList title="Listening ports" rows={payload?.network.listeners ?? []} />
            <NetworkList title="Established TCP" rows={payload?.network.connections ?? []} />
          </div>
          {payload?.network.message ? <div className="mt-2 text-[12px] text-fg-faint">{payload.network.message}</div> : null}
        </Panel>

        <Panel title="Activity and Pressure" subtitle="Caches and state most likely to break agent/runtime work">
          <div className="space-y-2">
            {(payload?.activity.heavy_paths ?? []).map((path) => (
              <button
                key={path.label}
                type="button"
                onClick={() => setActiveTab(path.label.includes("Docker") ? "docker" : "automation")}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border/10 bg-[hsl(var(--bg-3)/0.42)] px-3 py-2 text-left transition-colors hover:border-accent/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-fg">{path.label}</div>
                  <div className="truncate text-[10px] text-fg-faint">{path.path}</div>
                </div>
                <div className="text-right text-[12px] font-bold tabular text-fg">{fmt(path.size_gb)} GB</div>
              </button>
            ))}
          </div>
          {payload?.activity.automation_processes.length ? (
            <pre className="mt-3 max-h-36 overflow-auto rounded-md bg-[hsl(var(--bg-1)/0.7)] p-3 text-[10px] leading-[1.45] text-fg-dim">
              {payload.activity.automation_processes.join("\n")}
            </pre>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "safe" | "warn" | "danger" }) {
  return (
    <div className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.78)] p-4 shadow-sm">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">{label}</div>
      <div className={cn(
        "text-[28px] font-bold tabular tracking-[-0.03em]",
        tone === "safe" && "text-safe",
        tone === "warn" && "text-warn",
        tone === "danger" && "text-danger",
      )}>
        {value}
      </div>
      <div className="mt-1 text-[12px] text-fg-dim">{detail}</div>
    </div>
  );
}

function RecommendationCard({ rec, onOpenTab }: { rec: PerformanceRecommendation; onOpenTab: (tabId: string) => void }) {
  const danger = rec.severity === "critical";
  return (
    <button
      type="button"
      onClick={() => rec.target_tab && onOpenTab(rec.target_tab)}
      className={cn(
        "rounded-lg border p-4 text-left shadow-sm transition-colors",
        danger ? "border-danger/30 bg-danger/10 hover:border-danger/60" : "border-warn/30 bg-warn/10 hover:border-warn/60",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-[12px] font-bold text-fg">
        {danger ? <AlertTriangle className="h-4 w-4 text-danger" /> : <ShieldCheck className="h-4 w-4 text-warn" />}
        {rec.title}
      </div>
      <div className="text-[12px] leading-[1.55] text-fg-dim">{rec.action}</div>
    </button>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.78)] p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-2">
        <Cpu className="mt-0.5 h-4 w-4 text-accent" />
        <div>
          <h2 className="text-[15px] font-bold text-fg">{title}</h2>
          <p className="text-[11px] leading-[1.5] text-fg-faint">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function StatusPill({ online, label }: { online: boolean; label: string }) {
  return (
    <span className={cn(
      "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold tabular",
      online ? "bg-safe/15 text-safe" : "bg-bg-1 text-fg-faint",
    )}>
      {label}
    </span>
  );
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)_72px_82px] gap-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
      {cols.map((col) => <span key={col}>{col}</span>)}
    </div>
  );
}

function NetworkList({ title, rows }: { title: string; rows: { command: string; pid: number; name: string }[] }) {
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
