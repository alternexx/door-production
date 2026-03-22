import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  deals,
  dealHistory,
  dealAgents,
  users,
  showings,
  tasks,
  pipelineStages,
} from "@/db/schema";
import { eq, and, gte, sql, ne, inArray, isNull, lt } from "drizzle-orm";

export async function GET() {
  const now = new Date();
  const todayMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const tomorrowMidnight = new Date(todayMidnight.getTime() + 86400000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  const [
    activityFeed,
    stageChangesTodayResult,
    staleCountResult,
    agentDealCountsResult,
    showingsScheduledTotalResult,
    showingsTodayResult,
    tasksOpenTotalResult,
    tasksDueTodayResult,
    allUsers,
    stageDistributionResult,
    rentalPriceResult,
    sellerPriceResult,
    buyerPriceResult,
    tenantRepCommissionResult,
    applicationsTotalResult,
    applicationsPriceTotalResult,
    rentalWinsResult,
    rentalLossesResult,
    sellerWinsResult,
    sellerLossesResult,
    buyerWinsResult,
    buyerLossesResult,
    tenantRepWinsResult,
    tenantRepLossesResult,
    applicationWinsResult,
    applicationLossesResult,
  ] = await Promise.all([
    // activityFeed: last 50 dealHistory
    db
      .select({
        dealId: dealHistory.dealId,
        dealType: dealHistory.dealType,
        field: dealHistory.field,
        oldValue: dealHistory.oldValue,
        newValue: dealHistory.newValue,
        changedByName: dealHistory.changedByName,
        changedAt: dealHistory.changedAt,
      })
      .from(dealHistory)
      .orderBy(sql`${dealHistory.changedAt} desc`)
      .limit(50),

    // stageChangesToday
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(dealHistory)
      .where(
        and(
          eq(dealHistory.field, "stage"),
          gte(dealHistory.changedAt, todayMidnight)
        )
      ),

    // stale deals count (updatedAt < 7 days ago, not archived)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deals)
      .where(
        and(
          lt(deals.updatedAt, sevenDaysAgo),
          eq(deals.status, "active")
        )
      ),

    // agentDealCounts
    db
      .select({
        userId: dealAgents.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(dealAgents)
      .innerJoin(deals, eq(dealAgents.dealId, deals.id))
      .where(and(eq(deals.status, "active"), isNull(dealAgents.removedAt)))
      .groupBy(dealAgents.userId),

    // showingsScheduledTotal
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(showings)
      .where(eq(showings.status, "scheduled")),

    // showingsToday
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(showings)
      .where(
        and(
          eq(showings.status, "scheduled"),
          gte(showings.scheduledAt, todayMidnight),
          lt(showings.scheduledAt, tomorrowMidnight)
        )
      ),

    // tasksOpenTotal
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(inArray(tasks.status, ["todo", "in_progress"])),

    // tasksDueToday
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          gte(tasks.dueDate, todayMidnight),
          lt(tasks.dueDate, tomorrowMidnight),
          ne(tasks.status, "completed")
        )
      ),

    // agents
    db.select().from(users),

    // stageDistribution
    db
      .select({
        dealType: deals.dealType,
        stageName: pipelineStages.name,
        stageColor: pipelineStages.color,
        count: sql<number>`count(*)::int`,
      })
      .from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(eq(deals.status, "active"))
      .groupBy(deals.dealType, pipelineStages.name, pipelineStages.color, pipelineStages.orderIndex)
      .orderBy(pipelineStages.orderIndex),

    // rentals price sum
    db
      .select({ total: sql<number>`coalesce(sum(${deals.price}), 0)::int` })
      .from(deals)
      .where(and(eq(deals.dealType, "rental"), eq(deals.status, "active"))),

    // sellers price sum
    db
      .select({ total: sql<number>`coalesce(sum(${deals.price}), 0)::int` })
      .from(deals)
      .where(and(eq(deals.dealType, "seller"), eq(deals.status, "active"))),

    // buyers price sum
    db
      .select({ total: sql<number>`coalesce(sum(${deals.price}), 0)::int` })
      .from(deals)
      .where(and(eq(deals.dealType, "buyer"), eq(deals.status, "active"))),

    // tenant-rep commission sum
    db
      .select({
        total: sql<number>`coalesce(sum(${deals.commission}::numeric), 0)::numeric`,
      })
      .from(deals)
      .where(
        and(eq(deals.dealType, "tenant_rep"), eq(deals.status, "active"))
      ),

    // applications total
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deals)
      .where(
        and(eq(deals.dealType, "application"), eq(deals.status, "active"))
      ),

    // applications price total (sum of application_price for active application deals)
    db
      .select({ total: sql<number>`coalesce(sum(${deals.applicationPrice}::numeric), 0)::numeric` })
      .from(deals)
      .where(
        and(eq(deals.dealType, "application"), eq(deals.status, "active"))
      ),

    // rental wins
    db.select({ count: sql<number>`count(*)::int` }).from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.dealType, "rental"), eq(deals.status, "archived"), eq(pipelineStages.outcome, "win"))),
    // rental losses
    db.select({ count: sql<number>`count(*)::int` }).from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.dealType, "rental"), eq(deals.status, "archived"), eq(pipelineStages.outcome, "loss"))),
    // seller wins
    db.select({ count: sql<number>`count(*)::int` }).from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.dealType, "seller"), eq(deals.status, "archived"), eq(pipelineStages.outcome, "win"))),
    // seller losses
    db.select({ count: sql<number>`count(*)::int` }).from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.dealType, "seller"), eq(deals.status, "archived"), eq(pipelineStages.outcome, "loss"))),
    // buyer wins
    db.select({ count: sql<number>`count(*)::int` }).from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.dealType, "buyer"), eq(deals.status, "archived"), eq(pipelineStages.outcome, "win"))),
    // buyer losses
    db.select({ count: sql<number>`count(*)::int` }).from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.dealType, "buyer"), eq(deals.status, "archived"), eq(pipelineStages.outcome, "loss"))),
    // tenant_rep wins
    db.select({ count: sql<number>`count(*)::int` }).from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.dealType, "tenant_rep"), eq(deals.status, "archived"), eq(pipelineStages.outcome, "win"))),
    // tenant_rep losses
    db.select({ count: sql<number>`count(*)::int` }).from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.dealType, "tenant_rep"), eq(deals.status, "archived"), eq(pipelineStages.outcome, "loss"))),
    // application wins
    db.select({ count: sql<number>`count(*)::int` }).from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.dealType, "application"), eq(deals.status, "archived"), eq(pipelineStages.outcome, "win"))),
    // application losses
    db.select({ count: sql<number>`count(*)::int` }).from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(and(eq(deals.dealType, "application"), eq(deals.status, "archived"), eq(pipelineStages.outcome, "loss"))),
  ]);

  function calcWinRate(winsRes: typeof rentalWinsResult, lossesRes: typeof rentalLossesResult) {
    const w = winsRes[0]?.count ?? 0;
    const l = lossesRes[0]?.count ?? 0;
    const t = w + l;
    return { wins: w, losses: l, total: t, rate: t > 0 ? Math.round((w / t) * 100) : 0 };
  }

  const winRates = {
    rental: calcWinRate(rentalWinsResult, rentalLossesResult),
    seller: calcWinRate(sellerWinsResult, sellerLossesResult),
    buyer: calcWinRate(buyerWinsResult, buyerLossesResult),
    tenantRep: calcWinRate(tenantRepWinsResult, tenantRepLossesResult),
    application: calcWinRate(applicationWinsResult, applicationLossesResult),
  };

  // Backwards compat
  const wins = winRates.application.wins;
  const losses = winRates.application.losses;
  const winLossTotal = winRates.application.total;
  const winRate = winRates.application.rate;

  // Build agent deal counts map
  const agentDealCountsMap: Record<string, number> = {};
  for (const row of agentDealCountsResult) {
    agentDealCountsMap[row.userId] = row.count;
  }

  // Count deals per type for top cards
  const dealCountsByType = stageDistributionResult.reduce(
    (acc, row) => {
      acc[row.dealType] = (acc[row.dealType] || 0) + row.count;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({
    activityFeed,
    stageChangesToday: stageChangesTodayResult[0]?.count ?? 0,
    flagCounts: {
      stale: staleCountResult[0]?.count ?? 0,
      stageStuck: 0,
      agentTooLong: 0,
    },
    agentDealCounts: agentDealCountsMap,
    showingsScheduledTotal: showingsScheduledTotalResult[0]?.count ?? 0,
    showingsToday: showingsTodayResult[0]?.count ?? 0,
    tasksOpenTotal: tasksOpenTotalResult[0]?.count ?? 0,
    tasksDueToday: tasksDueTodayResult[0]?.count ?? 0,
    agents: allUsers.filter(u => u.name !== "[deleted]").map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      lastActiveAt: u.lastActiveAt,
      isActive: u.isActive,
    })),
    stageDistribution: stageDistributionResult,
    priceTotals: {
      rentals: rentalPriceResult[0]?.total ?? 0,
      sellers: sellerPriceResult[0]?.total ?? 0,
      buyers: buyerPriceResult[0]?.total ?? 0,
      tenantRep: Number(tenantRepCommissionResult[0]?.total ?? 0),
    },
    dealCounts: dealCountsByType,
    applicationsTotal: applicationsTotalResult[0]?.count ?? 0,
    applicationsPriceTotal: Number(applicationsPriceTotalResult[0]?.total ?? 0),
    applicationsWinRate: {
      wins,
      losses,
      total: winLossTotal,
      rate: winRate,
    },
    winRates,
  });
}
