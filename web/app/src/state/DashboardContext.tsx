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
  CategoryScan,
  DiskStatus,
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

interface DashboardState {
  status: DiskStatus | null;
  history: HistoryReport | null;
  tabs: TopLevelTab[];
  allCategories: string[];
  scans: Record<string, ScanCache>;
  activeTab: string;
  activeSub: Record<string, string>;
  output: OutputLine[];
  outputVisible: boolean;
  busy: boolean;
  overviewAutoScanned: boolean;
  showChangelog: boolean;
  confirm: ConfirmOptions | null;

  setActiveTab: (tabId: string) => void;
  setActiveSub: (tabId: string, subId: string) => void;
  scanCategory: (catId: string) => Promise<void>;
  scanEverything: () => Promise<void>;
  cleanPath: (catId: string, path: string, label: string) => void;
  cleanAllTier: (catId: string, tier: "safe" | "probably_safe") => void;
  cleanEverywhere: (tier: "safe" | "probably_safe") => void;
  runAction: (catId: string, actionId: string, label: string, cost?: string) => void;
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
  const [activeTab, _setActiveTab] = useState<string>("overview");
  const [activeSub, setActiveSubState] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [outputVisible, setOutputVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [overviewAutoScanned, setOverviewAutoScanned] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const confirmResolverRef = useRef<((result: boolean) => void) | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Initial loads + 15s status poll (live SSE comes in Phase 3).
  useEffect(() => {
    const refresh = async () => {
      try { setStatus(await api.status()); } catch {}
    };
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.report().then(setHistory).catch(() => {});
  }, []);

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
    await Promise.all(allCategories.map((c) => scanCategory(c)));
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

  const value = useMemo<DashboardState>(
    () => ({
      status,
      history,
      tabs,
      allCategories,
      scans,
      activeTab,
      activeSub,
      output,
      outputVisible,
      busy,
      overviewAutoScanned,
      showChangelog,
      confirm,
      setActiveTab,
      setActiveSub,
      scanCategory,
      scanEverything,
      cleanPath,
      cleanAllTier,
      cleanEverywhere,
      runAction,
      openConfirm,
      closeOutput,
      openChangelog: () => setShowChangelog(true),
      closeChangelog: () => setShowChangelog(false),
    }),
    [
      status, history, tabs, allCategories, scans, activeTab, activeSub,
      output, outputVisible, busy, overviewAutoScanned, showChangelog, confirm,
      setActiveTab, setActiveSub, scanCategory, scanEverything, cleanPath,
      cleanAllTier, cleanEverywhere, runAction, openConfirm, closeOutput,
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
