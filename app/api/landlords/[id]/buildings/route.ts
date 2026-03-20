import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { buildings } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const rows = await db.query.buildings.findMany({
      where: eq(buildings.landlordId, id),
      with: {
        deals: true,
      },
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
    return NextResponse.json({ error: "Failed to fetch landlord buildings" }, { status: 500 });
  }
}
