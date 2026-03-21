"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

interface DashboardData {
  activityFeed: Array<{
    dealId: string;
    dealType: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedByName: string;
    changedAt: string;
  }>;
  stageChangesToday: number;
  flagCounts: { stale: number; stageStuck: number; agentTooLong: number };
  agentDealCounts: Record<string, number>;
  showingsScheduledTotal: number;
  showingsToday: number;
  tasksOpenTotal: number;
  tasksDueToday: number;
  agents: Array<{
    id: string;
    name: string;
    role: string;
    lastActiveAt: string | null;
    isActive: boolean;
  }>;
  stageDistribution: Array<{
    dealType: string;
    stageName: string;
    stageColor: string;
    count: number;
  }>;
  priceTotals: {
    rentals: number;
    sellers: number;
    buyers: number;
    tenantRep: number;
  };
  dealCounts: Record<string, number>;
  applicationsTotal: number;
  applicationsWinRate: {
    wins: number;
    losses: number;
    total: number;
    rate: number;
  };
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  rental: "Rentals",
  seller: "Sellers",
  buyer: "Buyers",
  tenant_rep: "Tenant Rep",
  application: "Applications",
};

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function presenceDot(lastActiveAt: string | null) {
  if (!lastActiveAt) return "bg-gray-400";
  const mins = (Date.now() - new Date(lastActiveAt).getTime()) / 60000;
  if (mins < 2) return "bg-green-500";
  if (mins < 30) return "bg-yellow-400";
  return "bg-gray-400";
}

function presenceLabel(lastActiveAt: string | null) {
  if (!lastActiveAt) return "offline";
  const mins = Math.floor(
    (Date.now() - new Date(lastActiveAt).getTime()) / 60000
  );
  if (mins < 2) return "online";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const FIELD_DOT_COLORS: Record<string, string> = {
  stage: "bg-blue-500",
  price: "bg-green-500",
  status: "bg-amber-500",
  notes: "bg-purple-500",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="h-full overflow-auto p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            Dashboard
          </h1>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const topCards = [
    {
      label: "Rentals",
      count: data.dealCounts["rental"] ?? 0,
      sub: `${formatMoney(data.priceTotals.rentals)} total`,
    },
    {
      label: "Sellers",
      count: data.dealCounts["seller"] ?? 0,
      sub: `${formatMoney(data.priceTotals.sellers)} total`,
    },
    {
      label: "Buyers",
      count: data.dealCounts["buyer"] ?? 0,
      sub: `${formatMoney(data.priceTotals.buyers)} total`,
    },
    {
      label: "Tenant Rep",
      count: data.dealCounts["tenant_rep"] ?? 0,
      sub: `${formatMoney(data.priceTotals.tenantRep)} commission`,
    },
  ];

  // Group stage distribution by deal type
  const stagesByType: Record<
    string,
    Array<{ stageName: string; stageColor: string; count: number }>
  > = {};
  for (const row of data.stageDistribution) {
    if (!stagesByType[row.dealType]) stagesByType[row.dealType] = [];
    stagesByType[row.dealType].push(row);
  }

  return (
    <div className="h-full overflow-auto">
      <div className="flex h-full">

        {/* Left column — Agent Presence */}
        <div className="w-[200px] shrink-0 border-r border-border bg-card overflow-y-auto p-3 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Team</p>
          {data.agents.filter((a) => a.isActive).map((a) => (
            <div key={a.id} className="flex items-start gap-2 px-1 py-1.5">
              <div className={`h-2 w-2 rounded-full shrink-0 mt-1 ${presenceDot(a.lastActiveAt)}`} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{a.name}</p>
                <p className="text-[10px] text-muted-foreground">{presenceLabel(a.lastActiveAt)}</p>
                <p className="text-[10px] text-muted-foreground">{data.agentDealCounts[a.id] ?? 0} deals</p>
              </div>
            </div>
          ))}
          {data.agents.filter(a => a.isActive).length === 0 && (
            <p className="text-xs text-muted-foreground px-1">No agents</p>
          )}
        </div>

        {/* Center — main content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>

          {/* Pipeline Volume */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pipeline Volume</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {topCards.map((c) => {
              // get raw number for tooltip
              const rawVal = c.label === "Rentals" ? data.priceTotals.rentals
                : c.label === "Sellers" ? data.priceTotals.sellers
                : c.label === "Buyers" ? data.priceTotals.buyers
                : c.label === "Tenant Rep" ? data.priceTotals.tenantRep
                : null
              return (
              <div key={c.label} className="bg-card border rounded-xl p-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <span className="text-2xl font-semibold text-foreground">{c.count}</span>
                <span
                  className="text-xs text-muted-foreground cursor-default"
                  title={rawVal != null ? `$${rawVal.toLocaleString()}` : undefined}
                >{c.sub}</span>
              </div>
            )})}
            <div className="bg-card border rounded-xl p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Applications</span>
              <span className="text-2xl font-semibold text-foreground">{data.applicationsTotal}</span>
              {data.applicationsWinRate.total > 0 ? (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full w-fit ${data.applicationsWinRate.rate > 50 ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"}`}>
                  {data.applicationsWinRate.rate}% win rate
                </span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 rounded-full w-fit bg-muted text-muted-foreground">Not enough data</span>
              )}
            </div>
          </div>
          </div>

          {/* Stage Distribution */}
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Stage Distribution</h2>
            {Object.entries(stagesByType).map(([type, stages]) => {
              const total = stages.reduce((s, r) => s + r.count, 0);
              return (
                <div key={type} className="space-y-1">
                  <span className="text-xs text-muted-foreground">{DEAL_TYPE_LABELS[type] || type} ({total})</span>
                  <div className="flex gap-0.5 rounded-md overflow-hidden">
                    {stages.map((s) => (
                      <div key={s.stageName} className="flex items-center justify-center px-2 py-1.5 min-w-0"
                        style={{ backgroundColor: s.stageColor, flex: s.count }}
                        title={`${s.stageName}: ${s.count}`}>
                        <span className="text-[10px] text-white truncate font-medium drop-shadow-sm">{s.stageName} ({s.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {Object.keys(stagesByType).length === 0 && <p className="text-xs text-muted-foreground">No active deals</p>}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card border rounded-xl p-4 space-y-2">
              <h2 className="text-sm font-medium">Flagged Deals</h2>
              <div className="flex gap-4 text-xs">
                <div><span className="text-muted-foreground">Stale</span><p className="text-lg font-semibold">{data.flagCounts.stale}</p></div>
                <div><span className="text-muted-foreground">Stuck</span><p className="text-lg font-semibold">{data.flagCounts.stageStuck}</p></div>
                <div><span className="text-muted-foreground">Agent</span><p className="text-lg font-semibold">{data.flagCounts.agentTooLong}</p></div>
              </div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <h2 className="text-sm font-medium mb-2">Showings</h2>
              <div className="flex gap-6 text-xs">
                <div><span className="text-muted-foreground">Today</span><p className="text-lg font-semibold text-[var(--fm-amber)]">{data.showingsToday}</p></div>
                <div><span className="text-muted-foreground">Total</span><p className="text-lg font-semibold">{data.showingsScheduledTotal}</p></div>
              </div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <h2 className="text-sm font-medium mb-2">Tasks</h2>
              <div className="flex gap-6 text-xs">
                <div><span className="text-muted-foreground">Due Today</span><p className="text-lg font-semibold text-[var(--fm-amber)]">{data.tasksDueToday}</p></div>
                <div><span className="text-muted-foreground">Open</span><p className="text-lg font-semibold">{data.tasksOpenTotal}</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — Activity Feed */}
        <div className="w-[280px] shrink-0 border-l border-border bg-card overflow-hidden flex flex-col">
          <div className="px-4 pt-4 pb-2 border-b border-border shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</p>
            <p className="text-xs text-muted-foreground mt-0.5">{data.stageChangesToday} stage changes today</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {data.activityFeed.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                <div className={`h-2 w-2 rounded-full mt-1 shrink-0 ${FIELD_DOT_COLORS[entry.field] || "bg-muted-foreground"}`} />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{entry.changedByName}</span>{" "}
                  <span className="text-muted-foreground">
                    changed <span className="text-foreground">{entry.field}</span>
                    {entry.newValue && <> → <span className="text-foreground">{entry.newValue}</span></>}
                  </span>
                  <div className="text-muted-foreground/60 mt-0.5">{relativeTime(entry.changedAt)}</div>
                </div>
              </div>
            ))}
            {data.activityFeed.length === 0 && <p className="text-xs text-muted-foreground">No activity yet</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
