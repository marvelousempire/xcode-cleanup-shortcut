import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../lib/api";
import { X } from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

/** Ensure clock is HH:MM:SS for every release row. */
function normalizeClock(raw: string | undefined): string {
  if (!raw || !raw.trim()) return "00:00:00";
  const t = raw.trim();
  const parts = t.split(":").map((x) => x.trim());
  if (parts.length === 2 && /^\d{1,2}$/.test(parts[0]) && /^\d{2}$/.test(parts[1])) {
    const h = parts[0].padStart(2, "0");
    return `${h}:${parts[1]}:00`;
  }
  if (parts.length === 3) {
    const h = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const s = parts[2].padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return "00:00:00";
}

/** Readable titles; every release shows full Eastern time including seconds. */
function humanizeCanonicalChangelog(md: string): string {
  const re =
    /^## \[(\d+)\.(\d+)\.(\d+)\]\s*—\s*(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?\s*Eastern\s*·(.*)$/imu;
  return md.replace(/^##[^\n]*$/gm, (line) => {
    const m = line.trim().match(re);
    if (!m) return line;
    const ver = `${m[1]}.${m[2]}.${m[3]}`;
    const yyyy = Number(m[4]);
    const mm = Number(m[5]) - 1;
    const dd = Number(m[6]);
    const clockNorm = normalizeClock(m[7]);
    let tail = (m[8] ?? "").trim();
    const d = new Date(yyyy, mm, dd);
    if (!Number.isNaN(d.getTime())) {
      const long = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(d);
      if (tail.startsWith("*") && tail.endsWith("*")) tail = tail.slice(1, -1).trim();
      tail = tail.replace(/^\s*·\s*/, "").trim();
      const subtitle = tail ? ` — ${tail}` : "";
      return `## v${ver} · ${long} · ${clockNorm} Eastern${subtitle}`;
    }
    return line;
  });
}

function renderInline(s: string) {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

interface ParsedRelease {
  version: string;
  dateDisplay: string;
  clock: string;
  tagline: string;
  isoDate: string;
}

function parseReleaseHeader(lineAfterHashes: string): ParsedRelease | null {
  const t = lineAfterHashes.trim();
  const re =
    /^v([\d.]+) · (.+?) · (\d{2}:\d{2}:\d{2}) Eastern(?: — )?(.*)$/;
  const m = t.match(re);
  if (!m) return null;
  const version = m[1];
  const dateDisplay = m[2];
  let clock = m[3];
  if (/^\d{2}:\d{2}$/.test(clock)) clock = `${clock}:00`;
  const tagline = (m[4] ?? "").trim();
  let isoDate = "";
  const parsed = Date.parse(`${dateDisplay}`);
  if (!Number.isNaN(parsed)) isoDate = new Date(parsed).toISOString().slice(0, 10);
  return { version, dateDisplay, clock, tagline, isoDate };
}

function slugId(version: string) {
  return `changelog-ver-${version.replace(/\./g, "-")}`;
}

function renderMarkdownLines(lines: string[], skipFirstHr: boolean): string {
  let html = "";
  let inUl = false;
  const closeUl = () => { if (inUl) { html += "</ul>"; inUl = false; } };
  let firstHr = skipFirstHr;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("# ")) { closeUl(); continue; }
    const trim = line.trim();
    if (trim === "---") {
      closeUl();
      if (firstHr) firstHr = false;
      else html += '<hr class="changelog-hr" />';
      continue;
    }
    if (line.startsWith("### ")) { closeUl(); html += `<h3>${escapeHtml(line.slice(4))}</h3>`; }
    else if (line.startsWith("- ")) {
      if (!inUl) { html += "<ul>"; inUl = true; }
      html += `<li>${renderInline(line.slice(2))}</li>`;
    }
    else if (line === "") { closeUl(); }
    else { closeUl(); html += `<p>${renderInline(line)}</p>`; }
  }
  if (inUl) html += "</ul>";
  return html;
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  /** Each block: first line may be ## release or preamble # Changelog only */
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const line of lines) {
    if (line.startsWith("## ") && cur.length > 0) {
      blocks.push(cur);
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) blocks.push(cur);

  let out = "";
  for (const block of blocks) {
    const first = block[0]?.trimEnd() ?? "";
    if (!first.startsWith("## ")) {
      const onlyChangelogTitle = block.every((ln) => {
        const t = ln.trim();
        return t === "" || t === "# Changelog";
      });
      if (onlyChangelogTitle) continue;
      out += `<div class="changelog-preamble">${renderMarkdownLines(block, false)}</div>`;
      continue;
    }
    const headerText = first.slice(3).trim();
    const rest = block.slice(1);
    const parsed = parseReleaseHeader(headerText);

    const bodyInner = renderMarkdownLines(rest, true);

    if (parsed) {
      const id = slugId(parsed.version);
      out += `
<section class="changelog-release" aria-labelledby="${id}">
  <header class="changelog-release__hdr">
    <div class="changelog-release__hdrTop">
      <span id="${id}" class="changelog-release__ver">v${escapeHtml(parsed.version)}</span>
    </div>
    <div class="changelog-release__metaRow">
      <time${parsed.isoDate ? ` datetime="${escapeHtml(parsed.isoDate)}"` : ""} class="changelog-release__date">${escapeHtml(parsed.dateDisplay)}</time>
      <span class="changelog-release__sep" aria-hidden="true">·</span>
      <span class="changelog-release__timeBlock" title="US Eastern — ${escapeHtml(parsed.clock)}"><span class="tabular-nums">${escapeHtml(parsed.clock)}</span><span class="changelog-release__easternSuffix"> Eastern</span></span>
    </div>
    ${parsed.tagline ? `<p class="changelog-release__tagline">${renderInline(parsed.tagline)}</p>` : ""}
  </header>
  <div class="changelog-release__body">${bodyInner}</div>
</section>`;
    }
    else {
      out += `<section class="changelog-release changelog-release--legacy"><h2 class="changelog-release__h2-fallback">${escapeHtml(headerText)}</h2><div class="changelog-release__body">${bodyInner}</div></section>`;
    }
  }
  return out;
}

export function ChangelogModal({ open, onClose }: Props) {
  const [body, setBody] = useState<string>("Loading…");

  useEffect(() => {
    if (!open) return;
    setBody("Loading…");
    api.changelog()
      .then((md) => setBody(renderMarkdown(humanizeCanonicalChangelog(md))))
      .catch(() => setBody("Failed to load changelog."));
  }, [open]);

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
                    className="flex w-full max-w-[min(880px,calc(100vw-32px))] max-h-[88vh] flex-col overflow-hidden rounded-xl border border-border/25 bg-[hsl(var(--bg-1))] shadow-[0_24px_64px_-12px_hsl(240_6%_4%/0.45)]"
                  >
                    <header className="flex shrink-0 items-center justify-between border-b border-border/20 px-6 py-4 bg-[hsl(var(--bg-2)/0.45)]">
                      <div>
                        <Dialog.Title className="m-0 text-[17px] font-bold tracking-tight text-fg" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"SF Pro Text\", sans-serif" }}>
                          Changelog
                        </Dialog.Title>
                        <p className="m-0 mt-1 text-[12px] text-fg-dim leading-snug">
                          Each release shows US Eastern wall time with seconds (<span className="font-mono text-[11px] tabular-nums">HH:MM:SS</span>).
                        </p>
                      </div>
                      <Dialog.Close
                        className="rounded-lg p-1.5 text-fg-dim hover:bg-[hsl(var(--bg-3))] hover:text-fg transition-colors"
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </Dialog.Close>
                    </header>
                    <div
                      className="changelog-body overflow-y-auto px-7 py-6"
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
