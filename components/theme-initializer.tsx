"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    const stored = localStorage.getItem("door-theme");
    const root = document.documentElement;

    if (stored === "dark") {
      root.classList.add("dark");
    } else if (stored === "light") {
      root.classList.remove("dark");
    } else {
      // System preference
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, []);

  return null;
}
