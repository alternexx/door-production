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

    await db
      .delete(dealContacts)
      .where(
        and(
          eq(dealContacts.contactId, id),
          eq(dealContacts.dealId, body.dealId)
        )
      );

    await db.insert(contactHistory).values({
      contactId: id,
      action: "unlinked",
      dealId: body.dealId,
      newValue: `Unlinked from deal: ${deal.title}`,
      changedBy: actor.id,
    });

    await db.insert(dealHistory).values({
      dealId: body.dealId,
      dealType: deal.dealType,
      field: "contact",
      oldValue: `Contact: ${contact.fullName}`,
      newValue: "Unlinked",
      changedById: actor.id,
      changedByName: actor.name,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to unlink contact" },
      { status: 500 }
    );
  }
}
