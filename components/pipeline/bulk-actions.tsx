"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowRight, Download, Trash2, Users, X } from "lucide-react"
import type { StageOption } from "./deal-table"

interface Agent {
  id: number
  name: string
  color: string
}

interface BulkActionsProps {
  selectedCount: number
  onClear: () => void
  stages: StageOption[]
  agents: Agent[]
  onChangeStage: (stage: string) => void
  onAssignAgent: (agentId: number) => void
  onExportCsv: () => void
  onDelete?: () => void
  isAdmin?: boolean
}

export function BulkActions({
  selectedCount,
  onClear,
  stages,
  agents,
  onChangeStage,
  onAssignAgent,
  onExportCsv,
  onDelete,
  isAdmin = false,
}: BulkActionsProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className="hidden md:flex fixed top-4 left-1/2 -translate-x-1/2 z-50 items-center gap-2 px-4 py-2.5 rounded-xl border bg-card shadow-xl"
        >
          <span className="text-sm font-medium mr-1">
            {selectedCount} selected
          </span>

          {/* Change Stage */}
          <Select onValueChange={(v: unknown) => { if (typeof v === "string") onChangeStage(v) }}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <ArrowRight className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Change Stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assign Agent */}
          <Select onValueChange={(v: unknown) => typeof v === "string" && onAssignAgent(parseInt(v))}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <Users className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Assign Agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export CSV */}
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onExportCsv}>
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>

          {/* Delete (admin) */}
          {isAdmin && onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          )}

          {/* Clear */}
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8 w-8 p-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
