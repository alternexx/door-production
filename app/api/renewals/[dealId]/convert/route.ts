import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  dealAgents,
  dealContacts,
  dealHistory,
  dealStageHistory,
  deals,
  pipelineStages,
} from "@/db/schema";
import { requireRequestUser } from "@/lib/request-user";

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  const copy = new Date(value);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addMonths(value: Date, months: number): Date {
  const copy = new Date(value);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

export async function POST(_req: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const currentUser = await requireRequestUser();
    const { dealId } = await params;

    const original = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
      with: {
        agents: true,
        contacts: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    if (!original.leaseEndDate) {
      return NextResponse.json({ error: "Deal does not have a lease end date" }, { status: 400 });
    }

    const cutoffDate = toDateOnly(addDays(new Date(), 90));
    if (original.leaseEndDate > cutoffDate) {
      return NextResponse.json(
        { error: "Deal is not expired or expiring in the next 90 days" },
        { status: 400 }
      );
    }

    const [nextStage] = await db
      .select()
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.dealType, "rental"),
          eq(pipelineStages.isClosedWon, false),
          eq(pipelineStages.isClosedLost, false)
        )
      )
      .orderBy(asc(pipelineStages.orderIndex))
      .limit(1);

    if (!nextStage) {
      return NextResponse.json({ error: "No open rental stage configured" }, { status: 400 });
    }

    const leaseStartSeed = addDays(new Date(`${original.leaseEndDate}T00:00:00Z`), 1);
    const leaseEndSeed = addMonths(leaseStartSeed, 12);

    const [created] = await db
      .insert(deals)
      .values({
        dealType: "rental",
        title: `${original.title} (Renewal)`,
        address: original.address,
        unit: original.unit,
        borough: original.borough,
        neighborhood: original.neighborhood,
        zip: original.zip,
        buildingId: original.buildingId,
        price: original.price,
        status: "active",
        source: original.source,
        notes: original.notes,
        stageId: nextStage.id,
        leaseStartDate: toDateOnly(leaseStartSeed),
        leaseEndDate: toDateOnly(leaseEndSeed),
        createdBy: currentUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (original.agents.length > 0) {
      await db.insert(dealAgents).values(
        original.agents.map((agent) => ({
          dealId: created.id,
          userId: agent.userId,
          assignedAt: new Date(),
        }))
      );
    }

    if (original.contacts.length > 0) {
      await db.insert(dealContacts).values(
        original.contacts.map((contact) => ({
          dealId: created.id,
          contactId: contact.contactId,
          role: contact.role,
          createdAt: new Date(),
        }))
      );
    }

    await db.insert(dealStageHistory).values({
      dealId: created.id,
      stageId: nextStage.id,
      stageName: nextStage.name,
      enteredAt: new Date(),
      changedBy: currentUser.id,
      createdAt: new Date(),
    });

    await db.insert(dealHistory).values([
      {
        dealId: created.id,
        dealType: created.dealType,
        field: "renewal",
        oldValue: null,
        newValue: `Created from deal ${original.id}`,
        changedById: currentUser.id,
        changedByName: currentUser.name,
        changedAt: new Date(),
      },
      {
        dealId: original.id,
        dealType: original.dealType,
        field: "renewal",
        oldValue: null,
        newValue: `Renewal deal created: ${created.id}`,
        changedById: currentUser.id,
        changedByName: currentUser.name,
        changedAt: new Date(),
      },
    ]);

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "No user found") {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create renewal deal" }, { status: 500 });
  }
}
