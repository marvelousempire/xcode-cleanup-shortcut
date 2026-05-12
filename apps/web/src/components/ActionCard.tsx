import { motion } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import type { Action } from "../lib/types";
import { Info } from "./icons";
import { cn } from "../lib/utils";

interface Props {
  catId: string;
  action: Action;
}

export function ActionCard({ catId, action }: Props) {
  const { runAction, busy } = useDashboard();
  return (
    <div
      className={cn(
        "mb-2.5 overflow-hidden rounded-md border border-border/10 transition-colors hover:border-border/30",
        action.informational && "border-l-[3px] border-l-accent",
      )}
      style={{ background: "hsl(var(--bg-2) / 0.55)" }}
    >
      {action.cost && <CostBlock kind="cost" text={action.cost} />}
      {action.sudo && (
        <CostBlock
          kind="sudo"
          text="This surfaces info only. Run the printed commands in your Terminal to actually delete."
          label="Sudo required"
        />
      )}
      <div className="p-4">
        <div className="text-[14px] font-semibold tracking-[-0.005em]">{action.label}</div>
        <div className="mt-1 text-[12px] leading-[1.55] text-fg-dim">{action.desc}</div>
        <button
          type="button"
          disabled={busy}
          onClick={() => runAction(catId, action.id, action.label, action.cost)}
          className={cn(
            "mt-3 rounded-md px-4 py-2 text-[12px] font-semibold transition-all",
            action.informational
              ? "border border-border/30 bg-transparent text-fg hover:bg-bg-3"
              : "bg-accent text-white hover:bg-accent-strong",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "active:scale-[0.97]",
          )}
        >
          {action.informational ? "Show details" : "Run"}
        </button>
      </div>
    </div>
  );
}

function CostBlock({ kind, text, label }: { kind: "cost" | "sudo"; text: string; label?: string }) {
  return (
    <motion.div
      whileHover={{ x: 1 }}
      transition={{ duration: 0.16, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        "flex items-start gap-2.5 border-l-[3px] px-3.5 py-2.5 text-[12px] leading-[1.5]",
        kind === "sudo" ? "border-l-danger" : "border-l-warn",
      )}
      style={{ background: kind === "sudo" ? "hsl(var(--danger) / 0.10)" : "hsl(var(--warn) / 0.10)" }}
    >
      <Info className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0", kind === "sudo" ? "text-danger" : "text-warn")} />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "mb-px block text-[10px] font-semibold uppercase tracking-[0.08em]",
            kind === "sudo" ? "text-danger" : "text-warn",
          )}
        >
          {label || "Cost of doing this"}
        </span>
        {text}
      </div>
    </motion.div>
  );
}
