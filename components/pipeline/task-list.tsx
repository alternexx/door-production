"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Plus, X, CheckCircle2, Archive, Circle, CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export type Task = {
  id: string
  dealId: string
  title: string
  description: string | null
  dueDate: string | null
  status: "todo" | "in_progress" | "completed"
  priority: "low" | "medium" | "high" | "urgent"
  completedAt: string | null
  assignee: { id: string; name: string } | null
  creator: { id: string; name: string } | null
  createdAt: string
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

function getDueCountdown(dueDate: string | null): { label: string; urgent: boolean } | null {
  if (!dueDate) return null
  const now = Date.now()
  const due = new Date(dueDate).getTime()
  const diffMs = due - now
  const diffDays = Math.ceil(diffMs / 86400000)
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, urgent: true }
  if (diffDays === 0) return { label: "Due today", urgent: true }
  if (diffDays === 1) return { label: "1 day left", urgent: true }
  if (diffDays <= 3) return { label: `${diffDays} days left`, urgent: true }
  return { label: `${diffDays} days left`, urgent: false }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function TaskList({
  dealId,
  addShelfOpen,
  onAddShelfOpenChange,
  onTaskSelect,
  addTitle,
  setAddTitle,
  addDescription,
  setAddDescription,
  addDueDate,
  setAddDueDate,
  addPriority,
  setAddPriority,
  addSaving,
  onAddTask,
  refreshKey,
}: {
  dealId: string
  addShelfOpen?: boolean
  onAddShelfOpenChange?: (v: boolean) => void
  onTaskSelect?: (task: Task | null) => void
  addTitle?: string
  setAddTitle?: (v: string) => void
  addDescription?: string
  setAddDescription?: (v: string) => void
  addDueDate?: string
  setAddDueDate?: (v: string) => void
  addPriority?: string
  setAddPriority?: (v: string) => void
  addSaving?: boolean
  onAddTask?: () => void
  refreshKey?: number
}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [archiving, setArchiving] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?deal_id=${dealId}`)
      if (res.ok) setTasks(await res.json())
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => { fetchTasks() }, [fetchTasks, refreshKey])

  const open = useMemo(() => tasks.filter(t => t.status !== "completed"), [tasks])
  const done = useMemo(() => tasks.filter(t => t.status === "completed"), [tasks])

  const handleComplete = async (task: Task) => {
    setCompleting(task.id)
    try {
      await fetch(`/api/tasks/${task.id}/complete`, { method: "POST" })
      await fetchTasks()
      onTaskSelect?.(null)
    } finally { setCompleting(null) }
  }

  const handleArchive = async (task: Task) => {
    setArchiving(task.id)
    try {
      await fetch(`/api/tasks/${task.id}/archive`, { method: "POST" })
      await fetchTasks()
      onTaskSelect?.(null)
    } finally { setArchiving(null) }
  }

  return (
    <div className="space-y-1">
      {loading ? (
        <div className="py-3 flex justify-center">
          <div className="size-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        </div>
      ) : open.length === 0 && done.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">No tasks yet</p>
      ) : (
        <>
          {open.map(task => {
            const countdown = getDueCountdown(task.dueDate)
            return (
              <div
                key={task.id}
                onClick={() => onTaskSelect?.(task)}
                className="group flex items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-muted/50 cursor-pointer"
              >
                <Circle className="size-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm truncate">{task.title}</span>
                {countdown && (
                  <span className={cn("text-[10px] shrink-0", countdown.urgent ? "text-red-500" : "text-muted-foreground")}>
                    {countdown.label}
                  </span>
                )}
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded shrink-0", priorityColors[task.priority])}>
                  {task.priority}
                </span>
              </div>
            )
          })}

          {done.length > 0 && (
            <div className="pt-1">
              <p className="px-2.5 text-[10px] text-muted-foreground mb-1">Completed ({done.length})</p>
              {done.map(task => (
                <div key={task.id} className="flex items-center gap-2 px-2.5 py-1.5 opacity-50">
                  <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
                  <span className="flex-1 text-sm line-through text-muted-foreground truncate">{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add task button */}
      <button
        onClick={() => onAddShelfOpenChange?.(!addShelfOpen)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
      >
        <Plus className="size-3" />
        Add task
      </button>


    </div>
  )
}

// Detail shelf shown when clicking a task — rendered at modal level
export function TaskDetailShelf({ task, open, completing, archiving, onComplete, onArchive, onClose }: {
  task: Task | null
  open: boolean
  completing: boolean
  archiving: boolean
  onComplete: () => void
  onArchive: () => void
  onClose: () => void
}) {
  const countdown = task ? getDueCountdown(task.dueDate) : null
  const isDone = task?.status === "completed"

  return (
    <div
      style={{
        position: "absolute", top: 0, left: "100%",
        width: open && task ? 260 : 0, height: "100%",
        borderLeft: open && task ? "1px solid var(--border)" : "none",
        borderRadius: "0 12px 12px 0",
        background: "var(--background)",
        boxShadow: open && task ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 10,
      }}
    >
      <div style={{ width: 260, display: "flex", flexDirection: "column", height: "100%" }}>
        {open && task && (
          <>
            <div className="flex items-center justify-between px-3.5 py-3 border-b shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task</span>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3">
              <p className="text-sm font-medium leading-snug">{task.title}</p>
              {task.description && <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {task.creator && <div className="flex justify-between"><span>Created by</span><span className="text-foreground">{task.creator.name}</span></div>}
                <div className="flex justify-between"><span>Created</span><span className="text-foreground">{formatDate(task.createdAt)}</span></div>
                {task.assignee && <div className="flex justify-between"><span>Assigned to</span><span className="text-foreground">{task.assignee.name}</span></div>}
                {task.dueDate && (
                  <div className="flex justify-between">
                    <span>Due</span>
                    <span className={cn("font-medium", countdown?.urgent ? "text-red-500" : "text-foreground")}>
                      {formatDate(task.dueDate)}{countdown ? ` · ${countdown.label}` : ""}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Priority</span>
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px]", priorityColors[task.priority])}>{task.priority}</span>
                </div>
                {isDone && task.completedAt && <div className="flex justify-between"><span>Completed</span><span className="text-foreground">{formatDate(task.completedAt)}</span></div>}
              </div>
            </div>
            {!isDone && (
              <div className="px-3.5 py-3 border-t space-y-2 shrink-0">
                <Button size="sm" className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={onComplete} disabled={completing || archiving}>
                  {completing ? <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" /> : <CheckCircle2 className="size-3.5 mr-1.5" />}
                  Complete
                </Button>
                <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={onArchive} disabled={completing || archiving}>
                  {archiving ? <div className="size-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-1.5" /> : <Archive className="size-3.5 mr-1.5" />}
                  Archive
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DueDatePicker({ dueDate, setDueDate }: { dueDate: string; setDueDate: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = dueDate ? new Date(dueDate + "T12:00:00") : undefined

  const handleSelect = (day: Date | undefined) => {
    if (!day) { setDueDate(""); setOpen(false); return }
    const pad = (n: number) => String(n).padStart(2, "0")
    setDueDate(`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`)
    setOpen(false)
  }

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Due Date</label>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "w-full h-8 flex items-center gap-2 px-2.5 rounded-md border border-input bg-background text-xs transition-colors hover:bg-accent",
          selected ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <CalendarIcon className="size-3 shrink-0" />
        {selected ? format(selected, "EEE, MMM d") : "Pick a date"}
        {selected && (
          <span
            className="ml-auto text-muted-foreground hover:text-foreground"
            onClick={e => { e.stopPropagation(); setDueDate("") }}
          >×</span>
        )}
      </button>
      {open && (
        <div className="rounded-lg border border-border bg-background shadow-md overflow-hidden">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={{ before: new Date() }}
            classNames={{ root: "!p-1", month_caption: "text-xs", day: "text-xs" }}
          />
        </div>
      )}
    </div>
  )
}

// Add task shelf — rendered by deal-modal
export function TaskAddShelf({
  open,
  title, setTitle,
  description, setDescription,
  dueDate, setDueDate,
  priority, setPriority,
  saving,
  onAdd,
  onClose,
}: {
  open: boolean
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  dueDate: string
  setDueDate: (v: string) => void
  priority: string
  setPriority: (v: string) => void
  saving: boolean
  onAdd: () => void
  onClose: () => void
}) {
  return (
    <div style={{
      position: "absolute", top: 0, left: "100%",
      width: open ? 260 : 0, height: "100%",
      borderLeft: open ? "1px solid var(--border)" : "none",
      borderRadius: "0 12px 12px 0",
      background: "var(--background)",
      boxShadow: open ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
      transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
      overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 10,
    }}>
      <div style={{ width: 260, display: "flex", flexDirection: "column", height: "100%" }}>
        {open && (
          <>
            <div className="flex items-center justify-between px-3.5 py-3 border-b shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Task</span>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Title *</label>
                <Input
                  autoFocus
                  placeholder="Task name..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={e => { if (e.key === "Enter" && title.trim()) onAdd() }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</label>
                <Textarea
                  placeholder="Optional notes..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="text-xs min-h-[60px] resize-none"
                />
              </div>
              <DueDatePicker dueDate={dueDate} setDueDate={setDueDate} />
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Priority</label>
                <div className="flex rounded-md border border-input overflow-hidden">
                  {["low", "medium", "high", "urgent"].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        "flex-1 py-1 text-[10px] font-medium transition-colors capitalize",
                        priority === p ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-auto">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={onAdd}
                  disabled={saving || !title.trim()}
                >
                  {saving && <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />}
                  Create Task
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
