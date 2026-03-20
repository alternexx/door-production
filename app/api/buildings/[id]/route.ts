import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { buildings } from "@/db/schema";
import { eq } from "drizzle-orm";

type BuildingInsert = typeof buildings.$inferInsert;

function normalizePatchBody(body: Record<string, unknown>): Partial<BuildingInsert> {
  const trimOrNull = (value: unknown) => {
    if (value === null) return null;
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  };

  const payload: Partial<BuildingInsert> = {};

  const address = trimOrNull(body.address);
  const borough = trimOrNull(body.borough);
  const neighborhood = trimOrNull(body.neighborhood);
  const zip = trimOrNull(body.zip);
  const keyAccess = trimOrNull(body.keyAccess);
  const ownerName = trimOrNull(body.ownerName);
  const ownerPhone = trimOrNull(body.ownerPhone);
  const ownerEmail = trimOrNull(body.ownerEmail);
  const managementCompany = trimOrNull(body.managementCompany);
  const landlordId = trimOrNull(body.landlordId);

  if (address !== undefined) payload.address = address ?? "";
  if (borough !== undefined) payload.borough = borough ?? "";
  if (neighborhood !== undefined) payload.neighborhood = neighborhood;
  if (zip !== undefined) payload.zip = zip;
  if (keyAccess !== undefined) payload.keyAccess = keyAccess;
  if (ownerName !== undefined) payload.ownerName = ownerName;
  if (ownerPhone !== undefined) payload.ownerPhone = ownerPhone;
  if (ownerEmail !== undefined) payload.ownerEmail = ownerEmail;
  if (managementCompany !== undefined) payload.managementCompany = managementCompany;
  if (landlordId !== undefined) payload.landlordId = landlordId;

  if (Object.prototype.hasOwnProperty.call(body, "amenities")) {
    payload.amenities = Array.isArray(body.amenities)
      ? body.amenities.filter((item): item is string => typeof item === "string")
      : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "photos")) {
    payload.photos = Array.isArray(body.photos)
      ? body.photos.filter((item): item is string => typeof item === "string")
      : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "floorPlans")) {
    payload.floorPlans = Array.isArray(body.floorPlans)
      ? body.floorPlans.filter((item): item is string => typeof item === "string")
      : null;
  }

  return payload;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const row = await db.query.buildings.findFirst({
      where: eq(buildings.id, id),
      with: { deals: true, landlord: true },
    });

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...row,
      dealCount: row.deals.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch building" }, { status: 500 });
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

    if ((patch.address !== undefined && !patch.address) || (patch.borough !== undefined && !patch.borough)) {
      return NextResponse.json(
        { error: "Address and borough cannot be empty" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(buildings)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(buildings.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update building" }, { status: 500 });
  }
}
