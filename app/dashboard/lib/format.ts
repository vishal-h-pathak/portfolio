/**
 * Shared formatting + normalization for the dashboard.
 *
 * jobs.score and jobs.tier are TEXT in Postgres (the hunter writes
 * strings, and tier now includes "1.5"), so every comparison must go
 * through these normalizers instead of touching the raw field.
 */

import type { Job } from "../../lib/supabase";

export const TIER_KEYS = ["1", "1.5", "2", "3"] as const;
export type TierKey = (typeof TIER_KEYS)[number];

export const TIER_LABEL: Record<string, string> = {
  "1": "Tier 1 — Neuro / neuromorphic / BCI",
  "1.5": "Tier 1.5",
  "2": "Tier 2 — Sales engineering",
  "3": "Tier 3 — Mission-driven ML/CV",
};

/** Normalize jobs.tier ("1" | 1 | "1.5" | "disqualify" | …) to a known
 *  tier key, or null for anything else (untiered / disqualify / skip). */
export function tierKey(tier: Job["tier"]): TierKey | null {
  if (tier === null || tier === undefined || tier === "") return null;
  const s = String(tier);
  return (TIER_KEYS as readonly string[]).includes(s) ? (s as TierKey) : null;
}

/** Numeric score, or null when unset/unparsable (score is text in the DB). */
export function scoreOf(score: Job["score"]): number | null {
  if (score === null || score === undefined || score === "") return null;
  const n = typeof score === "number" ? score : Number.parseFloat(String(score));
  return Number.isFinite(n) ? n : null;
}

export function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * USD cost formatter for the cost-tracker surfaces (S5). Per-call/per-run
 * spend is tiny (numeric(10,4)), so callers pass dp=4 to keep precision;
 * aggregates round to cents with the default dp=2. Non-finite input →
 * em-dash, so a run with no rolled-up cost reads as "—" rather than "$NaN".
 */
export function formatUsd(
  n: number | string | null | undefined,
  dp = 2,
): string {
  const v = typeof n === "number" ? n : Number(n);
  if (n === null || n === undefined || n === "" || !Number.isFinite(v)) {
    return "—";
  }
  return `$${v.toFixed(dp)}`;
}

export type LocationBucket = "local" | "elsewhere";

export function locationBucket(
  location: string | null | undefined,
): LocationBucket {
  if (!location) return "elsewhere";
  const l = location.toLowerCase();
  if (l.includes("atlanta") || /\bga\b/.test(l)) return "local";
  if (l.includes("remote") || l.includes("anywhere")) return "local";
  if (l.includes("hybrid")) {
    // "Hybrid" alone → local; "Hybrid - NYC" or "Hybrid, SF" → elsewhere
    const stripped = l.replace(/hybrid/g, "").replace(/[\s,\-/|()]+/g, "");
    if (stripped.length === 0) return "local";
    return "elsewhere";
  }
  return "elsewhere";
}
