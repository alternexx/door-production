import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { checklistTemplates, dealChecklistItems, deals } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { buildDealChecklist, normalizeChecklistTemplateItems } from "@/lib/checklists";
import { requireRequestUser } from "@/lib/request-user";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRequestUser();
    const { id } = await params;
    const body = await req.json();

    const label = typeof body?.label === "string" ? body.label.trim() : "";
    if (!label) {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }

    const [deal] = await db
      .select({ id: deals.id, dealType: deals.dealType })
      .from(deals)
      .where(eq(deals.id, id))
      .limit(1);

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const [template] = await db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.dealType, deal.dealType))
      .limit(1);

    const templateItems = normalizeChecklistTemplateItems(template?.items ?? []);
    const templateItem = templateItems.find(
      (item) => item.label.toLowerCase() === label.toLowerCase()
    );

    if (!templateItem) {
      return NextResponse.json({ error: "Checklist item is not in the template" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(dealChecklistItems)
      .where(
        and(
          eq(dealChecklistItems.dealId, id),
          eq(dealChecklistItems.templateItemLabel, templateItem.label)
        )
      )
      .limit(1);

    const nextCompleted =
      typeof body?.completed === "boolean" ? body.completed : !(existing?.completed ?? false);

    const now = new Date();

    if (existing) {
      await db
        .update(dealChecklistItems)
        .set({
          completed: nextCompleted,
          completedAt: nextCompleted ? now : null,
          completedBy: nextCompleted ? currentUser.id : null,
          updatedAt: now,
        })
        .where(eq(dealChecklistItems.id, existing.id));
    } else {
      await db.insert(dealChecklistItems).values({
        dealId: id,
        templateItemLabel: templateItem.label,
        completed: nextCompleted,
        completedAt: nextCompleted ? now : null,
        completedBy: nextCompleted ? currentUser.id : null,
        createdAt: now,
        updatedAt: now,
      });
    }

    const rows = await db.query.dealChecklistItems.findMany({
      where: eq(dealChecklistItems.dealId, id),
      with: { completedByUser: true },
    });

    const checklist = buildDealChecklist(templateItems, rows);

    return NextResponse.json({
      dealId: id,
      dealType: deal.dealType,
      ...checklist,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "No user found") {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to toggle checklist item" }, { status: 500 });
  }
}
