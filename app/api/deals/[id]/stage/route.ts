import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  deals,
  dealStageHistory,
  dealHistory,
  showings,
  users,
  pipelineStages,
} from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { stageChangeSchema } from "@/lib/validations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth disabled for now — Clerk not configured
  const userId: string | null = null;

  const { id } = await params;

  // Get current user from Clerk ID, or fall back to first admin
  let currentUser = userId
    ? (await db.select().from(users).where(eq(users.clerkId, userId)).limit(1))[0]
    : undefined;

  if (!currentUser) {
    // Fallback to first admin user for unauthenticated requests
    currentUser = (await db.select().from(users).where(eq(users.role, "admin")).limit(1))[0];
  }

  if (!currentUser) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  const [existingDeal] = await db
    .select()
    .from(deals)
    .where(eq(deals.id, id))
    .limit(1);

  if (!existingDeal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = stageChangeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { stageId, showingDate, showingAgentId } = parsed.data;

  if (stageId === existingDeal.stageId) {
    return NextResponse.json(
      { error: "Already in this stage" },
      { status: 400 }
    );
  }

  // Get stage details
  const [fromStage, toStage] = await Promise.all([
    db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, existingDeal.stageId))
      .then((r) => r[0]),
    db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, stageId))
      .then((r) => r[0]),
  ]);

  if (!toStage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  const isShowingScheduledStage =
    toStage.name.toLowerCase().trim() === "showing scheduled";

  const now = new Date();

  // Close current open stage history row
  const [activeStageEntry] = await db
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

  if (activeStageEntry) {
    const entered = new Date(activeStageEntry.enteredAt);
    const durationSeconds = Math.max(
      0,
      Math.floor((now.getTime() - entered.getTime()) / 1000)
    );
    await db
      .update(dealStageHistory)
      .set({
        exitedAt: now,
        durationSeconds,
      })
      .where(eq(dealStageHistory.id, activeStageEntry.id));
  }

  // Record new active stage row
  await db.insert(dealStageHistory).values({
    dealId: id,
    stageId,
    stageName: toStage.name,
    enteredAt: now,
    changedBy: currentUser.id,
    createdAt: now,
  });

  // Record in deal history
  await db.insert(dealHistory).values({
    dealId: id,
    dealType: existingDeal.dealType,
    field: "stage",
    oldValue: fromStage?.name ?? null,
    newValue: toStage.name,
    changedById: currentUser.id,
    changedByName: currentUser.name,
  });

  // Update the deal
  const updateData: Record<string, unknown> = {
    stageId,
    updatedAt: now,
  };

  // If moving to closed stage, archive
  if (toStage.isClosedWon || toStage.isClosedLost) {
    updateData.status = "archived";
    updateData.archivedAt = now;
    updateData.archiveReason = toStage.name;
  }

  if (isShowingScheduledStage && showingDate) {
    updateData.showingScheduledAt = new Date(showingDate);
  }

  const [updatedDeal] = await db
    .update(deals)
    .set(updateData)
    .where(eq(deals.id, id))
    .returning();

  // If showing scheduled, create a showing record
  if (isShowingScheduledStage && showingDate) {
    await db.insert(showings).values({
      dealId: id,
      agentId: showingAgentId ?? currentUser.id,
      scheduledAt: new Date(showingDate),
      status: "scheduled",
    });
  }

  return NextResponse.json({
    deal: updatedDeal,
    stage: toStage,
    isClosedWon: toStage.isClosedWon,
    isClosedLost: toStage.isClosedLost,
  });
}
