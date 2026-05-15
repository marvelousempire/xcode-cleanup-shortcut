import type { ReactNode } from "react";
import { useState } from "react";
import { useDashboard } from "../state/DashboardContext";
import { cn } from "../lib/utils";

const tabBtn =
  "rounded border border-border/25 bg-[hsl(var(--bg-1)/0.85)] px-2 py-0.5 text-[11px] font-semibold text-fg transition-colors hover:border-accent hover:text-accent";

type TabTarget = { tab: string; sub?: string; label: string };

function TabJump({ tab, sub, label }: TabTarget) {
  const { setActiveTab, setActiveSub } = useDashboard();
  return (
    <button
      type="button"
      className={tabBtn}
      onClick={() => {
        if (sub) setActiveSub(tab, sub);
        setActiveTab(tab);
      }}
    >
      {label}
    </button>
  );
}

function TabRow({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap items-center gap-1.5">{children}</div>;
}

function AtlasBlock({
  title,
  path,
  children,
  defaultOpen = false,
}: {
  title: string;
  path: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className={cn(
        "rounded-md border border-border/20 bg-[hsl(var(--bg-2)/0.45)] shadow-sm",
        "[&_summary::-webkit-details-marker]:hidden",
      )}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary
        className={cn(
          "cursor-pointer list-none px-3 py-2 text-[12px] font-semibold text-fg leading-snug",
          "border-b border-border/15 transition-colors hover:bg-[hsl(var(--bg-1)/0.35)]",
        )}
      >
        <span className="block">{title}</span>
        <code className="mt-0.5 block font-mono text-[10px] font-normal text-fg-dim">{path}</code>
      </summary>
      <div className="px-3 pb-3 pt-2 text-[11px] leading-[1.55] text-fg-dim">{children}</div>
    </details>
  );
}

/**
 * Deep reference: where macOS stacks weight under the user home folder,
 * with links into DustPan tabs (no duplicate prose in HomeFolderAdvice).
 */
export function UserLibraryAtlas() {
  return (
    <div className="space-y-2" aria-label="macOS Library folder reference">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-faint">
        Library atlas — heavy folders
      </div>
      <p className="text-[11px] text-fg-dim m-0 leading-[1.5]">
        These are the usual multi-gigabyte neighborhoods. Nothing here is cleaned automatically — use{" "}
        <strong className="font-medium text-fg-dim">Space Survey</strong> to measure, then the matching tab for
        safe actions.
      </p>

      <div className="grid gap-2 sm:grid-cols-1 md:grid-cols-2">
        <AtlasBlock title="Caches" path="~/Library/Caches" defaultOpen>
          <p className="m-0">
            Browser fragments, app thumbnails, Homebrew downloads, IDE index shards. Regenerates on next launch;
            total size often tracks how many apps you use, not how important the data is.
          </p>
          <TabRow>
            <TabJump tab="temp" label="Temp files" />
            <TabJump tab="browsers" label="Browsers" />
            <TabJump tab="apps" label="Apps" />
            <TabJump tab="space-eaters" label="Space Eaters" />
          </TabRow>
        </AtlasBlock>

        <AtlasBlock title="Application Support" path="~/Library/Application Support">
          <p className="m-0">
            Databases, sync metadata, chat indexes, game assets, <code className="font-mono text-[10px]">MobileSync/Backup</code>{" "}
            (full device backups). This folder is where “I deleted the app but still lost 40 GB” usually points.
          </p>
          <TabRow>
            <TabJump tab="apps" label="Apps" />
            <TabJump tab="llms" sub="llms-cursor" label="Cursor" />
            <TabJump tab="llms" sub="llms-chatgpt" label="ChatGPT" />
            <TabJump tab="llms" sub="llms-claude" label="Claude" />
            <TabJump tab="space-eaters" label="iOS backups" />
            <TabJump tab="creative" label="Creative" />
          </TabRow>
        </AtlasBlock>

        <AtlasBlock title="Containers (sandbox)" path="~/Library/Containers">
          <p className="m-0">
            Per-app sandboxes (<code className="font-mono text-[10px]">com.apple.*</code>, Docker, media pipelines).
            Photos analysis and Docker Desktop often hide very large trees here — not visible from the app’s
            &quot;cached data&quot; UI.
          </p>
          <TabRow>
            <TabJump tab="docker" label="Docker" />
            <TabJump tab="apps" label="Apps" />
            <TabJump tab="xcode" label="Xcode" />
            <TabJump tab="emergency" label="Emergency" />
          </TabRow>
        </AtlasBlock>

        <AtlasBlock title="Group Containers" path="~/Library/Group Containers">
          <p className="m-0">
            Shared storage for app groups (iCloud-enabled suites, developer toolchains, some Microsoft/Adobe stacks).
            Docker’s shared group data and <code className="font-mono text-[10px]">group.*</code> bundles accumulate here.
          </p>
          <TabRow>
            <TabJump tab="docker" label="Docker" />
            <TabJump tab="icloud" label="iCloud Drive" />
            <TabJump tab="apps" label="Apps" />
          </TabRow>
        </AtlasBlock>

        <AtlasBlock title="Developer" path="~/Library/Developer">
          <p className="m-0">
            Xcode <code className="font-mono text-[10px]">DerivedData</code>, <code className="font-mono text-[10px]">Archives</code>, and{" "}
            <code className="font-mono text-[10px]">CoreSimulator</code> device images. Routine bulk for iOS/macOS work;
            safe caches are rebuilt; simulators can be pruned selectively.
          </p>
          <TabRow>
            <TabJump tab="xcode" label="Xcode" />
            <TabJump tab="emergency" label="Emergency" />
          </TabRow>
        </AtlasBlock>

        <AtlasBlock title="Logs & diagnostics" path="~/Library/Logs">
          <p className="m-0">
            Crash reports, unified logging mirrors, vendor telemetry. Usually smaller than caches but worth checking on
            long-lived machines; old subfolders are often safe to remove after a quick look.
          </p>
          <TabRow>
            <TabJump tab="system" label="System" />
            <TabJump tab="temp" label="Temp files" />
          </TabRow>
        </AtlasBlock>

        <AtlasBlock title="Mobile Documents (iCloud)" path="~/Library/Mobile Documents">
          <p className="m-0">
            Local pillar for iCloud Drive and some app-document containers. Heavy when “Optimize Mac Storage” is off
            or large media lives in iCloud.
          </p>
          <TabRow>
            <TabJump tab="icloud" label="iCloud Drive" />
            <TabJump tab="survey" label="Space Survey" />
          </TabRow>
        </AtlasBlock>

        <AtlasBlock title="Saved state & preferences" path="~/Library/Saved Application State · Preferences">
          <p className="m-0">
            Window restoration, plist settings, small compared to Support/Containers — rarely the main disk hog. Touch
            only when you know which app you are resetting; DustPan favors explicit caches over these.
          </p>
          <TabRow>
            <TabJump tab="apps" label="Apps" />
          </TabRow>
        </AtlasBlock>
      </div>
    </div>
  );
}
