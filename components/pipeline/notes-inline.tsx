"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface NotesInlineProps {
  value: string | null
  onSave: (value: string) => void
  className?: string
}

export function NotesInline({ value, onSave, className }: NotesInlineProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value || "")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [editing])

  const handleBlur = () => {
    setEditing(false)
    if (text !== (value || "")) {
      onSave(text)
    }
  }

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setText(value || "")
            setEditing(false)
          }
        }}
        className={cn(
          "w-full min-h-[60px] text-[13px] rounded-md border border-input bg-background px-2 py-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-ring",
          className
        )}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn(
        "text-[13px] cursor-pointer truncate max-w-[200px]",
        value ? "text-foreground" : "text-muted-foreground italic",
        className
      )}
      title={value || "Click to add notes"}
    >
      {value || "—"}
    </div>
  )
}

interface NotesPeekCardProps {
  notes: string
  position: { x: number; y: number }
}

export function NotesPeekCard({ notes, position }: NotesPeekCardProps) {
  const flipLeft = position.x > window.innerWidth / 2
  const flipUp = position.y > window.innerHeight / 2

  return (
    <div
      className="fixed z-50 w-[280px] rounded-lg border bg-popover shadow-lg p-3 pointer-events-none"
      style={{
        left: flipLeft ? position.x - 290 : position.x + 10,
        top: flipUp ? position.y - 120 : position.y + 10,
      }}
    >
      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
      <p className="text-[13px] whitespace-pre-wrap line-clamp-6">{notes}</p>
    </div>
  )
}
