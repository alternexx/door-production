"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Home,
  Building2,
  Users,
  ShoppingCart,
  FileText,
  Handshake,
  Menu,
  X,
  Settings,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import { useSidebar } from "@/context/sidebar-context";
import { useSettingsModal } from "@/context/settings-modal-context";
import { UserButton, useUser } from "@clerk/nextjs";

const pipelineItems = [
  { label: "Rentals", href: "/pipeline/rentals", icon: Home },
  { label: "Buyers", href: "/pipeline/buyers", icon: ShoppingCart },
  { label: "Sellers", href: "/pipeline/sellers", icon: Home },
  { label: "Applications", href: "/pipeline/applications", icon: FileText },
  { label: "Tenant Rep", href: "/pipeline/tenant-rep", icon: Handshake },
];

const dataItems = [
  { label: "Buildings", href: "/buildings", icon: Building2 },
  // { label: "Landlords", href: "/landlords", icon: Users }, // temporarily hidden
  // { label: "Contacts", href: "/contacts", icon: Users }, // temporarily hidden
];

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center rounded-md text-[13px] font-medium transition-colors",
        collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
        isActive
          ? "text-[var(--fm-amber)] bg-[var(--sidebar-accent)] border-l-2 border-[var(--fm-amber)]"
          : "text-[var(--fm-text-secondary)] hover:text-[var(--fm-text)] hover:bg-black/5 dark:hover:bg-white/5"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const { collapsed, setCollapsed } = useSidebar();
  const { openSettings } = useSettingsModal();

  const { user } = useUser();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // When collapsed, hovering near left edge peeks the sidebar open
  const effectiveCollapsed = collapsed && !peeking;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      {/* Logo + collapse toggle */}
      <div className={cn(
        "flex items-center py-5 transition-all duration-200",
        effectiveCollapsed ? "justify-center px-0" : "px-4 justify-between"
      )}>
        {!effectiveCollapsed && (
          <Link href="/pipeline/rentals" className="flex flex-col items-start gap-0">
            <img src="/fm-logo.png" alt="FM" className="h-7 w-auto object-contain" />
          </Link>
        )}
        <button
          onClick={() => { setCollapsed(!collapsed); setPeeking(false); }}
          className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-[var(--fm-text-secondary)] hover:text-[var(--sidebar-foreground)] transition-colors shrink-0 hidden lg:block"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        <button
          className="lg:hidden text-[var(--fm-text-secondary)] hover:text-[var(--sidebar-foreground)]"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        <NavItem
          href="/dashboard"
          label="Dashboard"
          icon={LayoutDashboard}
          isActive={isActive("/dashboard")}
          collapsed={effectiveCollapsed}
          onClick={() => setMobileOpen(false)}
        />

        {!effectiveCollapsed && (
          <div className="px-3 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fm-text-secondary)]/60">
              Pipeline
            </span>
          </div>
        )}

        {pipelineItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isActive(item.href)}
            collapsed={effectiveCollapsed}
            onClick={() => setMobileOpen(false)}
          />
        ))}

        {!effectiveCollapsed && (
          <div className="px-3 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fm-text-secondary)]/60">
              Data
            </span>
          </div>
        )}

        {dataItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isActive(item.href)}
            collapsed={effectiveCollapsed}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-2 space-y-0.5">
        <button
          onClick={() => { openSettings(); setMobileOpen(false); setPeeking(false); }}
          title={effectiveCollapsed ? "Settings" : undefined}
          className={cn(
            "w-full flex items-center rounded-md text-[13px] font-medium transition-colors",
            effectiveCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
            isActive("/settings")
              ? "text-[var(--fm-amber)] bg-[var(--sidebar-accent)] border-l-2 border-[var(--fm-amber)]"
              : "text-[var(--fm-text-secondary)] hover:text-[var(--fm-text)] hover:bg-black/5 dark:hover:bg-white/5"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!effectiveCollapsed && "Settings"}
        </button>
        <div className={cn(
          "flex items-center rounded-md text-[13px] font-medium text-[var(--fm-text-secondary)]/50 cursor-not-allowed",
          effectiveCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
        )}>
          <HelpCircle className="h-4 w-4 shrink-0" />
          {!effectiveCollapsed && "Help"}
        </div>
      </div>

      {/* User */}
      <div className={cn(
        "py-3 border-t border-[var(--sidebar-border)] flex items-center gap-3",
        effectiveCollapsed ? "justify-center px-0" : "px-4"
      )}>
        <UserButton />
        {!effectiveCollapsed && (
          <span className="text-[13px] text-[var(--fm-text-secondary)] truncate">
            {user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? "Account"}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg bg-[var(--sidebar)] p-2 text-[var(--sidebar-foreground)] shadow-lg"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-[192px] transform transition-transform lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:fixed lg:inset-y-0 lg:flex overflow-hidden transition-all duration-200 z-30"
        style={{ width: effectiveCollapsed ? 0 : 192 }}
        onMouseEnter={() => { if (collapsed) setPeeking(true); }}
        onMouseLeave={() => { if (collapsed) setPeeking(false); }}
      >
        {sidebarContent}
      </aside>

      {/* Hover zone: thin invisible strip on the left edge when fully collapsed */}
      {collapsed && !peeking && (
        <div
          className="fixed left-0 top-0 h-full w-2 z-20 hidden lg:block"
          onMouseEnter={() => setPeeking(true)}
        />
      )}
    </>
  );
}
