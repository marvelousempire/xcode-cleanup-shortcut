import type {
  DiskStatus,
  DoctorReport,
  HistoryReport,
  CategoryScan,
  Action,
  TopLevelTab,
  LiveEvent,
  AIStatus,
  Habit,
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
}

async function jsonFetch<T>(path: string): Promise<T> {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json() as Promise<T>;
}

export const api = {
  status:    () => jsonFetch<DiskStatus>("/api/status"),
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
    jsonFetch<{ proposal: Proposal; snippet: string }>(`/api/ai/proposals/${id}/snippet`),
  acceptProposal:      (id: string) =>
    fetch(API_BASE + `/api/ai/proposals/${id}/accept`, { method: "POST" }).then(r => r.json()) as Promise<{ ok: true; proposal: Proposal; snippet: string }>,
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
