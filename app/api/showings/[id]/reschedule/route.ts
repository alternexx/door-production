import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { showings, showingHistory, dealHistory, deals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireUser();
    const { id } = await params;
    const body = await req.json();

    if (!body.scheduledAt) {
      return NextResponse.json(
        { error: "scheduledAt is required" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(showings)
      .where(eq(showings.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json(
        { error: "Showing not found" },
        { status: 404 }
      );
    }

    // Cancel the old showing
    await db
      .update(showings)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: "Rescheduled",
      })
      .where(eq(showings.id, id));

    // Create a new showing linked to the old one
    const [newShowing] = await db
      .insert(showings)
      .values({
        dealId: existing.dealId,
        agentId: body.agentId ?? existing.agentId,
        scheduledAt: new Date(body.scheduledAt),
        status: "scheduled",
        rescheduledFrom: id,
      })
      .returning();

    await db.insert(showingHistory).values({
      showingId: id,
      action: "rescheduled",
      oldValue: existing.scheduledAt.toISOString(),
      newValue: new Date(body.scheduledAt).toISOString(),
      changedBy: currentUser.id,
    });

    await db.insert(showingHistory).values({
      showingId: newShowing.id,
      action: "scheduled",
      newValue: new Date(body.scheduledAt).toISOString(),
      changedBy: currentUser.id,
    });

    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, existing.dealId))
      .limit(1);
    if (deal) {
      await db.insert(dealHistory).values({
        dealId: deal.id,
        dealType: deal.dealType,
        field: "showing",
        oldValue: `Showing on ${existing.scheduledAt.toLocaleDateString()}`,
        newValue: `Rescheduled to ${new Date(body.scheduledAt).toLocaleDateString()}`,
        changedById: currentUser.id,
        changedByName: currentUser.name,
      });
    }

    const full = await db.query.showings.findFirst({
      where: eq(showings.id, newShowing.id),
      with: { agent: true },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "Failed to reschedule showing" },
      { status: 500 }
    );
  }
}
