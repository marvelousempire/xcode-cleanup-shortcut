import { useState } from "react";
import { DashboardProvider, useDashboard } from "./state/DashboardContext";
import { AppHeader } from "./components/AppHeader";
import { SidebarLeft } from "./components/SidebarLeft";
import { SidebarRight } from "./components/SidebarRight";
import { OverviewPanel } from "./components/OverviewPanel";
import { CategoryPanel } from "./components/CategoryPanel";
import { AISettingsPanel } from "./components/AISettingsPanel";
import { AgentPanel } from "./components/AgentPanel";
import { EmergencyPanel } from "./components/EmergencyPanel";
import { SurveyPanel } from "./components/SurveyPanel";
import { OutputConsole } from "./components/OutputConsole";
import { ChangelogModal } from "./components/ChangelogModal";
import { AboutModal } from "./components/AboutModal";
import { RunningWidget } from "./components/RunningWidget";
import { OnboardingCoachmark } from "./components/OnboardingCoachmark";
import { DiskAlarmBar } from "./components/DiskAlarmBar";
import { SUB_LABELS } from "./components/SidebarRight";
import { cn } from "./lib/utils";
// `motion` / `AnimatePresence` removed in v0.18.4 — see comment on the panel
// switch below. Individual components still use Motion as needed.

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
  const [showAbout, setShowAbout] = useState(false);

  const tab = tabs.find((t) => t.id === activeTab);
  const hasSub = !!tab?.subcategories?.length;
  const currentSub = hasSub ? activeSub[tab.id] || tab.subcategories![0] : null;

  return (
    <>
      {/* ── DiskAlarmBar: full-viewport-width emergency strip, outside the
          max-width container so it bleeds edge-to-edge. Always visible
          regardless of active tab. Updates every 2 s via SSE. ── */}
      <DiskAlarmBar />

      <div className="mx-auto max-w-[1280px] px-6 pt-7 pb-24">
        <div className="flex items-center">
          <div className="flex-1 min-w-0">
            <AppHeader status={status} onOpenChangelog={openChangelog} />
          </div>
          <RunningWidget />
        </div>
      <OnboardingCoachmark />

      <div
        className={cn(
          // v0.18.2 — port the v0.14 vanilla breakpoint ladder so the layout
          // works below 1024px instead of collapsing to one column. Before
          // this, anything narrower than `lg:` (1024px) stacked the sidebar
          // on top and the main viewport BELOW it — looked like the page was
          // missing because you had to scroll down to find it.
          //   < md (768px) → 1 column (sidebar on top, main scrolls below)
          //   md to lg     → 2 columns (sidebar + main); subcategories show
          //                  as an inline pill row above the panel
          //   lg+          → 2 or 3 columns (right sidebar appears when the
          //                  active tab has subcategories)
          "grid items-start gap-4.5",
          "md:grid-cols-[220px_1fr]",
          hasSub ? "lg:grid-cols-[220px_1fr_220px]" : "lg:grid-cols-[220px_1fr]",
        )}
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

          {/* v0.18.4 — removed the `<AnimatePresence mode="wait"><motion.div
              initial={{opacity:0,x:6}} animate={{opacity:1,x:0}}>` wrapper. On
              some environments Motion was leaving the wrapper stuck at the
              initial opacity-0 state, which made the entire main viewport
              invisible — exactly the bug the maintainer hit ("big dark side,
              only the sidebar shows"). A non-animating div is a tiny UX
              downgrade compared to "the page is missing." Tab switches are
              instant now. If we want the slide-in back later, drive it from
              the leaving/entering panel themselves (each one knows when it
              mounts) instead of an outer AnimatePresence that depends on a
              composite key. */}
          <div key={activeTab + ":" + (currentSub || "")}>
            {activeTab === "survey" ? (
              <SurveyPanel />
            ) : activeTab === "emergency" ? (
              <EmergencyPanel />
            ) : activeTab === "agent" ? (
              <AgentPanel />
            ) : activeTab === "settings" ? (
              <AISettingsPanel />
            ) : tab?.meta && tab.id === "overview" ? (
              <OverviewPanel />
            ) : hasSub && currentSub ? (
              <CategoryPanel catId={currentSub} displayLabel={SUB_LABELS[currentSub]} />
            ) : tab?.category ? (
              <CategoryPanel catId={tab.category} />
            ) : (
              <div className="text-center text-fg-faint py-12">Loading…</div>
            )}
          </div>

          {/* On Overview, the terminal lives inside the 3-pane top — don't
              render a second copy at the bottom of the viewport. Settings has
              no terminal. On every other tab, the bottom console is the only
              place output appears. */}
          {/* Emergency + Agent panels have their own output surface (the app-level terminal); Settings has none */}
          {activeTab !== "overview" && activeTab !== "settings" && activeTab !== "agent" && <OutputConsole />}
        </main>

        {hasSub ? <SidebarRight /> : null}
      </div>

      <footer className="mt-9 text-center text-[12px] text-fg-dim">
        <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={() => setShowAbout(true)}
            className="font-semibold text-fg border-b border-border/20 hover:border-accent hover:text-accent transition-colors"
          >
            About
          </button>
          <span className="text-fg-faint">·</span>
          <a
            href="https://github.com/marvelousempire/xcode-cleanup-shortcut"
            target="_blank"
            rel="noreferrer"
            className="border-b border-border/20 text-fg no-underline transition-colors hover:border-accent hover:text-accent"
          >
            GitHub
          </a>
          <span className="text-fg-faint">·</span>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); openChangelog(); }}
            className="border-b border-border/20 text-fg no-underline transition-colors hover:border-accent hover:text-accent"
          >
            Changelog
          </a>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-faint">MIT</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-faint">localhost-only</span>
        </div>
        {/* Copyright per the `learn-mappers-copyright` global rule —
            AVERY GOODMAN in all caps, UCC 1-308 reservation in the same block. */}
        <div className="mt-2 text-[11px] text-fg-faint tracking-[0.01em]">
          © 2026 Learn Mappers LLC DBA AVERY GOODMAN · All rights reserved · Intellectual property · UCC 1-308
        </div>
      </footer>

      <ChangelogModal open={showChangelog} onClose={closeChangelog} />
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
    </div>
    </>
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
