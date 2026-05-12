import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import { Info, X } from "./icons";
import { cn } from "../lib/utils";

interface Props {
  title?: string;
  what: string;
  detail?: string;
  costText?: string;
  danger?: boolean;
  okLabel?: string;
  onResult: (result: boolean) => void;
}

export function ConfirmModal({ title, what, detail, costText, danger, okLabel, onResult }: Props) {
  // Submit on Enter, cancel on Escape (Radix already handles Escape).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") onResult(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onResult]);

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onResult(false); }}>
      <Dialog.Portal>
        <AnimatePresence>
          <Dialog.Overlay asChild>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 backdrop-blur-md"
              style={{ background: "hsl(240 5% 4% / 0.55)" }}
            />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
              className="fixed left-1/2 top-1/2 z-50 w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/20 bg-bg-1 shadow-lg overflow-hidden"
            >
              <header className="flex items-center justify-between border-b border-border/20 px-5 py-4">
                <Dialog.Title className="m-0 text-[16px] font-semibold">
                  {title || "Confirm"}
                </Dialog.Title>
                <Dialog.Close
                  className="rounded-md p-1 text-fg-dim hover:bg-bg-3 hover:text-fg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </Dialog.Close>
              </header>
              <div className="p-5">
                <p className="m-0 mb-1.5 text-[15px] font-semibold tracking-[-0.005em]">{what}</p>
                {detail && (
                  <p className="m-0 mb-3.5 break-all font-mono text-[12px] text-fg-dim">{detail}</p>
                )}
                {costText && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-md border-l-[3px] border-warn px-3.5 py-3" style={{ background: "hsl(var(--warn) / 0.10)" }}>
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-warn" />
                    <div>
                      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-warn">
                        Cost of doing this
                      </span>
                      <span className="text-[13px] leading-[1.5]">{costText}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onResult(false)}
                    className="rounded-md border border-border/20 px-4 py-2.5 text-[13px] font-semibold text-fg-dim transition-colors hover:border-border/40 hover:text-fg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onResult(true)}
                    autoFocus
                    className={cn(
                      "rounded-md border border-transparent px-4 py-2.5 text-[13px] font-semibold text-white transition-colors",
                      danger ? "bg-danger hover:bg-[hsl(0_75%_32%)]" : "bg-accent hover:bg-accent-strong",
                    )}
                  >
                    {okLabel || "Confirm"}
                  </button>
                </div>
              </div>
            </motion.div>
          </Dialog.Content>
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
