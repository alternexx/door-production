"use client";

import { useEffect, useMemo, useState } from "react";
import { useDealContext } from "@/lib/deal-context";
import { Info, ArrowUp, ArrowDown, ShieldAlert } from "lucide-react";

type AgentStat = {
  id: string;
  name: string;
  role: string;
  activeDeals: number;
  wins: number;
  losses: number;
  winRate: number | null;
  volume: number;
  showings: number;
  avgDaysToClose: number | null;
  pipelines: string[];
  lastActiveAt: string | null;
};

type SortKey = keyof Pick<
  AgentStat,
  "name" | "activeDeals" | "wins" | "losses" | "winRate" | "volume" | "showings" | "avgDaysToClose"
>;

const COLUMNS: { key: SortKey | "pipelines" | "lastActiveAt"; label: string; tip: string }[] = [
  { key: "name", label: "AGENT", tip: "Agent name" },
  { key: "activeDeals", label: "ACTIVE", tip: "Active deals currently assigned" },
  { key: "wins", label: "CLOSED", tip: "Deals closed won (archived with won stage)" },
  { key: "losses", label: "LOST", tip: "Deals closed lost (archived with lost stage)" },
  { key: "winRate", label: "WIN%", tip: "Wins ÷ (wins + losses) × 100" },
  { key: "volume", label: "VOLUME", tip: "Sum of price for active deals" },
  { key: "showings", label: "SHOWINGS", tip: "Total showings conducted" },
  { key: "avgDaysToClose", label: "AVG CLOSE", tip: "Average days from created to archived for won deals" },
  { key: "pipelines", label: "PIPELINES", tip: "Active deal types for this agent" },
  { key: "lastActiveAt", label: "LAST ACTIVE", tip: "Last time the agent was active in the app" },
];

const PIPELINE_PILLS: Record<string, { short: string; color: string }> = {
  rental: { short: "R", color: "bg-[var(--fm-amber)]/20 text-[var(--fm-amber)]" },
  seller: { short: "S", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  buyer: { short: "B", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  application: { short: "A", color: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  tenant_rep: { short: "T", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
};

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TeamStatsPage() {
  const { currentAgent } = useDealContext();
  const isAdmin = currentAgent?.role === "admin";

  const [data, setData] = useState<AgentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("winRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tooltip, setTooltip] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/data/team")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isAdmin]);

  const sorted = useMemo(() => {
    const s = [...data].sort((a, b) => {
      const av = a[sortKey as keyof AgentStat];
      const bv = b[sortKey as keyof AgentStat];
      const an = av ?? -Infinity;
      const bn = bv ?? -Infinity;
      if (an < bn) return sortDir === "asc" ? -1 : 1;
      if (an > bn) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return s;
  }, [data, sortKey, sortDir]);

  const totals = useMemo(() => {
    const totalActive = data.reduce((s, d) => s + d.activeDeals, 0);
    const totalWins = data.reduce((s, d) => s + d.wins, 0);
    const totalLosses = data.reduce((s, d) => s + d.losses, 0);
    const totalVolume = data.reduce((s, d) => s + d.volume, 0);
    const totalShowings = data.reduce((s, d) => s + d.showings, 0);
    const closed = totalWins + totalLosses;
    const avgWinRate = closed > 0 ? Math.round((totalWins / closed) * 1000) / 10 : null;
    const closeDays = data.filter((d) => d.avgDaysToClose !== null);
    const avgClose = closeDays.length
      ? Math.round((closeDays.reduce((s, d) => s + d.avgDaysToClose!, 0) / closeDays.length) * 10) / 10
      : null;
    return { totalActive, totalWins, totalLosses, avgWinRate, totalVolume, totalShowings, avgClose };
  }, [data]);

  function handleSort(key: string) {
    if (key === "pipelines" || key === "lastActiveAt") return;
    const k = key as SortKey;
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <ShieldAlert className="h-8 w-8 mx-auto text-[var(--fm-text-secondary)]/50" />
          <p className="text-[var(--fm-text-secondary)] text-sm">Access restricted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">Team Stats</h1>
        <p className="text-xs text-muted-foreground">Season to date · Admin only</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {COLUMNS.map((col) => {
                  const sortable = col.key !== "pipelines" && col.key !== "lastActiveAt";
                  const active = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      className={`px-3 py-2.5 text-left font-semibold text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap ${sortable ? "cursor-pointer select-none hover:text-foreground" : ""}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {active && (
                          sortDir === "asc"
                            ? <ArrowUp className="h-3 w-3" />
                            : <ArrowDown className="h-3 w-3" />
                        )}
                        <button
                          className="text-muted-foreground/40 hover:text-muted-foreground relative"
                          onClick={(e) => { e.stopPropagation(); setTooltip(tooltip === col.key ? null : col.key); }}
                        >
                          <Info className="h-3 w-3" />
                          {tooltip === col.key && (
                            <span className="absolute left-1/2 -translate-x-1/2 top-5 z-50 rounded bg-popover border border-border shadow-lg px-2.5 py-1.5 text-[11px] font-normal normal-case tracking-normal text-popover-foreground whitespace-nowrap">
                              {col.tip}
                            </span>
                          )}
                        </button>
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((agent, i) => (
                <tr
                  key={agent.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/15" : ""} hover:bg-muted/25 transition-colors`}
                >
                  <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">
                    {agent.name}
                    {agent.role === "admin" && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground/50 font-normal">admin</span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{agent.activeDeals}</td>
                  <td className="px-3 py-2 tabular-nums">{agent.wins}</td>
                  <td className="px-3 py-2 tabular-nums">{agent.losses}</td>
                  <td className="px-3 py-2 tabular-nums font-medium">
                    {agent.winRate !== null ? (
                      <span
                        className={
                          agent.winRate > 60
                            ? "text-emerald-600 dark:text-emerald-400"
                            : agent.winRate >= 40
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        }
                      >
                        {agent.winRate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatVolume(agent.volume)}</td>
                  <td className="px-3 py-2 tabular-nums">{agent.showings}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {agent.avgDaysToClose !== null ? (
                      `${Math.round(agent.avgDaysToClose)}d`
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {agent.pipelines.map((p) => {
                        const pill = PIPELINE_PILLS[p];
                        return pill ? (
                          <span
                            key={p}
                            className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold ${pill.color}`}
                            title={p}
                          >
                            {pill.short}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {relativeTime(agent.lastActiveAt)}
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="border-t-2 border-border bg-muted/40 font-semibold text-muted-foreground">
                <td className="px-3 py-2 uppercase text-[11px] tracking-wider">Team</td>
                <td className="px-3 py-2 tabular-nums">{totals.totalActive}</td>
                <td className="px-3 py-2 tabular-nums">{totals.totalWins}</td>
                <td className="px-3 py-2 tabular-nums">{totals.totalLosses}</td>
                <td className="px-3 py-2 tabular-nums">
                  {totals.avgWinRate !== null ? `${totals.avgWinRate.toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-2 tabular-nums">{formatVolume(totals.totalVolume)}</td>
                <td className="px-3 py-2 tabular-nums">{totals.totalShowings}</td>
                <td className="px-3 py-2 tabular-nums">
                  {totals.avgClose !== null ? `${Math.round(totals.avgClose)}d` : "—"}
                </td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
