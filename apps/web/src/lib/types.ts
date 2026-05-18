// Mirrors the data shape produced by web/cleaners.py + web/server.py.

export interface DiskStatus {
  free_gb: number;
  used_gb: number;
  total_gb: number;
  used_pct: number;
  version?: string;
  server_host?: string;
  server_port?: number;
  server_scope?: "localhost" | "network" | string;
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
  /** v0.20.3: how many paths returned "Operation not permitted" from macOS TCC */
  permission_denied_count?: number;
  /** v0.20.3: human-readable labels of the denied paths */
  permission_denied_paths?: string[];
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

// Plan 0009 — Disk Doctor types ───────────────────────────────────────────────

export interface DoctorWin {
  category: string;
  label: string;
  path: string;
  size_gb: number;
  size_kb: number;
  tier: "safe";
}

export interface DoctorReport {
  free_gb: number;
  total_gb: number;
  free_pct: number;
  rescue_mode: boolean;
  warning_mode: boolean;
  quick_wins: DoctorWin[];
  total_cleanable_gb: number;
  categories_scanned: number;
}

/** Plan 0027 — Disk Growth Watch (/api/growth, SSE event `growth`). */
export interface GrowthWindowDelta {
  gb: number | null;
  pct: number | null;
  partial?: boolean;
}

export interface GrowthPathRow {
  id: string;
  label: string;
  path?: string;
  current_gb: number;
  deltas: {
    m3: GrowthWindowDelta;
    m9: GrowthWindowDelta;
    m20: GrowthWindowDelta;
  };
  disk_used?: boolean;
}

export interface GrowthPayload {
  ts: number;
  sample_interval_sec: number;
  paths: GrowthPathRow[];
  top_ids_m3: string[];
}

export interface LatestFileActivityItem {
  name: string;
  path: string;
  folder: string;
  extension: string;
  mime: string | null;
  size_bytes: number;
  size_mb: number;
  modified_ts: number;
  created_ts: number | null;
  age_seconds: number;
  source_app: string;
  runner_app: string;
  confidence: number;
  activity_score: number;
}

export interface LatestFileActivityPayload {
  ts: number;
  roots: Array<{ label: string; path: string }>;
  items: LatestFileActivityItem[];
  total_size_bytes?: number;
  total_size_mb?: number;
  errors: Array<{ root: string; error: string }>;
  scan_ms: number;
}

// Plan 0006 — AI + habits types ──────────────────────────────────────────────

/** AI mode state: whether the backend has Docker + DB configured. */
export interface AIStatus {
  docker_mode: boolean;
  /** Provider names that have an API key stored on the server. */
  providers: string[];
}

/** Growth-slope habit record for a single category. */
export interface Habit {
  category: string;
  growth_gb_per_week: number;
  /** Estimated days until the category hits its threshold. 9999 = never. */
  days_to_threshold: number;
  current_gb: number;
  threshold_gb: number;
  /** AI-generated recommendation text, or null. */
  recommendation: string | null;
}

/** A single scan or clean run recorded in the DB. */
export interface Run {
  id: number;
  ts: string;
  mode: "scan" | "clean";
  category: string | null;
  tier: string | null;
  freed_gb: number | null;
  duration_ms: number | null;
  disk_before_gb: number | null;
  disk_after_gb: number | null;
}

export interface PerformanceProcess {
  pid: number;
  name: string;
  cpu_pct: number;
  mem_pct: number;
  rss_mb: number;
}

export interface PerformanceNetworkRow {
  command: string;
  pid: number;
  user: string;
  protocol: string;
  name: string;
  remote?: string | null;
  scope?: "local" | "lan" | "vps" | "public" | "unknown" | string;
}

export interface PerformanceService {
  id: string;
  label: string;
  host: string;
  port: number;
  reachable: boolean;
  status: string;
  scope: "local" | "remote" | string;
  details?: string[];
}

export interface PerformanceActivityPath {
  label: string;
  path: string;
  exists: boolean;
  permission_denied: boolean;
  size_gb: number;
}

export interface PerformanceRecommendation {
  severity: "critical" | "warning" | "info" | string;
  title: string;
  action: string;
  target_tab?: string;
}

export interface PerformancePayload {
  ts: number;
  host: string;
  platform?: string;
  lan_ip: string | null;
  system: {
    disk: DiskStatus;
    load: {
      load_1: number;
      load_5: number;
      load_15: number;
      cpu_count: number;
      load_pct: number;
    };
    memory: {
      total_mb: number;
      free_mb: number;
      used_mb: number;
      used_pct: number;
    };
    swap?: {
      total_mb: number;
      free_mb: number;
      used_mb: number;
      used_pct: number;
    };
    battery?: {
      available: boolean;
      percent?: number | null;
      state?: string;
      raw?: string;
    };
    thermal?: {
      available: boolean;
      level?: string;
      raw?: string;
    };
  };
  processes: PerformanceProcess[];
  network: {
    available: boolean;
    listeners: PerformanceNetworkRow[];
    connections: PerformanceNetworkRow[];
    errors?: string[];
    message?: string;
  };
  services: PerformanceService[];
  series?: {
    disk?: Array<DiskStatus & { ts: number }>;
    load?: Array<PerformancePayload["system"]["load"] & { ts: number }>;
    memory?: Array<PerformancePayload["system"]["memory"] & { ts: number }>;
    swap?: Array<NonNullable<PerformancePayload["system"]["swap"]> & { ts: number }>;
  };
  bottlenecks?: PerformanceBottleneck[];
  activity: {
    heavy_paths: PerformanceActivityPath[];
    automation_processes: string[];
    recommendations: PerformanceRecommendation[];
  };
  controls: Array<{
    id: string;
    label: string;
    kind: string;
    target_tab?: string;
    approval_required: boolean;
  }>;
}

export interface PerformanceBottleneck {
  severity: "critical" | "warning" | "info" | string;
  title: string;
  detail: string;
  target_tab?: string;
}

export interface PerformanceBenchmarkResult {
  ts: number;
  duration_ms: number;
  overall: number;
  scores: Record<string, number | null>;
  notes: string[];
}

export interface PerformanceBenchmarkStatus {
  available: boolean;
  last_result: PerformanceBenchmarkResult | null;
}

// Live stream events pushed from /api/live
export type LiveEvent =
  | { kind: "disk"; free_gb: number; used_gb: number; total_gb: number; used_pct: number; ts: number }
  | { kind: "load"; load_1: number; load_5: number; load_15: number; cpu_count: number; ts: number }
  | { kind: "memory"; pressure_pct: number; free_mb: number; total_mb: number; ts: number }
  | { kind: "top_io"; processes: { pid: number; name: string; mb: number }[]; ts: number }
  | { kind: "hello"; version: string; ts: number };
