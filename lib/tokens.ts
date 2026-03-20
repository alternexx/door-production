export const colors = {
  amber: "#ba7517",
  amberLight: "#fdf3e0",
  amberDim: "rgba(186,117,23,0.15)",
  surface: "#f5f5f3",
  surfaceSoft: "#fafaf8",
  sidebar: "#111111",
  text: "#1a1a18",
  textSecondary: "#888780",
  border: "rgba(0,0,0,0.12)",
  dark: {
    bg: "#1a1a18",
    surface: "#242422",
    surface2: "#2e2e2b",
    border: "rgba(255,255,255,0.08)",
    text: "#f0ede8",
    textSecondary: "#9e9b94",
  },
} as const

export const DEAL_TYPES = [
  { key: "rentals", label: "Rentals", icon: "home" },
  { key: "sellers", label: "Sellers", icon: "tag" },
  { key: "buyers", label: "Buyers", icon: "users" },
  { key: "applications", label: "Applications", icon: "file-text" },
  { key: "tenant-rep", label: "Tenant Rep", icon: "briefcase" },
] as const

export type DealTypeKey = (typeof DEAL_TYPES)[number]["key"]

export const AGENT_COLORS: Record<string, string> = {
  Jack: "#3b82f6",
  James: "#8b5cf6",
  Kevin: "#14b8a6",
  Emmanuel: "#f97316",
  Judah: "#eab308",
  Dioris: "#ec4899",
  Mayra: "#ef4444",
  Mark: "#22c55e",
  Alexandra: "#6366f1",
}

export const BOROUGHS = [
  "Brooklyn",
  "Queens",
  "Manhattan",
  "Bronx",
  "Staten Island",
] as const
