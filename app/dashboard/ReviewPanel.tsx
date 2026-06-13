"use client";

import { useState } from "react";
import type { Job, JobStatus } from "../lib/supabase";
import { Btn } from "./components/Button";
import { Pill } from "./components/JobBadges";

type ResumeTailoring = {
  tailored_summary?: string;
  emphasis_areas?: string[];
  keywords_to_include?: string[];
  experience_order?: string[];
  diff_notes?: string;
};

// Soft warning for ghost / re-posted / generic listings. Never gates
// approval — Vishal still decides. Empty when the scorer didn't emit one.
function LegitimacyPill({
  legitimacy,
  reasoning,
}: {
  legitimacy: Job["legitimacy"];
  reasoning: string | null;
}) {
  if (!legitimacy) return null;
  const tone =
    legitimacy === "high_confidence"
      ? ("live" as const)
      : legitimacy === "proceed_with_caution"
        ? ("attention" as const)
        : ("failed" as const);
  const labels: Record<NonNullable<Job["legitimacy"]>, string> = {
    high_confidence: "legitimacy: high confidence",
    proceed_with_caution: "legitimacy: proceed with caution",
    suspicious: "legitimacy: suspicious",
  };
  return (
    <div className="space-y-1">
      <Pill tone={tone} title={reasoning ?? undefined}>
        {labels[legitimacy]}
      </Pill>
      {reasoning && (
        <p className="text-[11px] leading-relaxed text-ink-dim">{reasoning}</p>
      )}
    </div>
  );
}

function parseResumeTailoring(raw: string | null): ResumeTailoring | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ResumeTailoring;
  } catch {
    return null;
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
      {children}
    </div>
  );
}

export default function ReviewPanel({
  job,
  onClose,
  onUpdateStatus,
}: {
  job: Job;
  onClose: () => void;
  onUpdateStatus: (job: Job, status: JobStatus) => void;
}) {
  const [copied, setCopied] = useState(false);
  const resume = parseResumeTailoring(job.resume_path);

  function handleCopy() {
    if (!job.cover_letter_path) return;
    navigator.clipboard.writeText(job.cover_letter_path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleConfirm() {
    onUpdateStatus(job, "submit_confirmed");
    onClose();
  }

  function handleBackToNew() {
    onUpdateStatus(job, "new");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col border-l border-rule bg-bg-raised sm:max-w-lg"
      >
        {/* Header */}
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-rule p-4">
          <div className="min-w-0">
            <div className="mb-0.5 text-[10px] uppercase tracking-[0.18em] text-amber">
              Review application
            </div>
            <h2 className="truncate text-[13px] font-medium text-ink">{job.title}</h2>
            <p className="truncate text-xs text-ink-faint">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-2 text-2xl leading-none text-ink-faint transition-colors duration-150 hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 text-xs">
          {job.legitimacy && (
            <div>
              <FieldLabel>Posting legitimacy</FieldLabel>
              <LegitimacyPill
                legitimacy={job.legitimacy}
                reasoning={job.legitimacy_reasoning}
              />
            </div>
          )}

          {job.archetype && (
            <div>
              <FieldLabel>Archetype</FieldLabel>
              <Pill tone="dim">
                {job.archetype}
                {typeof job.archetype_confidence === "number" && (
                  <span className="ml-1.5 normal-case text-ink-faint tabular-nums">
                    {job.archetype_confidence.toFixed(2)}
                  </span>
                )}
              </Pill>
            </div>
          )}

          {job.application_url && (
            <div>
              <FieldLabel>Application URL</FieldLabel>
              <a
                href={job.application_url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-[11px] text-green underline-offset-2 transition-colors duration-150 hover:underline"
              >
                {job.application_url} ↗
              </a>
            </div>
          )}

          {job.application_notes && (
            <div>
              <FieldLabel>ATS detection notes</FieldLabel>
              <p className="whitespace-pre-wrap border border-rule bg-bg p-3 text-[11px] leading-relaxed text-ink-dim">
                {job.application_notes}
              </p>
            </div>
          )}

          {job.resume_pdf_path && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <FieldLabel>Resume PDF</FieldLabel>
                <a
                  href={`/api/materials/${job.id}/resume`}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-rule px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-dim transition-colors duration-150 hover:border-amber hover:text-amber"
                >
                  open in new tab ↗
                </a>
              </div>
              <iframe
                src={`/api/materials/${job.id}/resume`}
                title="Resume PDF"
                className="h-[600px] w-full border border-rule bg-bg"
              />
            </div>
          )}

          {job.cover_letter_pdf_path && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <FieldLabel>Cover letter PDF</FieldLabel>
                <a
                  href={`/api/materials/${job.id}/cover_letter`}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-rule px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-dim transition-colors duration-150 hover:border-amber hover:text-amber"
                >
                  open in new tab ↗
                </a>
              </div>
              <iframe
                src={`/api/materials/${job.id}/cover_letter`}
                title="Cover Letter PDF"
                className="h-[600px] w-full border border-rule bg-bg"
              />
            </div>
          )}

          {/* Cover Letter Text (for copy/paste into forms) */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <FieldLabel>Cover letter text</FieldLabel>
              {job.cover_letter_path && (
                <button
                  onClick={handleCopy}
                  className="border border-rule px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-dim transition-colors duration-150 hover:border-amber hover:text-amber"
                >
                  {copied ? "copied" : "copy"}
                </button>
              )}
            </div>
            {job.cover_letter_path ? (
              <div className="max-h-80 overflow-y-auto whitespace-pre-wrap border border-rule bg-bg p-4 leading-relaxed text-ink-dim">
                {job.cover_letter_path}
              </div>
            ) : (
              <p className="text-[11px] italic text-ink-faint">
                No cover letter available.
              </p>
            )}
          </div>

          {/* Resume Tailoring */}
          {resume ? (
            <div className="space-y-4">
              <FieldLabel>Resume tailoring</FieldLabel>

              {resume.tailored_summary && (
                <div>
                  <div className="mb-1 text-[11px] font-medium text-ink-dim">
                    Tailored professional summary
                  </div>
                  <p className="whitespace-pre-wrap border border-rule bg-bg p-3 leading-relaxed text-ink-dim">
                    {resume.tailored_summary}
                  </p>
                </div>
              )}

              {resume.emphasis_areas && resume.emphasis_areas.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-medium text-ink-dim">
                    Emphasis areas
                  </div>
                  <ul className="list-inside list-disc space-y-0.5 text-[11px] text-ink-dim">
                    {resume.emphasis_areas.map((area, i) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {resume.keywords_to_include &&
                resume.keywords_to_include.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-ink-dim">
                      Keywords to include
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.keywords_to_include.map((kw, i) => (
                        <Pill key={i} tone="attention">
                          {kw}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )}

              {resume.experience_order && resume.experience_order.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-medium text-ink-dim">
                    Suggested experience order
                  </div>
                  <ol className="list-inside list-decimal space-y-0.5 text-[11px] text-ink-dim">
                    {resume.experience_order.map((exp, i) => (
                      <li key={i}>{exp}</li>
                    ))}
                  </ol>
                </div>
              )}

              {resume.diff_notes && (
                <div>
                  <div className="mb-1 text-[11px] font-medium text-ink-dim">
                    What changed &amp; why
                  </div>
                  <p className="whitespace-pre-wrap border border-rule bg-bg p-3 text-[11px] leading-relaxed text-ink-dim">
                    {resume.diff_notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <FieldLabel>Resume tailoring</FieldLabel>
              <p className="text-[11px] italic text-ink-faint">
                No resume tailoring data available.
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 gap-2 border-t border-rule p-4">
          <Btn size="md" variant="secondary" className="flex-1" onClick={handleBackToNew}>
            back to new
          </Btn>
          <Btn size="md" variant="approve" className="flex-1" onClick={handleConfirm}>
            confirm submit
          </Btn>
        </div>
      </aside>
    </div>
  );
}
