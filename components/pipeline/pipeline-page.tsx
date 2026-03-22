"use client";

import { useState, useCallback } from "react";
import { DealTable } from "./deal-table";
import { DealModal } from "./deal-modal";
import { useDealContext } from "@/lib/deal-context";
import type { DealType } from "@/db/schema";
import type { StageOption } from "./deal-table";
import type { AppDeal } from "@/lib/mock-data";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AGENT_COLORS } from "@/lib/tokens";

function resolveAgentColor(agentId: string, agentName: string): string {
  try {
    const custom = typeof window !== "undefined" ? localStorage.getItem("door-team-agent-colors") : null;
    if (custom) {
      const map = JSON.parse(custom) as Record<string, string>;
      if (map[agentId]) return map[agentId];
    }
  } catch {}
  if (AGENT_COLORS[agentName]) return AGENT_COLORS[agentName];
  return "#9ca3af";
}

interface PipelinePageProps {
  dealType: DealType;
}

const DEAL_TYPE_CONFIG: Record<DealType, {
  title: string;
  primaryFieldLabel: string;
  showPrice: boolean;
  showDaysOnMarket: boolean;
}> = {
  rental: { title: "Rentals", primaryFieldLabel: "Address", showPrice: true, showDaysOnMarket: true },
  seller: { title: "Sellers", primaryFieldLabel: "Address", showPrice: true, showDaysOnMarket: true },
  buyer: { title: "Buyers", primaryFieldLabel: "Client", showPrice: true, showDaysOnMarket: false },
  application: { title: "Applications", primaryFieldLabel: "Applicant", showPrice: false, showDaysOnMarket: false },
  tenant_rep: { title: "Tenant Rep", primaryFieldLabel: "Client", showPrice: false, showDaysOnMarket: false },
};

export function PipelinePage({ dealType }: PipelinePageProps) {
  const { getDeals, getStages, agents, addDeal, updateDeal, archiveDeal, addHistoryEntry, currentAgent } = useDealContext();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const config = DEAL_TYPE_CONFIG[dealType];

  // v2 deal-table uses plural keys for column config
  const dealTypeV2Map: Record<DealType, string> = {
    rental: "rentals",
    seller: "sellers",
    buyer: "buyers",
    application: "applications",
    tenant_rep: "tenant-rep",
  };
  const dealTypeV2 = dealTypeV2Map[dealType];

  const rawDeals = getDeals(dealType);
  const dbStages = getStages(dealType);
  const dbAppStages = getStages("application");

  // Override with localStorage config if present
  function applyConfigOverrides(rawStages: typeof dbStages, v2Key: string) {
    if (typeof window === "undefined") return rawStages;
    try {
      const configStages = typeof window !== "undefined" ? localStorage.getItem(`door-config-stages-${v2Key}`) : null;
      const configColors = typeof window !== "undefined" ? localStorage.getItem(`door-config-stage-colors-${v2Key}`) : null;
      const parsedNames: string[] | null = configStages ? JSON.parse(configStages) : null;
      const parsedColors: Record<string, string> | null = configColors ? JSON.parse(configColors) : null;
      if (parsedNames && parsedNames.length > 0) {
        return parsedNames.map((name, i): typeof rawStages[0] => {
          const existing = rawStages.find(s => s.name === name);
          const color = parsedColors?.[name] || existing?.color || "#6366f1";
          if (existing) return { ...existing, name, color };
          return {
            id: `config-${name}`, dealType: rawStages[0]?.dealType ?? "rental" as DealType,
            name, color, orderIndex: i, isClosedWon: false, isClosedLost: false,
            staleThresholdDays: null, createdAt: new Date(),
          };
        });
      }
    } catch {}
    return rawStages;
  }

  const stages = applyConfigOverrides(dbStages, dealTypeV2);
  const appStages = applyConfigOverrides(dbAppStages, "applications");

  // Map stages to v2 StageOption shape
  const stageOptions: StageOption[] = stages.map((s) => ({
    name: s.name,
    color: s.color,
    textColor: "#ffffff",
  }));

  const appStageOptions: StageOption[] = appStages.map((s) => ({
    name: s.name,
    color: s.color,
    textColor: "#ffffff",
  }));

  // Map agents to v2 shape
  const agentList = agents.map((a) => ({
    id: a.id,
    name: a.name,
    color: resolveAgentColor(a.id, a.name),
  }));

  const handleSaveNewDeal = useCallback(async (data: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, dealType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create deal");
        return;
      }
      const created = await res.json();
      // Shape must match AppDeal exactly so toDeal() can map it correctly
      const newDeal: AppDeal = {
        ...created,
        createdAt: new Date(created.createdAt),
        updatedAt: new Date(created.updatedAt),
        listedAt: created.listedAt ? new Date(created.listedAt) : null,
        archivedAt: created.archivedAt ? new Date(created.archivedAt) : null,
        // stage comes back as full object from API — keep as-is
        stage: created.stage,
        // agents come back as [{id, dealId, userId, user: {...}, ...}] — keep raw shape
        agents: (created.agents ?? []).filter(
          (a: { removedAt?: string | null }) => !a.removedAt
        ),
        creator: created.creator ?? null,
      };
      addDeal(newDeal);
      toast.success("Deal created");
    } catch {
      toast.error("Failed to create deal");
    }
  }, [dealType, addDeal]);

  const handleUpdateDeal = useCallback(async (id: string, data: Record<string, unknown>) => {
    const updates: Partial<AppDeal> = {};
    if (data.primaryField) updates.title = data.primaryField as string;
    if (data.borough) updates.borough = data.borough as string;
    if (data.price !== undefined) updates.price = data.price ? Number(data.price) : undefined;
    if (data.notes !== undefined) updates.notes = data.notes as string;
    if (data.stage) {
      const found = stages.find((s) => s.id === data.stage || s.name === data.stage);
      if (found) updates.stage = found;
    }
    updateDeal(dealType, id, updates);
  }, [dealType, stages, updateDeal]);

  const handleArchiveDeal = useCallback(async (id: string, reason: string) => {
    archiveDeal(dealType, id, reason);
    toast.success("Deal archived");
  }, [dealType, archiveDeal]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-2.5 border-b border-border/50 shrink-0">
        <h1 className="text-[18px] font-semibold">{config.title}</h1>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden px-4 pt-2 pb-3 min-h-0 flex flex-col">
        <DealTable
          deals={rawDeals}
          stages={stageOptions}
          dealType={dealTypeV2}
          primaryFieldLabel={config.primaryFieldLabel}
          showPrice={config.showPrice}
          showDaysOnMarket={config.showDaysOnMarket}
          agents={agentList}
          applicationStages={appStageOptions}
          currentUserId={currentAgent?.id}
          isAdmin={currentAgent?.role === "admin"}
          fullHeight
        />
      </div>

      <DealModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        dealType={dealType}
        deal={null}
        agents={agentList}
        stages={stageOptions}
        onSave={handleSaveNewDeal}
      />
    </div>
  );
}
