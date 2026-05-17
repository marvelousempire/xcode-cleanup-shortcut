import type {
  DiskStatus,
  DoctorReport,
  GrowthPayload,
  HistoryReport,
  CategoryScan,
  Action,
  TopLevelTab,
  LiveEvent,
  AIStatus,
  Habit,
  PerformanceBenchmarkStatus,
  PerformancePayload,
  Run,
} from "./types";

const API_BASE = ""; // Same-origin in production; Vite proxy in dev.

// ── Plan 0023 Ship 2: proposal shape (matches web/proposals_store.py) ────
export interface Proposal {
  id:                    string;
  created_at:            number;
  resolved_at?:          number;
  status:                "pending" | "accepted" | "dismissed";
  name:                  string;
  category_id_suggested: string;
  rationale:             string;
  cost_to_user:          string;
  paths:                 Array<{ label: string; path: string; tier: "safe" | "probably_safe" | "caution" }>;
  shell?:                string | null;
  source:                string;
  /** v0.26.1 — "cleaner" (default) or "applescript" */
  kind?:                 "cleaner" | "applescript";
  /** v0.26.1 — for AppleScript proposals, the full .applescript body */
  script_body?:          string | null;
  /** v0.26.1 — suggested filename for an AppleScript proposal */
  file_name?:            string | null;
}

/** v0.27.0 — one entry per script in the AppleScript library */
export interface AppleScriptEntry {
  name:         string;       // e.g. "show-disk-status.applescript"
  stem:         string;       // e.g. "show-disk-status"
  script_path:  string;       // e.g. "applescripts/show-disk-status.applescript"
  size_bytes:   number;
  title:        string;       // from the doc's H1
  status:       string;       // e.g. "✅ Shipped in v0.26.0"
  type:         string;       // e.g. "Diagnostic + UI helper"
  intent:       string;       // first 500 chars of "The moment that prompted it"
  doc_path?:    string | null;
  doc_number?:  number | null;
}

/** v0.26.1 — structured artifacts returned for AppleScript proposals from /accept and /snippet */
export interface AppleScriptArtifacts {
  script:      string;
  script_path: string;
  doc:         string;
  doc_path:    string;
  file_name:   string;
  doc_number:  number;
}

async function jsonFetch<T>(path: string): Promise<T> {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json() as Promise<T>;
}

export interface EmergencyEstimate {
  by_action: Record<string, number>;
  total_reclaimable_gb: number;
  scan_ms: number;
}

export const api = {
  status:    () => jsonFetch<DiskStatus>("/api/status"),
  performance: () => jsonFetch<PerformancePayload>("/api/performance/status"),
  performanceSnapshot: () => jsonFetch<PerformancePayload>("/api/performance/snapshot"),
  performanceBenchmark: () => jsonFetch<PerformanceBenchmarkStatus>("/api/performance/benchmark"),
  runPerformanceBenchmark: () =>
    fetch(API_BASE + "/api/performance/benchmark/run", { method: "POST", body: "{}" })
      .then((r) => r.json()) as Promise<PerformanceBenchmarkStatus["last_result"]>,
  emergencyEstimate: () => jsonFetch<EmergencyEstimate>("/api/emergency/estimate"),
  growth:    () => jsonFetch<GrowthPayload>("/api/growth"),
  report:    () => jsonFetch<HistoryReport>("/api/report"),
  tabs:      () => jsonFetch<{ tabs: TopLevelTab[] }>("/api/tabs"),
  scan:      (catId: string) => jsonFetch<CategoryScan>(`/api/category/${catId}/scan`),
  actions:   (catId: string) => jsonFetch<{ actions: Action[] }>(`/api/category/${catId}/actions`),
  changelog: () => fetch(API_BASE + "/api/changelog").then((r) => r.text()),

  // ── Plan 0009: Disk Doctor ────────────────────────────────────────────────
  doctor: () => jsonFetch<DoctorReport>("/api/doctor"),

  // ── Plan 0006: AI + DB endpoints ──────────────────────────────────────────
  aiStatus: () => jsonFetch<AIStatus>("/api/ai/status"),
  habits:   () => jsonFetch<{ habits: Habit[] }>("/api/habits"),
  runs:     (limit = 50) => jsonFetch<{ runs: Run[] }>(`/api/runs?limit=${limit}`),

  settingsKeys: () => jsonFetch<{ providers: string[] }>("/api/settings/keys"),
  settingsOllama: () => jsonFetch<{ url: string; model: string }>("/api/settings/ollama"),

  saveKey: (provider: string, key: string) =>
    fetch(API_BASE + "/api/settings/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, key }),
    }).then((r) => r.json()),

  deleteKey: (provider: string) =>
    fetch(API_BASE + `/api/settings/keys/${provider}`, { method: "DELETE" }).then((r) => r.json()),

  // ── Plan 0023 Ship 2: cleaner proposals review inbox ─────────────────────
  proposals:           (status?: string) =>
    jsonFetch<{ proposals: Proposal[]; count: number }>(
      "/api/ai/proposals" + (status ? `?status=${status}` : "")
    ),
  proposalsCount:      () => jsonFetch<{ pending: number }>("/api/ai/proposals/count"),
  proposalSnippet:     (id: string) =>
    jsonFetch<{ proposal: Proposal; snippet: string; applescript?: AppleScriptArtifacts }>(`/api/ai/proposals/${id}/snippet`),
  editProposal:        (id: string, updates: Partial<Proposal>) =>
    fetch(API_BASE + `/api/ai/proposals/${id}/edit`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(updates),
    }).then(r => r.json()) as Promise<{ ok: true; proposal: Proposal }>,

  // ── Plan 0025: AppleScript library in-app surface ─────────────────────────
  applescripts:        () =>
    jsonFetch<{ library_available: boolean; scripts: AppleScriptEntry[]; count: number; philosophy: string }>("/api/applescripts"),
  applescriptBody:     (name: string) =>
    fetch(API_BASE + `/api/applescripts/${encodeURIComponent(name)}/body`).then(r => r.text()),
  applescriptDoc:      (name: string) =>
    fetch(API_BASE + `/api/applescripts/${encodeURIComponent(name)}/doc`).then(r => r.text()),
  applescriptRun:      (name: string) =>
    fetch(API_BASE + `/api/applescripts/${encodeURIComponent(name)}/run`, { method: "POST" })
      .then(r => r.json()) as Promise<{ ok: true; name: string; pid: number; hint: string }>,
  applescriptReveal:   (name: string) =>
    fetch(API_BASE + `/api/applescripts/${encodeURIComponent(name)}/reveal`, { method: "POST" })
      .then(r => r.json()) as Promise<{ ok: true; name: string }>,
  acceptProposal:      (id: string) =>
    fetch(API_BASE + `/api/ai/proposals/${id}/accept`, { method: "POST" }).then(r => r.json()) as Promise<{ ok: true; proposal: Proposal; snippet: string; applescript?: AppleScriptArtifacts }>,
  dismissProposal:     (id: string) =>
    fetch(API_BASE + `/api/ai/proposals/${id}/dismiss`, { method: "POST" }).then(r => r.json()) as Promise<{ ok: true; proposal: Proposal }>,

  saveOllama: (url: string, model: string) =>
    fetch(API_BASE + "/api/settings/ollama", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, model }),
    }).then((r) => r.json()),

  aiSummary: (category: string, provider?: string) =>
    fetch(API_BASE + "/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, provider }),
    }).then((r) => r.json()),
};

export type SSEMessage = { event: string; data: any };

/**
 * Stream an SSE endpoint, calling onMessage for each JSON-wrapped event line.
 * Returns the EventSource so the caller can close it.
 */
export function streamSSE(
  path: string,
  onMessage: (msg: SSEMessage) => void,
  onError?: (e: Event) => void,
): EventSource {
  const es = new EventSource(API_BASE + path);
  es.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data));
    } catch (e) {
      // ignore malformed frames
    }
  };
  if (onError) es.onerror = onError;
  return es;
}

/**
 * Open the live system stream and dispatch typed events. Returns a close fn.
 */
export function subscribeLive(onEvent: (ev: LiveEvent) => void): () => void {
  const es = new EventSource(API_BASE + "/api/live");
  es.onmessage = (ev) => {
    try {
      onEvent(JSON.parse(ev.data) as LiveEvent);
    } catch {
      /* ignore */
    }
  };
  return () => es.close();
}
