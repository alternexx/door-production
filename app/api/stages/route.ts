import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pipelineStages } from "@/db/schema";
import { eq, asc, and, or } from "drizzle-orm";
import type { DealType } from "@/db/schema";

export async function GET(req: NextRequest) {
  // Auth disabled for now — Clerk not configured

  const dealType = req.nextUrl.searchParams.get("dealType") as DealType | null;
  const archive = req.nextUrl.searchParams.get("archive");

  if (!dealType) {
    return NextResponse.json(
      { error: "dealType is required" },
      { status: 400 }
    );
  }

  let whereClause;
  if (archive === "true") {
    // Only archive (closed) stages
    whereClause = and(
      eq(pipelineStages.dealType, dealType),
      or(
        eq(pipelineStages.isClosedWon, true),
        eq(pipelineStages.isClosedLost, true)
      )
    );
  } else if (archive === "false") {
    // Only pipeline (non-closed) stages
    whereClause = and(
      eq(pipelineStages.dealType, dealType),
      eq(pipelineStages.isClosedWon, false),
      eq(pipelineStages.isClosedLost, false)
    );
  } else {
    // No filter — return all stages for this deal type (existing behavior)
    whereClause = eq(pipelineStages.dealType, dealType);
  }

  const stages = await db
    .select()
    .from(pipelineStages)
    .where(whereClause)
    .orderBy(asc(pipelineStages.orderIndex));

  return NextResponse.json(stages);
}

export async function POST(req: NextRequest) {
  // Auth disabled for now — Clerk not configured
  try {
    const body = await req.json();
    const { dealType, name, color, orderIndex, isClosedWon, isClosedLost } = body;
    if (!dealType || !name) return NextResponse.json({ error: "dealType and name required" }, { status: 400 });

    const [created] = await db.insert(pipelineStages).values({
      dealType: dealType as DealType,
      name,
      color: color || "#9ca3af",
      orderIndex: orderIndex ?? 0,
      isClosedWon: isClosedWon ?? false,
      isClosedLost: isClosedLost ?? false,
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create stage" }, { status: 500 });
  }
}
