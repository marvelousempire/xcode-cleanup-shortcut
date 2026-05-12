import { motion } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import type { PathEntry, Tier } from "../lib/types";
import { cn, fmt } from "../lib/utils";

interface Props {
  row: PathEntry;
  catId: string;
  tier: Tier;
  index: number;
}

function sizeLabel(p: PathEntry): string {
  if (p.size_gb >= 0.01) return `${fmt(p.size_gb)} GB`;
  if (p.size_kb >= 1024) return `${Math.round(p.size_kb / 1024)} MB`;
  if (p.size_kb > 0) return `${p.size_kb} KB`;
  return "—";
}

export function PathRow({ row, catId, tier, index }: Props) {
  const { cleanPath } = useDashboard();
  const cleanable = (tier === "safe" || tier === "probably_safe") && row.exists && row.size_kb > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.4), duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "mb-1 flex items-center gap-3 rounded-md border border-border/10 px-3 py-2.5 text-[13px] transition-colors",
        row.exists ? "" : "opacity-40",
      )}
      style={{ background: "hsl(var(--bg-2) / 0.55)" }}
    >
      <div className="min-w-0 flex-1">
        <strong className="block font-medium">{row.label}</strong>
        <code className="mt-px block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] text-fg-faint">
          {row.path}
        </code>
      </div>
      <div className="min-w-[60px] text-right font-mono text-[12px] text-fg-dim tabular">
        {sizeLabel(row)}
      </div>
      {cleanable ? (
        <button
          type="button"
          onClick={() => cleanPath(catId, row.path, row.label)}
          className="ml-2 rounded-md border border-border/20 bg-bg-2 px-2.5 py-1 text-[11px] font-medium text-fg-dim transition-all hover:border-danger hover:bg-[hsl(var(--danger)/0.10)] hover:text-danger"
        >
          Clean
        </button>
      ) : (
        <span className="ml-2 inline-block min-w-[52px]" />
      )}
    </motion.div>
  );
}
