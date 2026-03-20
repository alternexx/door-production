"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
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
  Plus,
  Calendar,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Agent = {
  id: string
  name: string
}

type Task = {
  id: string
  dealId: string
  title: string
  description: string | null
  dueDate: string | null
  assignedTo: string | null
  status: "todo" | "in_progress" | "completed"
  priority: "low" | "medium" | "high" | "urgent"
  completedAt: string | null
  assignee: { id: string; name: string } | null
  createdAt: string
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

function getDueDateLabel(dueDate: string | null) {
  if (!dueDate) return null
  return new Date(dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.status === "completed") return false
  return new Date(task.dueDate).getTime() < Date.now()
}

const EMPTY_ASSIGNMENT = "__unassigned__"

export function TaskList({ dealId }: { dealId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newStatus, setNewStatus] = useState<string>("todo")
  const [newPriority, setNewPriority] = useState<string>("medium")
  const [newDueDate, setNewDueDate] = useState("")
  const [newAssignedTo, setNewAssignedTo] = useState<string>(EMPTY_ASSIGNMENT)

  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const [editTask, setEditTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editStatus, setEditStatus] = useState<string>("todo")
  const [editPriority, setEditPriority] = useState<string>("medium")
  const [editDueDate, setEditDueDate] = useState("")
  const [editAssignedTo, setEditAssignedTo] = useState<string>(EMPTY_ASSIGNMENT)

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/users")
    if (!res.ok) return
    const data = await res.json()
    if (Array.isArray(data)) {
      setAgents(data.map((u) => ({ id: u.id, name: u.name })))
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?deal_id=${dealId}`)
      if (res.ok) {
        setTasks(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    fetchTasks()
    fetchAgents()
  }, [fetchTasks, fetchAgents])

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          status: newStatus,
          priority: newPriority,
          dueDate: newDueDate || undefined,
          assignedTo: newAssignedTo === EMPTY_ASSIGNMENT ? null : newAssignedTo,
        }),
      })
      if (res.ok) {
        setNewTitle("")
        setNewDescription("")
        setNewDueDate("")
        setNewStatus("todo")
        setNewPriority("medium")
        setNewAssignedTo(EMPTY_ASSIGNMENT)
        setShowAdd(false)
        await fetchTasks()
      }
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (task: Task) => {
    setEditTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description || "")
    setEditStatus(task.status)
    setEditPriority(task.priority)
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "")
    setEditAssignedTo(task.assignedTo || EMPTY_ASSIGNMENT)
  }

  const handleSaveEdit = async () => {
    if (!editTask || !editTitle.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${editTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          status: editStatus,
          priority: editPriority,
          dueDate: editDueDate || null,
          assignedTo: editAssignedTo === EMPTY_ASSIGNMENT ? null : editAssignedTo,
        }),
      })

      if (res.ok) {
        setEditTask(null)
        await fetchTasks()
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleComplete = async (task: Task) => {
    const endpoint =
      task.status === "completed"
        ? `/api/tasks/${task.id}/reopen`
        : `/api/tasks/${task.id}/complete`
    await fetch(endpoint, { method: "POST" })
    await fetchTasks()
  }

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === "todo" || t.status === "in_progress"),
    [tasks]
  )
  const completed = useMemo(
    () => tasks.filter((t) => t.status === "completed"),
    [tasks]
  )

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
          Tasks
          {openTasks.length > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({openTasks.length} open)
            </span>
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="mr-1 size-3" />
          Add
        </Button>
      </div>

      {!expanded ? null : loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-1">
          {showAdd && (
            <div className="flex flex-col gap-2 rounded-lg border p-2">
              <Input
                placeholder="Task title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="h-7 text-sm"
                autoFocus
              />
              <Textarea
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="min-h-16 text-xs"
              />
              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <Select value={newStatus} onValueChange={(v) => v && setNewStatus(v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={newPriority} onValueChange={(v) => v && setNewPriority(v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={newAssignedTo} onValueChange={(v) => v && setNewAssignedTo(v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Assign to" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_ASSIGNMENT}>Unassigned</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="h-7 pl-7 text-xs"
                  />
                </div>
              </div>
              <div className="ml-auto flex gap-1">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAdd}
                  disabled={saving || !newTitle.trim()}
                >
                  {saving ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {openTasks.length === 0 && completed.length === 0 && !showAdd && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No tasks yet
            </p>
          )}

          {openTasks.map((task) => {
            const overdue = isOverdue(task)
            const dueDateLabel = getDueDateLabel(task.dueDate)
            return (
              <div
                key={task.id}
                className={cn(
                  "group rounded-lg px-2 py-1.5 hover:bg-muted/50",
                  overdue && "border border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-900/10"
                )}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggleComplete(task)}
                  />
                  <span className="flex-1 text-sm">{task.title}</span>
                  <Badge className={cn("text-[10px]", priorityColors[task.priority])}>
                    {task.priority}
                  </Badge>
                  <button
                    onClick={() => openEdit(task)}
                    className="invisible text-muted-foreground hover:text-foreground group-hover:visible"
                    title="Edit"
                  >
                    <Pencil className="size-3" />
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2 pl-6 text-[10px] text-muted-foreground">
                  <span className={cn(overdue && "font-medium text-red-700 dark:text-red-400")}>
                    {dueDateLabel ? `Due ${dueDateLabel}` : "No due date"}
                  </span>
                  <span>•</span>
                  <span>{task.assignee?.name || "Unassigned"}</span>
                </div>
              </div>
            )
          })}

          {completed.length > 0 && (
            <div className="pt-1">
              <p className="px-2 text-[10px] font-medium text-muted-foreground">
                Completed ({completed.length})
              </p>
              {completed.map((task) => (
                <div
                  key={task.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => toggleComplete(task)}
                  />
                  <span className="flex-1 text-sm text-muted-foreground line-through">
                    {task.title}
                  </span>
                  <button
                    onClick={() => toggleComplete(task)}
                    className="invisible text-muted-foreground hover:text-foreground group-hover:visible"
                    title="Reopen"
                  >
                    <RotateCcw className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!editTask} onOpenChange={(v) => !v && setEditTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Task title"
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
              className="min-h-20"
            />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <Select value={editStatus} onValueChange={(v) => v && setEditStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={editPriority} onValueChange={(v) => v && setEditPriority(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={editAssignedTo} onValueChange={(v) => v && setEditAssignedTo(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_ASSIGNMENT}>Unassigned</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditTask(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving || !editTitle.trim()}>
                {saving ? <Loader2 className="size-3 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
