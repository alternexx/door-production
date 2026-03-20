import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, contactHistory, users } from "@/db/schema";
import { ilike, or } from "drizzle-orm";

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

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q");

    let rows;
    if (query) {
      const pattern = `%${query}%`;
      rows = await db.query.contacts.findMany({
        where: or(
          ilike(contacts.fullName, pattern),
          ilike(contacts.email, pattern),
          ilike(contacts.phone, pattern)
        ),
        with: { deals: { with: { deal: true } } },
        orderBy: (contacts, { asc }) => [asc(contacts.fullName)],
      });
    } else {
      rows = await db.query.contacts.findMany({
        with: { deals: { with: { deal: true } } },
        orderBy: (contacts, { asc }) => [asc(contacts.fullName)],
      });
    }

    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSystemActor();
    const body = await req.json();

    const [newContact] = await db
      .insert(contacts)
      .values({
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
      })
      .returning();

    await db.insert(contactHistory).values({
      contactId: newContact.id,
      action: "created",
      newValue: JSON.stringify({
        fullName: newContact.fullName,
        email: newContact.email,
        phone: newContact.phone,
      }),
      changedBy: actor.id,
    });

    return NextResponse.json(newContact, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
