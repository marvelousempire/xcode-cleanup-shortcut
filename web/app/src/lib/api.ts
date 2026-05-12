import type {
  DiskStatus,
  HistoryReport,
  CategoryScan,
  Action,
  TopLevelTab,
  LiveEvent,
} from "./types";

const API_BASE = ""; // Same-origin in production; Vite proxy in dev.

async function jsonFetch<T>(path: string): Promise<T> {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json() as Promise<T>;
}

export const api = {
  status: () => jsonFetch<DiskStatus>("/api/status"),
  report: () => jsonFetch<HistoryReport>("/api/report"),
  tabs: () => jsonFetch<{ tabs: TopLevelTab[] }>("/api/tabs"),
  scan: (catId: string) => jsonFetch<CategoryScan>(`/api/category/${catId}/scan`),
  actions: (catId: string) => jsonFetch<{ actions: Action[] }>(`/api/category/${catId}/actions`),
  changelog: () => fetch(API_BASE + "/api/changelog").then((r) => r.text()),
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
