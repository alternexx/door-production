"use client";

import { useState, useCallback } from "react";
import { DealTable } from "./deal-table";
import { DealModal } from "./deal-modal";
import { useDealContext } from "@/lib/deal-context";
import type { DealType } from "@/db/schema";
import type { Deal, StageOption } from "./deal-table";
import type { MockDeal } from "@/lib/mock-data";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AGENT_COLORS } from "@/lib/tokens";

function resolveAgentColor(agentId: string, agentName: string): string {
  // 1. Custom color from team page shelf
  try {
    const custom = typeof window !== "undefined" ? localStorage.getItem("door-team-agent-colors") : null;
    if (custom) {
      const map = JSON.parse(custom) as Record<string, string>;
      if (map[agentId]) return map[agentId];
    }
  } catch {}
  // 2. Canonical color from tokens
  if (AGENT_COLORS[agentName]) return AGENT_COLORS[agentName];
  // 3. Fallback
  return "#9ca3af";
}

interface PipelinePageProps {
  dealType: DealType;
}

// Map MockDeal → Deal (v2 shape expected by deal-table)
function toDeal(d: MockDeal): Deal {
  const checklistProgress = (d as unknown as { checklistProgress?: Deal["checklistProgress"] }).checklistProgress;
  return {
    id: d.id,
    primaryField: d.title,
    borough: d.borough ?? null,
    price: d.price ? String(d.price) : null,
    stage: d.stage.name,
    stageColor: d.stage.color,
    agents: (d.agents || []).filter(a => a.user?.name && a.user.name !== "[deleted]").map((a, i) => {
      const agentId = a.userId || a.user?.id || "";
      const agentName = a.user?.name || "Agent";
      return {
        id: agentId,
        name: agentName,
        color: resolveAgentColor(agentId, agentName),
        position: i,
      };
    }),
    notes: d.notes ?? null,
    email: d.clientEmail ?? null,
    phone: d.clientPhone ?? null,
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    daysOnMarket: (d as unknown as { daysOnMarket?: number }).daysOnMarket ?? null,
    isArchived: d.status === "archived",
    rawData: d as unknown as Record<string, unknown>,
    checklistProgress: checklistProgress ?? null,
  };
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

  // Map to v2 Deal shape
  const deals: Deal[] = rawDeals.map(toDeal);

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
    const firstStage = stages[0];
    const now = new Date();
    const newDeal: MockDeal = {
      id: `deal-${Date.now()}`,
      dealType,
      title: (data.primaryField as string) || (data.title as string) || "Untitled",
      address: (data.address as string) || "",
      unit: (data.unit as string) || null,
      borough: (data.borough as string) || "",
      neighborhood: (data.neighborhood as string) || null,
      zip: null,
      buildingId: (data.buildingId as string) || null,
      price: data.price ? Number(data.price) : null,
      status: "active",
      source: (data.source as string) || null,
      notes: (data.notes as string) || null,
      stageId: firstStage.id,
      leaseStartDate: null,
      leaseEndDate: null,
      listedAt: null,
      archivedAt: null,
      archiveReason: null,
      showingAgentId: null,
      commissionData: null,
      createdBy: "system",
      createdAt: now,
      updatedAt: now,
      stage: firstStage,
      agents: [],
      creator: { id: "system", clerkId: "system", email: "", name: "System", role: "admin", isActive: true, initials: "SY", color: "#888", createdAt: now, updatedAt: now },
      clientEmail: (data.email as string) || undefined,
      clientPhone: (data.phone as string) || undefined,
    };
    addDeal(newDeal);
    toast.success("Deal created");
  }, [dealType, stages, addDeal]);

  const handleUpdateDeal = useCallback(async (id: string, data: Record<string, unknown>) => {
    const updates: Partial<MockDeal> = {};
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
          deals={deals}
          stages={stageOptions}
          dealType={dealTypeV2}
          primaryFieldLabel={config.primaryFieldLabel}
          showPrice={config.showPrice}
          showDaysOnMarket={config.showDaysOnMarket}
          agents={agentList}
          applicationStages={appStageOptions}
          currentUserId={currentAgent?.id}
          isAdmin={true}
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
