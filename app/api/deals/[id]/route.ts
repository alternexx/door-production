import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deals, dealAgents, dealHistory, dealStageHistory, pipelineStages, users } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

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
  const normalized = { ...payload } as Partial<DealInsert> & { property?: unknown };
  const legacyProperty = normalized.property;
  const address = normalized.address;

  if (!address && typeof legacyProperty === "string" && legacyProperty.trim()) {
    normalized.address = legacyProperty;
  }
  if (!normalized.title && typeof normalized.address === "string" && normalized.address.trim()) {
    normalized.title = normalized.address;
  }

  delete normalized.property;
  return normalized;
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
    // Auth disabled for now — Clerk not configured
    const userId: string | null = null;
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

    const [authedUser] = userId
      ? await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
      : [];
    const changedById = authedUser?.id ?? existingDeal.createdBy;
    const changedByName = authedUser?.name ?? "System";

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

    // Handle agent updates if provided
    if (agentIds !== undefined) {
      await db.delete(dealAgents).where(eq(dealAgents.dealId, id));
      if (agentIds.length) {
        await db.insert(dealAgents).values(
          agentIds.map((userId: string) => ({
            dealId: id,
            userId,
            assignedAt: new Date(),
          }))
        );
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

    return NextResponse.json(updated);
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
