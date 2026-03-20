"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

const NOTIFICATION_KEYS = [
  // Deal activity
  { key: "door-notif-deal-updated",    section: "Deal Activity",  label: "Deal updated",              description: "Someone updates a deal you're assigned to" },
  { key: "door-notif-deal-stage",      section: "Deal Activity",  label: "Stage changed",             description: "A deal you're on moves to a new stage" },
  { key: "door-notif-deal-comment",    section: "Deal Activity",  label: "Comment on your deal",      description: "Someone leaves a comment on a deal you're assigned to" },
  // Showings
  { key: "door-notif-showing-reminder",  section: "Showings",    label: "Showing reminder",          description: "Reminder before an upcoming showing on your deal" },
  // Team
  { key: "door-notif-team-announcement", section: "Team",        label: "New announcement",          description: "An announcement is posted by the team" },
  { key: "door-notif-team-added",        section: "Team",        label: "Added to a deal",           description: "You're added as an agent on a deal" },
  // Alerts
  { key: "door-notif-alert-stale",       section: "Alerts",      label: "Deal goes stale",           description: "One of your deals hasn't been updated past the stale threshold" },
] as const;

type NotifKey = typeof NOTIFICATION_KEYS[number]["key"];
const SECTIONS = ["Deal Activity", "Showings", "Team", "Alerts"] as const;

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--fm-amber)] focus:ring-offset-2 focus:ring-offset-background ${
        checked ? "bg-[var(--fm-amber)]" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function NotificationsPage() {
  const [mounted, setMounted] = useState(false);
  const [values, setValues] = useState<Record<NotifKey, boolean>>(() => {
    const defaults = {} as Record<NotifKey, boolean>;
    for (const n of NOTIFICATION_KEYS) defaults[n.key] = true;
    return defaults;
  });

  useEffect(() => {
    setMounted(true);
    const loaded = {} as Record<NotifKey, boolean>;
    for (const n of NOTIFICATION_KEYS) {
      const stored = localStorage.getItem(n.key);
      loaded[n.key] = stored === null ? true : stored === "true";
    }
    setValues(loaded);
  }, []);

  const handleChange = (key: NotifKey, value: boolean) => {
    setValues(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(key, String(value));
  };

  if (!mounted) return (
    <div className="max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Notifications</h1>
    </div>
  );

  return (
    <div className="max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Notifications</h1>

      {SECTIONS.map((section, si) => {
        const items = NOTIFICATION_KEYS.filter(n => n.section === section);
        return (
          <section key={section} className="mb-10">
            {si > 0 && <div className="border-t border-border mb-8" />}
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80 mb-4">
              {section}
            </h2>
            <div className="space-y-1">
              {items.map(n => (
                <div key={n.key} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-[14px] text-foreground">{n.label}</p>
                    <p className="text-[13px] text-muted-foreground">{n.description}</p>
                  </div>
                  <Toggle
                    checked={values[n.key]}
                    onChange={(v) => handleChange(n.key, v)}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
