import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { PerformanceBenchmarkResult } from "../../lib/types";
import { fmt } from "../../lib/utils";

export function BenchmarkCard() {
  const [result, setResult] = useState<PerformanceBenchmarkResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    void api.performanceBenchmark().then((payload) => setResult(payload.last_result)).catch(() => undefined);
  }, []);

  const run = async () => {
    setRunning(true);
    try {
      const next = await api.runPerformanceBenchmark();
      setResult(next);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-lg border border-border/15 bg-[hsl(var(--bg-2)/0.78)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-fg">DustBench</h2>
          <p className="text-[11px] leading-[1.5] text-fg-faint">DustPan-owned local benchmark, not a GeekBench-compatible claim.</p>
        </div>
        <button type="button" onClick={run} disabled={running} className="rounded-md border border-border/20 px-3 py-2 text-[12px] font-semibold text-fg-dim hover:border-accent hover:text-fg disabled:opacity-50">
          {running ? "Running..." : "Run benchmark"}
        </button>
      </div>
      <div className="mt-4 text-[34px] font-bold tabular text-accent">{result ? fmt(result.overall) : "--"}</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {Object.entries(result?.scores ?? {}).map(([key, value]) => (
          <div key={key} className="rounded-md bg-[hsl(var(--bg-3)/0.42)] px-3 py-2 text-[12px]">
            <span className="font-semibold text-fg">{key}</span>
            <span className="float-right tabular text-fg-dim">{value == null ? "n/a" : fmt(value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
