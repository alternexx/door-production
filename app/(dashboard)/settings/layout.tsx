"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Palette, Bell, Link2, Settings2, Users } from "lucide-react";

const settingsNav = [
  {
    section: "Account",
    items: [
      { type: "profile", label: "Mark Christian Romero", avatar: "MC" },
      { type: "link", label: "Preferences", href: "/settings/preferences", icon: Palette },
      { type: "link", label: "Notifications", href: "/settings/notifications", icon: Bell },
      { type: "link", label: "Connections", href: "/settings/connections", icon: Link2 },
    ],
  },
  {
    section: "Admin",
    items: [
      { type: "link", label: "Team", href: "/settings/team", icon: Users },
      { type: "link", label: "Configuration", href: "/settings/configuration", icon: Settings2 },
    ],
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="h-full flex">
      {/* Left settings sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] overflow-y-auto">
        <div className="p-4">
          <h1 className="text-lg font-semibold text-[var(--sidebar-foreground)] mb-4">Settings</h1>
          
          {settingsNav.map((section) => (
            <div key={section.section} className="mb-6">
              <div className="px-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fm-text-secondary)]/60">
                  {section.section}
                </span>
              </div>
              <nav className="space-y-0.5">
                {section.items.map((item, idx) => {
                  if (item.type === "profile") {
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 px-2 py-2 rounded-md"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--fm-amber)] text-white text-[10px] font-medium shrink-0">
                          {item.avatar}
                        </div>
                        <span className="text-[13px] text-[var(--sidebar-foreground)] truncate">
                          {item.label}
                        </span>
                      </div>
                    );
                  }

                  const Icon = item.icon!;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href!}
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 rounded-md text-[13px] font-medium transition-colors",
                        isActive
                          ? "text-[var(--fm-amber)] bg-[var(--sidebar-accent)]"
                          : "text-[var(--fm-text-secondary)] hover:text-[var(--sidebar-foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Right content area */}
      <main className="flex-1 overflow-y-auto bg-[var(--background)]">
        {children}
      </main>
    </div>
  );
}
