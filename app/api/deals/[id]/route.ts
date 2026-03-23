import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deals, dealAgents, dealHistory, dealStageHistory, pipelineStages, users } from "@/db/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

type DealInsert = typeof deals.$inferInsert;
type DealRow = typeof deals.$inferSelect;

function stringifyHistoryValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function valuesAreDifferent(oldValue: unknown, newValue: unknown): boolean {
  const oldComparable = stringifyHistoryValue(oldValue);
  const newComparable = stringifyHistoryValue(newValue);
  return oldComparable !== newComparable;
}

function normalizeDealPayload(payload: Record<string, unknown>): Partial<DealInsert> {
  const normalized = { ...payload } as Partial<DealInsert> & Record<string, unknown>;

  // Legacy field aliases
  if (!normalized.address && normalized.property) normalized.address = normalized.property as string;
  if (!normalized.title && normalized.address) normalized.title = normalized.address as string;
  if (!normalized.title && (normalized.client || normalized.applicant)) {
    normalized.title = (normalized.client ?? normalized.applicant) as string;
  }

  // Price aliases
  if (normalized.budget !== undefined && normalized.price === undefined) {
    normalized.price = normalized.budget ? Number(String(normalized.budget).replace(/[^0-9.]/g, "")) : null;
  }

  // applicationPrice camelCase alias
  if ((normalized as Record<string, unknown>).applicationPrice !== undefined) {
    normalized.applicationPrice = (normalized as Record<string, unknown>).applicationPrice as string | null;
  }

  // leaseStartDate from move_in_date
  if (normalized.move_in_date !== undefined && normalized.leaseStartDate === undefined) {
    normalized.leaseStartDate = normalized.move_in_date as string | null;
  }

  // clientEmail/clientPhone
  if (normalized.email !== undefined && normalized.clientEmail === undefined) normalized.clientEmail = normalized.email as string;
  if (normalized.phone !== undefined && normalized.clientPhone === undefined) normalized.clientPhone = normalized.phone as string;

  // Clean up non-DB keys
  delete normalized.property;
  delete normalized.client;
  delete normalized.applicant;
  delete normalized.budget;
  delete normalized.move_in_date;
  delete normalized.email;
  delete normalized.phone;

  // Never allow null/empty for NOT NULL required fields
  if (!normalized.address) delete normalized.address;
  if (!normalized.title) delete normalized.title;
  if (!normalized.borough) delete normalized.borough;

  // Whitelist: only allow known deals columns through to prevent SQL errors
  const VALID_DEAL_COLUMNS = new Set([
    "dealType", "title", "address", "unit", "borough", "neighborhood", "zip",
    "buildingId", "price", "status", "source", "notes", "stageId",
    "leaseStartDate", "leaseEndDate", "listedAt", "archivedAt", "archiveReason",
    "showingScheduledAt", "showingAgentId", "commission", "applicationPrice",
    "commissionData",
  ]);
  for (const key of Object.keys(normalized)) {
    if (!VALID_DEAL_COLUMNS.has(key)) {
      delete (normalized as Record<string, unknown>)[key];
    }
  }

  return normalized as Partial<DealInsert>;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await db.query.deals.findFirst({
    where: eq(deals.id, id),
    with: { stage: true, agents: { with: { user: true }, where: (da, { isNull }) => isNull(da.removedAt) }, creator: true },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { agentIds, ...dealData } = body;
    const normalizedDealData = normalizeDealPayload(dealData);
    const stageIdValue = normalizedDealData.stageId;

    const [existingDeal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, id))
      .limit(1);

    if (!existingDeal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const changedById = currentUser.id;
    const changedByName = currentUser.name;

    const now = new Date();
    const changedFields = Object.entries(normalizedDealData).filter(([field, newValue]) => {
      if (newValue === undefined) return false;
      const oldValue = existingDeal[field as keyof DealRow];
      return valuesAreDifferent(oldValue, newValue);
    });

    const historyRows: Array<typeof dealHistory.$inferInsert> = changedFields
      .filter(([field]) => field !== "stageId")
      .map(([field, newValue]) => ({
        dealId: id,
        dealType: existingDeal.dealType,
        field,
        oldValue: stringifyHistoryValue(existingDeal[field as keyof DealRow]),
        newValue: stringifyHistoryValue(newValue),
        changedById,
        changedByName,
        changedAt: now,
      }));

    const [updated] = await db.update(deals)
      .set({ ...(normalizedDealData as Partial<DealInsert>), updatedAt: now })
      .where(eq(deals.id, id))
      .returning();

    // Handle agent updates if provided — filter empty ids defensively
    const safeAgentIds = Array.isArray(agentIds) ? (agentIds as string[]).filter((id) => typeof id === "string" && id.trim() !== "") : agentIds;
    if (safeAgentIds !== undefined) {
      // Get old agent names before deleting
      const oldAgentRows = await db
        .select({ name: users.name })
        .from(dealAgents)
        .innerJoin(users, eq(dealAgents.userId, users.id))
        .where(and(eq(dealAgents.dealId, id), isNull(dealAgents.removedAt)));
      const oldAgentNames = oldAgentRows.map((r) => r.name).sort();

      await db.delete(dealAgents).where(eq(dealAgents.dealId, id));
      if (safeAgentIds.length) {
        await db.insert(dealAgents).values(
          safeAgentIds.map((userId: string) => ({
            dealId: id,
            userId,
            assignedAt: new Date(),
          }))
        );
      }

      // Get new agent names and write history if changed
      const newAgentNames: string[] = [];
      if (safeAgentIds.length) {
        const newAgentRows = await db
          .select({ name: users.name })
          .from(users)
          .where(inArray(users.id, safeAgentIds));
        newAgentNames.push(...newAgentRows.map((r) => r.name).sort());
      }

      const oldStr = oldAgentNames.join(", ") || "(none)";
      const newStr = newAgentNames.join(", ") || "(none)";
      if (oldStr !== newStr) {
        historyRows.push({
          dealId: id,
          dealType: existingDeal.dealType,
          field: "agents",
          oldValue: oldStr,
          newValue: newStr,
          changedById,
          changedByName,
          changedAt: now,
        });
      }
    }

    if (
      typeof stageIdValue === "string" &&
      stageIdValue !== existingDeal.stageId
    ) {
      const [newStage] = await db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.id, stageIdValue))
        .limit(1);

      const [oldStage] = await db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.id, existingDeal.stageId))
        .limit(1);

      if (newStage) {
        const [activeStageRow] = await db
          .select()
          .from(dealStageHistory)
          .where(
            and(
              eq(dealStageHistory.dealId, id),
              isNull(dealStageHistory.exitedAt)
            )
          )
          .orderBy(desc(dealStageHistory.enteredAt))
          .limit(1);

        if (activeStageRow) {
          const enteredAt = new Date(activeStageRow.enteredAt);
          const durationSeconds = Math.max(
            0,
            Math.floor((now.getTime() - enteredAt.getTime()) / 1000)
          );

          await db
            .update(dealStageHistory)
            .set({
              exitedAt: now,
              durationSeconds,
            })
            .where(eq(dealStageHistory.id, activeStageRow.id));
        } else if (oldStage) {
          const fallbackEntered = existingDeal.createdAt;
          const durationSeconds = Math.max(
            0,
            Math.floor((now.getTime() - new Date(fallbackEntered).getTime()) / 1000)
          );

          await db.insert(dealStageHistory).values({
            dealId: id,
            stageId: oldStage.id,
            stageName: oldStage.name,
            enteredAt: fallbackEntered,
            exitedAt: now,
            durationSeconds,
            changedBy: changedById,
            createdAt: now,
          });
        }

        await db.insert(dealStageHistory).values({
          dealId: id,
          stageId: newStage.id,
          stageName: newStage.name,
          enteredAt: now,
          changedBy: changedById,
          createdAt: now,
        });

        historyRows.push({
          dealId: id,
          dealType: existingDeal.dealType,
          field: "stage",
          oldValue: oldStage?.name ?? null,
          newValue: newStage.name,
          changedById,
          changedByName,
          changedAt: now,
        });
      }
    }

    if (historyRows.length > 0) {
      await db.insert(dealHistory).values(historyRows);
    }

    // Refetch with relations so agents/stage are included in response
    const full = await db.query.deals.findFirst({
      where: eq(deals.id, id),
      with: { stage: true, agents: { with: { user: true }, where: (da, { isNull }) => isNull(da.removedAt) }, creator: true },
    });

    return NextResponse.json(full);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(dealAgents).where(eq(dealAgents.dealId, id));
    await db.delete(dealStageHistory).where(eq(dealStageHistory.dealId, id));
    await db.delete(dealHistory).where(eq(dealHistory.dealId, id));
    await db.delete(deals).where(eq(deals.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
