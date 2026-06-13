"use client";

/**
 * Badge family — every pill on the register goes through these.
 *
 * One Pill primitive (mono, 10px, tracked, square, hairline) + the
 * semantic wrappers: StatusBadge (four lifecycle tones), TierPill
 * (1 / 1.5 / 2 / 3), LocationBadge, ConfidenceBadge, DegreeGatePill.
 * Per-status ad-hoc styling anywhere else is a bug.
 */

import type { Job, JobStatus } from "../../lib/supabase";
import {
  isInFlight,
  isTerminalMuted,
  statusTone,
  STATUS_LABEL,
  type Tone,
} from "../lib/lifecycle";
import { locationBucket, tierKey, type TierKey } from "../lib/format";

const TONE_CLASS: Record<Tone, string> = {
  live: "text-green border-green-dim",
  attention: "text-amber border-amber-dim",
  failed: "text-red border-red-dim",
  dim: "text-ink-dim border-rule",
};

export function Pill({
  tone = "dim",
  dashed,
  pulse,
  title,
  className,
  children,
}: {
  tone?: Tone;
  dashed?: boolean;
  pulse?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-1.5 border px-2 py-0.5",
        "font-mono text-[10px] uppercase tracking-[0.16em] whitespace-nowrap",
        TONE_CLASS[tone],
        dashed ? "border-dashed" : "",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {pulse && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse"
        />
      )}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: JobStatus | null }) {
  const s = status ?? "new";
  return (
    <Pill
      tone={statusTone(s)}
      pulse={isInFlight(s)}
      dashed={isTerminalMuted(s)}
    >
      {STATUS_LABEL[s] ?? s}
    </Pill>
  );
}

/** Run statuses share the same four tones. */
export function RunStatusBadge({
  status,
}: {
  status: "pending" | "running" | "completed" | "failed";
}) {
  const tone: Tone =
    status === "failed"
      ? "failed"
      : status === "running"
        ? "live"
        : status === "completed"
          ? "live"
          : "dim";
  return (
    <Pill tone={tone} pulse={status === "running"}>
      {status}
    </Pill>
  );
}

const TIER_TONE: Record<TierKey, { tone: Tone; dashed?: boolean }> = {
  "1": { tone: "live" },
  "1.5": { tone: "live", dashed: true },
  "2": { tone: "attention" },
  "3": { tone: "dim" },
};

export function TierPill({ tier }: { tier: Job["tier"] }) {
  const k = tierKey(tier);
  if (!k) return null;
  const { tone, dashed } = TIER_TONE[k];
  return (
    <Pill tone={tone} dashed={dashed} className="tabular-nums">
      T{k}
    </Pill>
  );
}

export function LocationBadge({
  location,
}: {
  location: string | null | undefined;
}) {
  const bucket = locationBucket(location);
  return (
    <Pill tone={bucket === "local" ? "live" : "dim"}>
      {bucket === "local" ? "local/remote" : "elsewhere"}
    </Pill>
  );
}

/** Tailor/submitter confidence, 0..1. Anything on the review queue is
 *  by definition < 0.8 (the auto threshold), so split inside that. */
export function ConfidenceBadge({ c }: { c: number | null | undefined }) {
  if (c === null || c === undefined) {
    return <Pill tone="dim">no score</Pill>;
  }
  const tone: Tone = c >= 0.7 ? "live" : c >= 0.55 ? "attention" : "failed";
  return (
    <Pill tone={tone} className="tabular-nums">
      {c.toFixed(2)}
    </Pill>
  );
}

/** Amber MS/PhD-gate marker — only rendered when the hunter has the
 *  degree_gated column and flagged this row. */
export function DegreeGatePill({ gated }: { gated: boolean | null | undefined }) {
  if (!gated) return null;
  return (
    <Pill tone="attention" title="Posting requires MS/PhD">
      ms/phd gate
    </Pill>
  );
}
