/**
 * Lifecycle tones — the register's four-tone status language.
 *
 * Every job status (and run status) maps to exactly one of four tones,
 * matching the notebook's accent semantics:
 *
 *   live       green — positive / system working / done well
 *   attention  amber — a human needs to act
 *   failed     red   — something broke
 *   dim        ink   — quiet (new) or terminal (skipped/ignored/expired)
 *
 * This file is the single source of truth; the visual classes live in
 * components/JobBadges.tsx. No other file may key colors off a status.
 */

import type { JobStatus } from "../../lib/supabase";

export type Tone = "live" | "attention" | "failed" | "dim";

export function statusTone(status: JobStatus | null | undefined): Tone {
  switch (status ?? "new") {
    case "approved":
    case "preparing":
    case "prefilling":
    case "submitting": // legacy in-flight
    case "applied":
    case "submitted": // legacy terminal-positive
      return "live";

    case "ready_for_review":
    case "awaiting_human_submit":
    case "ready_to_submit": // legacy alias
    case "submit_confirmed": // legacy alias
    case "needs_review": // legacy alias
      return "attention";

    case "failed":
      return "failed";

    default: // new, discovered, skipped, expired, ignored
      return "dim";
  }
}

/** Statuses where the system is actively working — badges pulse. */
export function isInFlight(status: JobStatus | null | undefined): boolean {
  const s = status ?? "new";
  return s === "preparing" || s === "prefilling" || s === "submitting";
}

/** Terminal muted states — dashed border, row fades. */
export function isTerminalMuted(status: JobStatus | null | undefined): boolean {
  const s = status ?? "new";
  return s === "skipped" || s === "ignored" || s === "expired";
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

export const STATUS_LABEL: Record<string, string> = {
  discovered: "discovered",
  new: "new",
  approved: "approved",
  preparing: "preparing",
  ready_for_review: "review ready",
  prefilling: "pre-filling",
  awaiting_human_submit: "awaiting submit",
  applied: "applied",
  failed: "failed",
  skipped: "skipped",
  expired: "expired",
  ignored: "ignored",
  // Legacy aliases (read-only post-migration 007)
  ready_to_submit: "ready (legacy)",
  submit_confirmed: "confirmed (legacy)",
  submitting: "submitting (legacy)",
  needs_review: "needs review (legacy)",
  submitted: "submitted (legacy)",
};

/** CSS variable for tone-keyed inline accents (card stripes, chart bars).
 *  `dim` returns null — quiet rows carry no stripe. */
export function toneStripeVar(tone: Tone): string | null {
  switch (tone) {
    case "live":
      return "var(--green)";
    case "attention":
      return "var(--amber)";
    case "failed":
      return "var(--red)";
    case "dim":
      return null;
  }
}
