import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, contactHistory, dealContacts, users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getSystemActor() {
  const [actor] = await db
    .select({ id: users.id })
    .from(users)
    .limit(1);

  if (!actor) {
    throw new Error("No users available for history tracking");
  }

  return actor;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, id),
      with: { deals: { with: { deal: true } } },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contact);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getSystemActor();
    const { id } = await params;
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const changes: Record<string, { old: string | null; new: string | null }> =
      {};
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.fullName !== undefined && body.fullName !== existing.fullName) {
      changes.fullName = { old: existing.fullName, new: body.fullName };
      updateData.fullName = body.fullName;
    }
    if (body.email !== undefined && body.email !== existing.email) {
      changes.email = { old: existing.email, new: body.email };
      updateData.email = body.email;
    }
    if (body.phone !== undefined && body.phone !== existing.phone) {
      changes.phone = { old: existing.phone, new: body.phone };
      updateData.phone = body.phone;
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json(existing);
    }

    const [updated] = await db
      .update(contacts)
      .set(updateData)
      .where(eq(contacts.id, id))
      .returning();

    await db.insert(contactHistory).values({
      contactId: id,
      action: "updated",
      oldValue: JSON.stringify(
        Object.fromEntries(
          Object.entries(changes).map(([k, v]) => [k, v.old])
        )
      ),
      newValue: JSON.stringify(
        Object.fromEntries(
          Object.entries(changes).map(([k, v]) => [k, v.new])
        )
      ),
      changedBy: actor.id,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [existing] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    await db.delete(dealContacts).where(eq(dealContacts.contactId, id));
    await db.delete(contactHistory).where(eq(contactHistory.contactId, id));
    await db.delete(contacts).where(eq(contacts.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
