"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type TaskRow = {
  id: string
  title: string
  dueDate: string | null
  status: "todo" | "in_progress" | "completed"
  priority: "low" | "medium" | "high" | "urgent"
  deal: { id: string; title: string } | null
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

function dueLabel(dueDate: string | null) {
  if (!dueDate) return "No due date"
  return new Date(dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isOverdue(task: TaskRow) {
  if (!task.dueDate || task.status === "completed") return false
  return new Date(task.dueDate).getTime() < Date.now()
}

export function MyTasksWidget() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks?assigned_to=me&open_only=true")
      if (res.ok) {
        const data = await res.json()
        setTasks(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const toggleComplete = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete" }) })
    await fetchTasks()
  }

  const { overdue, upcoming } = useMemo(() => {
    const overdueItems = tasks.filter(isOverdue)
    const upcomingItems = tasks.filter((t) => !isOverdue(t))
    return { overdue: overdueItems, upcoming: upcomingItems }
  }, [tasks])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
        ) : (
          <>
            {overdue.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-red-600">Overdue</p>
                {overdue.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-md border border-red-200 bg-red-50/60 p-2 dark:border-red-900/40 dark:bg-red-900/10"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={false} onCheckedChange={() => toggleComplete(task.id)} />
                      <span className="flex-1 text-sm">{task.title}</span>
                      <Badge className={cn("text-[10px]", priorityColors[task.priority])}>{task.priority}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-red-700 dark:text-red-400">Due {dueLabel(task.dueDate)}</p>
                    {task.deal?.title && (
                      <p className="text-[11px] text-muted-foreground">{task.deal.title}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
                {upcoming.map((task) => (
                  <div key={task.id} className="rounded-md border p-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={false} onCheckedChange={() => toggleComplete(task.id)} />
                      <span className="flex-1 text-sm">{task.title}</span>
                      <Badge className={cn("text-[10px]", priorityColors[task.priority])}>{task.priority}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Due {dueLabel(task.dueDate)}</p>
                    {task.deal?.title && (
                      <p className="text-[11px] text-muted-foreground">{task.deal.title}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
