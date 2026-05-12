"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

// Same DiskStatus shape the Python server emits at /api/status. Duplicated here
// rather than imported from @cleanup-hub/web so the Next app stays self-contained
// while the migration is incremental.
interface DiskStatus {
  free_gb: number;
  total_gb: number;
  used_gb: number;
  used_pct: number;
}

export default function Home() {
  const [status, setStatus] = useState<DiskStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Static-export Next sits behind basePath: "/next" so /api/* stays on the
    // Python server at the origin root. Direct fetch — no rewrites needed.
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <main className="mx-auto max-w-[640px] px-6 pt-16 pb-24">
      <header className="mb-8 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" aria-hidden />
        <h1 className="text-[20px] font-bold tracking-[-0.01em]">Cleanup Hub · Next</h1>
        <span className="ml-2 rounded-full border border-border/30 bg-bg-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-fg-dim">
          experimental
        </span>
      </header>

      <section className="rounded-xl border border-border/20 bg-bg-2 p-8 text-center shadow-sm">
        {err ? (
          <div className="text-[13px] text-danger">Failed to fetch /api/status: {err}</div>
        ) : !status ? (
          <div className="text-[13px] text-fg-faint">Checking disk…</div>
        ) : (
          <>
            <div className="text-[64px] font-bold leading-none tracking-[-0.04em] text-accent">
              {status.free_gb.toFixed(1)}
              <span className="ml-1 text-[24px] font-medium text-fg-dim tracking-[-0.01em]">GB free</span>
            </div>
            <div className="mt-3 text-[13px] tabular-nums text-fg-dim">
              {Math.round(status.used_gb)} GB used of {Math.round(status.total_gb)} GB · {Math.round(status.used_pct)}%
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.04em] text-fg-faint">
              <ShieldCheck className="h-3 w-3 text-safe" aria-hidden />
              Factory-fresh without losing your stuff
            </div>
          </>
        )}
      </section>

      <p className="mt-5 text-center text-[12px] leading-[1.55] text-fg-faint">
        This is a Next.js static export served by the Python backend at <code className="font-mono text-[11px]">/next</code>.
        The canonical UI is the Vite app at <code className="font-mono text-[11px]">/</code>; the vanilla UI is at{" "}
        <code className="font-mono text-[11px]">?legacy=1</code>.
      </p>

      <p className="mt-6 text-center text-[11px] text-fg-faint">
        © 2026 Learn Mappers LLC DBA AVERY GOODMAN · All rights reserved · Intellectual property · UCC 1-308
      </p>
    </main>
  );
}
