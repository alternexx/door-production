"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface Agent {
  id: string
  name: string
  color: string
  position?: number
}

interface AgentChipProps {
  agent: Agent
  mode?: "initials" | "full"
  className?: string
  onRemove?: () => void
  onClick?: (agentId: string) => void
  active?: boolean
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function hexToRgba(hex: string, alpha: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  } catch {
    return `rgba(186, 117, 23, ${alpha})`
  }
}

export function AgentChip({ agent, mode = "initials", className, onRemove, onClick, active }: AgentChipProps) {
  const [hovered, setHovered] = useState(false)
  const bg = hexToRgba(agent.color, 0.18)
  const border = hexToRgba(agent.color, active ? 0.8 : 0.45)
  const activeBg = active ? hexToRgba(agent.color, 0.3) : bg

  if (mode === "initials") {
    return (
      <div className="relative inline-flex" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <span
          className={cn("inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold shrink-0 transition-all duration-150", hovered && "scale-110 z-10", (onRemove || onClick) && "cursor-pointer", className)}
          style={{
            backgroundColor: onRemove && hovered ? hexToRgba("#ef4444", 0.18) : activeBg,
            color: onRemove && hovered ? "#ef4444" : agent.color,
            border: `0.5px solid ${onRemove && hovered ? hexToRgba("#ef4444", 0.45) : border}`,
            opacity: onRemove && hovered ? 0.5 : 1,
            ...(active ? { boxShadow: `0 0 0 1.5px ${hexToRgba(agent.color, 0.5)}` } : {}),
          }}
          onClick={onRemove ? (e) => { e.stopPropagation(); onRemove() } : onClick ? (e) => { e.stopPropagation(); onClick(agent.id) } : undefined}
          title={onRemove ? "Click to remove" : onClick ? "Click to filter" : undefined}
        >
          {getInitials(agent.name)}
        </span>
        {/* Name tooltip */}
        {hovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none">
            <div
              className="px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shadow-lg"
              style={{ backgroundColor: agent.color, color: "#fff" }}
            >
              {agent.name}
            </div>
            <div className="w-2 h-2 mx-auto -mt-1 rotate-45" style={{ backgroundColor: agent.color }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-150 hover:scale-105",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        backgroundColor: active ? hexToRgba(agent.color, 0.3) : bg,
        color: agent.color,
        border: `0.5px solid ${active ? hexToRgba(agent.color, 0.8) : border}`,
        ...(active ? { boxShadow: `0 0 0 1.5px ${hexToRgba(agent.color, 0.5)}` } : {}),
      }}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(agent.id) } : undefined}
    >
      {agent.name}
    </span>
  )
}

export const AgentChipDark = AgentChip

export function AgentAddButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-accent"
      style={{ border: "1.5px dashed var(--border)", color: "var(--muted-foreground)" }}
      title="Add agent"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
    >
      <Plus className="h-3.5 w-3.5" />
    </motion.button>
  )
}

export function AgentChipGroup({
  agents,
  mode = "initials",
  onAgentClick,
  activeAgentIds,
}: {
  agents: Agent[]
  mode?: "initials" | "full"
  onAgentClick?: (agentId: string) => void
  activeAgentIds?: string[]
}) {
  if (!agents.length) return <span className="text-muted-foreground text-xs">—</span>

  return (
    <div className="flex items-center flex-nowrap gap-1">
      {agents.map((agent) => (
        <div key={agent.id} className="relative">
          <AgentChip
            agent={agent}
            mode={mode}
            onClick={onAgentClick}
            active={activeAgentIds?.includes(agent.id)}
          />
        </div>
      ))}
    </div>
  )
}
