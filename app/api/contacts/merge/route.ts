import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, dealContacts, contactHistory, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

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

export async function POST(req: NextRequest) {
  try {
    const actor = await getSystemActor();
    const body = await req.json();

    const { primaryId, mergeIds } = body;
    if (!primaryId || !mergeIds?.length) {
      return NextResponse.json(
        { error: "primaryId and mergeIds are required" },
        { status: 400 }
      );
    }

    const [primary] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, primaryId))
      .limit(1);
    if (!primary) {
      return NextResponse.json(
        { error: "Primary contact not found" },
        { status: 404 }
      );
    }

    const merging = await db
      .select()
      .from(contacts)
      .where(inArray(contacts.id, mergeIds));

    if (merging.length !== mergeIds.length) {
      return NextResponse.json(
        { error: "Some merge contacts not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const c of merging) {
      if (!primary.email && c.email) updateData.email = c.email;
      if (!primary.phone && c.phone) updateData.phone = c.phone;
    }

    if (Object.keys(updateData).length > 1) {
      await db
        .update(contacts)
        .set(updateData)
        .where(eq(contacts.id, primaryId));
    }

    await db
      .update(dealContacts)
      .set({ contactId: primaryId })
      .where(inArray(dealContacts.contactId, mergeIds));

    for (const c of merging) {
      await db.insert(contactHistory).values({
        contactId: primaryId,
        action: "merged",
        oldValue: JSON.stringify({
          mergedId: c.id,
          fullName: c.fullName,
          email: c.email,
          phone: c.phone,
        }),
        newValue: `Merged ${c.fullName} into ${primary.fullName}`,
        changedBy: actor.id,
      });
    }

    await db
      .delete(contactHistory)
      .where(inArray(contactHistory.contactId, mergeIds));
    await db.delete(contacts).where(inArray(contacts.id, mergeIds));

    const result = await db.query.contacts.findFirst({
      where: eq(contacts.id, primaryId),
      with: { deals: { with: { deal: true } } },
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to merge contacts" },
      { status: 500 }
    );
  }
}
