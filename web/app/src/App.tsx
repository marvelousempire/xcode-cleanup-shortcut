import { DashboardProvider, useDashboard } from "./state/DashboardContext";
import { AppHeader } from "./components/AppHeader";
import { SidebarLeft } from "./components/SidebarLeft";
import { SidebarRight } from "./components/SidebarRight";
import { OverviewPanel } from "./components/OverviewPanel";
import { CategoryPanel } from "./components/CategoryPanel";
import { OutputConsole } from "./components/OutputConsole";
import { ChangelogModal } from "./components/ChangelogModal";
import { SUB_LABELS } from "./components/SidebarRight";
import { cn } from "./lib/utils";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  return (
    <DashboardProvider>
      <AppBody />
    </DashboardProvider>
  );
}

function AppBody() {
  const {
    tabs,
    activeTab,
    activeSub,
    status,
    showChangelog,
    openChangelog,
    closeChangelog,
  } = useDashboard();

  const tab = tabs.find((t) => t.id === activeTab);
  const hasSub = !!tab?.subcategories?.length;
  const currentSub = hasSub ? activeSub[tab.id] || tab.subcategories![0] : null;

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-7 pb-24">
      <AppHeader status={status} onOpenChangelog={openChangelog} />

      <div
        className={cn("grid items-start gap-4.5", hasSub ? "lg:grid-cols-[220px_1fr_220px]" : "lg:grid-cols-[220px_1fr]")}
      >
        <SidebarLeft />

        <main className="min-w-0">
          {/* Mobile/tablet sub-nav: shown when right sidebar collapses */}
          {hasSub && tab?.subcategories && (
            <div className="lg:hidden mb-3 flex flex-wrap gap-1.5 rounded-md border border-border/20 bg-[hsl(var(--bg-2)/0.78)] p-2">
              {tab.subcategories.map((sub) => {
                const active = currentSub === sub;
                return (
                  <SubPillButton key={sub} sub={sub} active={active} />
                );
              })}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + ":" + (currentSub || "")}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab?.meta && tab.id === "overview" ? (
                <OverviewPanel />
              ) : hasSub && currentSub ? (
                <CategoryPanel catId={currentSub} displayLabel={SUB_LABELS[currentSub]} />
              ) : tab?.category ? (
                <CategoryPanel catId={tab.category} />
              ) : (
                <div className="text-center text-fg-faint py-12">Loading…</div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* On Overview, the terminal lives inside the 3-pane top — don't
              render a second copy at the bottom of the viewport. On every
              other tab, the bottom console is the only place output appears. */}
          {activeTab !== "overview" && <OutputConsole />}
        </main>

        {hasSub ? <SidebarRight /> : null}
      </div>

      <footer className="mt-9 text-center text-[12px] text-fg-dim">
        <div>
          <a
            href="https://github.com/marvelousempire/xcode-cleanup-shortcut"
            target="_blank"
            rel="noreferrer"
            className="border-b border-border/20 text-fg no-underline transition-colors hover:border-accent hover:text-accent"
          >
            marvelousempire/xcode-cleanup-shortcut
          </a>{" "}
          · MIT ·{" "}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); openChangelog(); }}
            className="border-b border-border/20 text-fg no-underline transition-colors hover:border-accent hover:text-accent"
          >
            Changelog
          </a>{" "}
          · localhost-only
        </div>
        {/* Copyright per the `learn-mappers-copyright` global rule —
            AVERY GOODMAN in all caps, UCC 1-308 reservation in the same block. */}
        <div className="mt-2 text-[11px] text-fg-faint tracking-[0.01em]">
          © 2026 Learn Mappers LLC DBA AVERY GOODMAN · All rights reserved · Intellectual property · UCC 1-308
        </div>
      </footer>

      <ChangelogModal open={showChangelog} onClose={closeChangelog} />
    </div>
  );
}

function SubPillButton({ sub, active }: { sub: string; active: boolean }) {
  const { setActiveSub, activeTab } = useDashboard();
  return (
    <button
      type="button"
      onClick={() => setActiveSub(activeTab, sub)}
      className={cn(
        "rounded-full border border-border/20 px-3 py-1.5 text-[12px] font-semibold transition-colors",
        active ? "border-accent text-accent-strong" : "text-fg-dim hover:text-fg",
      )}
      style={active ? { background: "hsl(var(--accent) / 0.10)" } : undefined}
    >
      {SUB_LABELS[sub] || sub}
    </button>
  );
}
