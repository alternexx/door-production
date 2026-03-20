import { NextResponse } from "next/server";
import { db } from "@/db";
import { showings, showingHistory, dealHistory, deals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireUser();
    const { id } = await params;

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

    if (existing.status === "completed") {
      const full = await db.query.showings.findFirst({
        where: eq(showings.id, id),
        with: { agent: true },
      });
      return NextResponse.json(full);
    }

    await db
      .update(showings)
      .set({ status: "completed" })
      .where(eq(showings.id, id));

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
        newValue: "Showing completed",
        changedById: currentUser.id,
        changedByName: currentUser.name,
      });
    }

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
      { error: "Failed to complete showing" },
      { status: 500 }
    );
  }
}
