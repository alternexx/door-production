"use client"

import { cn } from "@/lib/utils"

interface StageBadgeProps {
  stage: string
  color?: string
  textColor?: string
  className?: string
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

// Determine if a hex color is "light" (pastel) — bump opacity for light colors
function isLight(hex: string): boolean {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 180
  } catch { return false }
}

export function StageBadge({
  stage,
  color = "#ba7517",
  className,
}: StageBadgeProps) {
  // Pastels get more opacity to stay readable; vivid colors stay subtle
  const bgOpacity = isLight(color) ? 0.3 : 0.15
  const borderOpacity = isLight(color) ? 0.5 : 0.4

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap",
        className
      )}
      style={{
        backgroundColor: hexToRgba(color, bgOpacity),
        color: color,
        border: `0.5px solid ${hexToRgba(color, borderOpacity)}`,
      }}
    >
      {stage}
    </span>
  )
}

export const StageBadgeDark = StageBadge
