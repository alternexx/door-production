import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { checklistTemplates, type DealType } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { normalizeChecklistTemplateItems } from "@/lib/checklists";
import { requireAdminUser, requireRequestUser } from "@/lib/request-user";

const DEAL_TYPES: DealType[] = ["rental", "seller", "buyer", "application", "tenant_rep"];

function parseDealType(value: unknown): DealType | null {
  if (typeof value !== "string") return null;
  return DEAL_TYPES.includes(value as DealType) ? (value as DealType) : null;
}

export async function GET() {
  try {
    const currentUser = await requireRequestUser();
    const templates = await db
      .select()
      .from(checklistTemplates)
      .orderBy(asc(checklistTemplates.dealType));

    return NextResponse.json({
      templates,
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        isAdmin: currentUser.role === "admin",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "No user found") {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch checklist templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();

    const body = await req.json();
    const dealType = parseDealType(body?.dealType);
    const items = normalizeChecklistTemplateItems(body?.items);

    if (!dealType) {
      return NextResponse.json({ error: "Invalid dealType" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.dealType, dealType))
      .limit(1);

    const now = new Date();

    if (existing) {
      const [updated] = await db
        .update(checklistTemplates)
        .set({ items, updatedAt: now })
        .where(eq(checklistTemplates.id, existing.id))
        .returning();

      return NextResponse.json(updated);
    }

    const [created] = await db
      .insert(checklistTemplates)
      .values({
        dealType,
        items,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "No user found") {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to save checklist template" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdminUser();

    const body = await req.json();
    const dealType = parseDealType(body?.dealType);
    const items = normalizeChecklistTemplateItems(body?.items);

    if (!dealType) {
      return NextResponse.json({ error: "Invalid dealType" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.dealType, dealType))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(checklistTemplates)
      .set({
        items,
        updatedAt: new Date(),
      })
      .where(eq(checklistTemplates.id, existing.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "No user found") {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to update checklist template" }, { status: 500 });
  }
}
