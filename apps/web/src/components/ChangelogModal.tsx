import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import { X } from "./icons";
import { api } from "../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}
function renderInline(s: string) {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  let html = "";
  let inUl = false;
  const closeUl = () => { if (inUl) { html += "</ul>"; inUl = false; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("# ")) { closeUl(); continue; }
    if (line.startsWith("## ")) { closeUl(); html += `<h2>${escapeHtml(line.slice(3))}</h2>`; }
    else if (line.startsWith("### ")) { closeUl(); html += `<h3>${escapeHtml(line.slice(4))}</h3>`; }
    else if (line.startsWith("- ")) {
      if (!inUl) { html += "<ul>"; inUl = true; }
      html += `<li>${renderInline(line.slice(2))}</li>`;
    } else if (line === "") { closeUl(); }
    else { closeUl(); html += `<p>${renderInline(line)}</p>`; }
  }
  if (inUl) html += "</ul>";
  return html;
}

export function ChangelogModal({ open, onClose }: Props) {
  const [body, setBody] = useState<string>("Loading…");

  useEffect(() => {
    if (!open) return;
    setBody("Loading…");
    api.changelog().then((md) => setBody(renderMarkdown(md))).catch(() => setBody("Failed to load changelog."));
  }, [open]);

  // v0.18.1 — the Dialog.Overlay is now a flex container so the Dialog.Content
  // auto-centers regardless of viewport size, scroll position, or transform
  // origins from parent animations. Previous attempts used `left-1/2 top-1/2 +
  // translate(-50%,-50%)` which works in isolation but drifts when Radix
  // applies its own transform stack on top.
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <AnimatePresence>
          {open && (
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-8 backdrop-blur-md"
                style={{ background: "hsl(240 5% 4% / 0.55)" }}
              >
                <Dialog.Content asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 8 }}
                    transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                    className="flex w-full max-w-[720px] max-h-[85vh] flex-col overflow-hidden rounded-xl border border-border/20 bg-bg-1 shadow-lg"
                  >
                    <header className="flex shrink-0 items-center justify-between border-b border-border/20 px-5 py-4">
                      <Dialog.Title className="m-0 text-[16px] font-semibold">Changelog</Dialog.Title>
                      <Dialog.Close
                        className="rounded-md p-1 text-fg-dim hover:bg-bg-3 hover:text-fg transition-colors"
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </Dialog.Close>
                    </header>
                    <div
                      className="changelog-body overflow-y-auto px-6 py-5"
                      dangerouslySetInnerHTML={{ __html: body }}
                    />
                  </motion.div>
                </Dialog.Content>
              </motion.div>
            </Dialog.Overlay>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
