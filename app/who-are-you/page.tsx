"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  name: string;
}

const COLORS = [
  "#ba7517", "#3b82f6", "#8b5cf6", "#10b981", "#f97316",
  "#06b6d4", "#ec4899", "#f59e0b", "#6366f1",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function WhoAreYouPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/users/unlinked")
      .then((r) => r.json())
      .then((data) => setAgents(data))
      .catch(() => setError("Failed to load agents"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(agentId: string) {
    setSelectedId(agentId);
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/users/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: agentId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setSelectedId(null);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong");
      setSelectedId(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#1a1a1a] p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="flex flex-col items-center gap-1">
            <img src="/fm-logo.png" alt="FM" className="h-10 w-auto object-contain" />
            <span className="text-[9px] text-gray-500 opacity-40">powered by door</span>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-white text-center mb-1">
          Who are you?
        </h1>
        <p className="text-sm text-white/40 text-center mb-6">
          Select your name to get started.
        </p>

        {error && (
          <p className="text-sm text-red-400 text-center mb-4">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#ba7517]" />
          </div>
        ) : agents.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-8">
            No available profiles. Contact your admin.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {agents.map((agent, i) => (
              <button
                key={agent.id}
                onClick={() => handleSelect(agent.id)}
                disabled={submitting}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  selectedId === agent.id
                    ? "border-[#ba7517] bg-[#ba7517]/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                >
                  {getInitials(agent.name)}
                </div>
                <span className="text-sm font-medium text-white truncate">
                  {agent.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
