import { useDashboard } from "../state/DashboardContext";
import { UserLibraryAtlas } from "./UserLibraryAtlas";
import { cn } from "../lib/utils";

/**
 * Explain that most reclaimable clutter lives under the user folder and point
 * to the same surfaces DustPan already ships (survey, emergency, categories, FDA).
 */
export function HomeFolderAdvice() {
  const { setActiveTab } = useDashboard();

  return (
    <section
      className={cn(
        "mb-4 rounded-lg border px-4 py-3 shadow-sm",
        "border-accent/25 bg-[hsl(var(--accent)/0.06)]",
      )}
      aria-label="Help for disk space used by your home folder"
    >
      <div className="text-[12px] font-semibold text-fg leading-snug">
        Most wasted space hides in your user folder — here is how DustPan helps
      </div>
      <p className="text-[12px] text-fg-dim mt-1.5 mb-2 leading-[1.55] m-0">
        macOS keeps almost every safe-to-delete cache under{" "}
        <code className="rounded border border-border/20 bg-[hsl(var(--bg-1)/0.9)] px-1 py-0.5 font-mono text-[11px] text-fg">
          ~/Library
        </code>{" "}
        and your project folders (<code className="font-mono text-[11px]">~/Developer</code>,{" "}
        <code className="font-mono text-[11px]">Downloads</code>, Container sandboxes).
        DustPan splits those paths into tabs so you are not guessing in Finder.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            "rounded-md border border-border/25 bg-[hsl(var(--bg-2)/0.9)] px-3 py-1.5 text-[12px] font-semibold",
            "text-fg transition-colors hover:border-accent hover:text-accent",
          )}
          onClick={() => setActiveTab("survey")}
        >
          Space Survey crawl
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md border border-danger/35 bg-danger/10 px-3 py-1.5 text-[12px] font-semibold",
            "text-danger transition-colors hover:bg-[hsl(var(--danger)/0.18)]",
          )}
          onClick={() => setActiveTab("emergency")}
        >
          Emergency rescue tab
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md border border-border/25 bg-[hsl(var(--bg-2)/0.9)] px-3 py-1.5 text-[12px] font-semibold",
            "text-fg transition-colors hover:border-accent hover:text-accent",
          )}
          onClick={() => setActiveTab("xcode")}
        >
          Xcode &amp; caches
        </button>
      </div>
      <p className="text-[11px] text-fg-faint mt-2.5 mb-0 leading-[1.45]">
        If sizes read as zero or tiny but the disk feels full,
        macOS blocked <strong className="font-medium text-fg-dim">disk usage measurement</strong> — open{" "}
        <strong className="font-medium text-fg-dim">System Settings → Privacy &amp; Security → Full Disk Access</strong>,
        enable access for DustPan/Python, then quit and run <kbd className="font-mono">make ui</kbd> again so every row can populate.
      </p>

      <div className="mt-4 border-t border-border/15 pt-4">
        <UserLibraryAtlas />
      </div>
    </section>
  );
}
