"use client";
import { useEffect } from "react";
import { useSettingsModal } from "@/context/settings-modal-context";
import { useDealContext } from "@/lib/deal-context";
import { X, Palette, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

import PreferencesContent from "@/app/(dashboard)/settings/preferences/page";
import ConfigurationContent from "@/app/(dashboard)/settings/configuration/page";

const nav = [
  {
    section: "Account",
    items: [
      { id: "preferences" as const, label: "Preferences", icon: Palette },
    ],
  },
  {
    section: "Admin",
    items: [
      { id: "configuration" as const, label: "Configuration", icon: Settings2 },
    ],
  },
];

export function SettingsModal() {
  const { open, activePanel, closeSettings, setPanel } = useSettingsModal();
  const { currentAgent } = useDealContext();
  const isAdmin = currentAgent?.role === "admin";

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSettings();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, closeSettings]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — light blur, subtle dark */}
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
        onClick={closeSettings}
      />

      {/* Modal — compact, 90% transparent glass */}
      <div className="fixed inset-x-8 inset-y-6 z-50 rounded-2xl border border-border/60 shadow-2xl flex overflow-hidden bg-background/65 backdrop-blur-xl">

        {/* Left nav — transparent, no sidebar color */}
        <aside className="w-[180px] shrink-0 border-r border-border/40 flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
            <span className="text-[13px] font-semibold text-foreground">Settings</span>
            <button
              onClick={closeSettings}
              className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 p-2 space-y-4 overflow-y-auto">
            {nav.filter(section => section.section !== "Admin" || isAdmin).map((section) => (
              <div key={section.section}>
                <div className="px-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    {section.section}
                  </span>
                </div>
                <nav className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePanel === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setPanel(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[12px] font-medium transition-colors text-left",
                          isActive
                            ? "text-[var(--fm-amber)] bg-[var(--fm-amber)]/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        {/* Right content — transparent bg */}
        <main className="flex-1 overflow-y-auto">
          {activePanel === "preferences" && <PreferencesContent />}
          {activePanel === "configuration" && <ConfigurationContent />}
        </main>
      </div>
    </>
  );
}
