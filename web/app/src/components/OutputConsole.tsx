import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDashboard } from "../state/DashboardContext";
import { cn } from "../lib/utils";

export function OutputConsole() {
  const { output, outputVisible } = useDashboard();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [output.length]);

  return (
    <AnimatePresence>
      {outputVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 overflow-hidden rounded-lg border border-white/[0.06]"
          style={{ background: "hsl(240 5% 4% / 0.92)" }}
        >
          <div
            ref={scrollRef}
            className="overflow-y-auto px-5 py-4 font-mono text-[12px] leading-[1.6]"
            style={{ maxHeight: 360, color: "#F4F4F2", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          >
            {output.map((line) => (
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
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
