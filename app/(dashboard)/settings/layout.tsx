"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Palette, Settings2 } from "lucide-react";
import { useEffect } from "react";
import { useDealContext } from "@/lib/deal-context";

const accountItems = [
  { type: "link", label: "Preferences", href: "/settings/preferences", icon: Palette },
];

const adminItems = [
  { type: "link", label: "Configuration", href: "/settings/configuration", icon: Settings2 },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentAgent } = useDealContext();
  const isAdmin = currentAgent?.role === "admin";
  const userName = currentAgent?.name ?? "";

  useEffect(() => {
    if (currentAgent && currentAgent.role !== "admin") {
      if (pathname === "/settings/configuration") {
        router.replace("/settings/preferences");
      }
    }
  }, [currentAgent, pathname, router]);

  return (
    <div className="h-full flex">
      {/* Left settings sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] overflow-y-auto">
        <div className="p-4">
          <h1 className="text-lg font-semibold text-[var(--sidebar-foreground)] mb-4">Settings</h1>
          
          {/* Account section */}
          <div className="mb-6">
            <div className="px-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fm-text-secondary)]/60">Account</span>
            </div>
            <nav className="space-y-0.5">
              {userName && (
                <div className="flex items-center gap-3 px-2 py-2 rounded-md">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--fm-amber)] text-white text-[10px] font-medium shrink-0">
                    {userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[13px] text-[var(--sidebar-foreground)] truncate">{userName}</span>
                </div>
              )}
              {accountItems.map((item) => {
                const Icon = item.icon!;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href!} className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-md text-[13px] font-medium transition-colors",
                    isActive ? "text-[var(--fm-amber)] bg-[var(--sidebar-accent)]" : "text-[var(--fm-text-secondary)] hover:text-[var(--sidebar-foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                  )}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Admin section — only visible to admins */}
          {isAdmin && (
            <div className="mb-6">
              <div className="px-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fm-text-secondary)]/60">Admin</span>
              </div>
              <nav className="space-y-0.5">
                {adminItems.map((item) => {
                  const Icon = item.icon!;
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href!} className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-md text-[13px] font-medium transition-colors",
                      isActive ? "text-[var(--fm-amber)] bg-[var(--sidebar-accent)]" : "text-[var(--fm-text-secondary)] hover:text-[var(--sidebar-foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                    )}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </aside>

      {/* Right content area */}
      <main className="flex-1 overflow-y-auto bg-[var(--background)]">
        {children}
      </main>
    </div>
  );
}
