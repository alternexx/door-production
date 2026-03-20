"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type AgentDisplayMode = "initials" | "full"

interface AgentDisplayContextType {
  mode: AgentDisplayMode
  setMode: (mode: AgentDisplayMode) => void
}

const STORAGE_KEY = "fmdashboard_agent_display_mode"

const AgentDisplayContext = createContext<AgentDisplayContextType | null>(null)

export function AgentDisplayProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AgentDisplayMode>(() => {
    if (typeof window === "undefined") {
      return "initials"
    }
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "initials" || stored === "full") {
      return stored
    }
    return "initials"
  })

  const setMode = (newMode: AgentDisplayMode) => {
    setModeState(newMode)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newMode)
    }
  }

  return (
    <AgentDisplayContext.Provider value={{ mode, setMode }}>
      {children}
    </AgentDisplayContext.Provider>
  )
}

export function useAgentDisplay() {
  const context = useContext(AgentDisplayContext)
  if (!context) {
    return { mode: "initials" as AgentDisplayMode, setMode: () => {} }
  }
  return context
}
