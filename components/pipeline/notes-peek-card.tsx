"use client"

import { useRef } from "react"
import { StageBadge } from "./stage-badge"
import { AgentChip } from "./agent-chip"
import type { Deal } from "./deal-table"

interface NotesPeekCardProps {
  deal: Deal | null
  mouseX: number
  mouseY: number
  visible: boolean
}

export function NotesPeekCard({ deal, mouseX, mouseY, visible }: NotesPeekCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const position: "left" | "right" =
    typeof window !== "undefined" &&
    mouseX > window.innerWidth - 350 &&
    mouseY > window.innerHeight - 300
      ? "left"
      : "right"

  if (!visible || !deal || !deal.notes) return null

  const truncatedNotes = deal.notes.length > 200
    ? deal.notes.substring(0, 200) + "..."
    : deal.notes

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div
      ref={cardRef}
      className={`fixed bottom-6 z-50 w-[320px] rounded-xl border bg-card shadow-xl p-4 transition-all duration-200 ${
        position === "right" ? "right-6" : "left-20"
      }`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{deal.primaryField}</h4>
          {deal.borough && (
            <p className="text-xs text-muted-foreground">{deal.borough}</p>
          )}
        </div>
        <StageBadge
          stage={deal.stage}
          color={deal.stageColor}
          textColor={deal.stageTextColor}
        />
      </div>

      {/* Agents */}
      {deal.agents.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {deal.agents.map((agent) => (
            <AgentChip key={agent.id} agent={agent} mode="initials" />
          ))}
        </div>
      )}

      {/* Notes */}
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
          Notes
        </p>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {truncatedNotes}
        </p>
      </div>

      {/* Last Updated */}
      <p className="text-[10px] text-muted-foreground mt-2">
        Updated {formatDate(deal.updatedAt)}
      </p>
    </div>
  )
}
