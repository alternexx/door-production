import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  contacts,
  dealContacts,
  contactHistory,
  dealHistory,
  deals,
  users,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function getSystemActor() {
  const [actor] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .limit(1);

  if (!actor) {
    throw new Error("No users available for history tracking");
  }

  return actor;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getSystemActor();
    const { id } = await params;
    const body = await req.json();

    if (!body.dealId) {
      return NextResponse.json(
        { error: "dealId is required" },
        { status: 400 }
      );
    }

    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, body.dealId))
      .limit(1);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(dealContacts)
      .where(
        and(
          eq(dealContacts.contactId, id),
          eq(dealContacts.dealId, body.dealId)
        )
      )
      .limit(1);
    if (existing) {
      return NextResponse.json(
        { error: "Contact already linked to this deal" },
        { status: 400 }
      );
    }

    const [link] = await db
      .insert(dealContacts)
      .values({
        dealId: body.dealId,
        contactId: id,
        role: body.role ?? null,
      })
      .returning();

    await db.insert(contactHistory).values({
      contactId: id,
      action: "linked",
      dealId: body.dealId,
      newValue: `Linked to deal: ${deal.title}`,
      changedBy: actor.id,
    });

    await db.insert(dealHistory).values({
      dealId: body.dealId,
      dealType: deal.dealType,
      field: "contact",
      oldValue: null,
      newValue: `Linked contact: ${contact.fullName}`,
      changedById: actor.id,
      changedByName: actor.name,
    });

    return NextResponse.json(link, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to link contact" },
      { status: 500 }
    );
  }
}
