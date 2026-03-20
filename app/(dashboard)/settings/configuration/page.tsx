"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StagesConfigureModal } from "@/components/settings/stages-configure-modal";
import { ColumnsConfigureModal } from "@/components/settings/columns-configure-modal";

interface ToggleConfig {
  key: string;
  label: string;
  description?: string;
  defaultValue: boolean;
}

function Toggle({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
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

function ToggleRow({
  config,
  value,
  onChange
}: {
  config: ToggleConfig;
  value: boolean;
  onChange: (key: string, value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-[14px] text-foreground">{config.label}</p>
        {config.description && (
          <p className="text-[13px] text-muted-foreground">{config.description}</p>
        )}
      </div>
      <Toggle checked={value} onChange={(v) => onChange(config.key, v)} />
    </div>
  );
}

// Configuration definitions
const stagesConfig: ToggleConfig[] = [
  {
    key: "door-config-agents-reorder-stages",
    label: "Allow agents to reorder stages",
    description: "Let agents manually reorder pipeline stages, or restrict to admin only",
    defaultValue: false,
  },
  {
    key: "door-config-confirm-stage-backward",
    label: "Require confirmation when moving a deal backward",
    description: "Prompt agents to confirm before moving a deal to a previous stage",
    defaultValue: true,
  },
  {
    key: "door-config-confirm-stage-forward",
    label: "Require confirmation when moving a deal forward",
    description: "Prompt agents to confirm before advancing a deal to the next stage",
    defaultValue: false,
  },
  {
    key: "door-config-auto-archive-closed-stage",
    label: "Auto-archive when reaching a closed stage",
    description: "Automatically archive a deal when it reaches the final pipeline stage",
    defaultValue: true,
  },
  {
    key: "door-config-confirm-group-boundary",
    label: "Require confirmation when crossing a group boundary",
    description: "Prompt before moving a deal into a different pipeline group",
    defaultValue: true,
  },
  {
    key: "door-config-allow-unarchive",
    label: "Allow agents to unarchive deals",
    description: "Show an unarchive button on archived deals for all team members",
    defaultValue: true,
  },
];

const columnsConfig: ToggleConfig[] = [
  {
    key: "door-config-col-agents-configure",
    label: "Allow agents to add or remove columns",
    description: "Let agents customize column visibility and order, or restrict to admin only",
    defaultValue: false,
  },
];

const alertsConfig: ToggleConfig[] = [
  {
    key: "door-config-alert-stale-tag",
    label: "Show stale deal tag on pipeline table",
    description: "Visually flag deals that haven't been updated past the stale threshold",
    defaultValue: true,
  },
  {
    key: "door-config-alert-stale-notify-agent",
    label: "Notify agent when their deal goes stale",
    description: "Send an in-app alert to the assigned agent, not just admin",
    defaultValue: false,
  },
  {
    key: "door-config-alert-stale-dashboard",
    label: "Surface stale deals on admin dashboard",
    defaultValue: true,
  },
  {
    key: "door-config-alert-agent-inactive",
    label: "Alert when an agent hasn't logged in",
    description: "Threshold configurable below",
    defaultValue: true,
  },
  {
    key: "door-config-alert-agent-deal-duration",
    label: "Alert when an agent has been on a deal too long",
    description: "Flag deals where an agent has been assigned longer than the configured threshold",
    defaultValue: false,
  },
  {
    key: "door-config-alert-stage-backward",
    label: "Alert when a deal moves backward in stages",
    defaultValue: false,
  },
  {
    key: "door-config-alert-stage-no-change",
    label: "Alert when a deal stage hasn't changed",
    description: "Flag deals that have been stuck in the same stage past the threshold",
    defaultValue: true,
  },
];

// Threshold configuration definitions
interface ThresholdConfig {
  key: string;
  label: string;
  description: string;
  defaultValue: number;
  min: number;
  max: number;
}

const thresholdsConfig: ThresholdConfig[] = [
  {
    key: "door-config-threshold-stale-days",
    label: "Stale deal threshold",
    description: "Days without activity before a deal is flagged as stale",
    defaultValue: 7,
    min: 1,
    max: 90,
  },
  {
    key: "door-config-threshold-agent-inactive-days",
    label: "Agent inactivity threshold",
    description: "Days without login before an agent is flagged as inactive",
    defaultValue: 7,
    min: 1,
    max: 30,
  },
  {
    key: "door-config-threshold-agent-deal-days",
    label: "Agent deal duration threshold",
    description: "Days an agent can be assigned to a deal before triggering an alert",
    defaultValue: 30,
    min: 1,
    max: 180,
  },
  {
    key: "door-config-threshold-stage-no-change-days",
    label: "Stage inactivity threshold",
    description: "Days without a stage change before triggering the stage-stuck alert",
    defaultValue: 14,
    min: 1,
    max: 180,
  },
];

function ThresholdRow({
  config,
  value,
  onChange,
}: {
  config: ThresholdConfig;
  value: number;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-[14px] text-foreground">{config.label}</p>
        <p className="text-[13px] text-muted-foreground">{config.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={config.min}
          max={config.max}
          value={value}
          onChange={(e) => {
            const num = parseInt(e.target.value, 10);
            if (!isNaN(num)) {
              const clamped = Math.min(Math.max(num, config.min), config.max);
              onChange(config.key, clamped);
            }
          }}
          className="bg-card border border-border rounded-md px-3 py-1.5 text-[13px] text-foreground w-[80px] text-center focus:outline-none focus:ring-1 focus:ring-[var(--fm-amber)]"
        />
        <span className="text-[13px] text-muted-foreground">days</span>
      </div>
    </div>
  );
}

// =====================
// Advanced Thresholds Modal
// =====================
const DEAL_TYPE_ENTRIES = [
  { key: "rental", label: "Rentals" },
  { key: "seller", label: "Sellers" },
  { key: "buyer", label: "Buyers" },
  { key: "application", label: "Applications" },
  { key: "tenant_rep", label: "Tenant Rep" },
] as const;

interface AdvancedThresholdsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advancedThresholds: { byDealType: Partial<Record<string, number>>; byGroup: Record<string, Record<string, number>> };
  onSave: (val: { byDealType: Partial<Record<string, number>>; byGroup: Record<string, Record<string, number>> }) => void;
  globalThreshold: number;
}

// Fixed group slots — always show Group 1–5, checkbox enables the override
const GROUP_SLOTS = [
  { key: "group_1", label: "Group 1" },
  { key: "group_2", label: "Group 2" },
  { key: "group_3", label: "Group 3" },
  { key: "group_4", label: "Group 4" },
  { key: "group_5", label: "Group 5" },
];

function AdvancedThresholdsModal({ open, onOpenChange, advancedThresholds, onSave, globalThreshold }: AdvancedThresholdsModalProps) {
  const [activeTab, setActiveTab] = useState<string>(DEAL_TYPE_ENTRIES[0].key);
  const [draft, setDraft] = useState(advancedThresholds);

  useEffect(() => {
    if (!open) return;
    setDraft(advancedThresholds);
    setActiveTab(DEAL_TYPE_ENTRIES[0].key);
  }, [open, advancedThresholds]);

  const handleDealTypeChange = (dealType: string, value: string) => {
    const num = parseInt(value, 10);
    setDraft(prev => ({
      ...prev,
      byDealType: { ...prev.byDealType, [dealType]: isNaN(num) || value === "" ? 0 : num },
    }));
  };

  const handleGroupToggle = (dealType: string, groupKey: string, enabled: boolean) => {
    setDraft(prev => {
      const existing = prev.byGroup[dealType]?.[groupKey];
      if (!enabled) {
        const updated = { ...(prev.byGroup[dealType] || {}) };
        delete updated[groupKey];
        return { ...prev, byGroup: { ...prev.byGroup, [dealType]: updated } };
      }
      return {
        ...prev,
        byGroup: {
          ...prev.byGroup,
          [dealType]: { ...(prev.byGroup[dealType] || {}), [groupKey]: existing ?? globalThreshold },
        },
      };
    });
  };

  const handleGroupChange = (dealType: string, groupKey: string, value: string) => {
    const num = parseInt(value, 10);
    setDraft(prev => ({
      ...prev,
      byGroup: {
        ...prev.byGroup,
        [dealType]: { ...(prev.byGroup[dealType] || {}), [groupKey]: isNaN(num) ? 0 : num },
      },
    }));
  };

  const handleSave = () => {
    const cleanedByDealType: Partial<Record<string, number>> = {};
    for (const [k, v] of Object.entries(draft.byDealType)) {
      if (v && v > 0) cleanedByDealType[k] = v;
    }
    const cleanedByGroup: Record<string, Record<string, number>> = {};
    for (const [dt, groups] of Object.entries(draft.byGroup)) {
      const cleaned: Record<string, number> = {};
      for (const [gKey, v] of Object.entries(groups)) {
        if (v && v > 0) cleaned[gKey] = v;
      }
      if (Object.keys(cleaned).length > 0) cleanedByGroup[dt] = cleaned;
    }
    onSave({ byDealType: cleanedByDealType, byGroup: cleanedByGroup });
    onOpenChange(false);
  };

  const activeDt = DEAL_TYPE_ENTRIES.find(d => d.key === activeTab)!;
  const dealTypeValue = draft.byDealType[activeTab];
  const groupOverrides = draft.byGroup[activeTab] || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0" showCloseButton>
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <DialogHeader>
            <DialogTitle>Advanced Thresholds</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground mt-1">
            Set per deal type and per group stage inactivity overrides.
          </p>
        </div>

        {/* Deal type tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-border overflow-x-auto scrollbar-none">
          {DEAL_TYPE_ENTRIES.map(dt => (
            <button
              key={dt.key}
              onClick={() => setActiveTab(dt.key)}
              className={cn(
                "px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors shrink-0",
                activeTab === dt.key
                  ? "text-[var(--fm-amber)] border-b-2 border-[var(--fm-amber)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {dt.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-6 py-5 space-y-5">
          {/* Deal type override */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] text-foreground">{activeDt.label} threshold</p>
              <p className="text-[13px] text-muted-foreground">Override for all {activeDt.label.toLowerCase()} deals</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={180}
                value={dealTypeValue || ""}
                placeholder={String(globalThreshold)}
                onChange={(e) => handleDealTypeChange(activeTab, e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-1.5 text-[13px] text-foreground w-[80px] text-center focus:outline-none focus:ring-1 focus:ring-[var(--fm-amber)]"
              />
              <span className="text-[13px] text-muted-foreground">days</span>
            </div>
          </div>

          {/* Group overrides */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">Group overrides</p>
            <div className="space-y-2">
              {GROUP_SLOTS.map(slot => {
                const enabled = slot.key in groupOverrides;
                return (
                  <div key={slot.key} className="flex items-center gap-3 py-1.5">
                    <input
                      type="checkbox"
                      id={`${activeTab}-${slot.key}`}
                      checked={enabled}
                      onChange={(e) => handleGroupToggle(activeTab, slot.key, e.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-gray-300 accent-[var(--fm-amber)]"
                    />
                    <label
                      htmlFor={`${activeTab}-${slot.key}`}
                      className={cn("flex-1 text-[14px] cursor-pointer", enabled ? "text-foreground" : "text-muted-foreground")}
                    >
                      {slot.label}
                    </label>
                    {enabled && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={180}
                          value={groupOverrides[slot.key] || ""}
                          placeholder={String(dealTypeValue || globalThreshold)}
                          onChange={(e) => handleGroupChange(activeTab, slot.key, e.target.value)}
                          className="bg-card border border-border rounded-md px-3 py-1.5 text-[13px] text-foreground w-[80px] text-center focus:outline-none focus:ring-1 focus:ring-[var(--fm-amber)]"
                        />
                        <span className="text-[13px] text-muted-foreground">days</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-[13px] bg-[var(--fm-amber)] text-white rounded-md hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function loadInitialValues(): Record<string, boolean> {
  if (typeof window === "undefined") {
    const result: Record<string, boolean> = {};
    [...stagesConfig, ...columnsConfig, ...alertsConfig].forEach((config) => {
      result[config.key] = config.defaultValue;
    });
    return result;
  }
  const allConfigs = [...stagesConfig, ...columnsConfig, ...alertsConfig];
  const initialValues: Record<string, boolean> = {};
  allConfigs.forEach((config) => {
    const stored = localStorage.getItem(config.key);
    if (stored === null) {
      initialValues[config.key] = config.defaultValue;
    } else {
      initialValues[config.key] = stored === "true";
    }
  });
  return initialValues;
}

function loadInitialThresholds(): Record<string, number> {
  if (typeof window === "undefined") {
    const result: Record<string, number> = {};
    thresholdsConfig.forEach((config) => {
      result[config.key] = config.defaultValue;
    });
    return result;
  }
  const initialThresholds: Record<string, number> = {};
  thresholdsConfig.forEach((config) => {
    const stored = localStorage.getItem(config.key);
    if (stored === null) {
      initialThresholds[config.key] = config.defaultValue;
    } else {
      const parsed = parseInt(stored, 10);
      initialThresholds[config.key] = isNaN(parsed) ? config.defaultValue : parsed;
    }
  });
  return initialThresholds;
}

export default function ConfigurationPage() {
  const [mounted, setMounted] = useState(false);
  const [values, setValues] = useState<Record<string, boolean>>(() => loadInitialValues());
  const [thresholds, setThresholds] = useState<Record<string, number>>(() => loadInitialThresholds());
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [stagesModalOpen, setStagesModalOpen] = useState(false);
  const [advancedThresholdsOpen, setAdvancedThresholdsOpen] = useState(false);
  const [advancedThresholds, setAdvancedThresholds] = useState(() => {
    if (typeof window === "undefined") return { byDealType: {}, byGroup: {} };
    try { const s = localStorage.getItem("door-config-advanced-thresholds"); if (s) return JSON.parse(s); } catch {}
    return { byDealType: {}, byGroup: {} };
  });
  const saveAdvancedThresholds = (val: typeof advancedThresholds) => {
    setAdvancedThresholds(val);
    localStorage.setItem("door-config-advanced-thresholds", JSON.stringify(val));
  };

  // Set mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (key: string, value: boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(key, String(value));
  };

  const handleThresholdChange = (key: string, value: number) => {
    setThresholds((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(key, String(value));
  };

  if (!mounted) {
    return (
      <div className="max-w-2xl p-8">
        <h1 className="text-2xl font-semibold text-foreground mb-8">Configuration</h1>
      </div>
    );
  }

  return (
    <div className="max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Configuration</h1>

      {/* Stages Section */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2">
          Stages
        </h2>
        <p className="text-[13px] text-muted-foreground mb-4">
          Control how pipeline stages behave for your team.
        </p>
        <div className="space-y-1">
          {stagesConfig.map((config) => (
            <ToggleRow
              key={config.key}
              config={config}
              value={values[config.key] ?? config.defaultValue}
              onChange={handleChange}
            />
          ))}
        </div>
        <button
          onClick={() => setStagesModalOpen(true)}
          className="mt-4 flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
          Configure Stages
        </button>
      </section>

      <div className="border-t border-border my-8" />

      {/* Columns Section */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2">
          Columns
        </h2>
        <p className="text-[13px] text-muted-foreground mb-4">
          Set default column visibility across all pipeline views.
        </p>
        <div className="space-y-1">
          {columnsConfig.map((config) => (
            <ToggleRow
              key={config.key}
              config={config}
              value={values[config.key] ?? config.defaultValue}
              onChange={handleChange}
            />
          ))}
        </div>
        <button
          onClick={() => setColumnsModalOpen(true)}
          className="mt-4 flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
          Configure Columns
        </button>
      </section>

      <div className="border-t border-border my-8" />

      {/* Alerts Section */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2">
          Alerts
        </h2>
        <p className="text-[13px] text-muted-foreground mb-4">
          Configure which alert types surface for your team.
        </p>
        <div className="space-y-1">
          {alertsConfig.map((config) => (
            <ToggleRow
              key={config.key}
              config={config}
              value={values[config.key] ?? config.defaultValue}
              onChange={handleChange}
            />
          ))}
        </div>

        {/* Thresholds Subsection */}
        <div className="border-t border-border mt-6 pt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80 mb-4">
            Thresholds
          </h3>
          <div className="space-y-1">
            {thresholdsConfig.map((config) => (
              <ThresholdRow
                key={config.key}
                config={config}
                value={thresholds[config.key] ?? config.defaultValue}
                onChange={handleThresholdChange}
              />
            ))}
          </div>
          <button
            onClick={() => setAdvancedThresholdsOpen(true)}
            className="mt-4 flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            Advanced thresholds
          </button>
        </div>
      </section>

      {/* Modals */}
      <ColumnsConfigureModal
        open={columnsModalOpen}
        onOpenChange={setColumnsModalOpen}
      />
      <StagesConfigureModal
        open={stagesModalOpen}
        onOpenChange={setStagesModalOpen}
      />
      <AdvancedThresholdsModal
        open={advancedThresholdsOpen}
        onOpenChange={setAdvancedThresholdsOpen}
        advancedThresholds={advancedThresholds}
        onSave={saveAdvancedThresholds}
        globalThreshold={thresholds["door-config-threshold-stage-no-change-days"] ?? 14}
      />
    </div>
  );
}
