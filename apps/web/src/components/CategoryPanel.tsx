import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "../state/DashboardContext";
import type { Tier } from "../lib/types";
import { PathRow } from "./PathRow";
import { ActionCard } from "./ActionCard";
import { TabIcon, Info, ArrowUp, ArrowDown } from "./icons";
import { cn, fmt } from "../lib/utils";

// Row-table filter + sort state (v0.17.0). Kept locally per CategoryPanel
// instance so each tab remembers its own preference while mounted.
type SortBy = "size" | "name";
type SortDir = "asc" | "desc";
const MIN_SIZE_OPTIONS: { label: string; mb: number }[] = [
  { label: "All",      mb: 0 },
  { label: "≥1 MB",    mb: 1 },
  { label: "≥100 MB",  mb: 100 },
  { label: "≥1 GB",    mb: 1024 },
  { label: "≥5 GB",    mb: 5120 },
];

const TIER_META: Record<Tier, { label: string; note: string }> = {
  safe: {
    label: "Safe to delete",
    note: "These caches regenerate automatically. Cleaning has near-zero cost.",
  },
  probably_safe: {
    label: "Probably safe — opt in",
    note: "Bigger reclaim, but you'll re-fetch / re-cache something. Read each cost note before clicking.",
  },
  caution: {
    label: "Caution — review manually",
    note: "Never auto-deleted. Surfaces sizes so you can review and act in Finder/Terminal yourself.",
  },
};

function stripGlyph(s: string) {
  return s.replace(/^[\p{Extended_Pictographic}\p{Emoji}☀-➿]+\s*/u, "").trim() || s;
}

interface Props {
  catId: string;
  displayLabel?: string;
}

export function CategoryPanel({ catId, displayLabel }: Props) {
  const { scans, scanCategory, cleanAllTier, busy } = useDashboard();
  const cached = scans[catId];
  const scan = cached?.scan;
  const actions = cached?.actions ?? [];

  // Filter + sort state (v0.17.0). Defaults: show everything, sort by size desc.
  const [minMB, setMinMB] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortBy>("size");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Auto-scan on first mount if no cache.
  useEffect(() => {
    if (!cached) scanCategory(catId);
  }, [catId, cached, scanCategory]);

  const label = scan ? stripGlyph(scan.label) : displayLabel || catId;
  const tagline = scan?.tagline || "Loading…";

  // Docker.raw callout: when this is the docker tab and Docker.raw is found in caution.
  const dockerCallout = useMemo(() => {
    if (catId !== "docker" || !scan) return null;
    const cautionPaths = scan.groups.caution?.paths ?? [];
    const raw = cautionPaths
      .filter((p) => p.path.includes("Docker.raw") && p.exists && p.size_kb > 0)
      .sort((a, b) => b.size_kb - a.size_kb)[0];
    if (!raw) return null;
    const sizeLbl = raw.size_gb >= 0.01
      ? `${fmt(raw.size_gb)} GB`
      : raw.size_kb >= 1024
        ? `${Math.round(raw.size_kb / 1024)} MB`
        : `${raw.size_kb} KB`;
    return { sizeLbl, path: raw.path };
  }, [catId, scan]);

  return (
    <div className="glass rounded-lg border border-border/20 shadow-sm overflow-hidden">
      <header className="border-b border-border/10 px-6 py-5">
        <h2 className="m-0 inline-flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em]">
          <span className="text-accent">
            <TabIcon tabId={catId.split("-")[0]} className="h-4 w-4" />
          </span>
          {label}
        </h2>
        <div className="mt-1 text-[13px] leading-[1.5] text-fg-dim">{tagline}</div>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => scanCategory(catId)}
            className="flex-1 min-w-0 rounded-md border border-transparent bg-accent px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-40"
          >
            {scan ? "Re-scan" : "Scan"}
          </button>
          <TierButton catId={catId} tier="safe" />
          <TierButton catId={catId} tier="probably_safe" />
        </div>
        {scan && (
          <div className="mt-3.5 flex flex-wrap gap-4 text-[12px] tabular text-fg-dim">
            <Pill tone="safe">safe <strong>{fmt(scan.totals.safe || 0)} GB</strong></Pill>
            <Pill tone="warn">opt-in <strong>{fmt(scan.totals.probably_safe || 0)} GB</strong></Pill>
            <Pill tone="danger">caution <strong>{fmt(scan.totals.caution || 0)} GB</strong></Pill>
            <Pill tone="accent">cleanable <strong>{fmt(scan.total_cleanable_gb)} GB</strong></Pill>
          </div>
        )}
        {dockerCallout && (
          <div
            className="mt-3 flex items-center gap-2.5 rounded-md border-l-[3px] border-warn px-3 py-2.5 text-[12px] leading-[1.45]"
            style={{ background: "hsl(var(--warn) / 0.10)" }}
          >
            <Info className="h-3.5 w-3.5 flex-shrink-0 text-warn" />
            <div>
              <strong className="font-semibold">Docker.raw is {dockerCallout.sizeLbl}.</strong>{" "}
              Pruning shrinks what's INSIDE the VM, not the .raw file on disk. See{" "}
              <em className="text-fg-dim">How to actually shrink Docker.raw</em> below.{" "}
              <code className="font-mono text-[11px] text-fg-dim">{dockerCallout.path}</code>
            </div>
          </div>
        )}
      </header>

      {scan && (
        <div className="px-6 pt-3.5 pb-1">
          {/* Largest-files filter + sort toolbar (v0.17.0). Shared across all
              tiers in this category — hides individual rows under the threshold
              and re-sorts in place. */}
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-border/15 bg-bg-2 px-3 py-2 text-[11px] tabular">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">Min size</span>
            <div className="flex flex-wrap gap-1">
              {MIN_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.mb}
                  type="button"
                  onClick={() => setMinMB(opt.mb)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 transition-colors",
                    minMB === opt.mb
                      ? "border-accent text-accent"
                      : "border-border/20 text-fg-dim hover:border-border hover:text-fg",
                  )}
                  style={minMB === opt.mb ? { background: "hsl(var(--accent) / 0.10)" } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-faint">Sort</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSortBy("size")}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 transition-colors",
                  sortBy === "size"
                    ? "border-accent text-accent"
                    : "border-border/20 text-fg-dim hover:border-border hover:text-fg",
                )}
                style={sortBy === "size" ? { background: "hsl(var(--accent) / 0.10)" } : undefined}
              >
                Size
              </button>
              <button
                type="button"
                onClick={() => setSortBy("name")}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 transition-colors",
                  sortBy === "name"
                    ? "border-accent text-accent"
                    : "border-border/20 text-fg-dim hover:border-border hover:text-fg",
                )}
                style={sortBy === "name" ? { background: "hsl(var(--accent) / 0.10)" } : undefined}
              >
                Name
              </button>
              <button
                type="button"
                title={sortDir === "asc" ? "Ascending — switch to descending" : "Descending — switch to ascending"}
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="inline-flex items-center rounded-full border border-border/20 px-2.5 py-0.5 text-fg transition-colors hover:border-border"
              >
                {sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {(Object.keys(TIER_META) as Tier[]).map((tier) => {
            const group = scan.groups[tier];
            if (!group?.paths?.length) return null;
            const minKB = minMB * 1024;
            const filtered = (group.paths || []).filter((p) => minMB === 0 || p.size_kb >= minKB);
            const sorted = [...filtered].sort((a, b) => {
              let cmp: number;
              if (sortBy === "name") cmp = (a.label || "").localeCompare(b.label || "");
              else cmp = (a.size_gb || 0) - (b.size_gb || 0);
              return sortDir === "asc" ? cmp : -cmp;
            });
            if (sorted.length === 0) return null;
            const meta = TIER_META[tier];
            return (
              <div key={tier}>
                <h3
                  className={cn(
                    "mt-4.5 mb-2.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]",
                    tier === "safe" && "text-safe",
                    tier === "probably_safe" && "text-warn",
                    tier === "caution" && "text-danger",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      tier === "safe" && "bg-safe",
                      tier === "probably_safe" && "bg-warn",
                      tier === "caution" && "bg-danger",
                    )}
                  />
                  {meta.label}
                </h3>
                <div
                  className={cn(
                    "mb-2.5 rounded-md px-3 py-2.5 text-[12px] leading-[1.55] text-fg-dim",
                    tier === "caution" ? "" : "border border-border/10",
                  )}
                  style={
                    tier === "caution"
                      ? { background: "hsl(var(--danger) / 0.10)", color: "hsl(var(--fg))" }
                      : { background: "hsl(var(--bg-2) / 0.55)" }
                  }
                >
                  {meta.note}
                </div>
                {sorted.map((p, idx) => (
                  <PathRow key={p.path + idx} row={p} catId={catId} tier={tier} index={idx} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {actions.length > 0 && (
        <div className="px-6 pt-2 pb-6">
          <h3 className="mt-5.5 mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-dim">
            Predefined actions
          </h3>
          {actions.map((a) => (
            <ActionCard key={a.id} catId={catId} action={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function TierButton({ catId, tier }: { catId: string; tier: "safe" | "probably_safe" }) {
  const { scans, cleanAllTier, busy } = useDashboard();
  const scan = scans[catId]?.scan;
  const total = scan?.totals[tier] || 0;
  const label = tier === "safe" ? "Clean all safe" : "Clean opt-in";
  return (
    <button
      type="button"
      disabled={busy || total < 0.001}
      onClick={() => cleanAllTier(catId, tier)}
      className="flex-1 min-w-0 rounded-md border border-border/20 bg-[hsl(var(--bg-2)/0.55)] px-3.5 py-2 text-[12px] font-semibold text-fg tabular transition-colors hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {label}{scan ? ` · ${fmt(total)} GB` : ""}
    </button>
  );
}

function Pill({ tone, children }: { tone: "safe" | "warn" | "danger" | "accent"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 py-0.5",
        tone === "safe" && "text-safe",
        tone === "warn" && "text-warn",
        tone === "danger" && "text-danger",
        tone === "accent" && "text-fg",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "safe" && "bg-safe",
          tone === "warn" && "bg-warn",
          tone === "danger" && "bg-danger",
          tone === "accent" && "bg-accent",
        )}
      />
      {children}
    </span>
  );
}
