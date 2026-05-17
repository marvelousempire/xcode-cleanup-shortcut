import { useMemo, useState } from "react";
import type { PerformancePayload, PerformanceProcess } from "../../lib/types";
import { cn, fmt } from "../../lib/utils";

type SortKey = "cpu" | "memory" | "pid" | "name";

export function DetailedActivityMonitor({ payload }: { payload: PerformancePayload | null }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cpu");
  const processes = payload?.processes ?? [];
  const cpuTotal = processes.reduce((sum, proc) => sum + proc.cpu_pct, 0);
  const ramTotal = processes.reduce((sum, proc) => sum + proc.rss_mb, 0);
  const servicePct = payload?.services.length ? (payload.services.filter((svc) => svc.reachable).length / payload.services.length) * 100 : 0;
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return processes
      .filter((proc) => !needle || `${proc.pid} ${proc.name}`.toLowerCase().includes(needle))
      .sort((a, b) => compareProcesses(a, b, sortKey))
      .slice(0, 80);
  }, [processes, query, sortKey]);

  return (
    <section className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.78)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">Detailed Activity Monitor</div>
          <h2 className="mt-1 text-[20px] font-bold tracking-[-0.025em] text-fg">Modern htop for humans</h2>
          <p className="mt-1 max-w-3xl text-[12px] leading-[1.55] text-fg-dim">
            Power-user process visibility with plain-English pressure labels. It is read-only: no force quit, no kill, no hidden cleanup.
          </p>
        </div>
        <div className="grid min-w-[320px] gap-2 sm:grid-cols-4">
          <MiniStat label="Processes" value={String(processes.length)} meter={Math.min((processes.length / 120) * 100, 100)} tone="accent" />
          <MiniStat label="Visible CPU" value={`${fmt(cpuTotal)}%`} meter={Math.min(cpuTotal, 100)} />
          <MiniStat label="Visible RAM" value={`${fmt(ramTotal)} MB`} meter={payload ? Math.min((ramTotal / Math.max(payload.system.memory.total_mb, 1)) * 100, 100) : 0} />
          <MiniStat label="Services" value={payload ? `${payload.services.filter((svc) => svc.reachable).length}/${payload.services.length}` : "--"} meter={servicePct} tone={servicePct === 100 ? "safe" : "warn"} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter process, PID, node, python..."
          className="min-w-[260px] flex-1 rounded-md border border-border/15 bg-[hsl(var(--bg-1)/0.7)] px-3 py-2 text-[12px] text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-accent"
        />
        <SortButton active={sortKey === "cpu"} onClick={() => setSortKey("cpu")}>CPU</SortButton>
        <SortButton active={sortKey === "memory"} onClick={() => setSortKey("memory")}>RAM</SortButton>
        <SortButton active={sortKey === "pid"} onClick={() => setSortKey("pid")}>PID</SortButton>
        <SortButton active={sortKey === "name"} onClick={() => setSortKey("name")}>Name</SortButton>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border/10">
        <div className="grid grid-cols-[72px_minmax(160px,1.5fr)_120px_120px_140px] gap-3 bg-[hsl(var(--bg-3)/0.65)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">
          <span>PID</span>
          <span>Process</span>
          <span>CPU</span>
          <span>Memory</span>
          <span>Meaning</span>
        </div>
        <div className="max-h-[560px] overflow-auto">
          {visible.map((proc) => (
            <ProcessRow key={`${proc.pid}-${proc.name}`} proc={proc} totalMemory={payload?.system.memory.total_mb ?? 0} />
          ))}
          {!visible.length ? (
            <div className="px-3 py-8 text-center text-[12px] text-fg-faint">No matching processes.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ProcessRow({ proc, totalMemory }: { proc: PerformanceProcess; totalMemory: number }) {
  const memoryPct = proc.mem_pct || (totalMemory ? (proc.rss_mb / totalMemory) * 100 : 0);
  const status = processStatus(proc.cpu_pct, memoryPct);
  return (
    <div className="grid grid-cols-[72px_minmax(160px,1.5fr)_120px_120px_140px] gap-3 border-t border-border/10 px-3 py-2 text-[12px] first:border-t-0">
      <span className="tabular text-fg-faint">{proc.pid}</span>
      <div className="min-w-0">
        <div className="truncate font-semibold text-fg">{proc.name}</div>
        <div className="text-[10px] text-fg-faint">{processKind(proc.name)}</div>
      </div>
      <Meter value={Math.min(proc.cpu_pct, 100)} label={`${fmt(proc.cpu_pct)}%`} />
      <Meter value={Math.min(memoryPct, 100)} label={`${fmt(proc.rss_mb)} MB`} />
      <span className={cn("rounded-full px-2 py-1 text-center text-[10px] font-bold", status.className)}>{status.label}</span>
    </div>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  const tone = value >= 70 ? "danger" : value >= 35 ? "warn" : "safe";
  return (
    <div>
      <div className="mb-1 text-[10px] tabular text-fg-dim">{label}</div>
      <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--bg-3))]">
        <div className={cn("h-full rounded-full", tone === "safe" && "bg-safe", tone === "warn" && "bg-warn", tone === "danger" && "bg-danger")} style={{ width: `${Math.max(2, Math.min(value, 100))}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, meter, tone }: { label: string; value: string; meter: number; tone?: "safe" | "warn" | "danger" | "accent" }) {
  const safeMeter = Math.max(0, Math.min(meter, 100));
  const meterTone = tone ?? (safeMeter >= 75 ? "danger" : safeMeter >= 45 ? "warn" : "safe");
  return (
    <div className="rounded-md border border-border/10 bg-[hsl(var(--bg-3)/0.4)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.08em] text-fg-faint">{label}</div>
      <div className="text-[15px] font-bold tabular text-fg">{value}</div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--bg-1)/0.72)]">
        <div
          className={cn("h-full rounded-full", meterTone === "safe" && "bg-safe", meterTone === "warn" && "bg-warn", meterTone === "danger" && "bg-danger", meterTone === "accent" && "bg-accent")}
          style={{ width: `${Math.max(safeMeter, meter > 0 ? 3 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function SortButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-md border px-3 py-2 text-[12px] font-semibold transition-colors", active ? "border-accent bg-accent/10 text-fg" : "border-border/15 text-fg-dim hover:border-accent/50 hover:text-fg")}
    >
      {children}
    </button>
  );
}

function compareProcesses(a: PerformanceProcess, b: PerformanceProcess, key: SortKey) {
  if (key === "memory") return b.rss_mb - a.rss_mb;
  if (key === "pid") return a.pid - b.pid;
  if (key === "name") return a.name.localeCompare(b.name);
  return b.cpu_pct - a.cpu_pct;
}

function processStatus(cpu: number, mem: number) {
  if (cpu >= 70) return { label: "High CPU", className: "bg-danger/15 text-danger" };
  if (mem >= 35) return { label: "Memory hog", className: "bg-warn/15 text-warn" };
  if (cpu >= 20) return { label: "Busy", className: "bg-warn/15 text-warn" };
  return { label: "Normal", className: "bg-safe/15 text-safe" };
}

function processKind(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("node") || lower.includes("vite") || lower.includes("pnpm")) return "dev server / package work";
  if (lower.includes("python")) return "Python tool or backend";
  if (lower.includes("docker") || lower.includes("colima")) return "container runtime";
  if (lower.includes("chrome") || lower.includes("safari") || lower.includes("cursor")) return "app / browser";
  return "system or app process";
}
