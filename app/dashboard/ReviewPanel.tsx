"use client";

import { useState } from "react";
import type { Job, JobStatus } from "../lib/supabase";

type ResumeTailoring = {
  tailored_summary?: string;
  emphasis_areas?: string[];
  keywords_to_include?: string[];
  experience_order?: string[];
  diff_notes?: string;
};

function parseResumeTailoring(raw: string | null): ResumeTailoring | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ResumeTailoring;
  } catch {
    return null;
  }
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
        className="w-full sm:max-w-lg h-full bg-neutral-950 border-l border-neutral-800 flex flex-col"
      >
        {/* Header */}
        <header className="p-4 border-b border-neutral-800 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-orange-400 mb-0.5">
              Review Application
            </div>
            <h2 className="font-medium text-neutral-100 truncate">{job.title}</h2>
            <p className="text-xs text-neutral-500 truncate">
              {job.company}
              {job.location ? ` \u00b7 ${job.location}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-200 text-2xl leading-none px-2"
            aria-label="Close"
          >
            &times;
          </button>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
          {/* Application URL */}
          {job.application_url && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-600 mb-1">
                Application URL
              </div>
              <a
                href={job.application_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs break-all"
              >
                {job.application_url} &#8599;
              </a>
            </div>
          )}

          {/* ATS Notes */}
          {job.application_notes && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-600 mb-1">
                ATS Detection Notes
              </div>
              <p className="text-neutral-300 text-xs leading-relaxed whitespace-pre-wrap rounded border border-neutral-800 bg-neutral-900/40 p-3">
                {job.application_notes}
              </p>
            </div>
          )}

          {/* Cover Letter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase tracking-widest text-neutral-600">
                Cover Letter
              </div>
              {job.cover_letter_path && (
                <button
                  onClick={handleCopy}
                  className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>
            {job.cover_letter_path ? (
              <div className="rounded border border-neutral-800 bg-neutral-900/40 p-4 text-neutral-200 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                {job.cover_letter_path}
              </div>
            ) : (
              <p className="text-neutral-500 text-xs italic">No cover letter available.</p>
            )}
          </div>

          {/* Resume Tailoring */}
          {resume ? (
            <div className="space-y-4">
              <div className="text-[10px] uppercase tracking-widest text-neutral-600">
                Resume Tailoring
              </div>

              {/* Tailored Summary */}
              {resume.tailored_summary && (
                <div>
                  <div className="text-[11px] font-medium text-neutral-400 mb-1">
                    Tailored Professional Summary
                  </div>
                  <p className="rounded border border-neutral-800 bg-neutral-900/40 p-3 text-neutral-200 leading-relaxed whitespace-pre-wrap">
                    {resume.tailored_summary}
                  </p>
                </div>
              )}

              {/* Emphasis Areas */}
              {resume.emphasis_areas && resume.emphasis_areas.length > 0 && (
                <div>
                  <div className="text-[11px] font-medium text-neutral-400 mb-1">
                    Emphasis Areas
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-neutral-300 text-xs">
                    {resume.emphasis_areas.map((area, i) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keywords */}
              {resume.keywords_to_include && resume.keywords_to_include.length > 0 && (
                <div>
                  <div className="text-[11px] font-medium text-neutral-400 mb-1">
                    Keywords to Include
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {resume.keywords_to_include.map((kw, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-orange-800/60 bg-orange-900/30 text-orange-300"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Order */}
              {resume.experience_order && resume.experience_order.length > 0 && (
                <div>
                  <div className="text-[11px] font-medium text-neutral-400 mb-1">
                    Suggested Experience Order
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-neutral-300 text-xs">
                    {resume.experience_order.map((exp, i) => (
                      <li key={i}>{exp}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Diff Notes */}
              {resume.diff_notes && (
                <div>
                  <div className="text-[11px] font-medium text-neutral-400 mb-1">
                    What Changed &amp; Why
                  </div>
                  <p className="rounded border border-neutral-800 bg-neutral-900/40 p-3 text-neutral-300 text-xs leading-relaxed whitespace-pre-wrap">
                    {resume.diff_notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-600 mb-1">
                Resume Tailoring
              </div>
              <p className="text-neutral-500 text-xs italic">No resume tailoring data available.</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="border-t border-neutral-800 p-4 flex gap-3 shrink-0">
          <button
            onClick={handleBackToNew}
            className="flex-1 px-4 py-2.5 text-sm rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
          >
            Back to New
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 text-sm rounded border border-emerald-700 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-medium"
          >
            Confirm Submit
          </button>
        </div>
      </aside>
    </div>
  );
}
