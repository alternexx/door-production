"use client";

import { useEffect } from "react";

export default function usePresencePing() {
  useEffect(() => {
    const ping = () => fetch("/api/users/ping", { method: "POST" }).catch(() => {});
    ping();
    const id = setInterval(ping, 30_000);
    return () => clearInterval(id);
  }, []);
}
