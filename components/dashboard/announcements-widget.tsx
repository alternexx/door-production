"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Loader2, Pin, PinOff, Trash2, Pencil, Check, X } from "lucide-react"

type AnnouncementRow = {
  id: string
  title: string
  content: string
  isPinned: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  creator?: { id: string; name: string; role: "admin" | "agent" }
  isRead: boolean
  readAt: string | null
}

type AnnouncementResponse = {
  announcements: AnnouncementRow[]
  unreadCount: number
  currentUser: { id: string; name: string; role: "admin" | "agent"; isAdmin: boolean }
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function AnnouncementsWidget() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isPinned, setIsPinned] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")

  const load = async () => {
    try {
      const res = await fetch("/api/announcements?limit=10")
      if (!res.ok) return
      const data: AnnouncementResponse = await res.json()
      setAnnouncements(data.announcements)
      setUnreadCount(data.unreadCount)
      setIsAdmin(Boolean(data.currentUser?.isAdmin))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sorted = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [announcements])

  const markRead = async (announcementId: string) => {
    const target = announcements.find((item) => item.id === announcementId)
    if (!target || target.isRead) return

    setAnnouncements((prev) =>
      prev.map((item) =>
        item.id === announcementId
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item
      )
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    await fetch(`/api/announcements/${announcementId}/read`, { method: "POST" })
  }

  const createAnnouncement = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, isPinned }),
      })
      if (!res.ok) return
      const created: AnnouncementRow = await res.json()
      setAnnouncements((prev) => [created, ...prev])
      setTitle("")
      setContent("")
      setIsPinned(false)
      setUnreadCount((prev) => prev + 1)
    } finally {
      setSaving(false)
    }
  }

  const togglePinned = async (row: AnnouncementRow) => {
    const res = await fetch(`/api/announcements/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !row.isPinned }),
    })
    if (!res.ok) return

    const updated = await res.json()
    setAnnouncements((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, isPinned: Boolean(updated.isPinned), updatedAt: updated.updatedAt } : item
      )
    )
  }

  const startEdit = (row: AnnouncementRow) => {
    setEditingId(row.id)
    setEditTitle(row.title)
    setEditContent(row.content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle("")
    setEditContent("")
  }

  const saveEdit = async (announcementId: string) => {
    if (!editTitle.trim() || !editContent.trim()) return
    const res = await fetch(`/api/announcements/${announcementId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    })
    if (!res.ok) return

    const updated = await res.json()
    setAnnouncements((prev) =>
      prev.map((item) =>
        item.id === announcementId
          ? {
              ...item,
              title: updated.title,
              content: updated.content,
              updatedAt: updated.updatedAt,
            }
          : item
      )
    )
    cancelEdit()
  }

  const removeAnnouncement = async (announcementId: string) => {
    const row = announcements.find((item) => item.id === announcementId)
    if (!row) return
    if (!confirm("Delete this announcement?")) return

    const res = await fetch(`/api/announcements/${announcementId}`, { method: "DELETE" })
    if (!res.ok) return

    setAnnouncements((prev) => prev.filter((item) => item.id !== announcementId))
    if (!row.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Team Announcements</CardTitle>
        <Badge variant={unreadCount > 0 ? "default" : "outline"}>{unreadCount} unread</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <div className="space-y-2 rounded-md border p-3">
            <Input
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Write an announcement..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className={cn(
                  "text-xs",
                  isPinned ? "text-[var(--fm-amber)]" : "text-muted-foreground"
                )}
                onClick={() => setIsPinned((prev) => !prev)}
              >
                {isPinned ? "Pinned" : "Pin this announcement"}
              </button>
              <Button onClick={createAnnouncement} disabled={saving || !title.trim() || !content.trim()}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Post"}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((announcement) => {
              const isEditing = editingId === announcement.id
              return (
                <div
                  key={announcement.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => markRead(announcement.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      markRead(announcement.id)
                    }
                  }}
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors",
                    announcement.isRead ? "bg-background" : "bg-amber-50/70"
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} />
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); cancelEdit() }}>
                          <X className="size-3.5" />
                        </Button>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); saveEdit(announcement.id) }}>
                          <Check className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {announcement.isPinned && <Pin className="mt-0.5 size-3.5 text-[var(--fm-amber)]" />}
                          <p className="truncate text-sm font-medium">{announcement.title}</p>
                          {!announcement.isRead && <Badge className="h-4 px-1 text-[10px]">New</Badge>}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="icon-xs" variant="ghost" onClick={() => startEdit(announcement)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button size="icon-xs" variant="ghost" onClick={() => togglePinned(announcement)}>
                              {announcement.isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                            </Button>
                            <Button size="icon-xs" variant="ghost" onClick={() => removeAnnouncement(announcement.id)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{announcement.content}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {announcement.creator?.name ?? "Team"} • {formatTime(announcement.createdAt)}
                      </p>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
