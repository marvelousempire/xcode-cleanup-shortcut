import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

const STORAGE_KEY = "cleanupHub.coachmark.v15";

/**
 * First-visit coachmark that pulses a teal ring around the Overview cleanable-mix
 * panel; pill copy “click a category to drill in”. Dismisses on panel click or
 * 12s timeout. Uses `.pane-pie` as the anchor (historical class name).
 */
export function OnboardingCoachmark() {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Skip if the user has already dismissed it once.
    try { if (localStorage.getItem(STORAGE_KEY) === "1") return; } catch { return; }

    // Wait for the mix panel to mount.
    let attempts = 0;
    let cancelled = false;
    const findPane = () => {
      if (cancelled) return;
      const pane = document.querySelector<HTMLElement>(".pane-pie");
      if (!pane) {
        if (attempts++ < 30) setTimeout(findPane, 200);
        return;
      }
      setRect(pane.getBoundingClientRect());
      setVisible(true);
    };
    findPane();

    return () => { cancelled = true; };
  }, []);

  // Auto-dismiss after 12s, or on mix bar / legend click. The click handlers attach
  // 400ms after mount so the page's initial click (if any) doesn't trip them.
  useEffect(() => {
    if (!visible) return;
    const dismiss = () => {
      setVisible(false);
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    };
    const timeoutId = setTimeout(dismiss, 12000);
    let paneEl: HTMLElement | null = null;
    const attachId = setTimeout(() => {
      paneEl = document.querySelector(".pane-pie");
      paneEl?.addEventListener("click", dismiss, true);
    }, 400);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(attachId);
      paneEl?.removeEventListener("click", dismiss, true);
    };
  }, [visible]);

  // Re-anchor on window resize.
  useEffect(() => {
    if (!visible) return;
    const onResize = () => {
      const pane = document.querySelector<HTMLElement>(".pane-pie");
      if (pane) setRect(pane.getBoundingClientRect());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [visible]);

  if (!rect) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            position: "fixed",
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            border: "2px solid hsl(var(--accent))",
            borderRadius: 14,
            pointerEvents: "none",
            zIndex: 999,
            animation: "coach-pulse 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-[0.01em] text-white shadow-md"
            style={{ top: -32 }}
          >
            New: click a category to drill in
            <span
              className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-accent"
              style={{ bottom: -3 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
