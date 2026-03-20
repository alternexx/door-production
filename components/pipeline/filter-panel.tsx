"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BOROUGHS } from "@/lib/tokens"
import { cn } from "@/lib/utils"
import type { StageOption } from "./deal-table"

interface Agent {
  id: number
  name: string
  color: string
}

export interface FilterState {
  agents: number[]
  boroughs: string[]
  stages: string[]
  priceMin: string
  priceMax: string
  dateFrom: string
  dateTo: string
  myDeals: boolean
  archivedOnly: boolean
  staleOnly: boolean
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
}

interface FilterPanelProps {
  open: boolean
  onClose: () => void
  filters: FilterState
  onApply: (filters: FilterState) => void
  stages: StageOption[]
  agents: Agent[]
}

export function FilterPanel({
  open,
  onClose,
  filters,
  onApply,
  stages,
  agents,
}: FilterPanelProps) {
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

function FilterPanelContent({
  onClose,
  filters,
  onApply,
  stages,
  agents,
}: Omit<FilterPanelProps, "open">) {
  const [local, setLocal] = useState<FilterState>(filters)

  const toggleArrayItem = <T extends string | number>(
    arr: T[],
    item: T
  ): T[] => (arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item])

  const activeCount = [
    local.agents.length > 0,
    local.boroughs.length > 0,
    local.stages.length > 0,
    !!local.priceMin,
    !!local.priceMax,
    !!local.dateFrom,
    !!local.dateTo,
    local.myDeals,
    local.archivedOnly,
    local.staleOnly,
  ].filter(Boolean).length

  return (
    <div className="w-[300px] max-h-[70vh] overflow-y-auto space-y-5 p-4">
          {/* Agents */}
          <div className="space-y-2.5">
            <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground block">
              Agents
            </label>
            <div className="flex flex-wrap gap-2">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() =>
                    setLocal((prev) => ({ ...prev, agents: toggleArrayItem(prev.agents, a.id) }))
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                    local.agents.includes(a.id)
                      ? "text-white"
                      : "bg-transparent text-muted-foreground border-border"
                  )}
                  style={
                    local.agents.includes(a.id)
                      ? { backgroundColor: a.color, borderColor: a.color }
                      : undefined
                  }
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          {/* Boroughs */}
          <div className="space-y-2.5">
            <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground block">
              Borough
            </label>
            <div className="flex flex-wrap gap-2">
              {BOROUGHS.map((b) => (
                <button
                  key={b}
                  onClick={() =>
                    setLocal((prev) => ({ ...prev, boroughs: toggleArrayItem(prev.boroughs, b) }))
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                    local.boroughs.includes(b)
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Stages */}
          <div className="space-y-2.5">
            <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground block">
              Stage
            </label>
            <div className="flex flex-wrap gap-2">
              {stages.map((s) => (
                <button
                  key={s.name}
                  onClick={() =>
                    setLocal((prev) => ({
                      ...prev,
                      stages: toggleArrayItem(prev.stages, s.name),
                    }))
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                    local.stages.includes(s.name) ? "" : "opacity-50"
                  )}
                  style={{
                    backgroundColor: s.color,
                    color: s.textColor,
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2.5">
            <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground block">
              Price / Budget Range
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={local.priceMin}
                onChange={(e) => setLocal((prev) => ({ ...prev, priceMin: e.target.value }))}
                className="h-9 text-sm"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={local.priceMax}
                onChange={(e) => setLocal((prev) => ({ ...prev, priceMax: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2.5">
            <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground block">
              Date Range
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={local.dateFrom}
                onChange={(e) => setLocal((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="h-9 text-sm"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="date"
                value={local.dateTo}
                onChange={(e) => setLocal((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">My deals only</span>
              <button
                type="button"
                onClick={() => setLocal((prev) => ({ ...prev, myDeals: !prev.myDeals }))}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  local.myDeals ? "bg-[var(--fm-amber)]" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform",
                    local.myDeals ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Stale only</span>
              <button
                type="button"
                onClick={() => setLocal((prev) => ({ ...prev, staleOnly: !prev.staleOnly }))}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  local.staleOnly ? "bg-[var(--fm-amber)]" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform",
                    local.staleOnly ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Archived only</span>
              <button
                type="button"
                onClick={() =>
                  setLocal((prev) => ({ ...prev, archivedOnly: !prev.archivedOnly }))
                }
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  local.archivedOnly ? "bg-[var(--fm-amber)]" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform",
                    local.archivedOnly ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocal(defaultFilters)}
              className="text-xs"
            >
              Reset All
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onApply(local)
                onClose()
              }}
              className="bg-[var(--fm-amber)] hover:bg-[var(--fm-amber)]/90 text-white"
            >
              Apply{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
          </div>
    </div>
  )
}
