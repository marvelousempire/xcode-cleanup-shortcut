import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api";
import type { LatestFileActivityItem, LatestFileActivityPayload } from "../lib/types";
import { cn, fmt } from "../lib/utils";

export function LatestFileActivity() {
  const [payload, setPayload] = useState<LatestFileActivityPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      setPayload(await api.latestFiles());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load latest files");
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 12_000);
    return () => window.clearInterval(timer);
  }, []);

  const items = payload?.items ?? [];
  const totalBytes = payload?.total_size_bytes ?? items.reduce((sum, item) => sum + item.size_bytes, 0);
  const totalMb = totalBytes / 1024 / 1024;
  const topFolders = useMemo(() => folderBars(items), [items]);
  const timeline = useMemo(() => timelineBars(items), [items]);

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-cyan-400/25 bg-[linear-gradient(135deg,hsl(190_84%_42%/0.18),hsl(var(--bg-2)/0.82)_45%,hsl(173_80%_50%/0.10))] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-400/15 px-4 py-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">Live Disk Activity</div>
          <h2 className="mt-1 text-[18px] font-black tracking-[-0.03em] text-fg">Latest files added</h2>
          <p className="mt-1 max-w-3xl text-[12px] leading-[1.55] text-fg-dim">
            Bounded read-only view of recent files, likely source app, and the app that can open or run them.
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-3 gap-2">
          <MiniMeter label="Files" value={items.length ? String(items.length) : "--"} meter={Math.min((items.length / 24) * 100, 100)} />
          <MiniMeter label="Size" value={formatFileSize(totalBytes)} meter={Math.min((totalMb / 2048) * 100, 100)} tone="warn" />
          <MiniMeter label="Scan" value={payload ? `${payload.scan_ms}ms` : "--"} meter={payload ? Math.min((payload.scan_ms / 1200) * 100, 100) : 0} tone="accent" />
        </div>
      </div>

      <div className="grid gap-3 p-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <div className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1.2fr)_86px_110px_110px_90px] gap-2 pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-fg-faint">
            <span>File</span><span>Size</span><span>Source</span><span>Opens / runs</span><span>Meter</span>
          </div>
          <div className="max-h-[360px] overflow-auto rounded-lg border border-cyan-400/15 bg-[hsl(var(--bg-2)/0.55)]">
            {items.slice(0, 14).map((item) => <FileRow key={`${item.path}-${item.modified_ts}`} item={item} />)}
            {!items.length ? (
              <div className="px-4 py-8 text-center text-[12px] text-fg-faint">{error ?? "Waiting for latest-file activity..."}</div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3">
          <ChartCard title="Activity by folder">
            {topFolders.map((bar) => (
              <BarRow key={bar.label} label={bar.label} value={bar.value} detail={formatFileSize(bar.bytes)} />
            ))}
          </ChartCard>
          <ChartCard title="Recency pulse">
            <div className="flex h-24 items-end gap-1.5">
              {timeline.map((value, idx) => (
                <div key={idx} className="flex-1 rounded-t bg-accent/80" style={{ height: `${Math.max(8, value)}%` }} />
              ))}
            </div>
            <div className="mt-2 text-[10px] text-fg-faint">Left is older · right is newest</div>
          </ChartCard>
        </div>
      </div>
    </section>
  );
}

function FileRow({ item }: { item: LatestFileActivityItem }) {
  const age = formatAge(item.age_seconds);
  return (
    <div className="grid grid-cols-[minmax(0,1.2fr)_86px_110px_110px_90px] gap-2 border-b border-cyan-400/10 px-3 py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-[12px] font-bold text-fg">{item.name}</div>
        <div className="truncate text-[10px] text-fg-faint">{item.folder} · {age}</div>
      </div>
      <span className="tabular text-[11px] font-bold text-fg">{formatFileSize(item.size_bytes)}</span>
      <span className="truncate text-[11px] font-semibold text-fg-dim">{item.source_app}</span>
      <span className="truncate text-[11px] text-fg-dim">{item.runner_app}</span>
      <TinyMeter value={item.activity_score} label={`${fmt(item.confidence * 100, 0)}%`} />
    </div>
  );
}

function MiniMeter({ label, value, meter, tone = "safe" }: { label: string; value: string; meter: number; tone?: "safe" | "warn" | "accent" }) {
  return (
    <div className="rounded-lg border border-cyan-400/15 bg-[hsl(var(--bg-2)/0.58)] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">{label}</div>
      <div className="mt-0.5 text-[16px] font-black tabular text-fg">{value}</div>
      <TinyMeter value={meter} label="" tone={tone} />
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-cyan-400/15 bg-[hsl(var(--bg-2)/0.58)] p-3">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-fg-faint">{title}</div>
      {children}
    </div>
  );
}

function BarRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex justify-between gap-2 text-[10px]">
        <span className="truncate font-semibold text-fg-dim">{label}</span>
        <span className="tabular text-fg-faint">{detail}</span>
      </div>
      <TinyMeter value={value} label="" tone="accent" />
    </div>
  );
}

function TinyMeter({ value, label, tone = "safe" }: { value: number; label: string; tone?: "safe" | "warn" | "accent" }) {
  const safeValue = Math.max(0, Math.min(value, 100));
  return (
    <div>
      {label ? <div className="mb-1 text-[10px] tabular text-fg-faint">{label}</div> : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--bg-1)/0.78)]">
        <div
          className={cn("h-full rounded-full", tone === "warn" && "bg-warn", tone === "accent" && "bg-accent", tone === "safe" && "bg-safe")}
          style={{ width: `${Math.max(safeValue, value > 0 ? 3 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function folderBars(items: LatestFileActivityItem[]) {
  const totals = new Map<string, number>();
  items.forEach((item) => totals.set(item.folder, (totals.get(item.folder) ?? 0) + item.size_bytes));
  const max = Math.max(...totals.values(), 1);
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, bytes]) => ({ label, bytes, value: Math.min((bytes / max) * 100, 100) }));
}

function timelineBars(items: LatestFileActivityItem[]) {
  const sorted = [...items].sort((a, b) => a.modified_ts - b.modified_ts).slice(-12);
  if (!sorted.length) return Array.from({ length: 12 }, () => 0);
  const max = Math.max(...sorted.map((item) => item.activity_score), 1);
  return sorted.map((item) => Math.min((item.activity_score / max) * 100, 100));
}

function formatAge(seconds: number) {
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${fmt(bytes / 1024, bytes < 100 * 1024 ? 1 : 0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${fmt(bytes / 1024 / 1024, bytes < 100 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${fmt(bytes / 1024 / 1024 / 1024, 2)} GB`;
}
