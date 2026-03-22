import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  deals,
  dealAgents,
  dealHistory,
  dealStageHistory,
  pipelineStages,
  checklistTemplates,
  dealChecklistItems,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { DealType } from "@/db/schema";
import { buildDealChecklist, normalizeChecklistTemplateItems } from "@/lib/checklists";

type DealInsert = typeof deals.$inferInsert;

const DEAL_TYPE_ALIASES: Record<string, DealType> = {
  rental: "rental",
  rentals: "rental",
  seller: "seller",
  sellers: "seller",
  buyer: "buyer",
  buyers: "buyer",
  application: "application",
  applications: "application",
  tenant_rep: "tenant_rep",
  "tenant-rep": "tenant_rep",
};

function parseDealTypeParam(raw: string | null): DealType | null | "invalid" {
  if (raw === null) return null;
  return DEAL_TYPE_ALIASES[raw] ?? "invalid";
}

function normalizeDealPayload(payload: Record<string, unknown>): Partial<DealInsert> {
  const normalized = { ...payload } as Partial<DealInsert> & { property?: unknown };
  const legacyProperty = normalized.property;
  const address = normalized.address;

  if (!address && typeof legacyProperty === "string" && legacyProperty.trim()) {
    normalized.address = legacyProperty;
  }
  if (!normalized.title && typeof normalized.address === "string" && normalized.address.trim()) {
    normalized.title = normalized.address;
  }

  delete normalized.property;
  return normalized;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dealTypeParam = parseDealTypeParam(searchParams.get("type"));
    if (dealTypeParam === "invalid") {
      return NextResponse.json(
        { error: "Invalid deal type. Use rental, seller, buyer, application, or tenant_rep." },
        { status: 400 }
      );
    }
    const dealType = dealTypeParam;
    const includeArchived = searchParams.get("archived") === "true";

    const conditions = [];
    if (dealType) conditions.push(eq(deals.dealType, dealType));
    if (!includeArchived) conditions.push(eq(deals.status, "active"));

    const rows = await db.query.deals.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        stage: true,
        agents: { with: { user: true }, where: (da, { isNull }) => isNull(da.removedAt) },
        creator: true,
      },
      orderBy: (deals, { desc }) => [desc(deals.updatedAt)],
    });

    if (rows.length === 0) {
      return NextResponse.json(rows);
    }

    const dealIds = rows.map((row) => row.id);
    const dealTypesInPage = Array.from(new Set(rows.map((row) => row.dealType)));

    let templates: Array<typeof checklistTemplates.$inferSelect> = [];
    let checklistRows: Array<typeof dealChecklistItems.$inferSelect> = [];
    try {
      [templates, checklistRows] = await Promise.all([
        db
          .select()
          .from(checklistTemplates)
          .where(inArray(checklistTemplates.dealType, dealTypesInPage)),
        db
          .select()
          .from(dealChecklistItems)
          .where(inArray(dealChecklistItems.dealId, dealIds)),
      ]);
    } catch (checklistError) {
      console.warn("Checklist query failed, continuing without checklist progress:", checklistError);
    }

    const templatesByType = new Map(
      templates.map((template) => [
        template.dealType,
        normalizeChecklistTemplateItems(template.items ?? []),
      ])
    );

    const checklistRowsByDeal = new Map<string, typeof checklistRows>();
    for (const row of checklistRows) {
      const existing = checklistRowsByDeal.get(row.dealId);
      if (existing) {
        existing.push(row);
      } else {
        checklistRowsByDeal.set(row.dealId, [row]);
      }
    }

    const rowsWithChecklist = rows.map((row) => {
      const templateItems = templatesByType.get(row.dealType) ?? [];
      const itemRows = checklistRowsByDeal.get(row.id) ?? [];
      const checklist = buildDealChecklist(templateItems, itemRows);
      return {
        ...row,
        checklistProgress: {
          percent: checklist.percent,
          completedCount: checklist.completedCount,
          totalCount: checklist.totalCount,
        },
      };
    });

    return NextResponse.json(rowsWithChecklist);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentIds, ...dealData } = body;
    const normalizedDealData = normalizeDealPayload(dealData);

    const [newDeal] = await db.insert(deals).values({
      ...(normalizedDealData as DealInsert),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Insert agents
    if (agentIds?.length) {
      await db.insert(dealAgents).values(
        agentIds.map((userId: string) => ({
          dealId: newDeal.id,
          userId,
          assignedAt: new Date(),
        }))
      );
    }

    // Insert history entry
    await db.insert(dealHistory).values({
      dealId: newDeal.id,
      dealType: newDeal.dealType,
      field: "status",
      oldValue: null,
      newValue: "created",
      changedById: newDeal.createdBy,
      changedByName: "System",
      changedAt: new Date(),
    });

    // Seed initial stage timeline row
    const [initialStage] = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, newDeal.stageId))
      .limit(1);

    if (initialStage) {
      await db.insert(dealStageHistory).values({
        dealId: newDeal.id,
        stageId: initialStage.id,
        stageName: initialStage.name,
        enteredAt: new Date(),
        changedBy: newDeal.createdBy,
        createdAt: new Date(),
      });
    }

    const full = await db.query.deals.findFirst({
      where: eq(deals.id, newDeal.id),
      with: { stage: true, agents: { with: { user: true } }, creator: true },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
