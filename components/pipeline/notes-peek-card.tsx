"use client"

import { useRef, useEffect, useState } from "react"
import { StageBadge } from "./stage-badge"
import { AgentChip } from "./agent-chip"
import { CheckSquare, Calendar, MessageSquare } from "lucide-react"
import type { Deal } from "./deal-table"

interface NotesPeekCardProps {
  deal: Deal | null
  mouseX: number
  mouseY: number
  visible: boolean
}

export function NotesPeekCard({ deal, mouseX, mouseY, visible }: NotesPeekCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [counts, setCounts] = useState<{ openTasks: number; scheduledShowings: number; comments: number } | null>(null)
  const lastDealId = useRef<string | null>(null)

  const position: "left" | "right" =
    typeof window !== "undefined" &&
    mouseX > window.innerWidth - 350 &&
    mouseY > window.innerHeight - 300
      ? "left"
      : "right"

  // Fetch counts when deal changes
  useEffect(() => {
    if (!deal?.id || deal.id === lastDealId.current) return
    lastDealId.current = deal.id
    setCounts(null)

    Promise.all([
      fetch(`/api/tasks?deal_id=${deal.id}&open_only=true`).then(r => r.ok ? r.json() : []),
      fetch(`/api/showings?deal_id=${deal.id}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/deals/${deal.id}/comments`).then(r => r.ok ? r.json() : []),
    ]).then(([tasks, showings, comments]) => {
      setCounts({
        openTasks: Array.isArray(tasks) ? tasks.length : 0,
        scheduledShowings: Array.isArray(showings) ? showings.filter((s: { status: string }) => s.status === "scheduled").length : 0,
        comments: Array.isArray(comments) ? comments.length : 0,
      })
    }).catch(() => setCounts({ openTasks: 0, scheduledShowings: 0, comments: 0 }))
  }, [deal?.id])

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
      <div className="rounded-lg bg-muted/50 p-3 mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
          Notes
        </p>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {truncatedNotes}
        </p>
      </div>

      {/* Indicators */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckSquare className="size-3" />
          {counts == null ? "—" : counts.openTasks === 0 ? "0" : <span className="text-foreground font-medium">{counts.openTasks}</span>}
          <span className="ml-0.5">task{counts?.openTasks === 1 ? "" : "s"}</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="size-3" />
          {counts == null ? "—" : counts.scheduledShowings === 0 ? "0" : <span className="text-foreground font-medium">{counts.scheduledShowings}</span>}
          <span className="ml-0.5">showing{counts?.scheduledShowings === 1 ? "" : "s"}</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="size-3" />
          {counts == null ? "—" : counts.comments === 0 ? "0" : <span className="text-foreground font-medium">{counts.comments}</span>}
          <span className="ml-0.5">comment{counts?.comments === 1 ? "" : "s"}</span>
        </span>
      </div>

      {/* Last Updated */}
      <p className="text-[10px] text-muted-foreground mt-2">
        Updated {formatDate(deal.updatedAt)}
      </p>
    </div>
  )
}
