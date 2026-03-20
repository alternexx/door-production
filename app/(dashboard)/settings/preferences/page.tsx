"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAgentDisplay } from "@/context/agent-display-context";
import { ChevronRight, Sun, Moon, SunMoon } from "lucide-react";
import { StagesConfigureModal } from "@/components/settings/stages-configure-modal";
import { ColumnsConfigureModal } from "@/components/settings/columns-configure-modal";

type Theme = "light" | "dark" | "system";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("door-theme") as Theme) || "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    systemDark ? root.classList.add("dark") : root.classList.remove("dark");
  } else if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  localStorage.setItem("door-theme", theme);
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--fm-amber)] focus:ring-offset-2 focus:ring-offset-background ${
        checked ? "bg-[var(--fm-amber)]" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function PreferencesPage() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);
  const [notesPreview, setNotesPreview] = useState(true);
  const [myDealsDefault, setMyDealsDefault] = useState(false);
  const [stageColorIndicators, setStageColorIndicators] = useState(true);
  const [stageFilterPills, setStageFilterPills] = useState(true);
  const [stageTooltip, setStageTooltip] = useState(true);
  const [priceDollarFormat, setPriceDollarFormat] = useState(true);
  const [staleDealsTop, setStaleDealsTop] = useState(false);
  const [agentsReorderStages, setAgentsReorderStages] = useState(false);
  const [agentsConfigureColumns, setAgentsConfigureColumns] = useState(false);
  const [stagesModalOpen, setStagesModalOpen] = useState(false);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const { mode: agentDisplayMode, setMode: setAgentDisplayMode } = useAgentDisplay();

  useEffect(() => {
    setMounted(true);
    setTheme(getStoredTheme());
    setNotesPreview(localStorage.getItem("fmdashboard_notes_preview") !== "false");
    setMyDealsDefault(localStorage.getItem("door-my-deals-default") === "true");
    setStageColorIndicators(localStorage.getItem("door-stage-color-indicators") !== "false");
    setStageFilterPills(localStorage.getItem("door-stage-filter-pills") !== "false");
    setStageTooltip(localStorage.getItem("door-stage-tooltip-hover") !== "false");
    setPriceDollarFormat(localStorage.getItem("door-price-dollar-format") !== "false");
    setStaleDealsTop(localStorage.getItem("door-stale-deals-top") === "true");
    setAgentsReorderStages(localStorage.getItem("door-config-agents-reorder-stages") === "true");
    setAgentsConfigureColumns(localStorage.getItem("door-config-col-agents-configure") === "true");
  }, []);

  useEffect(() => {
    if (mounted) applyTheme(theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (theme === "system") applyTheme("system"); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, mounted]);

  const handleTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    localStorage.setItem("door-theme", t);
  };

  if (!mounted) return <div className="max-w-2xl p-8"><h1 className="text-2xl font-semibold text-foreground mb-8">Preferences</h1></div>;

  return (
    <div className="max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Preferences</h1>

      {/* Appearance */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80 mb-4">Appearance</h2>
        <div className="space-y-4">

          {/* Theme — 3-way toggle */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] text-foreground">Theme</p>
              <p className="text-[13px] text-muted-foreground">Choose your preferred color scheme</p>
            </div>
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => handleTheme("system")}
                title="Auto (system)"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] transition-colors ${
                  theme === "system" ? "bg-[var(--fm-amber)] text-white" : "bg-card text-foreground hover:bg-muted"
                }`}
              >
                <SunMoon className="h-3.5 w-3.5" />
                Auto
              </button>
              <button
                type="button"
                onClick={() => handleTheme("light")}
                title="Light"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] transition-colors border-l border-border ${
                  theme === "light" ? "bg-[var(--fm-amber)] text-white" : "bg-card text-foreground hover:bg-muted"
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
              <button
                type="button"
                onClick={() => handleTheme("dark")}
                title="Dark"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] transition-colors border-l border-border ${
                  theme === "dark" ? "bg-[var(--fm-amber)] text-white" : "bg-card text-foreground hover:bg-muted"
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
            </div>
          </div>

          {/* Notes hover preview */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] text-foreground">Notes hover preview</p>
              <p className="text-[13px] text-muted-foreground">Show a preview card when hovering over a deal&apos;s notes</p>
            </div>
            <Toggle checked={notesPreview} onChange={(v) => { setNotesPreview(v); localStorage.setItem("fmdashboard_notes_preview", String(v)); }} />
          </div>

          {/* Agent display */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] text-foreground">Agent display</p>
              <p className="text-[13px] text-muted-foreground">Show agent initials or full names on deal cards</p>
            </div>
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setAgentDisplayMode("initials")}
                className={`px-3 py-1.5 text-[13px] transition-colors ${
                  agentDisplayMode === "initials" ? "bg-[var(--fm-amber)] text-white" : "bg-card text-foreground hover:bg-muted"
                }`}
              >
                Initials
              </button>
              <button
                type="button"
                onClick={() => setAgentDisplayMode("full")}
                className={`px-3 py-1.5 text-[13px] transition-colors border-l border-border ${
                  agentDisplayMode === "full" ? "bg-[var(--fm-amber)] text-white" : "bg-card text-foreground hover:bg-muted"
                }`}
              >
                Full name
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80 mb-4">Pipeline</h2>
        <div className="space-y-4">

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] text-foreground">Show only my deals by default</p>
              <p className="text-[13px] text-muted-foreground">Filter the pipeline to show only deals assigned to you</p>
            </div>
            <Toggle checked={myDealsDefault} onChange={(v) => { setMyDealsDefault(v); localStorage.setItem("door-my-deals-default", String(v)); }} />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] text-foreground">Show stage color indicators</p>
              <p className="text-[13px] text-muted-foreground">Display colored left-border indicators on pipeline rows by stage</p>
            </div>
            <Toggle checked={stageColorIndicators} onChange={(v) => { setStageColorIndicators(v); localStorage.setItem("door-stage-color-indicators", String(v)); }} />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] text-foreground">Show stage filter shortcuts</p>
              <p className="text-[13px] text-muted-foreground">Display quick-filter stage pills above the pipeline table</p>
            </div>
            <Toggle checked={stageFilterPills} onChange={(v) => { setStageFilterPills(v); localStorage.setItem("door-stage-filter-pills", String(v)); }} />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] text-foreground">Show stage tooltip on hover</p>
              <p className="text-[13px] text-muted-foreground">Display how long a deal has been in its current stage when hovering</p>
            </div>
            <Toggle checked={stageTooltip} onChange={(v) => { setStageTooltip(v); localStorage.setItem("door-stage-tooltip-hover", String(v)); }} />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] text-foreground">Show price as dollar amount</p>
              <p className="text-[13px] text-muted-foreground">Format price columns with $ and comma separators (e.g. $3,500)</p>
            </div>
            <Toggle checked={priceDollarFormat} onChange={(v) => { setPriceDollarFormat(v); localStorage.setItem("door-price-dollar-format", String(v)); }} />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] text-foreground">Stale deals at top</p>
              <p className="text-[13px] text-muted-foreground">Automatically sort stale deals to the top of the pipeline</p>
            </div>
            <Toggle checked={staleDealsTop} onChange={(v) => { setStaleDealsTop(v); localStorage.setItem("door-stale-deals-top", String(v)); }} />
          </div>

        </div>
      </section>

      {/* Configure (agent-facing, shown only when admin enables it) */}
      {(agentsReorderStages || agentsConfigureColumns) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2">Configure</h2>
          <p className="text-[13px] text-muted-foreground mb-4">Customize your pipeline layout.</p>
          <div className="space-y-2">
            {agentsReorderStages && (
              <button
                onClick={() => setStagesModalOpen(true)}
                className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                Configure Stages
              </button>
            )}
            {agentsConfigureColumns && (
              <button
                onClick={() => setColumnsModalOpen(true)}
                className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                Configure Columns
              </button>
            )}
          </div>
          <StagesConfigureModal open={stagesModalOpen} onOpenChange={setStagesModalOpen} />
          <ColumnsConfigureModal open={columnsModalOpen} onOpenChange={setColumnsModalOpen} />
        </section>
      )}
    </div>
  );
}
