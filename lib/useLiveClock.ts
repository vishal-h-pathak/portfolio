"use client";

import { useEffect, useState } from "react";

/**
 * EDT live clock, "HH:mm EDT" 24-hour, updated every 30s.
 * SSR-safe: returns a placeholder until the first client render to avoid hydration mismatch.
 */
export function useLiveClock(): string {
  const [text, setText] = useState<string>("--:-- EDT");

  useEffect(() => {
    const tick = () => {
      try {
        const now = new Date();
        const formatted = now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/New_York",
        });
        setText(`${formatted} EDT`);
      } catch {
        // toLocaleTimeString failures fall through silently — placeholder stays.
      }
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return text;
}
