import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { PerformancePayload } from "../lib/types";
import { useDashboard } from "../state/DashboardContext";
import { fmt } from "../lib/utils";
import { Cpu, Monitor, RefreshCw } from "./icons";
import { BenchmarkCard } from "./performance/BenchmarkCard";
import { BottleneckRadar } from "./performance/BottleneckRadar";
import { DetailedActivityMonitor } from "./performance/DetailedActivityMonitor";
import { MetricSparkline } from "./performance/MetricSparkline";
import { NetworkFlowTable } from "./performance/NetworkFlowTable";
import { MeterList, PressureGauge, type GaugeBreakdownItem } from "./performance/PressureGauge";
import { ProcessLeaderboard } from "./performance/ProcessLeaderboard";
import { ServiceGrid } from "./performance/ServiceGrid";

export function ServerPerformancePanel() {
  const { setActiveTab } = useDashboard();
  const [payload, setPayload] = useState<PerformancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"overview" | "activity">("overview");

  const refresh = async () => {
    try {
      setError(null);
      setPayload(await api.performanceSnapshot());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load performance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const es = new EventSource("/api/performance/live");
    es.onmessage = (ev) => {
      try {
        const frame = JSON.parse(ev.data);
        if (frame.event === "performance" && frame.data?.kind === "snapshot") {
          setPayload(frame.data.snapshot);
          setLive(true);
          setLoading(false);
        }
        if (frame.event === "performance" && frame.data?.kind === "system") {
          setPayload((prev) => prev ? { ...prev, system: frame.data.system, series: frame.data.series, ts: frame.data.ts } : prev);
          setLive(true);
        }
      } catch {
        /* ignore malformed live frames */
      }
    };
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  const diskUsed = payload?.system.disk.used_pct ?? 0;
  const loadPct = payload?.system.load.load_pct ?? 0;
  const memoryUsed = payload?.system.memory.used_pct ?? 0;
  const onlineCount = useMemo(() => payload?.services.filter((svc) => svc.reachable).length ?? 0, [payload?.services]);
  const ultraMeters = useMemo(() => buildUltraMeters(payload, onlineCount), [payload, onlineCount]);
  const diskBreakdown = useMemo(() => topDiskItems(payload), [payload]);
  const cpuBreakdown = useMemo(() => topCpuItems(payload), [payload]);
  const memoryBreakdown = useMemo(() => topMemoryItems(payload), [payload]);
  const serviceBreakdown = useMemo(() => topServiceItems(payload), [payload]);

  return (
    <div className="space-y-4">
      <section className="glass rounded-lg border border-border/20 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
              <Monitor className="h-3.5 w-3.5" />
              Server Performance · {payload?.platform ?? "detecting"} · {live ? "live" : "snapshot"}
            </div>
            <h1 className="text-[24px] font-bold tracking-[-0.025em] text-fg">
              Realtime Mac/Linux analytics and bottleneck radar
            </h1>
            <p className="mt-1 max-w-3xl text-[13px] leading-[1.6] text-fg-dim">
              Live CPU, memory, disk, processes, network visibility, service health, bottleneck analytics,
              and DustBench. Cleaning stays separate and approval-gated.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/20 bg-[hsl(var(--bg-2)/0.65)] px-3 py-2 text-[12px] font-semibold text-fg-dim transition-colors hover:border-accent hover:text-fg disabled:opacity-50"
          >
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Refresh
          </button>
        </div>
        {error ? <div className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</div> : null}
      </section>

      <div className="flex flex-wrap gap-2 rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.58)] p-2">
        <SubTabButton active={subTab === "overview"} onClick={() => setSubTab("overview")}>
          Overview
        </SubTabButton>
        <SubTabButton active={subTab === "activity"} onClick={() => setSubTab("activity")}>
          Detailed Activity Monitor
        </SubTabButton>
      </div>

      {subTab === "activity" ? (
        <DetailedActivityMonitor payload={payload} />
      ) : (
        <>
      <UltraMonitorGrid items={ultraMeters} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PressureGauge label="Disk used" value={diskUsed} detail={payload ? `${fmt(payload.system.disk.free_gb)} GB free of ${fmt(payload.system.disk.total_gb)} GB` : "Loading"} breakdown={diskBreakdown} />
        <PressureGauge label="CPU load" value={loadPct} detail={payload ? `1m ${payload.system.load.load_1} / ${payload.system.load.cpu_count} cores` : "Loading"} breakdown={cpuBreakdown} />
        <PressureGauge label="Memory used" value={memoryUsed} detail={payload ? `${Math.round(payload.system.memory.free_mb)} MB free` : "Loading"} breakdown={memoryBreakdown} />
        <div className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.78)] p-4 shadow-sm">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">Services online</div>
          <div className="text-[28px] font-bold tabular text-safe">{payload ? `${onlineCount}/${payload.services.length}` : "--"}</div>
          <div className="mt-2 text-[12px] text-fg-dim">{payload ? `${payload.host}${payload.lan_ip ? ` / ${payload.lan_ip}` : ""}` : "Loading"}</div>
          <MeterList items={serviceBreakdown} />
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <MetricSparkline label="Disk used" values={(payload?.series?.disk ?? []).map((row) => row.used_pct)} valueSuffix="%" />
        <MetricSparkline label="CPU load" values={(payload?.series?.load ?? []).map((row) => row.load_pct)} valueSuffix="%" />
        <MetricSparkline label="Memory used" values={(payload?.series?.memory ?? []).map((row) => row.used_pct)} valueSuffix="%" />
      </div>

      <BottleneckRadar items={payload?.bottlenecks ?? []} onOpenTab={setActiveTab} />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Known Services" subtitle="Local first, remote checks only for allowlisted targets">
          <ServiceGrid services={payload?.services ?? []} />
        </Panel>
        <Panel title="Top Processes" subtitle="Sorted by CPU first, then resident memory">
          <ProcessLeaderboard rows={payload?.processes ?? []} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Network Monitor" subtitle="Little Snitch-style visibility without silent blocking">
          <div className="grid gap-3 lg:grid-cols-2">
            <NetworkFlowTable title="Listening ports" rows={payload?.network.listeners ?? []} />
            <NetworkFlowTable title="Established TCP" rows={payload?.network.connections ?? []} />
          </div>
          {payload?.network.message ? <div className="mt-2 text-[12px] text-fg-faint">{payload.network.message}</div> : null}
        </Panel>
        <BenchmarkCard />
      </div>
        </>
      )}
    </div>
  );
}

interface UltraMeter {
  label: string;
  value: number;
  display: string;
  detail: string;
  tone?: "safe" | "warn" | "danger" | "accent";
}

function buildUltraMeters(payload: PerformancePayload | null, onlineCount: number): UltraMeter[] {
  if (!payload) {
    return [
      { label: "Disk", value: 0, display: "--", detail: "Waiting for snapshot", tone: "accent" },
      { label: "CPU", value: 0, display: "--", detail: "Waiting for snapshot", tone: "accent" },
      { label: "Memory", value: 0, display: "--", detail: "Waiting for snapshot", tone: "accent" },
      { label: "Services", value: 0, display: "--", detail: "Waiting for snapshot", tone: "accent" },
    ];
  }

  const servicesPct = payload.services.length ? (onlineCount / payload.services.length) * 100 : 0;
  const networkCount = payload.network.listeners.length + payload.network.connections.length;
  const networkPct = Math.min((networkCount / 40) * 100, 100);
  const hotProcesses = payload.processes.filter((proc) => proc.cpu_pct >= 20 || proc.rss_mb >= 1024).length;
  const hotProcessPct = Math.min((hotProcesses / Math.max(payload.processes.length, 1)) * 100, 100);
  const heaviestPath = [...(payload.activity.heavy_paths ?? [])].sort((a, b) => b.size_gb - a.size_gb)[0];
  const heavyPathPct = heaviestPath ? Math.min((heaviestPath.size_gb / Math.max(payload.system.disk.total_gb, 1)) * 100, 100) : 0;
  const bottleneckPct = Math.min(((payload.bottlenecks ?? []).filter((item) => item.severity !== "info").length / 4) * 100, 100);
  const automationPct = Math.min(((payload.activity.automation_processes ?? []).length / 12) * 100, 100);

  return [
    { label: "Disk pressure", value: payload.system.disk.used_pct, display: `${fmt(payload.system.disk.used_pct)}%`, detail: `${fmt(payload.system.disk.free_gb)} GB free` },
    { label: "CPU load", value: payload.system.load.load_pct, display: `${fmt(payload.system.load.load_pct)}%`, detail: `${payload.system.load.cpu_count} cores watched` },
    { label: "Memory pressure", value: payload.system.memory.used_pct, display: `${fmt(payload.system.memory.used_pct)}%`, detail: `${fmt(payload.system.memory.free_mb)} MB free` },
    { label: "Services online", value: servicesPct, display: `${onlineCount}/${payload.services.length}`, detail: servicesPct === 100 ? "all reachable" : "needs attention", tone: servicesPct === 100 ? "safe" : "warn" },
    { label: "Network visibility", value: networkPct, display: String(networkCount), detail: "ports + TCP flows", tone: "accent" },
    { label: "Hot processes", value: hotProcessPct, display: String(hotProcesses), detail: "busy or memory-heavy" },
    { label: "Largest watched path", value: heavyPathPct, display: heaviestPath ? `${fmt(heaviestPath.size_gb)} GB` : "--", detail: heaviestPath?.label ?? "no heavy path" },
    { label: "Bottleneck radar", value: bottleneckPct, display: String((payload.bottlenecks ?? []).length), detail: "live recommendations", tone: bottleneckPct > 50 ? "warn" : "safe" },
    { label: "Automation stack", value: automationPct, display: String((payload.activity.automation_processes ?? []).length), detail: "detected runners", tone: "accent" },
  ];
}

function UltraMonitorGrid({ items }: { items: UltraMeter[] }) {
  return (
    <section className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.72)] p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-bold text-fg">Ultra Dashboard</h2>
          <p className="text-[11px] text-fg-faint">Dense live meters: more signal on screen, less scrolling, faster bottleneck reads.</p>
        </div>
        <div className="rounded-full border border-safe/25 bg-safe/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-safe">
          Live meter wall
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-9">
        {items.map((item) => <LiveMeterCard key={item.label} item={item} />)}
      </div>
    </section>
  );
}

function LiveMeterCard({ item }: { item: UltraMeter }) {
  const value = Math.max(0, Math.min(item.value, 100));
  const tone = item.tone ?? (value >= 90 ? "danger" : value >= 70 ? "warn" : "safe");
  const color = tone === "danger" ? "bg-danger text-danger" : tone === "warn" ? "bg-warn text-warn" : tone === "accent" ? "bg-accent text-accent" : "bg-safe text-safe";
  const [barClass, textClass] = color.split(" ");
  return (
    <div className="min-h-[112px] rounded-md border border-border/10 bg-[hsl(var(--bg-3)/0.36)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">{item.label}</div>
          <div className={`mt-1 text-[22px] font-black tabular tracking-[-0.04em] ${textClass}`}>{item.display}</div>
        </div>
        <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${barClass}`} />
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[hsl(var(--bg-1)/0.72)]">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(value, item.value > 0 ? 3 : 0)}%` }} />
      </div>
      <div className="mt-2 truncate text-[11px] text-fg-dim">{item.detail}</div>
    </div>
  );
}

function topDiskItems(payload: PerformancePayload | null): GaugeBreakdownItem[] {
  if (!payload) return [];
  const total = Math.max(payload.system.disk.total_gb, 1);
  return (payload.activity.heavy_paths ?? [])
    .filter((path) => path.exists || path.size_gb > 0)
    .sort((a, b) => b.size_gb - a.size_gb)
    .slice(0, 5)
    .map((path) => ({
      label: path.label,
      value: Math.min((path.size_gb / total) * 100, 100),
      detail: `${fmt(path.size_gb)} GB`,
    }));
}

function topCpuItems(payload: PerformancePayload | null): GaugeBreakdownItem[] {
  return (payload?.processes ?? [])
    .slice()
    .sort((a, b) => b.cpu_pct - a.cpu_pct)
    .slice(0, 5)
    .map((proc) => ({
      label: proc.name,
      value: Math.min(proc.cpu_pct, 100),
      detail: `${fmt(proc.cpu_pct)}%`,
    }));
}

function topMemoryItems(payload: PerformancePayload | null): GaugeBreakdownItem[] {
  return (payload?.processes ?? [])
    .slice()
    .sort((a, b) => b.rss_mb - a.rss_mb)
    .slice(0, 5)
    .map((proc) => ({
      label: proc.name,
      value: Math.min(proc.mem_pct || (proc.rss_mb / Math.max(payload?.system.memory.total_mb ?? 1, 1)) * 100, 100),
      detail: `${fmt(proc.rss_mb)} MB`,
    }));
}

function topServiceItems(payload: PerformancePayload | null): GaugeBreakdownItem[] {
  return (payload?.services ?? []).slice(0, 5).map((svc) => ({
    label: svc.label,
    value: svc.reachable ? 100 : 0,
    detail: svc.status,
  }));
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

function SubTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active
        ? "rounded-md border border-accent bg-accent/10 px-3 py-2 text-[12px] font-bold text-fg"
        : "rounded-md border border-transparent px-3 py-2 text-[12px] font-semibold text-fg-dim transition-colors hover:border-border/20 hover:text-fg"
      }
    >
      {children}
    </button>
  );
}
