import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dealHistory, dealStageHistory } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth disabled for now — Clerk not configured

  const { id } = await params;
  const field = req.nextUrl.searchParams.get("field");

  const query = db
    .select()
    .from(dealHistory)
    .where(eq(dealHistory.dealId, id))
    .orderBy(desc(dealHistory.changedAt));

  const entries = await query;

  const stageTimeline = await db.query.dealStageHistory.findMany({
    where: eq(dealStageHistory.dealId, id),
    with: {
      stage: true,
      changedByUser: true,
    },
    orderBy: (rows, { desc }) => [desc(rows.enteredAt)],
  });

  const filtered = field
    ? entries.filter((e) => e.field === field)
    : entries;

  return NextResponse.json({
    history: filtered,
    stageTimeline,
  });
}
