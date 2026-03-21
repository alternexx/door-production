"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { AGENT_COLORS as TOKEN_COLORS } from "@/lib/tokens";
import { Lock, Unlock, Power, X, Loader2, Plus, Search, Trash2 } from "lucide-react";

type Agent = {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  role: "admin" | "agent";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function getAgentStatus(agent: Agent): { label: string; color: string } {
  if (!agent.isActive) return { label: "Inactive", color: "bg-muted-foreground/40" };
  if (agent.clerkId.startsWith("import_")) return { label: "Invite Sent", color: "bg-amber-400" };
  return { label: "Active", color: "bg-emerald-500" };
}

// Fallback palette for names not in TOKEN_COLORS
const FALLBACK_COLORS = ["#f59e0b","#ef4444","#8b5cf6","#3b82f6","#10b981","#f97316","#ec4899","#06b6d4","#84cc16","#6366f1"];

function getAgentColor(name: string): string {
  if (TOKEN_COLORS[name]) return TOKEN_COLORS[name];
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return FALLBACK_COLORS[code % FALLBACK_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const _ROWS: string[][] = [
  ["#7f1d1d","#991b1b","#b91c1c","#dc2626","#ef4444","#f87171","#fca5a5","#fecaca","#fee2e2"],
  ["#7c2d12","#9a3412","#c2410c","#ea580c","#f97316","#fb923c","#fdba74","#fed7aa","#ffedd5"],
  ["#78350f","#92400e","#b45309","#d97706","#f59e0b","#fbbf24","#fcd34d","#fde68a","#fef9c3"],
  ["#365314","#3f6212","#4d7c0f","#65a30d","#84cc16","#a3e635","#bef264","#d9f99d","#ecfccb"],
  ["#14532d","#166534","#15803d","#16a34a","#22c55e","#4ade80","#86efac","#bbf7d0","#dcfce7"],
  ["#134e4a","#115e59","#0f766e","#0d9488","#14b8a6","#2dd4bf","#5eead4","#99f6e4","#ccfbf1"],
  ["#164e63","#155e75","#0e7490","#0891b2","#06b6d4","#22d3ee","#67e8f9","#a5f3fc","#cffafe"],
  ["#0c4a6e","#075985","#0369a1","#0284c7","#0ea5e9","#38bdf8","#7dd3fc","#bae6fd","#e0f2fe"],
  ["#1e3a8a","#1e40af","#1d4ed8","#2563eb","#3b82f6","#60a5fa","#93c5fd","#bfdbfe","#dbeafe"],
  ["#312e81","#3730a3","#4338ca","#4f46e5","#6366f1","#818cf8","#a5b4fc","#c7d2fe","#e0e7ff"],
  ["#4c1d95","#5b21b6","#6d28d9","#7c3aed","#8b5cf6","#a78bfa","#c4b5fd","#ddd6fe","#ede9fe"],
  ["#831843","#9d174d","#be185d","#db2777","#ec4899","#f472b6","#f9a8d4","#fbcfe8","#fce7f3"],
];
const PRESET_COLORS: string[] = _ROWS.flat();

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [shelfOpen, setShelfOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "agent" as "admin" | "agent" });
  const [inviteSaving, setInviteSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState<Agent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Agent | null>(null);

  // Lock/unlock inline edit
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [shaking, setShaking] = useState(false);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  // Avatar color shelf
  const [colorShelfAgentId, setColorShelfAgentId] = useState<string | null>(null);
  const [agentColors, setAgentColors] = useState<Record<string, string>>({});

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setAgents(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const stored = localStorage.getItem("door-team-agent-colors");
    if (stored) setAgentColors(JSON.parse(stored));
  }, []);

  const filtered = agents.filter((a) => {
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  async function toggleRole(agent: Agent) {
    setTogglingId(agent.id);
    const newRole = agent.role === "admin" ? "agent" : "admin";
    const res = await fetch(`/api/users/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? updated : a)));
    }
    setTogglingId(null);
  }

  async function toggleActive(agent: Agent) {
    const res = await fetch(`/api/users/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !agent.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? updated : a)));
    }
    setDeactivateConfirm(null);
  }

  async function handleDelete(agent: Agent) {
    const res = await fetch(`/api/users/${agent.id}`, { method: "DELETE" });
    if (res.ok) setAgents((prev) => prev.filter((a) => a.id !== agent.id));
    setDeleteConfirm(null);
  }

  async function saveInlineEdit(agentId: string) {
    setSavingEditId(agentId);
    const res = await fetch(`/api/users/${agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, email: editEmail }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAgents((prev) => prev.map((a) => (a.id === agentId ? updated : a)));
    }
    setSavingEditId(null);
    setLockedId(null);
  }

  function setAgentColor(agentId: string, color: string) {
    const updated = { ...agentColors, [agentId]: color };
    setAgentColors(updated);
    localStorage.setItem("door-team-agent-colors", JSON.stringify(updated));
  }

  async function handleInvite() {
    setInviteSaving(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });
    if (res.ok) {
      const newAgent = await res.json();
      setAgents((prev) => [...prev, newAgent]);
      setShelfOpen(false);
      setInviteForm({ name: "", email: "", role: "agent" });
    }
    setInviteSaving(false);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .shake { animation: shake 0.35s ease; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Team</h1>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground cursor-not-allowed opacity-60"
          >
            Agent Data
          </button>
          <button
            onClick={() => setShelfOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--fm-amber)] text-white text-sm font-medium hover:bg-[var(--fm-amber)]/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Invite Member
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fm-amber)]/30 focus:border-[var(--fm-amber)]"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="w-full border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No agents match your search
                  </td>
                </tr>
              )}
              {filtered.map((agent, idx) => {
                const avatarColor = agentColors[agent.id] || getAgentColor(agent.name);
                const isUnlocked = lockedId === agent.id;

                return (
                  <tr key={agent.id} className="border-t border-border hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-sm w-10">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-medium shrink-0 cursor-pointer"
                          style={{ backgroundColor: avatarColor }}
                          onClick={() => setColorShelfAgentId(agent.id)}
                        >
                          {getInitials(agent.name)}
                        </div>
                        {isUnlocked ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1 rounded-md border border-border bg-background text-sm w-40 focus:outline-none focus:ring-2 focus:ring-[var(--fm-amber)]/30"
                          />
                        ) : (
                          <span className={cn("text-sm font-medium", isUnlocked && shaking && "shake")}>
                            {agent.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleRole(agent)}
                        disabled={togglingId === agent.id}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors inline-flex items-center gap-1.5",
                          agent.role === "admin"
                            ? "bg-[var(--fm-amber)]/15 text-[var(--fm-amber)] hover:bg-[var(--fm-amber)]/25"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {togglingId === agent.id && <Loader2 className="h-3 w-3 animate-spin" />}
                        {agent.role === "admin" ? "Admin" : "Agent"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {isUnlocked ? (
                        <input
                          type="text"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="px-2 py-1 rounded-md border border-border bg-background text-sm w-48 focus:outline-none focus:ring-2 focus:ring-[var(--fm-amber)]/30"
                        />
                      ) : (
                        agent.email || <span className="text-muted-foreground/40 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const status = getAgentStatus(agent);
                        return (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span className={cn("h-1.5 w-1.5 rounded-full", status.color)} />
                            {status.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (isUnlocked) {
                              saveInlineEdit(agent.id);
                            } else {
                              setLockedId(agent.id);
                              setEditName(agent.name);
                              setEditEmail(agent.email || "");
                              setShaking(true);
                              setTimeout(() => setShaking(false), 400);
                            }
                          }}
                          disabled={savingEditId === agent.id}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title={isUnlocked ? "Save & Lock" : "Unlock to Edit"}
                        >
                          {savingEditId === agent.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isUnlocked ? (
                            <Unlock className="h-3.5 w-3.5" />
                          ) : (
                            <Lock className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeactivateConfirm(agent)}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            agent.isActive
                              ? "hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                              : "hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500"
                          )}
                          title={agent.isActive ? "Deactivate" : "Activate"}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        {!agent.isActive && (
                          <button
                            onClick={() => setDeleteConfirm(agent)}
                            className="p-1.5 rounded-md transition-colors hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Agent Activity Alerts */}
      <AgentActivityAlerts />

      {/* Deactivate / Activate Confirm Modal */}
      {deactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeactivateConfirm(null)} />
          <div className="relative bg-background border border-border rounded-xl shadow-xl p-6 w-[360px] space-y-4">
            <h3 className="text-[15px] font-semibold text-foreground">
              {deactivateConfirm.isActive ? "Deactivate member?" : "Activate member?"}
            </h3>
            <p className="text-[13px] text-muted-foreground">
              {deactivateConfirm.isActive
                ? `${deactivateConfirm.name} will lose access to DOOR. Their deal history will be preserved.`
                : `${deactivateConfirm.name} will regain access to DOOR.`}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDeactivateConfirm(null)}
                className="px-4 py-2 text-[13px] rounded-md border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => toggleActive(deactivateConfirm)}
                className={cn(
                  "px-4 py-2 text-[13px] rounded-md text-white font-medium transition-colors",
                  deactivateConfirm.isActive
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                )}
              >
                {deactivateConfirm.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-background border border-border rounded-xl shadow-xl p-6 w-[360px] space-y-4">
            <h3 className="text-[15px] font-semibold text-foreground">Delete member?</h3>
            <p className="text-[13px] text-muted-foreground">
              This will permanently delete <span className="font-medium text-foreground">{deleteConfirm.name}</span> from DOOR. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-[13px] rounded-md border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-[13px] rounded-md bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Shelf */}
      {shelfOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShelfOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-[280px] bg-background border-l border-border shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">Invite Member</h2>
              <button
                onClick={() => setShelfOpen(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fm-amber)]/30 focus:border-[var(--fm-amber)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fm-amber)]/30 focus:border-[var(--fm-amber)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
                <div className="flex rounded-md border border-border overflow-hidden">
                  <button
                    onClick={() => setInviteForm((f) => ({ ...f, role: "admin" }))}
                    className={cn(
                      "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                      inviteForm.role === "admin"
                        ? "bg-[var(--fm-amber)] text-white"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => setInviteForm((f) => ({ ...f, role: "agent" }))}
                    className={cn(
                      "flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-border",
                      inviteForm.role === "agent"
                        ? "bg-[var(--fm-amber)] text-white"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Agent
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <button
                onClick={handleInvite}
                disabled={inviteSaving || !inviteForm.name || !inviteForm.email}
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--fm-amber)] text-white text-sm font-medium hover:bg-[var(--fm-amber)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {inviteSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add to Team
              </button>
            </div>
          </div>
        </>
      )}

      {/* Color Shelf */}
      {colorShelfAgentId && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setColorShelfAgentId(null)} />
          <div className="fixed right-0 top-0 h-full w-[200px] bg-background border-l border-border shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-3.5 py-3 border-b">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Color
              </span>
              <button onClick={() => setColorShelfAgentId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-9 gap-1.5">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    onClick={() => { setAgentColor(colorShelfAgentId, presetColor); setColorShelfAgentId(null); }}
                    className={cn(
                      "h-5 w-5 rounded-full cursor-pointer ring-1 ring-border hover:ring-2 hover:ring-[var(--fm-amber)] transition-all",
                      agentColors[colorShelfAgentId] === presetColor && "ring-2 ring-[var(--fm-amber)]"
                    )}
                    style={{ backgroundColor: presetColor }}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-[var(--fm-amber)]" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
}

function AgentActivityAlerts() {
  const [alertEnabled, setAlertEnabled] = useState(true)
  const [threshold, setThreshold] = useState(7)

  useEffect(() => {
    setAlertEnabled(localStorage.getItem("door-config-alert-agent-inactive") !== "false")
    const stored = parseInt(localStorage.getItem("door-config-threshold-agent-inactive-days") || "7", 10)
    setThreshold(stored)
  }, [])

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80 mb-4">Activity Alerts</h2>
      <div className="rounded-xl border border-border divide-y divide-border">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-[14px] text-foreground">Flag inactive agents</p>
            <p className="text-[13px] text-muted-foreground">Highlight agents on the team page who haven't logged in past the threshold</p>
          </div>
          <Toggle
            checked={alertEnabled}
            onChange={(v) => {
              setAlertEnabled(v)
              localStorage.setItem("door-config-alert-agent-inactive", String(v))
            }}
          />
        </div>
        {alertEnabled && (
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-[14px] text-foreground">Inactivity threshold</p>
              <p className="text-[13px] text-muted-foreground">Days without login before flagging</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const v = Math.max(1, threshold - 1)
                  setThreshold(v)
                  localStorage.setItem("door-config-threshold-agent-inactive-days", String(v))
                }}
                className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors text-sm"
              >−</button>
              <span className="text-sm font-medium w-10 text-center">{threshold}d</span>
              <button
                onClick={() => {
                  const v = Math.min(30, threshold + 1)
                  setThreshold(v)
                  localStorage.setItem("door-config-threshold-agent-inactive-days", String(v))
                }}
                className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors text-sm"
              >+</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
