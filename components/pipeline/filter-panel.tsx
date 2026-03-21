"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { BOROUGHS } from "@/lib/tokens"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, ChevronLeft, X } from "lucide-react"
import type { StageOption } from "./deal-table"

interface Agent {
  id: string
  name: string
  color: string
}

export interface FilterState {
  agents: string[]
  boroughs: string[]
  stages: string[]
  priceMin: string
  priceMax: string
  dateFrom: string
  dateTo: string
  myDeals: boolean
  archivedOnly: boolean
  staleOnly: boolean
  flaggedOnly: boolean
}

export const defaultFilters: FilterState = {
  agents: [],
  boroughs: [],
  stages: [],
  priceMin: "",
  priceMax: "",
  dateFrom: "",
  dateTo: "",
  myDeals: false,
  archivedOnly: false,
  staleOnly: false,
  flaggedOnly: false,
}

interface FilterPanelProps {
  open: boolean
  onClose: () => void
  filters: FilterState
  onApply: (filters: FilterState) => void
  stages: StageOption[]
  agents: Agent[]
}

export function FilterPanel({ open, onClose, filters, onApply, stages, agents }: FilterPanelProps) {
  if (!open) return null
  return (
    <FilterPanelContent
      onClose={onClose}
      filters={filters}
      onApply={onApply}
      stages={stages}
      agents={agents}
    />
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        checked ? "bg-[var(--fm-amber)]" : "bg-muted"
      )}
    >
      <span className={cn("pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  )
}

function formatDateLabel(from: string, to: string): string {
  if (!from && !to) return "Date range"
  if (from && to) return `${format(new Date(from + "T12:00:00"), "MMM d")} – ${format(new Date(to + "T12:00:00"), "MMM d")}`
  if (from) return `From ${format(new Date(from + "T12:00:00"), "MMM d")}`
  return `To ${format(new Date(to + "T12:00:00"), "MMM d")}`
}

function FilterPanelContent({ onClose, filters, onApply, stages, agents }: Omit<FilterPanelProps, "open">) {
  const [dateShelfOpen, setDateShelfOpen] = useState(false)
  const [pickingFor, setPickingFor] = useState<"from" | "to">("from")

  const update = (patch: Partial<FilterState>) => onApply({ ...filters, ...patch })

  const toggleArrayItem = <T extends string | number>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]

  const hasDateFilter = !!filters.dateFrom || !!filters.dateTo

  return (
    <div className="relative flex overflow-hidden" style={{ width: dateShelfOpen ? 520 : 270 }}>
      {/* Main panel */}
      <div className="w-[270px] shrink-0 max-h-[70vh] overflow-y-auto space-y-4 p-4">

        {/* Agents */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground block">Agents</label>
          <div className="flex flex-wrap gap-1.5">
            {agents.map((a) => (
              <button
                key={a.id}
                onClick={() => update({ agents: toggleArrayItem(filters.agents, a.id) })}
                className={cn("px-2 py-0.5 rounded-full text-xs font-medium transition-all border", filters.agents.includes(a.id) ? "text-white" : "bg-transparent text-muted-foreground border-border")}
                style={filters.agents.includes(a.id) ? { backgroundColor: a.color, borderColor: a.color } : undefined}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        {/* Boroughs */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground block">Borough</label>
          <div className="flex flex-wrap gap-1.5">
            {BOROUGHS.map((b) => (
              <button
                key={b}
                onClick={() => update({ boroughs: toggleArrayItem(filters.boroughs, b) })}
                className={cn("px-2 py-0.5 rounded-full text-xs font-medium transition-all border", filters.boroughs.includes(b) ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground border-border")}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Stages */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground block">Stage</label>
          <div className="flex flex-wrap gap-1.5">
            {stages.map((s) => (
              <button
                key={s.name}
                onClick={() => update({ stages: toggleArrayItem(filters.stages, s.name) })}
                className={cn("px-2 py-0.5 rounded-md text-xs font-medium transition-all", !filters.stages.includes(s.name) && "opacity-50")}
                style={{ backgroundColor: s.color, color: s.textColor }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range — compact inline */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground block">Price Range</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceMin}
              onChange={(e) => update({ priceMin: e.target.value })}
              className="w-0 flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <span className="text-muted-foreground text-[10px] shrink-0">–</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.priceMax}
              onChange={(e) => update({ priceMax: e.target.value })}
              className="w-0 flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Date Range — single button that opens shelf */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground block">Date Range</label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDateShelfOpen(v => !v)}
              className={cn(
                "flex-1 h-7 flex items-center gap-1.5 px-2 rounded-md border text-xs transition-colors",
                hasDateFilter ? "border-[var(--fm-amber)] text-foreground bg-[var(--fm-amber)]/5" : "border-input text-muted-foreground bg-background hover:bg-accent"
              )}
            >
              <CalendarIcon className="size-3 shrink-0" />
              <span className="flex-1 text-left truncate">{formatDateLabel(filters.dateFrom, filters.dateTo)}</span>
              {hasDateFilter && (
                <span onClick={e => { e.stopPropagation(); update({ dateFrom: "", dateTo: "" }); setDateShelfOpen(false); }}
                  className="text-muted-foreground hover:text-foreground">
                  <X className="size-3" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2.5 pt-1 border-t">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs">My deals only</span>
            <Toggle checked={filters.myDeals} onChange={(v) => update({ myDeals: v })} />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs">Flagged only</span>
            <Toggle checked={filters.flaggedOnly ?? false} onChange={(v) => update({ flaggedOnly: v, staleOnly: v })} />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs">Archived only</span>
            <Toggle checked={filters.archivedOnly} onChange={(v) => update({ archivedOnly: v })} />
          </label>
        </div>

        {/* Reset / Done */}
        <div className="pt-1 border-t flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={() => { onApply(defaultFilters); onClose(); }} className="text-xs h-7">
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-7">
            Done
          </Button>
        </div>
      </div>

      {/* Date shelf — slides in from left */}
      <div
        style={{
          width: dateShelfOpen ? 250 : 0,
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          borderLeft: dateShelfOpen ? "1px solid var(--border)" : "none",
        }}
        className="shrink-0 bg-background flex flex-col"
      >
        <div style={{ width: 250 }} className="flex flex-col h-full">
          {dateShelfOpen && (
            <>
              <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0">
                <button onClick={() => setDateShelfOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="size-3.5" />
                </button>
                <div className="flex gap-1 flex-1">
                  {(["from", "to"] as const).map(side => (
                    <button
                      key={side}
                      onClick={() => setPickingFor(side)}
                      className={cn(
                        "flex-1 text-[11px] font-medium px-2 py-0.5 rounded transition-colors",
                        pickingFor === side ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {side === "from" ? (filters.dateFrom ? format(new Date(filters.dateFrom + "T12:00:00"), "MMM d") : "From") : (filters.dateTo ? format(new Date(filters.dateTo + "T12:00:00"), "MMM d") : "To")}
                    </button>
                  ))}
                </div>
                {hasDateFilter && (
                  <button onClick={() => update({ dateFrom: "", dateTo: "" })} className="text-muted-foreground hover:text-foreground">
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto flex items-start justify-center pt-1">
                <Calendar
                  mode="single"
                  selected={pickingFor === "from" && filters.dateFrom ? new Date(filters.dateFrom + "T12:00:00") : pickingFor === "to" && filters.dateTo ? new Date(filters.dateTo + "T12:00:00") : undefined}
                  onSelect={(day) => {
                    if (!day) return
                    const pad = (n: number) => String(n).padStart(2, "0")
                    const val = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
                    if (pickingFor === "from") {
                      update({ dateFrom: val })
                      setPickingFor("to")
                    } else {
                      update({ dateTo: val })
                      setDateShelfOpen(false)
                    }
                  }}
                  classNames={{ root: "!p-1", month_caption: "text-xs", day: "text-xs" }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
