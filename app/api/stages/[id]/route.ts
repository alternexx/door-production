import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pipelineStages, deals, dealStageHistory } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth disabled for now — Clerk not configured
  const { id } = await params;
  try {
    // Check if any deals reference this stage
    const referencedDeals = await db.select({ id: deals.id }).from(deals).where(eq(deals.stageId, id)).limit(1);
    if (referencedDeals.length > 0) {
      return NextResponse.json({ error: "Stage is in use by deals and cannot be deleted" }, { status: 409 });
    }
    // Remove from stage history references (safe to nullify or skip)
    await db.delete(dealStageHistory).where(eq(dealStageHistory.stageId, id));
    const [deleted] = await db.delete(pipelineStages).where(eq(pipelineStages.id, id)).returning();
    if (!deleted) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete stage" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [stage] = await db.select().from(pipelineStages).where(eq(pipelineStages.id, id)).limit(1);
  if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(stage);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth disabled for now — Clerk not configured

  const { id } = await params;
  const body = await req.json();

  const updates: Partial<{
    name: string;
    color: string;
    orderIndex: number;
    outcome: "win" | "loss" | "na" | null;
  }> = {};

  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.color === "string") updates.color = body.color;
  if (typeof body.orderIndex === "number") updates.orderIndex = body.orderIndex;
  if (body.outcome === "win" || body.outcome === "loss" || body.outcome === "na") updates.outcome = body.outcome;
  if (body.outcome === null) updates.outcome = null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(pipelineStages)
    .set(updates)
    .where(eq(pipelineStages.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
