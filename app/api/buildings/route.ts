import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { buildings } from "@/db/schema";
import { asc, ilike, or } from "drizzle-orm";

type BuildingInsert = typeof buildings.$inferInsert;

function normalizeBody(body: Record<string, unknown>): Partial<BuildingInsert> {
  const trimOrNull = (value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  };

  const landlordId =
    typeof body.landlordId === "string" && body.landlordId.trim().length
      ? body.landlordId.trim()
      : null;

  return {
    address: trimOrNull(body.address) ?? "",
    borough: trimOrNull(body.borough) ?? "",
    neighborhood: trimOrNull(body.neighborhood),
    zip: trimOrNull(body.zip),
    landlordId,
    keyAccess: trimOrNull(body.keyAccess),
    ownerName: trimOrNull(body.ownerName),
    ownerPhone: trimOrNull(body.ownerPhone),
    ownerEmail: trimOrNull(body.ownerEmail),
    managementCompany: trimOrNull(body.managementCompany),
    amenities: Array.isArray(body.amenities)
      ? body.amenities.filter((item): item is string => typeof item === "string")
      : null,
    photos: Array.isArray(body.photos)
      ? body.photos.filter((item): item is string => typeof item === "string")
      : null,
    floorPlans: Array.isArray(body.floorPlans)
      ? body.floorPlans.filter((item): item is string => typeof item === "string")
      : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();

    const rows = await db.query.buildings.findMany({
      where: q
        ? or(
            ilike(buildings.address, `%${q}%`),
            ilike(buildings.borough, `%${q}%`),
            ilike(buildings.neighborhood, `%${q}%`),
            ilike(buildings.zip, `%${q}%`),
            ilike(buildings.ownerName, `%${q}%`),
            ilike(buildings.managementCompany, `%${q}%`)
          )
        : undefined,
      with: { deals: true, landlord: true },
      orderBy: [asc(buildings.address)],
    });

    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        dealCount: row.deals.length,
      }))
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch buildings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const normalized = normalizeBody(body);

    if (!normalized.address || !normalized.borough) {
      return NextResponse.json(
        { error: "Address and borough are required" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(buildings)
      .values({
        address: normalized.address,
        borough: normalized.borough,
        neighborhood: normalized.neighborhood ?? null,
        zip: normalized.zip ?? null,
        landlordId: normalized.landlordId ?? null,
        keyAccess: normalized.keyAccess ?? null,
        ownerName: normalized.ownerName ?? null,
        ownerPhone: normalized.ownerPhone ?? null,
        ownerEmail: normalized.ownerEmail ?? null,
        managementCompany: normalized.managementCompany ?? null,
        amenities: normalized.amenities ?? null,
        photos: normalized.photos ?? null,
        floorPlans: normalized.floorPlans ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create building" }, { status: 500 });
  }
}
