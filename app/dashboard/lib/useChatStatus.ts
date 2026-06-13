"use client";

/**
 * useChatStatus — client view of GET /api/chat/status.
 *
 * Returns null while resolving, then "api" | "oauth" | "disabled".
 * Callers must render NO chat UI until a non-null, non-disabled mode
 * arrives (no flash of a chat button that would then error). The result
 * is cached module-wide so every consumer on a page shares one fetch.
 */

import { useEffect, useState } from "react";

export type ChatMode = "api" | "oauth" | "disabled";

let cached: ChatMode | null = null;
let inflight: Promise<ChatMode> | null = null;

function fetchMode(): Promise<ChatMode> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch("/api/chat/status")
      .then((res) => (res.ok ? res.json() : { mode: "disabled" }))
      .then((json: { mode?: string }) => {
        cached =
          json.mode === "api" || json.mode === "oauth" ? json.mode : "disabled";
        return cached;
      })
      .catch(() => {
        // Network failure: report disabled but don't cache, so a later
        // mount can recover the chat UI.
        inflight = null;
        return "disabled" as const;
      });
  }
  return inflight;
}

export function useChatStatus(): ChatMode | null {
  const [mode, setMode] = useState<ChatMode | null>(cached);
  useEffect(() => {
    let mounted = true;
    void fetchMode().then((m) => {
      if (mounted) setMode(m);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return mode;
}
