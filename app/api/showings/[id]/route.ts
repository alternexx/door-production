import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { showings, showingHistory, dealHistory, deals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function PATCH(
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

    const updateData: Record<string, unknown> = {};

    if (body.scheduledAt) {
      updateData.scheduledAt = new Date(body.scheduledAt);
    }
    if (body.status) {
      updateData.status = body.status;

      if (body.status === "completed") {
        await db.insert(showingHistory).values({
          showingId: id,
          action: "completed",
          oldValue: existing.status,
          newValue: "completed",
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
            newValue: `Showing completed`,
            changedById: currentUser.id,
            changedByName: currentUser.name,
          });
        }
      }

      if (body.status === "no_show") {
        await db.insert(showingHistory).values({
          showingId: id,
          action: "no_show",
          oldValue: existing.status,
          newValue: "no_show",
          changedBy: currentUser.id,
        });
      }
    }

    const [updated] = await db
      .update(showings)
      .set(updateData)
      .where(eq(showings.id, id))
      .returning();

    const full = await db.query.showings.findFirst({
      where: eq(showings.id, id),
      with: { agent: true },
    });

    return NextResponse.json(full);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update showing" },
      { status: 500 }
    );
  }
}
