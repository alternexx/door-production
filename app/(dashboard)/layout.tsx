"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider, useSidebar } from "@/context/sidebar-context";
import { SettingsModalProvider } from "@/context/settings-modal-context";
import { SettingsModal } from "@/components/settings/settings-modal";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import usePresencePing from "@/lib/hooks/use-presence-ping";

function PresencePing() {
  usePresencePing();
  return null;
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <>
      <Sidebar />
      <main
        className="h-full overflow-hidden transition-all duration-200"
        style={{ paddingLeft: collapsed ? 0 : 192 }}
      >
        {children}
      </main>
      <SettingsModal />
    </>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.unauthorized) router.replace("/sign-in");
        if (data.needsSetup) router.replace("/who-are-you");
      })
      .catch(() => {});
  }, [router]);

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SettingsModalProvider>
        <SidebarProvider>
          <div className="h-full overflow-hidden bg-background">
            <PresencePing />
            <DashboardContent>{children}</DashboardContent>
          </div>
        </SidebarProvider>
      </SettingsModalProvider>
    </AuthGuard>
  );
}
