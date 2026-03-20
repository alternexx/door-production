"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import type { StageOption } from "./deal-table"

interface StageDropdownProps {
  currentStage: string
  stages: StageOption[]
  stageColor?: string
  stageTextColor?: string
  onSelect: (stage: string) => void
  disabled?: boolean
}

export function StageDropdown({
  currentStage,
  stages,
  stageColor = "#f1efe8",
  stageTextColor = "#1a1a18",
  onSelect,
  disabled = false,
}: StageDropdownProps) {
  const [open, setOpen] = useState(false)
  const [flipUp, setFlipUp] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    if (trigger) {
      const rect = trigger.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setFlipUp(spaceBelow < 200)
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const handleSelect = (stage: string) => {
    if (stage !== currentStage) {
      onSelect(stage)
    }
    setOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "inline-block px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-opacity",
          disabled && "opacity-60 cursor-not-allowed"
        )}
        style={(() => {
          try {
            const r = parseInt(stageColor.slice(1,3),16)
            const g = parseInt(stageColor.slice(3,5),16)
            const b = parseInt(stageColor.slice(5,7),16)
            return {
              backgroundColor: `rgba(${r},${g},${b},0.15)`,
              color: stageColor,
              border: `0.5px solid rgba(${r},${g},${b},0.4)`,
            }
          } catch {
            return { backgroundColor: stageColor, color: stageTextColor }
          }
        })()}
      >
        {currentStage}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute z-50 min-w-[200px] rounded-lg border bg-popover shadow-lg py-1",
            flipUp ? "bottom-full mb-1" : "top-full mt-1",
            "left-0"
          )}
        >
          {stages
            .filter((s) => !s.name.toLowerCase().includes("archive"))
            .map((stage) => (
              <button
                key={stage.name}
                onClick={() => handleSelect(stage.name)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-accent transition-colors",
                  stage.name === currentStage && "font-medium"
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span style={{ color: stage.name === currentStage ? stage.color : undefined }}>
                  {stage.name}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
