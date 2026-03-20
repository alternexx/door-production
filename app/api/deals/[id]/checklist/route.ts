import { NextResponse } from "next/server";
import { db } from "@/db";
import { checklistTemplates, dealChecklistItems, deals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildDealChecklist, normalizeChecklistTemplateItems } from "@/lib/checklists";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const items = await db.query.dealChecklistItems.findMany({
      where: eq(dealChecklistItems.dealId, id),
      with: { completedByUser: true },
    });

    const normalizedTemplateItems = normalizeChecklistTemplateItems(template?.items ?? []);
    const checklist = buildDealChecklist(normalizedTemplateItems, items);

    return NextResponse.json({
      dealId: id,
      dealType: deal.dealType,
      templateId: template?.id ?? null,
      ...checklist,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch checklist" }, { status: 500 });
  }
}
