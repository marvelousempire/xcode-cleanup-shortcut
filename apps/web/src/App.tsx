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
import { AIAgentChat } from "./components/AIAgentChat";
import { AppleScriptsPanel } from "./components/AppleScriptsPanel";
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
      {/* Full-viewport shell: alarm bar stays edge-to-edge; content uses horizontal
          padding only — no max-width gutter so TVs / ultrawide monitors use space. */}
      <div className="flex min-h-dvh flex-col bg-bg-1">
        {/* ── DiskAlarmBar — full viewport width, outside horizontal padding ── */}
        <DiskAlarmBar />

        <div className="flex w-full max-w-none min-w-0 flex-1 flex-col px-4 pt-6 sm:px-6 xl:px-10 2xl:px-14">
          <header className="flex shrink-0 items-center gap-3">
            <div className="min-w-0 flex-1">
              <AppHeader status={status} onOpenChangelog={openChangelog} />
            </div>
            <RunningWidget />
          </header>

          <OnboardingCoachmark />

          <div
            className={cn(
              "grid w-full max-w-none min-w-0 flex-1 auto-rows-auto items-start gap-4 pb-6 md:gap-5 xl:gap-6",
              // Fluid side rails: capped min/max width, center column absorbs TV width.
              "grid-cols-1",
              "md:grid-cols-[clamp(11rem,15vw,17.25rem)_minmax(0,1fr)]",
              hasSub
                ? "lg:grid-cols-[clamp(11rem,15vw,17.25rem)_minmax(0,1fr)_clamp(11rem,15vw,17.25rem)]"
                : "lg:grid-cols-[clamp(11rem,15vw,17.25rem)_minmax(0,1fr)]",
            )}
          >
            <SidebarLeft />

            <main className="min-w-0 max-w-none">
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

              <div key={activeTab + ":" + (currentSub || "")}>
                {activeTab === "ai-chat" ? (
                  <AIAgentChat />
                ) : activeTab === "applescripts" ? (
                  <AppleScriptsPanel />
                ) : activeTab === "survey" ? (
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
              {activeTab !== "overview" && activeTab !== "settings" && activeTab !== "agent" && activeTab !== "ai-chat" && activeTab !== "applescripts" && <OutputConsole />}
            </main>

            {hasSub ? (
              <div className="hidden min-w-0 lg:block">
                <SidebarRight />
              </div>
            ) : null}
          </div>

          <footer className="mt-auto shrink-0 border-t border-border/15 pb-6 pt-4 text-center text-[12px] text-fg-dim">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
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

        </div>
      </div>

      <ChangelogModal open={showChangelog} onClose={closeChangelog} />
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
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
