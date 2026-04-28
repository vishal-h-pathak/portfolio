"use client";

/**
 * /dashboard/review/[job_id] — M-6 manual-submission cockpit.
 *
 * The dashboard's source of truth for whether a job got submitted is the
 * "Mark Applied" click here. The system never auto-applies — the
 * orchestrator (M-5) leaves a visible browser open on the user's local
 * machine; the user reviews, clicks Submit themselves, then comes back
 * here and clicks Mark Applied.
 *
 * Sections:
 *   - Header (title / company / score / tier / archetype pill / legitimacy pill)
 *   - Status banner (per-state message describing what to do next)
 *   - Materials accordions (resume PDF, cover letter PDF + text, form-answer
 *     drafts with copy buttons)
 *   - Pre-fill screenshot (when status >= awaiting_human_submit and
 *     prefill_screenshot_path is set)
 *   - Match Agent panel (J-11 — unchanged by this refactor)
 *   - Action bar: Pre-fill Form, Mark Applied (modal with notes),
 *     Open Application Manually, Skip, Mark Failed
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  supabase,
  type FormAnswers,
  type FormAnswerQuestion,
  type Job,
  type JobStatus,
} from "../../../lib/supabase";
import MatchAgent from "../../MatchAgent";

// ── Status banner copy ─────────────────────────────────────────────────────

const STATUS_BANNER: Partial<
  Record<
    JobStatus,
    { tone: "info" | "warn" | "ok" | "danger"; message: string }
  >
> = {
  ready_for_review: {
    tone: "info",
    message:
      "Tailored materials are ready. Review the resume, cover letter, " +
      "and form-answer drafts. When ready, click Pre-fill Form.",
  },
  prefilling: {
    tone: "warn",
    message:
      "Pre-fill in progress. Wait for the browser window to open on " +
      "your local machine, then return here to mark applied.",
  },
  awaiting_human_submit: {
    tone: "warn",
    message:
      "Form pre-filled in your browser. Review what was typed, fix " +
      "any errors, click Submit. Then come back and click Mark Applied below.",
  },
  applied: { tone: "ok", message: "Marked applied." },
  failed: {
    tone: "danger",
    message:
      "Pre-fill failed. See screenshot below if available. Retry, " +
      "fall back to manual, or mark skipped.",
  },
  skipped: { tone: "info", message: "Skipped." },
};

const TONE_STYLES: Record<"info" | "warn" | "ok" | "danger", string> = {
  info: "border-neutral-700 bg-neutral-900/60 text-neutral-200",
  warn: "border-amber-800/60 bg-amber-950/30 text-amber-200",
  ok: "border-emerald-800/60 bg-emerald-950/30 text-emerald-200",
  danger: "border-red-800/60 bg-red-950/30 text-red-200",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function LegitimacyPill({ job }: { job: Job }) {
  if (!job.legitimacy) return null;
  const styles: Record<NonNullable<Job["legitimacy"]>, string> = {
    high_confidence:
      "border-emerald-800/60 bg-emerald-900/30 text-emerald-300",
    proceed_with_caution:
      "border-amber-800/60 bg-amber-900/30 text-amber-300",
    suspicious: "border-red-800/60 bg-red-900/30 text-red-300",
  };
  const labels: Record<NonNullable<Job["legitimacy"]>, string> = {
    high_confidence: "legit: high confidence",
    proceed_with_caution: "legit: proceed with caution",
    suspicious: "legit: suspicious",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-widest ${styles[job.legitimacy]}`}
      title={job.legitimacy_reasoning ?? undefined}
    >
      {labels[job.legitimacy]}
    </span>
  );
}

// ── Form-answer drafts panel ───────────────────────────────────────────────

const IDENTITY_FIELD_KEYS: Array<{ key: keyof FormAnswers; label: string }> = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "full_name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "linkedin_url", label: "LinkedIn URL" },
  { key: "github_url", label: "GitHub URL" },
  { key: "portfolio_url", label: "Portfolio URL" },
  { key: "current_location", label: "Current Location" },
  { key: "willing_to_relocate", label: "Willing to Relocate" },
  { key: "remote_preference", label: "Remote Preference" },
  { key: "salary_expectation", label: "Salary Expectation" },
  { key: "work_authorization", label: "Work Authorization" },
  { key: "notice_period", label: "Notice Period" },
  { key: "availability_to_start", label: "Availability" },
  { key: "current_company", label: "Current Company" },
  { key: "current_title", label: "Current Title" },
  { key: "years_of_experience", label: "Years of Experience" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          setCopied(false);
        }
      }}
      className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 hover:border-neutral-500 text-neutral-400 hover:text-neutral-100 transition shrink-0"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

function FormAnswersBlock({
  formAnswers,
}: {
  formAnswers: FormAnswers | null;
}) {
  if (!formAnswers) {
    return (
      <div className="text-sm text-neutral-500 italic">
        Form-answer drafts not generated for this score band (gated on
        score &ge; 6 in the tailoring step).
      </div>
    );
  }
  const identityRows = IDENTITY_FIELD_KEYS.map(({ key, label }) => {
    const v = formAnswers[key];
    if (v === undefined || v === null || v === "") return null;
    return { label, value: String(v) };
  }).filter(Boolean) as Array<{ label: string; value: string }>;

  const questions: FormAnswerQuestion[] =
    formAnswers.additional_questions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
          Identity / Contact / Comp (from profile.yml)
        </div>
        <div className="rounded border border-neutral-800 overflow-hidden">
          <dl className="divide-y divide-neutral-900">
            {identityRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[180px_1fr_auto] gap-3 items-center px-3 py-2"
              >
                <dt className="text-xs text-neutral-500">{row.label}</dt>
                <dd className="text-sm text-neutral-200 font-mono break-all">
                  {row.value}
                </dd>
                <CopyButton text={row.value} />
              </div>
            ))}
          </dl>
        </div>
      </div>

      {formAnswers.why_this_role && (
        <div>
          <div className="flex items-center justify-between mb-2 gap-3">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">
              Why this role
            </div>
            <CopyButton text={formAnswers.why_this_role} />
          </div>
          <p className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
            {formAnswers.why_this_role}
          </p>
        </div>
      )}

      {formAnswers.why_this_company && (
        <div>
          <div className="flex items-center justify-between mb-2 gap-3">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">
              Why this company
            </div>
            <CopyButton text={formAnswers.why_this_company} />
          </div>
          <p className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
            {formAnswers.why_this_company}
          </p>
        </div>
      )}

      {formAnswers.additional_info && (
        <div>
          <div className="flex items-center justify-between mb-2 gap-3">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">
              Additional info
            </div>
            <CopyButton text={formAnswers.additional_info} />
          </div>
          <p className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
            {formAnswers.additional_info}
          </p>
        </div>
      )}

      {questions.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
            Role-specific questions ({questions.length})
          </div>
          <ol className="space-y-3">
            {questions.map((q, i) => (
              <li
                key={i}
                className="rounded border border-neutral-800 bg-neutral-950 p-3"
              >
                <div className="text-xs text-neutral-400 font-medium mb-1">
                  Q{i + 1}: {q.question}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap flex-1">
                    {q.draft_answer}
                  </p>
                  <CopyButton text={q.draft_answer} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ── Pre-fill screenshot ────────────────────────────────────────────────────

function PrefillScreenshot({ storagePath }: { storagePath: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.storage
        .from("job-materials")
        .createSignedUrl(storagePath, 60 * 10);
      if (error || !data?.signedUrl) {
        setErr(error?.message ?? "failed to sign");
      } else {
        setSignedUrl(data.signedUrl);
      }
    })();
  }, [storagePath]);

  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-3">
        Pre-fill screenshot
      </h2>
      <div className="rounded border border-neutral-800 bg-neutral-950 p-3">
        {signedUrl ? (
          <>
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded border border-neutral-800 overflow-hidden hover:border-neutral-600"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrl}
                alt="Pre-fill screenshot"
                className="w-full max-h-[600px] object-contain bg-neutral-900"
              />
            </a>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-neutral-600">
              <span className="truncate">{storagePath}</span>
              <a
                href={signedUrl}
                download
                className="text-neutral-400 hover:text-neutral-100"
              >
                download
              </a>
            </div>
          </>
        ) : err ? (
          <div className="text-xs text-red-400/70">could not load: {err}</div>
        ) : (
          <div className="text-xs text-neutral-600">signing…</div>
        )}
      </div>
    </section>
  );
}

// ── Mark-Applied modal ─────────────────────────────────────────────────────

function MarkAppliedModal({
  jobId,
  onClose,
  onApplied,
}: {
  jobId: string | number;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/dashboard/jobs/${jobId}/mark-applied`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_notes: notes }),
      });
      if (!res.ok) {
        throw new Error((await res.text()) || `mark-applied: ${res.status}`);
      }
      onApplied();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-neutral-800 bg-neutral-950 p-5">
        <h3 className="text-lg font-medium mb-2">Mark Applied</h3>
        <p className="text-sm text-neutral-400 mb-4">
          Confirms you submitted the application yourself in the visible
          browser. Stamps <code className="font-mono">submitted_at</code> and
          (optionally) attaches notes about anything that needed manual
          fixing.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder={
            "Optional notes (e.g. 'salary field rejected $130k, " +
            "had to enter $129,999')"
          }
          className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
        />
        {err && (
          <div className="mt-2 text-xs text-red-300 break-words">{err}</div>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900 text-sm text-neutral-300 hover:border-neutral-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-3 py-1.5 rounded border border-emerald-700 bg-emerald-900/40 text-sm text-emerald-200 hover:bg-emerald-800/60 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Mark Applied"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ReviewDetailPage() {
  const params = useParams<{ job_id: string }>();
  const router = useRouter();
  const jobId = params?.job_id;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showMarkApplied, setShowMarkApplied] = useState(false);
  const [showMatchAgent, setShowMatchAgent] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function refresh() {
    if (!jobId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (error) setError(error.message);
    else if (!data) setError("Job not found");
    else {
      setJob(data as Job);
      setError(null);
    }
    setLoading(false);
  }

  async function postAction(path: string, body?: object) {
    if (!job || actionBusy) return;
    setActionBusy(path);
    setActionError(null);
    try {
      const res = await fetch(`/api/dashboard/jobs/${job.id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        throw new Error((await res.text()) || `${path}: ${res.status}`);
      }
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionBusy(null);
    }
  }

  const banner = useMemo(() => {
    const status = (job?.status ?? "new") as JobStatus;
    return STATUS_BANNER[status];
  }, [job?.status]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-neutral-500 text-sm">
        loading…
      </main>
    );
  }

  if (!job || error) {
    return (
      <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto bg-black text-neutral-100">
        <Link
          href="/dashboard/review"
          className="text-sm text-neutral-500 hover:text-neutral-200"
        >
          ← Review queue
        </Link>
        <div className="mt-6 rounded border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error ?? "Job not found"}
        </div>
      </main>
    );
  }

  const status = (job.status ?? "new") as JobStatus;
  const submissionUrl = job.submission_url || job.application_url || job.url;
  const resumePdfUrl = `/api/materials/${job.id}/resume`;
  const coverLetterPdfUrl = `/api/materials/${job.id}/cover_letter`;
  const coverLetterText = job.cover_letter_path ?? "";
  const canPrefill = status === "ready_for_review";

  return (
    <main className="min-h-screen pb-32 px-4 py-8 sm:px-8 sm:py-12 max-w-5xl mx-auto bg-black text-neutral-100">
      <Link
        href="/dashboard/review"
        className="text-xs text-neutral-500 hover:text-neutral-200"
      >
        ← Review queue
      </Link>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="mt-4 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold">{job.title}</h1>
            <p className="text-sm text-neutral-400 mt-1">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
            </p>
            {relativeTime(job.status_updated_at) && (
              <p className="text-[11px] text-neutral-600 font-mono mt-1">
                Status updated {relativeTime(job.status_updated_at)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {job.score !== null && job.score !== undefined && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                  Score
                </div>
                <div className="font-mono text-2xl text-neutral-200">
                  {job.score}/10
                </div>
              </div>
            )}
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-100 hover:border-neutral-700"
              >
                Posting ↗
              </a>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-widest">
          {job.tier && (
            <span className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-300">
              tier {job.tier}
            </span>
          )}
          {job.archetype && (
            <span
              className="px-2 py-0.5 rounded border border-violet-800/60 bg-violet-900/30 text-violet-300"
              title={
                job.archetype_confidence
                  ? `confidence ${job.archetype_confidence.toFixed(2)}`
                  : undefined
              }
            >
              {job.archetype}
            </span>
          )}
          <LegitimacyPill job={job} />
          <span className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-400 ml-auto">
            status: <span className="text-neutral-200">{status}</span>
          </span>
        </div>
      </header>

      {/* ── Status banner ───────────────────────────────────────────── */}
      {banner && (
        <section
          className={`mb-6 rounded-lg border px-4 py-3 text-sm leading-relaxed ${TONE_STYLES[banner.tone]}`}
        >
          {banner.message}
          {status === "applied" && job.submitted_at && (
            <span className="block mt-1 text-xs opacity-70 font-mono">
              submitted_at: {new Date(job.submitted_at).toISOString()}
            </span>
          )}
          {status === "failed" && job.failure_reason && (
            <span className="block mt-1 text-xs opacity-80">
              {job.failure_reason}
            </span>
          )}
        </section>
      )}

      {/* ── Materials ───────────────────────────────────────────────── */}
      <section className="mb-8 space-y-4">
        <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
          Materials
        </h2>

        <details className="rounded border border-neutral-800 bg-neutral-950 group">
          <summary className="cursor-pointer px-4 py-3 text-sm text-neutral-200 hover:bg-neutral-900/60 select-none flex items-center justify-between">
            <span>Tailored resume (PDF)</span>
            <span className="text-neutral-500 text-xs group-open:hidden">
              click to open
            </span>
          </summary>
          <div className="border-t border-neutral-900 px-4 py-3 flex items-center gap-3">
            <a
              href={resumePdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-600"
            >
              View
            </a>
            <a
              href={`${resumePdfUrl}?download=1`}
              className="text-xs px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-600"
            >
              Download
            </a>
            <span className="text-[11px] text-neutral-600 font-mono ml-auto truncate">
              {job.resume_pdf_path ?? "(no storage path)"}
            </span>
          </div>
        </details>

        <details className="rounded border border-neutral-800 bg-neutral-950 group">
          <summary className="cursor-pointer px-4 py-3 text-sm text-neutral-200 hover:bg-neutral-900/60 select-none flex items-center justify-between">
            <span>Cover letter</span>
            <span className="text-neutral-500 text-xs group-open:hidden">
              click to open
            </span>
          </summary>
          <div className="border-t border-neutral-900 px-4 py-3 space-y-3">
            <div className="flex items-center gap-3">
              <a
                href={coverLetterPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-600"
              >
                View PDF
              </a>
              {coverLetterText && <CopyButton text={coverLetterText} />}
            </div>
            {coverLetterText && (
              <pre className="rounded border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed font-mono max-h-80 overflow-y-auto">
                {coverLetterText}
              </pre>
            )}
          </div>
        </details>

        <details
          className="rounded border border-neutral-800 bg-neutral-950 group"
          open
        >
          <summary className="cursor-pointer px-4 py-3 text-sm text-neutral-200 hover:bg-neutral-900/60 select-none flex items-center justify-between">
            <span>
              Form-answer drafts
              {job.form_answers && (
                <span className="ml-2 text-[10px] uppercase tracking-widest text-neutral-500">
                  ({(job.form_answers.additional_questions ?? []).length}{" "}
                  custom Qs)
                </span>
              )}
            </span>
            <span className="text-neutral-500 text-xs group-open:hidden">
              click to open
            </span>
          </summary>
          <div className="border-t border-neutral-900 px-4 py-4">
            <FormAnswersBlock formAnswers={job.form_answers} />
          </div>
        </details>
      </section>

      {/* ── Pre-fill screenshot ─────────────────────────────────────── */}
      {job.prefill_screenshot_path && (
        <PrefillScreenshot storagePath={job.prefill_screenshot_path} />
      )}

      {/* ── Match Agent (J-11, unchanged by this refactor) ──────────── */}
      <section className="mb-8">
        <button
          onClick={() => setShowMatchAgent((v) => !v)}
          className="text-sm text-neutral-400 hover:text-neutral-100 underline-offset-4 hover:underline"
        >
          {showMatchAgent ? "Hide" : "Open"} Match Agent
          {Array.isArray(job.match_chat) && job.match_chat.length > 0 && (
            <span className="ml-2 text-[10px] uppercase tracking-widest text-emerald-300">
              {job.match_chat.length} turn(s) saved
            </span>
          )}
        </button>
        {showMatchAgent && (
          <div className="mt-3 rounded border border-neutral-800 bg-neutral-950 p-3">
            <MatchAgent job={job} onClose={() => setShowMatchAgent(false)} />
          </div>
        )}
      </section>

      {/* ── Action bar (sticky) ─────────────────────────────────────── */}
      <section className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-black/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3 flex items-center gap-2 flex-wrap">
          {actionError && (
            <div className="w-full mb-2 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300 break-words">
              {actionError}
            </div>
          )}
          <button
            onClick={() => postAction("prefill")}
            disabled={!canPrefill || actionBusy !== null}
            className="px-4 py-2 rounded border border-emerald-700 bg-emerald-900/40 text-sm text-emerald-200 hover:bg-emerald-800/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              canPrefill
                ? "Flip status to prefilling; main.py picks it up next cycle"
                : `Pre-fill is only available from ready_for_review (current: ${status})`
            }
          >
            {actionBusy === "prefill" ? "Pre-filling…" : "Pre-fill Form"}
          </button>
          <button
            onClick={() => setShowMarkApplied(true)}
            disabled={status === "applied" || actionBusy !== null}
            className="px-4 py-2 rounded border border-emerald-700 bg-emerald-900/40 text-sm text-emerald-200 hover:bg-emerald-800/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark Applied
          </button>
          {submissionUrl && (
            <a
              href={submissionUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded border border-neutral-700 bg-neutral-900 text-sm text-neutral-300 hover:border-neutral-500"
            >
              Open Application Manually ↗
            </a>
          )}
          <button
            onClick={() =>
              postAction("skip", { reason: "skipped from cockpit" })
            }
            disabled={actionBusy !== null}
            className="px-4 py-2 rounded border border-neutral-700 bg-neutral-900 text-sm text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={() =>
              postAction("mark-failed", {
                reason: "marked failed from cockpit",
              })
            }
            disabled={actionBusy !== null}
            className="px-4 py-2 rounded border border-red-800/60 bg-red-950/40 text-sm text-red-200 hover:bg-red-900/60 transition disabled:opacity-50 ml-auto"
          >
            Mark Failed
          </button>
        </div>
      </section>

      {showMarkApplied && (
        <MarkAppliedModal
          jobId={job.id}
          onClose={() => setShowMarkApplied(false)}
          onApplied={async () => {
            setShowMarkApplied(false);
            await refresh();
            // M-6: after marking applied, navigate back to the queue so the
            // user moves to the next job; they're done with this one.
            router.push("/dashboard/review");
          }}
        />
      )}
    </main>
  );
}
