import { NextResponse } from "next/server";
import { and, asc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function daysUntil(dateValue: string): number {
  const now = new Date();
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = Date.parse(`${dateValue}T00:00:00Z`);
  return Math.ceil((target - startOfToday) / 86400000);
}

export async function GET() {
  try {
    const now = new Date();
    const today = toDateOnly(now);
    const in90DaysDate = new Date(now);
    in90DaysDate.setUTCDate(in90DaysDate.getUTCDate() + 90);
    const in90Days = toDateOnly(in90DaysDate);

    const rows = await db.query.deals.findMany({
      where: and(
        eq(deals.dealType, "rental"),
        isNotNull(deals.leaseEndDate),
        gte(deals.leaseEndDate, today),
        lte(deals.leaseEndDate, in90Days)
      ),
      with: {
        stage: true,
        agents: { with: { user: true } },
      },
      orderBy: [asc(deals.leaseEndDate)],
    });

    const payload = rows
      .map((row) => {
        if (!row.leaseEndDate) return null;
        return {
          ...row,
          daysUntilExpiry: daysUntil(row.leaseEndDate),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    return NextResponse.json(payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch renewals" }, { status: 500 });
  }
}
