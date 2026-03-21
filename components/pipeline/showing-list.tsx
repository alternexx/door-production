"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Plus, X, Archive, Clock } from "lucide-react"
import { format } from "date-fns"

type ShowingAgent = { id: string; name: string }
export type Showing = {
  id: string
  dealId: string
  agentId: string
  scheduledAt: string
  status: "scheduled" | "completed" | "cancelled" | "no_show"
  showingType: "private" | "open_house"
  feedbackReaction: string | null
  feedbackNotes: string | null
  cancelledAt: string | null
  cancelReason: string | null
  rescheduledFrom: string | null
  agent: ShowingAgent
  createdAt: string
}

function formatShowingLabel(showing: Showing): string {
  const d = new Date(showing.scheduledAt)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours >= 12 ? "pm" : "am"
  const h = hours % 12 || 12
  const mm = minutes === 0 ? "" : `:${String(minutes).padStart(2, "0")}`
  const timeStr = `${h}${mm}${ampm}`
  const dateStr = `${month}/${day}`
  if (showing.showingType === "open_house") return `Open house: ${dateStr} ${timeStr}`
  return `Private: ${dateStr} ${timeStr}`
}

const MAX_SCHEDULED = 5

export function ShowingList({
  dealId,
  shelfOpen,
  onShelfOpenChange,
  onAtMaxChange,
  onShowingSelect,
  refreshKey,
}: {
  dealId: string
  shelfOpen?: boolean
  onShelfOpenChange?: (open: boolean) => void
  onAtMaxChange?: (atMax: boolean) => void
  onShowingSelect?: (s: Showing | null) => void
  refreshKey?: number
}) {
  const [showings, setShowings] = useState<Showing[]>([])
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState<string | null>(null)

  const fetchShowings = useCallback(async () => {
    try {
      const res = await fetch(`/api/showings?deal_id=${dealId}`)
      if (res.ok) setShowings(await res.json())
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    fetchShowings()
  }, [fetchShowings, refreshKey])

  const scheduled = showings.filter((s) => s.status === "scheduled")
  const atMax = scheduled.length >= MAX_SCHEDULED

  useEffect(() => {
    onAtMaxChange?.(atMax)
  }, [atMax, onAtMaxChange])

  const handleArchive = async (showing: Showing) => {
    setArchiving(showing.id)
    try {
      await fetch(`/api/showings/${showing.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "archived" }),
      })
      await fetchShowings()
    } finally {
      setArchiving(null)
    }
  }

  return (
    <div className="space-y-1">
      {loading ? (
        <div className="py-3 flex justify-center">
          <div className="size-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        </div>
      ) : scheduled.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">No upcoming showings</p>
      ) : (
        scheduled.map((s) => (
          <div
            key={s.id}
            onClick={() => { onShowingSelect?.(s); onShelfOpenChange?.(false) }}
            className="group flex items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-muted/50 cursor-pointer"
          >
            <Clock className="size-3 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm">{formatShowingLabel(s)}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleArchive(s) }}
              disabled={archiving === s.id}
              className="invisible group-hover:visible text-muted-foreground hover:text-foreground transition-colors"
              title="Archive"
            >
              {archiving === s.id ? (
                <div className="size-3.5 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              ) : (
                <Archive className="size-3.5" />
              )}
            </button>
          </div>
        ))
      )}

      {/* Schedule button */}
      {!atMax ? (
        <button
          onClick={() => onShelfOpenChange?.(!shelfOpen)}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
        >
          <Plus className="size-3" />
          Schedule showing
        </button>
      ) : (
        <p className="px-2.5 text-[10px] text-muted-foreground pt-1">
          Max {MAX_SCHEDULED} scheduled. Archive one to add more.
        </p>
      )}
    </div>
  )
}

// Detail shelf for viewing/archiving a showing
export function ShowingDetailShelf({
  showing,
  open,
  archiving,
  onArchive,
  onClose,
}: {
  showing: Showing | null
  open: boolean
  archiving: boolean
  onArchive: () => void
  onClose: () => void
}) {
  return (
    <div style={{
      position: "absolute", top: 0, left: "100%",
      width: open && showing ? 260 : 0, height: "100%",
      borderLeft: open && showing ? "1px solid var(--border)" : "none",
      borderRadius: "0 12px 12px 0",
      background: "var(--background)",
      boxShadow: open && showing ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
      transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
      overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 10,
    }}>
      <div style={{ width: 260, display: "flex", flexDirection: "column", height: "100%" }}>
        {open && showing && (
          <>
            <div className="flex items-center justify-between px-3.5 py-3 border-b shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Showing</span>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="flex-1 px-3.5 py-3 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Type</span>
                <span className="text-foreground capitalize">{showing.showingType === "open_house" ? "Open house" : "Private"}</span>
              </div>
              <div className="flex justify-between">
                <span>Date</span>
                <span className="text-foreground">
                  {new Date(showing.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Time</span>
                <span className="text-foreground">
                  {new Date(showing.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              {showing.agent && (
                <div className="flex justify-between">
                  <span>Agent</span>
                  <span className="text-foreground">{showing.agent.name}</span>
                </div>
              )}
            </div>
            <div className="px-3.5 py-3 border-t shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs"
                onClick={onArchive}
                disabled={archiving}
              >
                {archiving ? <div className="size-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-1.5" /> : <Archive className="size-3.5 mr-1.5" />}
                Archive showing
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Shelf rendered by deal-modal alongside agent/stage shelves
export function ShowingScheduleShelf({
  open,
  scheduleDate,
  setScheduleDate,
  showingType,
  setShowingType,
  saving,
  atMax,
  onSchedule,
  onClose,
}: {
  open: boolean
  scheduleDate: string
  setScheduleDate: (v: string) => void
  showingType: "private" | "open_house"
  setShowingType: (v: "private" | "open_house") => void
  saving: boolean
  atMax: boolean
  onSchedule: () => void
  onClose: () => void
}) {
  // Parse current scheduleDate into date + time parts
  const selectedDate = scheduleDate ? new Date(scheduleDate) : undefined
  const [hour, setHour] = useState("12")
  const [minute, setMinute] = useState("00")
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM")

  // Sync time pickers when shelf opens
  useEffect(() => {
    if (open && selectedDate) {
      const h = selectedDate.getHours()
      const m = selectedDate.getMinutes()
      setHour(String(h % 12 || 12))
      setMinute(String(m).padStart(2, "0"))
      setAmpm(h >= 12 ? "PM" : "AM")
    }
  }, [open])

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return
    const h24 = ampm === "PM" ? (parseInt(hour) % 12) + 12 : parseInt(hour) % 12
    day.setHours(h24, parseInt(minute), 0, 0)
    // format as datetime-local string
    const pad = (n: number) => String(n).padStart(2, "0")
    const val = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(h24)}:${pad(parseInt(minute))}`
    setScheduleDate(val)
  }

  const updateTime = (newHour: string, newMinute: string, newAmpm: "AM" | "PM") => {
    setHour(newHour)
    setMinute(newMinute)
    setAmpm(newAmpm)
    if (!selectedDate) return
    const h24 = newAmpm === "PM" ? (parseInt(newHour) % 12) + 12 : parseInt(newHour) % 12
    const pad = (n: number) => String(n).padStart(2, "0")
    const val = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}T${pad(h24)}:${pad(parseInt(newMinute))}`
    setScheduleDate(val)
  }

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1))
  const minutes = ["00", "15", "30", "45"]

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: "100%",
        width: open ? 260 : 0,
        height: "100%",
        borderLeft: open ? "1px solid var(--border)" : "none",
        borderRadius: "0 12px 12px 0",
        background: "var(--background)",
        boxShadow: open ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
      }}
    >
      <div style={{ width: 260, display: "flex", flexDirection: "column", height: "100%" }}>
        {open && (
          <>
            <div className="flex items-center justify-between px-3.5 py-3 border-b shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Schedule Showing
              </span>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-col flex-1 overflow-y-auto">
              {/* Inline calendar */}
              <div className="px-1 pt-1 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDaySelect}
                  disabled={{ before: new Date() }}
                  classNames={{
                    root: "!p-1",
                    month_caption: "text-xs",
                    day: "text-xs",
                  }}
                />
              </div>

              {/* Time picker */}
              <div className="px-3.5 pb-3 space-y-2 shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</p>
                <div className="flex items-center gap-1.5">
                  {/* Hour */}
                  <select
                    value={hour}
                    onChange={(e) => updateTime(e.target.value, minute, ampm)}
                    className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-center appearance-none cursor-pointer hover:bg-accent transition-colors"
                  >
                    {hours.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground text-sm font-medium">:</span>
                  {/* Minute */}
                  <select
                    value={minute}
                    onChange={(e) => updateTime(hour, e.target.value, ampm)}
                    className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-center appearance-none cursor-pointer hover:bg-accent transition-colors"
                  >
                    {minutes.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {/* AM/PM */}
                  <div className="flex rounded-md border border-input overflow-hidden">
                    {(["AM", "PM"] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => updateTime(hour, minute, p)}
                        className={`px-2 h-8 text-xs font-medium transition-colors ${
                          ampm === p
                            ? "bg-foreground text-background"
                            : "bg-background text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</span>
                  <div className="flex rounded-md border border-input overflow-hidden">
                    {(["private", "open_house"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setShowingType(t)}
                        className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                          showingType === t
                            ? "bg-foreground text-background"
                            : "bg-background text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {t === "private" ? "Private" : "Open house"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                {selectedDate && (
                  <p className="text-xs text-muted-foreground">
                    {format(selectedDate, "EEE, MMM d")} · {hour}:{minute} {ampm}
                  </p>
                )}

                <Button
                  size="sm"
                  className="w-full h-8 text-xs mt-1"
                  onClick={onSchedule}
                  disabled={saving || !scheduleDate || atMax}
                >
                  {saving && (
                    <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                  )}
                  Confirm
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
