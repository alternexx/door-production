"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  STAGES,
  EMPTY_AGENT,
  type AppDeal,
  type AppStage,
  type AppAgent,
  type DealHistoryEntry,
} from "./mock-data";
import type { DealType } from "@/db/schema";
import { AGENT_COLORS } from "@/lib/tokens";

// ── Context shape ──────────────────────────────────────────────────
interface DealContextValue {
  agents: AppAgent[];
  currentAgent: AppAgent;
  getStages: (dealType: DealType) => AppStage[];
  getDeals: (dealType: DealType) => AppDeal[];
  addDeal: (deal: AppDeal) => void;
  updateDeal: (dealType: DealType, dealId: string, updates: Partial<AppDeal>) => void;
  removeDeal: (dealType: DealType, dealId: string) => void;
  archiveDeal: (
    dealType: DealType,
    dealId: string,
    reason: string,
    archiveStage?: { id: string; name: string; color: string },
  ) => void;
  getHistory: (dealId: string) => DealHistoryEntry[];
  addHistoryEntry: (entry: DealHistoryEntry) => void;
  isLoading: boolean;
  reloadDeal: (dealType: DealType, dealId: string) => Promise<void>;
}

const DealContext = createContext<DealContextValue | null>(null);

export function useDealContext() {
  const ctx = useContext(DealContext);
  if (!ctx) throw new Error("useDealContext must be used inside DealProvider");
  return ctx;
}

// ── Helpers ────────────────────────────────────────────────────────
function dbDealToMock(d: Record<string, unknown>, stages: Record<DealType, AppStage[]>): AppDeal {
  const dealType = d.dealType as DealType;
  const stageList = stages[dealType] ?? [];
  const dbStage = (d.stage as Partial<AppStage> | undefined) ?? undefined;
  const dbStageId = (dbStage?.id as string | undefined) ?? (d.stageId as string | undefined);
  const dbStageName = dbStage?.name;
  const dbStageColor = dbStage?.color;

  // DB stage IDs are UUIDs and don't match mock IDs, so resolve by DB stage name first.
  const matchedStageByName = dbStageName ? stageList.find((s) => s.name === dbStageName) : undefined;
  const fallbackStage = stageList.find((s) => s.id === dbStageId) ?? stageList[0];
  const baseStage = matchedStageByName ?? fallbackStage;
  const stageObj: AppStage = {
    ...baseStage,
    id: dbStageId ?? baseStage.id,
    name: dbStageName ?? baseStage.name,
    color: dbStageColor ?? baseStage.color,
  };
  const agentRows = (d.agents as { user: AppAgent }[] | undefined) ?? [];

  const baseDeal: AppDeal = {
    id: d.id as string,
    dealType,
    title: (d.title as string) ?? "",
    address: (d.address as string) ?? "",
    unit: (d.unit as string | null) ?? null,
    borough: (d.borough as string) ?? "",
    neighborhood: (d.neighborhood as string | null) ?? null,
    zip: (d.zip as string | null) ?? null,
    buildingId: (d.buildingId as string | null) ?? null,
    price: (d.price as number | null) ?? null,
    status: (d.status as "active" | "archived") ?? "active",
    source: (d.source as string | null) ?? null,
    notes: (d.notes as string | null) ?? null,
    stageId: stageObj.id,
    leaseStartDate: (d.leaseStartDate as string | null) ?? null,
    leaseEndDate: (d.leaseEndDate as string | null) ?? null,
    listedAt: d.listedAt ? new Date(d.listedAt as string) : null,
    archivedAt: d.archivedAt ? new Date(d.archivedAt as string) : null,
    archiveReason: (d.archiveReason as string | null) ?? null,
    showingAgentId: (d.showingAgentId as string | null) ?? null,
    commissionData: d.commissionData ?? null,
    showingScheduledAt: (d.showingScheduledAt as string | null) ?? null,
    createdBy: (d.createdBy as string) ?? EMPTY_AGENT.id,
    createdAt: new Date(d.createdAt as string),
    updatedAt: new Date(d.updatedAt as string),
    stage: stageObj,
    agents: agentRows.map((a) => ({
      id: a.user?.id ?? "",
      dealId: d.id as string,
      userId: a.user?.id ?? "",
      assignedAt: new Date(),
      removedAt: null,
      user: a.user,
    })),
    creator: (d.creator as AppAgent) ?? EMPTY_AGENT,
    clientName: undefined,
    clientEmail: undefined,
    clientPhone: undefined,
  };

  return {
    ...baseDeal,
    checklistProgress: d.checklistProgress,
  } as AppDeal;
}

// ── Provider ───────────────────────────────────────────────────────
export function DealProvider({ children }: { children: ReactNode }) {
  const [stagesByType, setStagesByType] = useState<Record<DealType, AppStage[]>>(() => ({
    rental: [...STAGES.rental],
    seller: [...STAGES.seller],
    buyer: [...STAGES.buyer],
    application: [...STAGES.application],
    tenant_rep: [...STAGES.tenant_rep],
  }));

  const [dealsByType, setDealsByType] = useState<Record<DealType, AppDeal[]>>(() => ({
    rental: [], seller: [], buyer: [], application: [], tenant_rep: [],
  }));

  const [historyByDeal, setHistoryByDeal] = useState<Record<string, DealHistoryEntry[]>>({});

  const [agentList, setAgentList] = useState<AppAgent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<AppAgent>(EMPTY_AGENT);
  const [isLoading, setIsLoading] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);

  // ── Load from DB on mount ──────────────────────────────────────
  useEffect(() => {
    if (dbLoaded) return;
    const loadFromDb = async () => {
      setIsLoading(true);
      try {
        const dealTypes: DealType[] = ["rental", "seller", "buyer", "application", "tenant_rep"];
        const results = await Promise.all(
          dealTypes.map(async (type) => {
            const [dealsRes, stagesRes] = await Promise.all([
              fetch(`/api/deals?type=${type}&archived=true`),
              fetch(`/api/stages?dealType=${type}&archive=false`),
            ]);

            const dealsData = dealsRes.ok ? await dealsRes.json() : null;
            const stagesData = stagesRes.ok ? await stagesRes.json() : null;
            return { type, dealsData, stagesData };
          })
        );

        const fetchedStagesByType: Record<DealType, AppStage[]> = {
          rental: [...STAGES.rental],
          seller: [...STAGES.seller],
          buyer: [...STAGES.buyer],
          application: [...STAGES.application],
          tenant_rep: [...STAGES.tenant_rep],
        };
        for (const result of results) {
          if (!result?.stagesData) continue;
          const mappedStages = (result.stagesData as Record<string, unknown>[]).map((stage) => ({
            id: stage.id as string,
            dealType: stage.dealType as DealType,
            name: stage.name as string,
            color: stage.color as string,
            orderIndex: stage.orderIndex as number,
            isClosedWon: Boolean(stage.isClosedWon),
            isClosedLost: Boolean(stage.isClosedLost),
            staleThresholdDays: (stage.staleThresholdDays as number | null) ?? null,
            createdAt: new Date(stage.createdAt as string),
          }));
          if (mappedStages.length) fetchedStagesByType[result.type] = mappedStages;
        }
        setStagesByType(fetchedStagesByType);

        const hasData = results.some((r) => r && r.dealsData && r.dealsData.length > 0);
        if (hasData) {
          const byType: Record<DealType, AppDeal[]> = {
            rental: [], seller: [], buyer: [], application: [], tenant_rep: [],
          };
          for (const result of results) {
            if (!result?.dealsData) continue;
            byType[result.type] = result.dealsData.map((d: Record<string, unknown>) =>
              dbDealToMock(d, fetchedStagesByType)
            );
          }
          setDealsByType(byType);
        }
        // If no DB data yet, keep mock data (first run)

        // Fetch real agents
        try {
          const agentsRes = await fetch("/api/users");
          const agentsData: Array<{id: string; name: string; email: string; role: string; isActive: boolean; clerkId: string}> = agentsRes.ok ? await agentsRes.json() : [];

          // Load custom colors from team page shelf, fall back to tokens.ts canonical colors
          let customAgentColors: Record<string, string> = {};
          try {
            const storedColors = typeof window !== "undefined" ? localStorage.getItem("door-team-agent-colors") : null;
            if (storedColors) customAgentColors = JSON.parse(storedColors);
          } catch {}
          function getColor(id: string, name: string): string {
            if (customAgentColors[id]) return customAgentColors[id];
            return AGENT_COLORS[name] || "#9ca3af";
          }

          const realAgents: AppAgent[] = agentsData.map(u => ({
            id: u.id,
            clerkId: u.clerkId,
            email: u.email,
            name: u.name,
            role: u.role as "admin" | "agent",
            isActive: u.isActive,
            initials: u.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
            color: u.isActive ? getColor(u.id, u.name) : "#9ca3af",
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          if (realAgents.length) {
            setAgentList(realAgents);
            // Identify current user from /api/auth/me
            try {
              const meRes = await fetch("/api/auth/me");
              const meData = meRes.ok ? await meRes.json() : null;
              const me = meData?.id ? realAgents.find(a => a.id === meData.id) : null;
              setCurrentAgent(me ? { ...me } : { ...realAgents[0] });
            } catch {
              setCurrentAgent({ ...realAgents[0] });
            }
          }
        } catch (agentErr) {
          console.warn("Agent fetch failed, using mock agents:", agentErr);
        }
      } catch (e) {
        console.warn("DB load failed, using mock data:", e);
      } finally {
        setIsLoading(false);
        setDbLoaded(true);
      }
    };
    loadFromDb();

    // Listen for stage config changes from the configure modal
    const handler = () => { setDbLoaded(false); };
    window.addEventListener("door:stages-updated", handler);
    return () => window.removeEventListener("door:stages-updated", handler);
  }, [dbLoaded]);

  const getStages = useCallback((dealType: DealType) => stagesByType[dealType], [stagesByType]);
  const getDeals = useCallback((dealType: DealType) => dealsByType[dealType], [dealsByType]);

  const addDeal = useCallback((deal: AppDeal) => {
    // Optimistic update
    setDealsByType((prev) => ({
      ...prev,
      [deal.dealType]: [...prev[deal.dealType], deal],
    }));
    setHistoryByDeal((prev) => ({
      ...prev,
      [deal.id]: [{
        id: `hist-${Date.now()}`,
        dealId: deal.id,
        dealType: deal.dealType,
        field: "stage",
        oldValue: null,
        newValue: deal.stage.name,
        changedById: currentAgent.id,
        changedByName: currentAgent.name,
        changedAt: new Date(),
      }],
    }));

    // Persist to DB (fire and forget)
    fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: deal.id,
        dealType: deal.dealType,
        title: deal.title,
        address: deal.address,
        unit: deal.unit,
        borough: deal.borough,
        neighborhood: deal.neighborhood,
        zip: deal.zip,
        buildingId: deal.buildingId ?? null,
        price: deal.price,
        status: deal.status,
        source: deal.source,
        notes: deal.notes,
        stageId: deal.stageId || deal.stage?.id,
        leaseStartDate: deal.leaseStartDate,
        leaseEndDate: deal.leaseEndDate,
        createdBy: currentAgent.id,
        agentIds: deal.agents?.map((a) => a.userId) ?? [],
      }),
    }).catch(console.error);
  }, [currentAgent]);

  const updateDeal = useCallback((dealType: DealType, dealId: string, updates: Partial<AppDeal>) => {
    // Optimistic update
    setDealsByType((prev) => ({
      ...prev,
      [dealType]: prev[dealType].map((d) =>
        d.id === dealId ? { ...d, ...updates, updatedAt: new Date() } : d
      ),
    }));

    // Build DB-safe patch (exclude relation objects)
    const { stage, agents, creator, agent_ids, ...dbUpdates } = updates as Record<string, unknown>;
    if (stage) (dbUpdates as Record<string, unknown>).stageId = (stage as AppStage).id;
    if (agent_ids) (dbUpdates as Record<string, unknown>).agentIds = agent_ids;

    // Persist to DB (fire and forget)
    if (Object.keys(dbUpdates).length) {
      fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbUpdates),
      }).catch(console.error);
    }
  }, []);

  const removeDeal = useCallback((dealType: DealType, dealId: string) => {
    setDealsByType((prev) => ({
      ...prev,
      [dealType]: prev[dealType].filter((d) => d.id !== dealId),
    }));
    fetch(`/api/deals/${dealId}`, { method: "DELETE" }).catch(console.error);
  }, []);

  const archiveDeal = useCallback((
    dealType: DealType,
    dealId: string,
    reason: string,
    archiveStage?: { id: string; name: string; color: string },
  ) => {
    const now = new Date();
    setDealsByType((prev) => ({
      ...prev,
      [dealType]: prev[dealType].map((d) =>
        d.id === dealId
          ? {
              ...d,
              status: "archived" as const,
              archivedAt: now,
              archiveReason: reason,
              updatedAt: now,
              // Optimistically update stage to archive stage if provided
              ...(archiveStage ? {
                stageId: archiveStage.id,
                stage: { ...d.stage, id: archiveStage.id, name: archiveStage.name, color: archiveStage.color },
              } : {}),
            }
          : d
      ),
    }));

    fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "archived",
        archivedAt: now.toISOString(),
        archiveReason: reason,
        ...(archiveStage ? { stageId: archiveStage.id } : {}),
      }),
    }).catch(console.error);
  }, []);

  const getHistory = useCallback((dealId: string) => historyByDeal[dealId] ?? [], [historyByDeal]);

  const addHistoryEntry = useCallback((entry: DealHistoryEntry) => {
    setHistoryByDeal((prev) => ({
      ...prev,
      [entry.dealId]: [entry, ...(prev[entry.dealId] ?? [])],
    }));
  }, []);

  const reloadDeal = useCallback(async (dealType: DealType, dealId: string) => {
    // Fetch only the single deal and update it in-place
    try {
      const res = await fetch(`/api/deals/${dealId}`);
      if (!res.ok) return;
      const d = await res.json();

      const allStages = stagesByType[dealType] ?? STAGES[dealType];
      const updated = dbDealToMock(d, { ...stagesByType, [dealType]: allStages });

      setDealsByType(prev => ({
        ...prev,
        [dealType]: prev[dealType].map(existing =>
          existing.id === dealId ? updated : existing
        ),
      }));
    } catch { /* silent */ }
  }, [stagesByType]);

  return (
    <DealContext.Provider value={{
      agents: agentList,
      currentAgent: currentAgent,
      getStages,
      getDeals,
      addDeal,
      updateDeal,
      removeDeal,
      archiveDeal,
      getHistory,
      addHistoryEntry,
      isLoading,
      reloadDeal,
    }}>
      {children}
    </DealContext.Provider>
  );
}
