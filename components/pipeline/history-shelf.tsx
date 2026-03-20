"use client"

import { useState, useEffect, useMemo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface HistoryEntry {
  id: string
  dealType: string
  dealId: string
  field: string
  oldValue: string | null
  newValue: string | null
  changedByName: string | null
  changedByEmail: string | null
  changedAt: string
}

interface StageTimelineEntry {
  id: string
  stageName: string
  enteredAt: string
  exitedAt: string | null
  durationSeconds: number | null
  changedByUser?: {
    name?: string | null
    email?: string | null
  } | null
  stage?: {
    color?: string | null
  } | null
}

interface HistoryShelfProps {
  open: boolean
  onClose: () => void
  dealType: string
  dealId: string
  dealName: string
}

const FIELD_LABELS: Record<string, string> = {
  stage: "Stage",
  price: "Price",
  budget: "Price",
  notes: "Notes",
  agents: "Agents",
  property: "Name",
  client: "Name",
  applicant: "Name",
  email: "Email",
  phone: "Phone",
  borough: "Borough",
  address: "Address",
  appLink: "App Link",
  moveInDate: "Move-in Date",
  showsheetUrl: "Showsheet",
}

type Tab = "all" | "stage" | "price" | "notes" | "agents" | "details"

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "stage", label: "Stage" },
  { key: "price", label: "Price" },
  { key: "notes", label: "Notes" },
  { key: "agents", label: "Agents" },
  { key: "details", label: "Details" },
]

const DETAIL_FIELDS = ["property", "client", "applicant", "email", "phone", "borough", "address", "appLink", "moveInDate", "showsheetUrl"]

function filterByTab(entries: HistoryEntry[], tab: Tab): HistoryEntry[] {
  if (tab === "all") return entries
  if (tab === "stage") return entries.filter(e => e.field === "stage")
  if (tab === "price") return entries.filter(e => e.field === "price" || e.field === "budget")
  if (tab === "notes") return entries.filter(e => e.field === "notes")
  if (tab === "agents") return entries.filter(e => e.field === "agents")
  if (tab === "details") return entries.filter(e => DETAIL_FIELDS.includes(e.field))
  return entries
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fieldColor(field: string): string {
  if (field === "stage") return "bg-amber-500"
  if (field === "price" || field === "budget") return "bg-green-500"
  if (field === "notes") return "bg-blue-500"
  if (field === "agents") return "bg-purple-500"
  return "bg-gray-400"
}

export function HistoryShelf({
  open,
  onClose,
  dealType: _dealType,
  dealId,
  dealName,
}: HistoryShelfProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [stageTimeline, setStageTimeline] = useState<StageTimelineEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>("all")
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!open || !dealId) return
    fetch(`/api/deals/${dealId}/history`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setHistory(data)
          setStageTimeline([])
          return
        }
        setHistory(Array.isArray(data?.history) ? data.history : [])
        setStageTimeline(Array.isArray(data?.stageTimeline) ? data.stageTimeline : [])
      })
      .catch(() => {
        setHistory([])
        setStageTimeline([])
      })
      .finally(() => setLoading(false))
  }, [open, dealId])

  useEffect(() => {
    if (!open) return
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [open])

  const filtered = useMemo(() => filterByTab(history, tab), [history, tab])

  const formatStageDuration = (entry: StageTimelineEntry) => {
    const totalSeconds =
      entry.durationSeconds ??
      Math.max(
        0,
        Math.floor((nowMs - new Date(entry.enteredAt).getTime()) / 1000)
      )
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${Math.max(1, mins)}m`
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[360px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>History</SheetTitle>
          <p className="text-xs text-muted-foreground">{dealName}</p>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                tab === t.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tab === "stage" ? (
            stageTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No stage changes recorded
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
                <div className="space-y-4">
                  {stageTimeline.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 pl-1">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 relative z-10"
                        style={{ backgroundColor: entry.stage?.color || "#6b7280" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="mb-1">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border"
                            style={{
                              color: entry.stage?.color || "#6b7280",
                              borderColor: `${entry.stage?.color || "#6b7280"}40`,
                              backgroundColor: `${entry.stage?.color || "#6b7280"}1A`,
                            }}
                          >
                            {entry.stageName}
                          </span>
                        </div>
                        <div className="text-[13px] font-medium">
                          Time in stage: {formatStageDuration(entry)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {entry.changedByUser?.name || "System"} · {new Date(entry.enteredAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No changes recorded
            </p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {filtered.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 pl-1">
                    <div className={cn("h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 relative z-10", fieldColor(entry.field))} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-0.5">
                        {FIELD_LABELS[entry.field] || entry.field} changed
                      </div>
                      <div className="text-[13px]">
                        {entry.field === "notes" ? (
                          <span className="font-medium italic text-foreground/80 line-clamp-2">
                            {entry.newValue || "(cleared)"}
                          </span>
                        ) : entry.oldValue ? (
                          <>
                            <span className="text-muted-foreground">{entry.oldValue}</span>
                            <span className="text-muted-foreground mx-1.5">→</span>
                            <span className="font-medium">{entry.newValue}</span>
                          </>
                        ) : (
                          <span className="font-medium">{entry.newValue}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {entry.changedByName && (
                          <>
                            <span className="text-xs text-muted-foreground">
                              {entry.changedByName}
                            </span>
                            <span className="text-xs text-muted-foreground">·</span>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(entry.changedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Keep backward-compatible export name
export { HistoryShelf as StageHistoryShelf }
