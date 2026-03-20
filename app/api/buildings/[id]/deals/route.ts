import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = await db.query.deals.findMany({
      where: eq(deals.buildingId, id),
      with: {
        stage: true,
        agents: { with: { user: true } },
        creator: true,
      },
      orderBy: [desc(deals.updatedAt)],
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch building deals" }, { status: 500 });
  }
}
