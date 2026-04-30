"use client";

/**
 * AdapterBadge — submittability indicator on browse cards.
 *
 * The submitter routes by `ats_kind`. Three deterministic adapters
 * (greenhouse / lever / ashby) are fast and zero-LLM; everything else
 * falls back to the universal LLM-driven agent. Surfacing this on the
 * card before approval lets the user predict cost when triaging.
 *
 * Renders nothing for null `ats_kind` — silent absence is preferable
 * to an "unknown" pill that adds visual noise without information.
 */

import type { Job } from "../../lib/supabase";

type AtsKind = NonNullable<Job["ats_kind"]>;

const DETERMINISTIC: ReadonlySet<AtsKind> = new Set<AtsKind>([
  "greenhouse",
  "lever",
  "ashby",
]);

const TOOLTIP: Record<AtsKind, string> = {
  greenhouse: "Greenhouse — deterministic adapter (fast, zero LLM)",
  lever: "Lever — deterministic adapter (fast, zero LLM)",
  ashby: "Ashby — deterministic adapter (fast, zero LLM)",
  workday: "Workday — universal agent fallback (slower, LLM-driven)",
  icims: "iCIMS — universal agent fallback (slower, LLM-driven)",
  smartrecruiters:
    "SmartRecruiters — universal agent fallback (slower, LLM-driven)",
  linkedin: "LinkedIn — universal agent fallback (slower, LLM-driven)",
  generic: "Generic — universal agent fallback (slower, LLM-driven)",
};

export function AdapterBadge({ atsKind }: { atsKind: Job["ats_kind"] }) {
  if (!atsKind) return null;
  const isDet = DETERMINISTIC.has(atsKind);
  const cls = isDet
    ? "border-emerald-800/60 bg-emerald-900/30 text-emerald-300"
    : "border-amber-800/60 bg-amber-900/30 text-amber-300";
  const label = isDet ? "det" : "agent";
  return (
    <span
      title={TOOLTIP[atsKind]}
      className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border font-mono ${cls}`}
    >
      {label}
    </span>
  );
}
