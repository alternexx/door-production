"use client";
import { createContext, useContext, useState } from "react";

type SettingsPanel = "preferences" | "notifications" | "connections" | "configuration" | "team";

interface SettingsModalContextValue {
  open: boolean;
  activePanel: SettingsPanel;
  openSettings: (panel?: SettingsPanel) => void;
  closeSettings: () => void;
  setPanel: (panel: SettingsPanel) => void;
}

const SettingsModalContext = createContext<SettingsModalContextValue>({
  open: false,
  activePanel: "preferences",
  openSettings: () => {},
  closeSettings: () => {},
  setPanel: () => {},
});

export function SettingsModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<SettingsPanel>("preferences");
  return (
    <SettingsModalContext.Provider value={{
      open,
      activePanel,
      openSettings: (panel = "preferences") => { setActivePanel(panel); setOpen(true); },
      closeSettings: () => setOpen(false),
      setPanel: setActivePanel,
    }}>
      {children}
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  return useContext(SettingsModalContext);
}
