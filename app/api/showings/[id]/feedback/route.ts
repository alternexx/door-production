import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { showings, showingHistory, dealHistory, deals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

async function saveFeedback(
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

    await db
      .update(showings)
      .set({
        feedbackReaction: body.reaction,
        feedbackNotes: body.notes,
        status: "completed",
      })
      .where(eq(showings.id, id));

    await db.insert(showingHistory).values({
      showingId: id,
      action: "feedback_added",
      oldValue: existing.feedbackReaction,
      newValue: JSON.stringify({
        reaction: body.reaction,
        notes: body.notes,
      }),
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
        newValue: `Showing feedback: ${body.reaction}${body.notes ? ` — ${body.notes}` : ""}`,
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
      { error: "Failed to add feedback" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return saveFeedback(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return saveFeedback(req, context);
}
