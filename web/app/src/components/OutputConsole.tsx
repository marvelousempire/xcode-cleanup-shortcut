import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { cn } from "../lib/utils";

interface Props {
  /** When `embedded`, the terminal is always rendered (no collapse animation)
   * with an idle placeholder when there's no output. Used inside the Overview
   * 3-pane top where the terminal is part of the layout, not an optional
   * surface that appears below the main content. */
  embedded?: boolean;
  className?: string;
  /** When set, the terminal body fills its parent's height. Used in the
   * Overview pie/terminal row where the parent grid cell defines size. */
  fillHeight?: boolean;
}

export function OutputConsole({ embedded = false, className, fillHeight = false }: Props) {
  const { output, outputVisible } = useDashboard();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [output.length]);

  const body = (
    <div
      ref={scrollRef}
      className={cn(
        "overflow-y-auto px-5 py-4 font-mono text-[12px] leading-[1.6]",
        fillHeight && "h-full",
      )}
      style={{
        maxHeight: fillHeight ? undefined : 360,
        minHeight: fillHeight ? 180 : undefined,
        color: "#F4F4F2",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {output.length === 0 ? (
        <span className="italic text-[#6B6B73]">
          Idle — nothing is running. Hit Scan or Clean to see live output.
        </span>
      ) : (
        output.map((line) => (
          <motion.span
            key={line.id}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "block",
              line.cls === "ok" && "text-[#22C55E]",
              line.cls === "warn" && "text-[#FBBF24]",
              line.cls === "err" && "text-[#EF4444]",
              line.cls === "dim" && "text-[#9B9BA3]",
            )}
          >
            {line.text}
          </motion.span>
        ))
      )}
    </div>
  );

  // Embedded mode = always-visible (the Overview terminal pane). No animation
  // on mount/unmount because the pane itself owns its lifecycle.
  if (embedded) {
    return (
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-md border border-white/[0.06]",
          fillHeight && "h-full flex-1",
          className,
        )}
        style={{ background: "hsl(240 5% 4% / 0.92)" }}
      >
        {body}
      </div>
    );
  }

  // Standalone mode = the bottom output console on non-Overview tabs. Collapses
  // when there's no output to render.
  return (
    <AnimatePresence>
      {outputVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={cn("mt-5 overflow-hidden rounded-lg border border-white/[0.06]", className)}
          style={{ background: "hsl(240 5% 4% / 0.92)" }}
        >
          {body}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
