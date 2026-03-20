"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Loader2,
  Plus,
  MessageSquare,
  CalendarClock,
  XCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

type ShowingAgent = { id: string; name: string }
type Showing = {
  id: string
  dealId: string
  agentId: string
  scheduledAt: string
  status: "scheduled" | "completed" | "cancelled" | "no_show"
  feedbackReaction: string | null
  feedbackNotes: string | null
  cancelledAt: string | null
  cancelReason: string | null
  rescheduledFrom: string | null
  agent: ShowingAgent
  createdAt: string
}

const reactionLabels: Record<string, string> = {
  loved_it: "Loved it",
  interested: "Interested",
  too_expensive: "Too expensive",
  too_small: "Too small",
  bad_neighborhood: "Bad neighborhood",
  wants_more: "Wants more",
  not_interested: "Not interested",
  other: "Other",
}

const reactionEmojis: Record<string, string> = {
  loved_it: "😍",
  interested: "👍",
  too_expensive: "💸",
  too_small: "📏",
  bad_neighborhood: "🚫",
  wants_more: "🔎",
  not_interested: "👎",
  other: "💬",
}

const statusIcons: Record<string, React.ReactNode> = {
  scheduled: <Calendar className="size-3.5 text-blue-500" />,
  completed: <CheckCircle2 className="size-3.5 text-green-500" />,
  cancelled: <XCircle className="size-3.5 text-red-500" />,
  no_show: <AlertCircle className="size-3.5 text-orange-500" />,
}

export function ShowingList({ dealId }: { dealId: string }) {
  const [showings, setShowings] = useState<Showing[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [saving, setSaving] = useState(false)

  // Feedback dialog
  const [feedbackShowing, setFeedbackShowing] = useState<Showing | null>(null)
  const [feedbackReaction, setFeedbackReaction] = useState("")
  const [feedbackNotes, setFeedbackNotes] = useState("")

  // Reschedule dialog
  const [rescheduleShowing, setRescheduleShowing] = useState<Showing | null>(
    null
  )
  const [rescheduleDate, setRescheduleDate] = useState("")

  // Cancel dialog
  const [cancelShowing, setCancelShowing] = useState<Showing | null>(null)
  const [cancelReason, setCancelReason] = useState("")

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
  }, [fetchShowings])

  const handleSchedule = async () => {
    if (!scheduleDate) return
    setSaving(true)
    try {
      const res = await fetch("/api/showings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, scheduledAt: scheduleDate }),
      })
      if (res.ok) {
        setScheduleDate("")
        setShowSchedule(false)
        await fetchShowings()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleFeedback = async () => {
    if (!feedbackShowing || !feedbackReaction) return
    setSaving(true)
    try {
      await fetch(`/api/showings/${feedbackShowing.id}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reaction: feedbackReaction,
          notes: feedbackNotes,
        }),
      })
      setFeedbackShowing(null)
      setFeedbackReaction("")
      setFeedbackNotes("")
      await fetchShowings()
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async (showing: Showing) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/showings/${showing.id}/complete`, {
        method: "POST",
      })
      if (res.ok) {
        const updated = await res.json()
        setFeedbackShowing(updated ?? showing)
        setFeedbackReaction(updated?.feedbackReaction ?? "")
        setFeedbackNotes(updated?.feedbackNotes ?? "")
        await fetchShowings()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleReschedule = async () => {
    if (!rescheduleShowing || !rescheduleDate) return
    setSaving(true)
    try {
      await fetch(`/api/showings/${rescheduleShowing.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: rescheduleDate }),
      })
      setRescheduleShowing(null)
      setRescheduleDate("")
      await fetchShowings()
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelShowing) return
    setSaving(true)
    try {
      await fetch(`/api/showings/${cancelShowing.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      })
      setCancelShowing(null)
      setCancelReason("")
      await fetchShowings()
    } finally {
      setSaving(false)
    }
  }

  const scheduled = showings.filter((s) => s.status === "scheduled")
  const past = showings.filter((s) => s.status !== "scheduled")

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-foreground/80"
        >
          {expanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
          Showings
          {scheduled.length > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({scheduled.length} upcoming)
            </span>
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setShowSchedule(!showSchedule)}
        >
          <Plus className="mr-1 size-3" />
          Schedule
        </Button>
      </div>

      {!expanded ? null : loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-1">
          {showSchedule && (
            <div className="flex items-center gap-2 rounded-lg border p-2">
              <Input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-7 text-xs"
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSchedule}
                disabled={saving || !scheduleDate}
              >
                {saving ? <Loader2 className="size-3 animate-spin" /> : "Schedule"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowSchedule(false)}
              >
                Cancel
              </Button>
            </div>
          )}

          {showings.length === 0 && !showSchedule && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No showings yet
            </p>
          )}

          {scheduled.map((showing) => (
            <div
              key={showing.id}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50"
            >
              {statusIcons[showing.status]}
              <div className="flex-1">
                <span className="text-sm">
                  {new Date(showing.scheduledAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="ml-1 text-xs text-muted-foreground">
                  {new Date(showing.scheduledAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {showing.agent.name.split(" ")[0]}
              </span>
              <div className="invisible flex gap-1 group-hover:visible">
                <button
                  onClick={() => handleComplete(showing)}
                  className="text-muted-foreground hover:text-green-600"
                  title="Mark complete"
                >
                  <CheckCircle2 className="size-3" />
                </button>
                <button
                  onClick={() => setFeedbackShowing(showing)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Add feedback"
                >
                  <MessageSquare className="size-3" />
                </button>
                <button
                  onClick={() => setRescheduleShowing(showing)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Reschedule"
                >
                  <CalendarClock className="size-3" />
                </button>
                <button
                  onClick={() => setCancelShowing(showing)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Cancel"
                >
                  <XCircle className="size-3" />
                </button>
              </div>
            </div>
          ))}

          {past.length > 0 && (
            <div className="pt-1">
              <p className="px-2 text-[10px] font-medium text-muted-foreground">
                Past ({past.length})
              </p>
              {past.map((showing) => (
                <div
                  key={showing.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/50"
                >
                  {statusIcons[showing.status]}
                  <span className="flex-1 text-sm text-muted-foreground">
                    {new Date(showing.scheduledAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {showing.feedbackReaction && (
                    <Badge variant="secondary" className="text-[10px]">
                      {reactionEmojis[showing.feedbackReaction] ?? "💬"}{" "}
                      {reactionLabels[showing.feedbackReaction] ?? showing.feedbackReaction}
                    </Badge>
                  )}
                  {showing.feedbackNotes && (
                    <span className="max-w-[180px] truncate text-[10px] text-muted-foreground">
                      {showing.feedbackNotes}
                    </span>
                  )}
                  {showing.status === "cancelled" && (
                    <Badge variant="destructive" className="text-[10px]">
                      Cancelled
                    </Badge>
                  )}
                  {showing.status === "no_show" && (
                    <Badge className="bg-orange-100 text-[10px] text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                      No-show
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog
        open={!!feedbackShowing}
        onOpenChange={() => setFeedbackShowing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Showing Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={feedbackReaction} onValueChange={(v) => v && setFeedbackReaction(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select reaction..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reactionLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Additional notes..."
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setFeedbackShowing(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleFeedback}
                disabled={saving || !feedbackReaction}
              >
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Save Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog
        open={!!rescheduleShowing}
        onOpenChange={() => setRescheduleShowing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Showing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="datetime-local"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setRescheduleShowing(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReschedule}
                disabled={saving || !rescheduleDate}
              >
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Reschedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog
        open={!!cancelShowing}
        onOpenChange={() => setCancelShowing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Showing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Reason for cancellation (optional)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setCancelShowing(null)}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={saving}
              >
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Cancel Showing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
