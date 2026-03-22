"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Search, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Agent {
  id: string
  name: string
  color: string
}

interface AgentShelfProps {
  open: boolean
  onClose: () => void
  agents: Agent[]
  selectedIds: string[]
  onToggle: (id: string) => void
  anchorEl?: HTMLElement | null
}

export function AgentShelf({ open, onClose, agents, selectedIds, onToggle, anchorEl }: AgentShelfProps) {
  const [search, setSearch] = useState("")
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)

  const handleClose = () => {
    setSearch("")
    onClose()
  }

  // Position relative to anchor element
  useEffect(() => {
    if (!open) return
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setPos({
        top: spaceBelow > 320 ? rect.bottom + window.scrollY + 4 : rect.top + window.scrollY - 324,
        left: rect.left + window.scrollX,
      })
    }
  }, [open, anchorEl])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open, onClose])

  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
          }}
          className="w-[240px] rounded-xl border border-border bg-card shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agents</span>
            <button
              onClick={handleClose}
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-0.5 max-h-[280px] overflow-y-auto px-2 pb-2">
            {filtered.map((agent) => {
              const isSelected = selectedIds.includes(agent.id)
              return (
                <button
                  key={agent.id}
                  onClick={() => onToggle(agent.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors",
                    isSelected ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <span
                    className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm text-foreground">{agent.name}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-[var(--fm-amber)]" />}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No agents found</p>
            )}
          </div>
          <div className="px-3 py-2 border-t border-border">
            <span className="text-[11px] text-muted-foreground">{selectedIds.length} selected</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
