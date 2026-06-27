"use client";

import { useEffect, useState } from "react";

/**
 * Auth-aware console entry for the public footer.
 *
 * The dashboard_auth cookie is httpOnly, so the browser can't read it
 * directly. Instead we probe the gated /api/console/session endpoint: a
 * 200 means middleware let us through (we're the signed-in owner), and
 * anything else (401 for visitors) keeps the link hidden. Running the
 * check client-side keeps the public homepage static/ISR — no
 * per-request cookie read forces it dynamic. Reuses the footer's
 * existing `.footer-appendix` treatment so it reads as discreet.
 */
export function ConsoleLink() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/console/session", { cache: "no-store" })
      .then((res) => {
        if (!cancelled) setAuthed(res.ok);
      })
      .catch(() => {
        // Network hiccup → leave the link hidden; nothing to surface.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!authed) return null;

  return (
    <span className="footer-appendix">
      <span className="label">OWNER</span>
      <a href="/console">console ↗</a>
    </span>
  );
}
