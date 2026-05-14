import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { api, streamSSE } from "../lib/api";
import type {
  Action,
  AIStatus,
  CategoryScan,
  DiskStatus,
  DoctorReport,
  Habit,
  HistoryReport,
  TopLevelTab,
} from "../lib/types";

export interface ConfirmOptions {
  title?: string;
  what: string;
  detail?: string;
  costText?: string;
  danger?: boolean;
  okLabel?: string;
}

export type OutputLine = { id: number; text: string; cls?: "ok" | "warn" | "err" | "dim" };

export interface ScanCache {
  scan: CategoryScan;
  actions: Action[];
}

export interface RunningClean {
  token: string;
  category: string;
  kind: string;
  started_at: number;
}

interface DashboardState {
  status: DiskStatus | null;
  history: HistoryReport | null;
  tabs: TopLevelTab[];
  allCategories: string[];
  scans: Record<string, ScanCache>;
  runningCleans: RunningClean[];
  activeTab: string;
  activeSub: Record<string, string>;
  output: OutputLine[];
  outputVisible: boolean;
  busy: boolean;
  /** True while scanEverything() is in flight. Separate from `busy` so the
   * scan button can show a spinner without also blocking the clean buttons. */
  scanning: boolean;
  overviewAutoScanned: boolean;
  showChangelog: boolean;
  confirm: ConfirmOptions | null;
  /** Plan 0006: AI status — docker_mode + configured providers. */
  aiStatus: AIStatus | null;
  /** Plan 0006: habit records for each category. Empty when DB not available. */
  habits: Habit[];
  /** Plan 0009: doctor report — ranked safe items across all scanned categories. */
  doctorReport: DoctorReport | null;
  /** Plan 0023 Ship 2: pending AI cleaner proposals (for sidebar badge). */
  pendingProposals: number;
  refreshProposalsCount: () => void;

  setActiveTab: (tabId: string) => void;
  setActiveSub: (tabId: string, subId: string) => void;
  scanCategory: (catId: string) => Promise<void>;
  scanEverything: () => Promise<void>;
  cleanPath: (catId: string, path: string, label: string) => void;
  cleanAllTier: (catId: string, tier: "safe" | "probably_safe") => void;
  cleanEverywhere: (tier: "safe" | "probably_safe") => void;
  runAction: (catId: string, actionId: string, label: string, cost?: string) => void;
  /** Like runAction but skips the confirm dialog — for Emergency panel where cards already explain everything. */
  runActionDirect: (catId: string, actionId: string, label: string, onDone?: (freed_gb: number) => void) => void;
  openConfirm: (opts: ConfirmOptions) => Promise<boolean>;
  closeOutput: () => void;
  openChangelog: () => void;
  closeChangelog: () => void;
}

const DashboardCtx = createContext<DashboardState | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardCtx);
  if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
  return ctx;
}

let nextLineId = 1;

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DiskStatus | null>(null);
  const [history, setHistory] = useState<HistoryReport | null>(null);
  const [tabs, setTabs] = useState<TopLevelTab[]>([]);
  const [scans, setScans] = useState<Record<string, ScanCache>>({});
  // Live running-cleans (v0.15.0). Server pushes via /api/live; UI renders a
  // header chip + the heavier elevations down the road key off this state.
  const [runningCleans, setRunningCleans] = useState<RunningClean[]>([]);
  const [activeTab, _setActiveTab] = useState<string>("overview");
  const [activeSub, setActiveSubState] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [outputVisible, setOutputVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [overviewAutoScanned, setOverviewAutoScanned] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [pendingProposals, setPendingProposals] = useState<number>(0);

  const refreshProposalsCount = useCallback(() => {
    fetch("/api/ai/proposals/count")
      .then(r => r.ok ? r.json() : null)
      .then(d => setPendingProposals(d?.pending ?? 0))
      .catch(() => { /* ignore */ });
  }, []);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const confirmResolverRef = useRef<((result: boolean) => void) | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Replaces the 15s status poll with the v0.15.0 /api/live SSE channel —
  // status deltas + running-cleans events arrive in real time. Initial fetch
  // still runs once so the hero doesn't sit blank waiting for the first delta.
  useEffect(() => {
    let liveES: EventSource | null = null;
    let backoffMs = 1000;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      try { liveES?.close(); } catch { /* ignore */ }
      liveES = new EventSource("/api/live");
      liveES.onopen = () => { backoffMs = 1000; };
      liveES.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.event === "status") setStatus(msg.data);
          else if (msg.event === "running") setRunningCleans(msg.data || []);
        } catch { /* ignore malformed frames */ }
      };
      liveES.onerror = () => {
        try { liveES?.close(); } catch { /* ignore */ }
        if (cancelled) return;
        reconnectTimer = setTimeout(connect, backoffMs);
        backoffMs = Math.min(backoffMs * 1.6, 15000);
      };
    };

    // One-shot fetch primes the hero immediately; live channel handles deltas after.
    api.status().then(setStatus).catch(() => { /* ignore */ });
    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { liveES?.close(); } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    api.report().then(setHistory).catch(() => {});
  }, []);

  // ── SADPA: Smart Auto-Detector Protector Agent (plan 0011) ───────────────
  // Monitors free_gb via the live SSE channel (already running — no extra
  // polling). Two tiers of response:
  //   < 1 GB  → navigate immediately to Emergency Rescue panel
  //   < 10 GB → auto-scan so RescueBanner / QuickWins have real data
  const autoScannedRef   = useRef(false);
  const autoEmergencyRef = useRef(false);
  useEffect(() => {
    if (!status) return;
    // Tier 1 — absolute zero: open Emergency panel immediately
    if (status.free_gb < 1 && !autoEmergencyRef.current) {
      autoEmergencyRef.current = true;
      setActiveTab("emergency");
    }
    // Tier 2 — critically low: kick off a full scan in background
    if (status.free_gb < 10 && !autoScannedRef.current) {
      autoScannedRef.current = true;
      setTimeout(() => void scanEverythingRef.current?.(), 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.free_gb]);

  // Plan 0006: load AI status + habits on mount. Both are soft — failures are silent.
  useEffect(() => {
    api.aiStatus().then(setAiStatus).catch(() => {});
    api.habits().then((d) => setHabits(d.habits ?? [])).catch(() => {});
  }, []);

  // Plan 0023 Ship 2: poll proposals count for the sidebar badge.
  useEffect(() => {
    refreshProposalsCount();
    const iv = setInterval(refreshProposalsCount, 30_000);
    return () => clearInterval(iv);
  }, [refreshProposalsCount]);

  // Plan 0009: load doctor report on mount (empty until first scan).
  // Refreshed after every scan so QuickWins + RescueBanner stay current.
  const refreshDoctor = () => {
    api.doctor().then(setDoctorReport).catch(() => {});
  };
  useEffect(() => { refreshDoctor(); }, []);

  useEffect(() => {
    api.tabs().then((d) => {
      setTabs(d.tabs);
      // Initialize default active-sub for each subcategory tab.
      const subInit: Record<string, string> = {};
      d.tabs.forEach((t) => {
        if (t.subcategories?.length) subInit[t.id] = t.subcategories[0];
      });
      setActiveSubState(subInit);
    });
  }, []);

  const allCategories = useMemo(() => {
    const out: string[] = [];
    for (const t of tabs) {
      if (t.meta) continue;
      if (t.subcategories) out.push(...t.subcategories);
      else if (t.category) out.push(t.category);
    }
    return out;
  }, [tabs]);

  const setActiveTab = useCallback(
    (tabId: string) => {
      _setActiveTab(tabId);
      // Overview auto-scans on first activation.
      if (tabId === "overview" && !overviewAutoScanned) {
        setOverviewAutoScanned(true);
        // Defer one tick so the panel mounts first.
        setTimeout(() => void scanEverythingRef.current?.(), 30);
      }
    },
    [overviewAutoScanned],
  );

  // Overview is the default activeTab on first mount, so setActiveTab("overview")
  // is never called and the auto-scan above never fires. Mirror the trigger here
  // once tabs have loaded — runs exactly once per session.
  useEffect(() => {
    if (
      activeTab === "overview" &&
      !overviewAutoScanned &&
      tabs.length > 0
    ) {
      setOverviewAutoScanned(true);
      setTimeout(() => void scanEverythingRef.current?.(), 30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length]);

  const setActiveSub = useCallback((tabId: string, subId: string) => {
    setActiveSubState((prev) => ({ ...prev, [tabId]: subId }));
  }, []);

  const appendLine = useCallback((text: string, cls?: OutputLine["cls"]) => {
    setOutput((prev) => {
      const next = [...prev, { id: nextLineId++, text, cls }];
      return next.slice(-500); // cap memory
    });
    setOutputVisible(true);
  }, []);

  const scanCategory = useCallback(async (catId: string) => {
    try {
      const [scan, actions] = await Promise.all([api.scan(catId), api.actions(catId)]);
      setScans((prev) => ({ ...prev, [catId]: { scan, actions: actions.actions } }));
    } catch {
      /* ignore individual failures */
    }
  }, []);

  const scanEverythingRef = useRef<(() => Promise<void>) | null>(null);
  const scanEverything = useCallback(async () => {
    if (!allCategories.length) return;
    setScanning(true);
    try {
      await Promise.all(allCategories.map((c) => scanCategory(c)));
      // Refresh habits + doctor report after full re-scan.
      api.habits().then((d) => setHabits(d.habits ?? [])).catch(() => {});
      refreshDoctor();
    } finally {
      setScanning(false);
    }
  }, [allCategories, scanCategory]);
  scanEverythingRef.current = scanEverything;

  const openConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setConfirm(opts);
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, []);

  // Stop a running SSE if any (used internally before starting a new one).
  const stopStream = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  };

  const closeOutput = useCallback(() => {
    setOutputVisible(false);
    setOutput([]);
  }, []);

  const handleStream = useCallback(
    (path: string, headerLine: string, onDone: (freedGb: number) => void) => {
      setBusy(true);
      setOutput([]);
      setOutputVisible(true);
      appendLine(headerLine, "dim");
      stopStream();
      esRef.current = streamSSE(
        path,
        (msg) => {
          if (msg.event === "line") {
            const line = msg.data as string;
            let cls: OutputLine["cls"] | undefined;
            if (line.startsWith("▶") || line.startsWith("✓")) cls = "ok";
            else if (line.startsWith("  cleaning:")) cls = "dim";
            else if (line.startsWith("  cost:")) cls = "warn";
            else if (line.toLowerCase().includes("error")) cls = "err";
            else if (line.startsWith("[")) cls = "warn";
            appendLine(line, cls);
          } else if (msg.event === "done") {
            esRef.current?.close();
            esRef.current = null;
            const freed = (msg.data?.freed_gb ?? 0) as number;
            appendLine(`✓ Done. Freed ${freed.toFixed(1)} GB.`, "ok");
            setBusy(false);
            api.status().then(setStatus).catch(() => {});
            api.report().then(setHistory).catch(() => {});
            onDone(freed);
          }
        },
        () => {
          esRef.current?.close();
          esRef.current = null;
          appendLine("✗ Connection lost.", "err");
          setBusy(false);
        },
      );
    },
    [appendLine],
  );

  const cleanPath = useCallback(
    (catId: string, path: string, label: string) => {
      openConfirm({
        title: "Confirm cleanup",
        what: `Clean "${label}"?`,
        detail: path,
        costText:
          "Deletes the contents of this path (rm -rf <path>/*). Cannot be undone — but only safe-tier and opt-in paths are surfaced for one-click cleaning, so the worst case is a re-cache.",
        danger: true,
        okLabel: "Clean this path",
      }).then((ok) => {
        if (!ok) return;
        handleStream(
          `/api/clean-path?category=${encodeURIComponent(catId)}&path=${encodeURIComponent(path)}`,
          `→ Clean: ${label} (${path})`,
          () => scanCategory(catId),
        );
      });
    },
    [handleStream, openConfirm, scanCategory],
  );

  const cleanAllTier = useCallback(
    (catId: string, tier: "safe" | "probably_safe") => {
      const tierLabel = tier === "safe" ? "all safe" : "all opt-in";
      const scan = scans[catId]?.scan;
      const gb = scan ? scan.totals[tier] || 0 : 0;
      openConfirm({
        title: "Confirm cleanup",
        what: `Clean ${tierLabel} paths in ${scan?.label || catId}?`,
        detail: `Frees ~${gb.toFixed(1)} GB. Runs the same rm -rf each per-path button runs.`,
        costText:
          tier === "safe"
            ? "First build after this regenerates the affected caches (typically ~30s extra)."
            : "Opt-in caches you've selectively trusted — re-fetched on next use. Reviewable below before you confirm.",
        danger: true,
        okLabel: `Clean ${tier === "safe" ? "safe-tier" : "opt-in-tier"}`,
      }).then((ok) => {
        if (!ok) return;
        handleStream(
          `/api/clean-all-safe?category=${encodeURIComponent(catId)}&tier=${encodeURIComponent(tier)}`,
          `→ Clean ${tierLabel} in ${catId}`,
          () => scanCategory(catId),
        );
      });
    },
    [handleStream, openConfirm, scanCategory, scans],
  );

  const cleanEverywhere = useCallback(
    (tier: "safe" | "probably_safe") => {
      const label = tier === "safe" ? "ALL safe" : "ALL opt-in";
      let total = 0;
      for (const c of allCategories) {
        const s = scans[c]?.scan;
        if (s) total += s.totals[tier] || 0;
      }
      openConfirm({
        title: "Confirm cleanup",
        what: `Clean ${label} across every category?`,
        detail: `Frees ~${total.toFixed(1)} GB total. Same rm -rf the per-tab buttons run, just batched.`,
        costText:
          tier === "safe"
            ? "First build after this regenerates Xcode caches (~30s extra). Browser caches re-fetch. LLM tool indexes rebuild on next open. Caution-tier items are NOT touched."
            : "Opt-in caches you've explicitly trusted are removed. Plus everything safe. Caution-tier items are still NOT touched.",
        danger: true,
        okLabel: `Clean ${tier === "safe" ? "safe-tier" : "opt-in-tier"} everywhere`,
      }).then((ok) => {
        if (!ok) return;
        handleStream(
          `/api/clean-everything?tier=${encodeURIComponent(tier)}`,
          `→ Clean ${label} across every category`,
          () => void scanEverything(),
        );
      });
    },
    [allCategories, handleStream, openConfirm, scanEverything, scans],
  );

  const runAction = useCallback(
    (catId: string, actionId: string, label: string, cost?: string) => {
      openConfirm({
        title: "Confirm action",
        what: `Run "${label}"?`,
        costText: cost || "Read the cost note above before confirming.",
        okLabel: "Run",
      }).then((ok) => {
        if (!ok) return;
        handleStream(
          `/api/run?category=${encodeURIComponent(catId)}&action=${encodeURIComponent(actionId)}`,
          `→ ${label}`,
          () => scanCategory(catId),
        );
      });
    },
    [handleStream, openConfirm, scanCategory],
  );

  /**
   * runActionDirect — no confirm dialog. The Emergency panel cards already
   * explain exactly what will be deleted and why; an extra modal is friction
   * when the disk is at zero. The onDone callback receives the actual freed_gb
   * from the SSE `done` event so the panel can update per-card counters live.
   */
  const runActionDirect = useCallback(
    (catId: string, actionId: string, label: string, onDone?: (freed_gb: number) => void) => {
      handleStream(
        `/api/run?category=${encodeURIComponent(catId)}&action=${encodeURIComponent(actionId)}`,
        `→ ${label}`,
        (freed_gb: number) => {
          scanCategory(catId);
          onDone?.(freed_gb);
        },
      );
    },
    [handleStream, scanCategory],
  );

  const value = useMemo<DashboardState>(
    () => ({
      status,
      history,
      tabs,
      allCategories,
      scans,
      runningCleans,
      activeTab,
      activeSub,
      output,
      outputVisible,
      busy,
      scanning,
      overviewAutoScanned,
      showChangelog,
      confirm,
      aiStatus,
      habits,
      doctorReport,
      pendingProposals,
      refreshProposalsCount,
      setActiveTab,
      setActiveSub,
      scanCategory,
      scanEverything,
      cleanPath,
      cleanAllTier,
      cleanEverywhere,
      runAction,
      runActionDirect,
      openConfirm,
      closeOutput,
      openChangelog: () => setShowChangelog(true),
      closeChangelog: () => setShowChangelog(false),
    }),
    [
      status, history, tabs, allCategories, scans, runningCleans, activeTab, activeSub,
      output, outputVisible, busy, scanning, overviewAutoScanned, showChangelog, confirm,
      aiStatus, habits, doctorReport, pendingProposals, refreshProposalsCount,
      setActiveTab, setActiveSub, scanCategory, scanEverything, cleanPath,
      cleanAllTier, cleanEverywhere, runAction, runActionDirect, openConfirm, closeOutput,
    ],
  );

  // Bridge the confirm resolution from JSX -> resolver.
  const resolveConfirm = useCallback((result: boolean) => {
    confirmResolverRef.current?.(result);
    confirmResolverRef.current = null;
    setConfirm(null);
  }, []);

  return (
    <DashboardCtx.Provider value={value}>
      {children}
      {/* Confirm modal: rendered here so it can resolve its promise on click. */}
      {confirm && (
        <ConfirmModal
          {...confirm}
          onResult={resolveConfirm}
        />
      )}
    </DashboardCtx.Provider>
  );
}

// Local inline confirm modal so the provider can own its lifecycle.
import { ConfirmModal } from "../components/ConfirmModal";
