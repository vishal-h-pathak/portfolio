/**
 * Lifecycle tones — semantic palette for status-keyed UI surfaces.
 *
 * Maps every JobStatus into one of six tones. A tone is a single
 * abstract concept (info / warn / ok / danger / muted / inflight); the
 * visual classes live in the consumers (e.g. the BrowseCard stripe
 * uses TONE_HEX inline; tone-keyed Tailwind classes live in Button).
 * This is the single source-of-truth so every status-keyed surface
 * across the dashboard speaks the same colour language.
 */

import type { JobStatus } from "../../lib/supabase";

export type Tone = "info" | "warn" | "ok" | "danger" | "muted" | "inflight";

/** Map status -> tone. `null` means "no stripe / no accent". */
export function statusTone(status: JobStatus | null | undefined): Tone | null {
  switch (status ?? "new") {
    case "new":
    case "discovered":
      return null;

    case "approved":
      return "info";
    case "preparing":
    case "prefilling":
      return "inflight";

    case "ready_for_review":
    case "awaiting_human_submit":
    case "ready_to_submit":
    case "needs_review":
      return "warn";

    case "submit_confirmed":
    case "submitting":
      return "inflight";

    case "applied":
    case "submitted":
      return "ok";

    case "failed":
      return "danger";

    case "skipped":
    case "expired":
    case "ignored":
      return "muted";
  }
}

/** A row needs the user's attention right now. Used by the browse view's
 *  "Action needed" section and the global nav badge. */
export function isActionNeeded(status: JobStatus | null | undefined): boolean {
  const s = status ?? "new";
  return (
    s === "ready_for_review" ||
    s === "awaiting_human_submit" ||
    s === "failed" ||
    s === "needs_review" // legacy alias still in flight on stragglers
  );
}

/** Hex value for the 3px left-edge stripe on browse cards. Mirrors the
 *  inline-style pattern KpiTile uses on the insights page. Returns null
 *  when the tone is null — render no stripe in that case. */
export function toneStripeHex(tone: Tone | null): string | null {
  if (!tone) return null;
  return TONE_HEX[tone];
}

const TONE_HEX: Record<Tone, string> = {
  info: "#0ea5e9", // sky-500
  warn: "#f59e0b", // amber-500
  ok: "#10b981", // emerald-500
  danger: "#ef4444", // red-500
  muted: "#404040", // neutral-700
  inflight: "#a855f7", // violet-500
};
