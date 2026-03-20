import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { landlords } from "@/db/schema";
import { asc, ilike, or } from "drizzle-orm";

type LandlordInsert = typeof landlords.$inferInsert;

function normalizeBody(body: Record<string, unknown>): Partial<LandlordInsert> {
  const trimOrNull = (value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  };

  return {
    name: trimOrNull(body.name) ?? "",
    phone: trimOrNull(body.phone),
    email: trimOrNull(body.email),
    preferredContact: trimOrNull(body.preferredContact),
    managementCompany: trimOrNull(body.managementCompany),
    notes: trimOrNull(body.notes),
    coBroke: typeof body.coBroke === "boolean" ? body.coBroke : false,
    coBrokeTerms: trimOrNull(body.coBrokeTerms),
  };
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();

    const rows = await db.query.landlords.findMany({
      where: q
        ? or(
            ilike(landlords.name, `%${q}%`),
            ilike(landlords.phone, `%${q}%`),
            ilike(landlords.email, `%${q}%`),
            ilike(landlords.managementCompany, `%${q}%`)
          )
        : undefined,
      with: {
        buildings: {
          with: {
            deals: true,
          },
        },
      },
      orderBy: [asc(landlords.name)],
    });

    return NextResponse.json(
      rows.map((row) => {
        const dealCount = row.buildings.reduce((sum, building) => sum + building.deals.length, 0);
        return {
          ...row,
          buildingCount: row.buildings.length,
          dealCount,
        };
      })
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch landlords" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const normalized = normalizeBody(body);

    if (!normalized.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [created] = await db
      .insert(landlords)
      .values({
        name: normalized.name,
        phone: normalized.phone ?? null,
        email: normalized.email ?? null,
        preferredContact: normalized.preferredContact ?? null,
        managementCompany: normalized.managementCompany ?? null,
        notes: normalized.notes ?? null,
        coBroke: normalized.coBroke ?? false,
        coBrokeTerms: normalized.coBrokeTerms ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create landlord" }, { status: 500 });
  }
}
