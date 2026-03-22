"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  name: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SetupPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/users/setup")
      .then((r) => r.json())
      .then((data) => setAgents(data.agents ?? []))
      .catch(() => setError("Failed to load agents"))
      .finally(() => setLoadingAgents(false));
  }, []);

  async function handleSelect(agentId: string) {
    setSelectedId(agentId);
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/users/setup", {
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

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualName.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/users/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: manualName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong");
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
          Welcome. Who are you?
        </h1>
        <p className="text-sm text-white/40 text-center mb-6">
          Select your name to link your account
        </p>

        {error && (
          <p className="text-sm text-red-400 text-center mb-4">{error}</p>
        )}

        {loadingAgents ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#ba7517]" />
          </div>
        ) : !showManual ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {agents.map((agent) => (
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
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ba7517] text-sm font-semibold text-white">
                    {getInitials(agent.name)}
                  </div>
                  <span className="text-sm font-medium text-white truncate">
                    {agent.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowManual(true)}
                className="text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                Not on the list?
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Your full name"
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#ba7517] focus:outline-none focus:ring-1 focus:ring-[#ba7517]"
            />

            <button
              type="submit"
              disabled={submitting || !manualName.trim()}
              className="w-full rounded-lg bg-[#ba7517] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#d4891b] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Setting up..." : "Continue"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                Back to agent list
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
