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
    if (existing.status === "cancelled") {
      return NextResponse.json(
        { error: "Showing already cancelled" },
        { status: 400 }
      );
    }

    const now = new Date();
    await db
      .update(showings)
      .set({
        status: "cancelled",
        cancelledAt: now,
        cancelReason: body.reason ?? null,
      })
      .where(eq(showings.id, id));

    await db.insert(showingHistory).values({
      showingId: id,
      action: "cancelled",
      oldValue: existing.status,
      newValue: "cancelled",
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
        oldValue: null,
        newValue: `Cancelled showing${body.reason ? `: ${body.reason}` : ""}`,
        changedById: currentUser.id,
        changedByName: currentUser.name,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "Failed to cancel showing" },
      { status: 500 }
    );
  }
}
