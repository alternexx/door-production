import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  showings,
  showingHistory,
  dealHistory,
  deals,
} from "@/db/schema";
import { and, eq, gte, lt } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const dealId = req.nextUrl.searchParams.get("deal_id");
    const month = req.nextUrl.searchParams.get("month");
    const agentId = req.nextUrl.searchParams.get("agent_id");

    let rows;

    if (dealId) {
      rows = await db.query.showings.findMany({
        where: eq(showings.dealId, dealId),
        with: {
          agent: true,
        },
        orderBy: (showings, { desc }) => [desc(showings.scheduledAt)],
      });
    } else {
      const monthValue = month && /^\d{4}-\d{2}$/.test(month) ? month : null;
      const [year, monthNumber] = monthValue
        ? monthValue.split("-").map(Number)
        : [new Date().getUTCFullYear(), new Date().getUTCMonth() + 1];
      const start = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, monthNumber, 1, 0, 0, 0, 0));

      rows = await db.query.showings.findMany({
        where: and(
          gte(showings.scheduledAt, start),
          lt(showings.scheduledAt, end),
          agentId ? eq(showings.agentId, agentId) : undefined
        ),
        with: {
          agent: true,
          deal: true,
        },
        orderBy: (showings, { asc }) => [asc(showings.scheduledAt)],
      });
    }

    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch showings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await requireUser();
    const body = await req.json();

    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, body.dealId))
      .limit(1);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const [newShowing] = await db
      .insert(showings)
      .values({
        dealId: body.dealId,
        agentId: body.agentId ?? currentUser.id,
        scheduledAt: new Date(body.scheduledAt),
        status: "scheduled",
        showingType: body.showingType === "open_house" ? "open_house" : "private",
      })
      .returning();

    await db.insert(showingHistory).values({
      showingId: newShowing.id,
      action: "scheduled",
      newValue: new Date(body.scheduledAt).toISOString(),
      changedBy: currentUser.id,
    });

    await db.insert(dealHistory).values({
      dealId: body.dealId,
      dealType: deal.dealType,
      field: "showing",
      oldValue: null,
      newValue: `Scheduled showing for ${new Date(body.scheduledAt).toLocaleDateString()}`,
      changedById: currentUser.id,
      changedByName: currentUser.name,
    });

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
      { error: "Failed to create showing" },
      { status: 500 }
    );
  }
}
