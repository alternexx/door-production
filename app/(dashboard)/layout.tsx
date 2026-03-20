"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider, useSidebar } from "@/context/sidebar-context";
import { SettingsModalProvider } from "@/context/settings-modal-context";
import { SettingsModal } from "@/components/settings/settings-modal";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <>
      <Sidebar />
      <main
        className="h-full overflow-hidden transition-all duration-200"
        style={{ paddingLeft: collapsed ? 0 : 220 }}
      >
        {children}
      </main>
      <SettingsModal />
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsModalProvider>
      <SidebarProvider>
        <div className="h-full overflow-hidden bg-background">
          <DashboardContent>{children}</DashboardContent>
        </div>
      </SidebarProvider>
    </SettingsModalProvider>
  );
}
