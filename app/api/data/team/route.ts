import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, deals, dealAgents, pipelineStages, showings } from "@/db/schema";
import { eq, and, isNull, sql, count, sum } from "drizzle-orm";

export async function GET() {
  try {
    const activeUsers = await db
      .select({ id: users.id, name: users.name, role: users.role, lastActiveAt: users.lastActiveAt })
      .from(users)
      .where(and(eq(users.isActive, true), sql`${users.name} != '[deleted]'`));

    const stats = await Promise.all(
      activeUsers.map(async (user) => {
        const [
          [activeDealRow],
          [winsRow],
          [lossesRow],
          [volumeRow],
          [showingsRow],
          [avgCloseRow],
          pipelinesRows,
        ] = await Promise.all([
          // Active deals
          db
            .select({ count: count() })
            .from(dealAgents)
            .innerJoin(deals, eq(dealAgents.dealId, deals.id))
            .where(
              and(
                eq(dealAgents.userId, user.id),
                isNull(dealAgents.removedAt),
                eq(deals.status, "active")
              )
            ),

          // Wins
          db
            .select({ count: count() })
            .from(dealAgents)
            .innerJoin(deals, eq(dealAgents.dealId, deals.id))
            .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
            .where(
              and(
                eq(dealAgents.userId, user.id),
                isNull(dealAgents.removedAt),
                eq(deals.status, "archived"),
                eq(pipelineStages.isClosedWon, true)
              )
            ),

          // Losses
          db
            .select({ count: count() })
            .from(dealAgents)
            .innerJoin(deals, eq(dealAgents.dealId, deals.id))
            .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
            .where(
              and(
                eq(dealAgents.userId, user.id),
                isNull(dealAgents.removedAt),
                eq(deals.status, "archived"),
                eq(pipelineStages.isClosedLost, true)
              )
            ),

          // Volume (active deals)
          db
            .select({ total: sum(deals.price) })
            .from(dealAgents)
            .innerJoin(deals, eq(dealAgents.dealId, deals.id))
            .where(
              and(
                eq(dealAgents.userId, user.id),
                isNull(dealAgents.removedAt),
                eq(deals.status, "active")
              )
            ),

          // Showings
          db
            .select({ count: count() })
            .from(showings)
            .where(eq(showings.agentId, user.id)),

          // Avg days to close (won deals)
          db
            .select({
              avg: sql<number>`avg(extract(epoch from ${deals.archivedAt} - ${deals.createdAt}) / 86400)`,
            })
            .from(dealAgents)
            .innerJoin(deals, eq(dealAgents.dealId, deals.id))
            .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
            .where(
              and(
                eq(dealAgents.userId, user.id),
                isNull(dealAgents.removedAt),
                eq(deals.status, "archived"),
                eq(pipelineStages.isClosedWon, true),
                sql`${deals.archivedAt} IS NOT NULL`
              )
            ),

          // Distinct pipelines (active deals)
          db
            .selectDistinct({ dealType: deals.dealType })
            .from(dealAgents)
            .innerJoin(deals, eq(dealAgents.dealId, deals.id))
            .where(
              and(
                eq(dealAgents.userId, user.id),
                isNull(dealAgents.removedAt),
                eq(deals.status, "active")
              )
            ),
        ]);

        const wins = winsRow?.count ?? 0;
        const losses = lossesRow?.count ?? 0;
        const closed = wins + losses;
        const winRate = closed > 0 ? Math.round((wins / closed) * 1000) / 10 : null;
        const avgDays = avgCloseRow?.avg != null ? Math.round(Number(avgCloseRow.avg) * 10) / 10 : null;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          activeDeals: activeDealRow?.count ?? 0,
          wins,
          losses,
          winRate,
          volume: Number(volumeRow?.total ?? 0),
          showings: showingsRow?.count ?? 0,
          avgDaysToClose: avgDays,
          pipelines: pipelinesRows.map((r) => r.dealType),
          lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
        };
      })
    );

    return NextResponse.json(stats);
  } catch (e) {
    console.error("Team stats error:", e);
    return NextResponse.json({ error: "Failed to fetch team stats" }, { status: 500 });
  }
}
