"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  applicationsPriceTotal: number;
  applicationsWinRate: {
    wins: number;
    losses: number;
    total: number;
    rate: number;
  };
  winRates: {
    rental: { wins: number; losses: number; total: number; rate: number };
    seller: { wins: number; losses: number; total: number; rate: number };
    buyer: { wins: number; losses: number; total: number; rate: number };
    tenantRep: { wins: number; losses: number; total: number; rate: number };
    application: { wins: number; losses: number; total: number; rate: number };
  };
  dealsCreatedThisWeek: number;
  dealsClosedThisWeek: number;
  stageChangesThisWeek: number;
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  rental: "Rentals",
  seller: "Sellers",
  buyer: "Buyers",
  tenant_rep: "Tenant Rep",
  application: "Applications",
};

const DEAL_TYPE_ROUTES: Record<string, string> = {
  rental: "/pipeline/rentals",
  seller: "/pipeline/sellers",
  buyer: "/pipeline/buyers",
  tenant_rep: "/pipeline/tenant-rep",
  application: "/pipeline/applications",
};

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="h-full overflow-hidden p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            Dashboard
          </h1>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Pipeline table rows
  const pipelineRows = [
    { label: "Rentals", key: "rental", wrKey: "rental" as const, volume: data.priceTotals.rentals, rawVolume: data.priceTotals.rentals, volumeLabel: "total" },
    { label: "Sellers", key: "seller", wrKey: "seller" as const, volume: data.priceTotals.sellers, rawVolume: data.priceTotals.sellers, volumeLabel: "total" },
    { label: "Buyers", key: "buyer", wrKey: "buyer" as const, volume: data.priceTotals.buyers, rawVolume: data.priceTotals.buyers, volumeLabel: "total" },
    { label: "Tenant Rep", key: "tenant_rep", wrKey: "tenantRep" as const, volume: data.priceTotals.tenantRep, rawVolume: data.priceTotals.tenantRep, volumeLabel: "commission" },
    { label: "Applications", key: "application", wrKey: "application" as const, volume: data.applicationsPriceTotal, rawVolume: data.applicationsPriceTotal, volumeLabel: "total" },
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

  const allFlagsClear = data.flagCounts.stale === 0 && data.flagCounts.stageStuck === 0 && data.flagCounts.agentTooLong === 0;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <span className="text-xs text-muted-foreground">{today}</span>
          </div>

          {/* Pipeline Overview — merged table */}
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="px-4 pt-3 pb-2">
              <h2 className="text-sm font-medium text-foreground">Pipeline Overview</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2">Type</th>
                  <th className="text-right font-medium px-4 py-2">Active Deals</th>
                  <th className="text-right font-medium px-4 py-2">Volume</th>
                  <th className="text-right font-medium px-4 py-2">Win Rate</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {pipelineRows.map((row) => {
                  const count = row.key === "application" ? data.applicationsTotal : (data.dealCounts[row.key] ?? 0);
                  const wr = data.winRates[row.wrKey];
                  return (
                    <tr key={row.key} className="border-t hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push(DEAL_TYPE_ROUTES[row.key])}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.label}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{count}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground" title={`$${row.rawVolume.toLocaleString()}`}>
                        {formatMoney(row.volume)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {wr.total > 0 ? (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${wr.rate > 50 ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"}`}>
                            {wr.rate}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">&mdash;</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground/50 text-sm">&rarr;</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Stage Distribution */}
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-medium text-foreground">Stage Distribution</h2>
            {Object.entries(stagesByType).map(([type, stages]) => {
              const total = stages.reduce((s, r) => s + r.count, 0);
              const route = DEAL_TYPE_ROUTES[type];
              return (
                <div key={type} className="space-y-1">
                  <span className="text-xs text-muted-foreground">{DEAL_TYPE_LABELS[type] || type} ({total})</span>
                  <div className="flex gap-0.5 h-7 rounded-md overflow-visible">
                    {stages.map((s) => (
                      <div key={s.stageName}
                        className="relative flex items-center justify-center px-2 min-w-0 group cursor-pointer transition-all duration-200"
                        style={{ backgroundColor: s.stageColor + "28", borderBottom: `2px solid ${s.stageColor}80`, flex: s.count }}
                        onClick={() => {
                          if (route) router.push(`${route}?stage=${encodeURIComponent(s.stageName)}`);
                        }}
                      >
                        {/* Hover brighten overlay */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-sm"
                          style={{ backgroundColor: s.stageColor + "40" }} />
                        {/* Normal text */}
                        <span className="relative text-[10px] truncate font-medium opacity-50 group-hover:opacity-0 transition-opacity duration-150 pointer-events-none"
                          style={{ color: s.stageColor }}>
                          {s.stageName} ({s.count})
                        </span>
                        {/* Hover tooltip — full label */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap">
                          <div className="rounded-md px-2.5 py-1.5 text-[11px] font-medium shadow-lg border border-border/60"
                            style={{ backgroundColor: s.stageColor, color: "#fff" }}>
                            {s.stageName} · {s.count}
                          </div>
                          <div className="w-2 h-2 rotate-45 mx-auto -mt-1 border-r border-b border-border/60"
                            style={{ backgroundColor: s.stageColor }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {Object.keys(stagesByType).length === 0 && <p className="text-xs text-muted-foreground">No active deals</p>}
          </div>

          {/* This Week — compact inline */}
          <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
            <span className="uppercase tracking-wider text-[10px] font-medium">This Week</span>
            <span>Created <span className="font-medium text-foreground">{data.dealsCreatedThisWeek}</span></span>
            <span>Closed <span className="font-medium text-foreground">{data.dealsClosedThisWeek}</span></span>
            <span>Stage Moves <span className="font-medium text-foreground">{data.stageChangesThisWeek}</span></span>
          </div>

          {/* Bottom row: Flagged Deals | Showings | Tasks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card border rounded-xl p-4 space-y-2">
              <h2 className="text-sm font-medium">Flagged Deals</h2>
              {allFlagsClear ? (
                <p className="text-xs text-muted-foreground">&#10003; All clear</p>
              ) : (
                <div className="flex gap-4 text-xs">
                  <div><span className="text-muted-foreground">Stale</span><p className="text-lg font-semibold">{data.flagCounts.stale}</p></div>
                  <div><span className="text-muted-foreground">Stuck</span><p className="text-lg font-semibold">{data.flagCounts.stageStuck}</p></div>
                  <div><span className="text-muted-foreground">Agent</span><p className="text-lg font-semibold">{data.flagCounts.agentTooLong}</p></div>
                </div>
              )}
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
    </div>
  );
}
