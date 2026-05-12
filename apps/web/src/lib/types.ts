// Mirrors the data shape produced by web/cleaners.py + web/server.py.

export interface DiskStatus {
  free_gb: number;
  used_gb: number;
  total_gb: number;
  used_pct: number;
  version?: string;
}

export interface HistoryReport {
  runs: number;
  real_runs: number;
  total_freed_gb: number;
  max_freed_gb: number;
}

export type Tier = "safe" | "probably_safe" | "caution";

export interface PathEntry {
  label: string;
  path: string;
  size_kb: number;
  size_gb: number;
  exists: boolean;
}

export interface TierGroup {
  paths: PathEntry[];
}

export interface CategoryScan {
  id: string;
  label: string;
  icon: string;
  tagline: string;
  groups: Record<Tier, TierGroup>;
  totals: Record<Tier, number>;
  total_cleanable_gb: number;
  scan_ms: number;
}

export interface Action {
  id: string;
  label: string;
  desc: string;
  cost?: string;
  informational?: boolean;
  sudo?: boolean;
}

export interface TopLevelTab {
  id: string;
  label: string;
  category?: string;
  subcategories?: string[];
  meta?: boolean;
}

// Live stream events pushed from /api/live
export type LiveEvent =
  | { kind: "disk"; free_gb: number; used_gb: number; total_gb: number; used_pct: number; ts: number }
  | { kind: "load"; load_1: number; load_5: number; load_15: number; cpu_count: number; ts: number }
  | { kind: "memory"; pressure_pct: number; free_mb: number; total_mb: number; ts: number }
  | { kind: "top_io"; processes: { pid: number; name: string; mb: number }[]; ts: number }
  | { kind: "hello"; version: string; ts: number };
