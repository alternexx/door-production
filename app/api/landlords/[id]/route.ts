import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { landlords } from "@/db/schema";
import { eq } from "drizzle-orm";

type LandlordInsert = typeof landlords.$inferInsert;

function normalizePatchBody(body: Record<string, unknown>): Partial<LandlordInsert> {
  const trimOrNull = (value: unknown) => {
    if (value === null) return null;
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  };

  const payload: Partial<LandlordInsert> = {};

  const name = trimOrNull(body.name);
  const phone = trimOrNull(body.phone);
  const email = trimOrNull(body.email);
  const preferredContact = trimOrNull(body.preferredContact);
  const managementCompany = trimOrNull(body.managementCompany);
  const notes = trimOrNull(body.notes);
  const coBrokeTerms = trimOrNull(body.coBrokeTerms);

  if (name !== undefined) payload.name = name ?? "";
  if (phone !== undefined) payload.phone = phone;
  if (email !== undefined) payload.email = email;
  if (preferredContact !== undefined) payload.preferredContact = preferredContact;
  if (managementCompany !== undefined) payload.managementCompany = managementCompany;
  if (notes !== undefined) payload.notes = notes;
  if (coBrokeTerms !== undefined) payload.coBrokeTerms = coBrokeTerms;
  if (Object.prototype.hasOwnProperty.call(body, "coBroke")) {
    payload.coBroke = typeof body.coBroke === "boolean" ? body.coBroke : false;
  }

  return payload;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const row = await db.query.landlords.findFirst({
      where: eq(landlords.id, id),
      with: {
        buildings: {
          with: {
            deals: {
              with: {
                stage: true,
              },
            },
          },
        },
      },
    });

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const dealHistory = row.buildings
      .flatMap((building) =>
        building.deals.map((deal) => ({
          ...deal,
          buildingAddress: building.address,
        }))
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({
      ...row,
      buildingCount: row.buildings.length,
      dealCount: dealHistory.length,
      dealHistory,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch landlord" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const patch = normalizePatchBody(body);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if (patch.name !== undefined && !patch.name) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    const [updated] = await db
      .update(landlords)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(landlords.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update landlord" }, { status: 500 });
  }
}
