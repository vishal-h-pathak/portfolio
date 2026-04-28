"use client";

/**
 * /dashboard/review/[job_id] — Review packet detail view.
 *
 * Renders everything job-submitter's review/packet.py::build_packet() stashed
 * in jobs.submission_log:
 *   - Header: title/company + confidence + adapter + attempt_n + reason
 *   - Browserbase replay link (the fastest way to actually see what happened)
 *   - Agent reasoning block (only populated by the generic_stagehand adapter)
 *   - Filled fields table with label / value / confidence / kind
 *   - Skipped fields table with label / reason (effectively-required and
 *     hard-required rows are flagged)
 *   - Screenshots (links to signed Supabase Storage URLs; fallback to raw
 *     path if signing fails)
 *   - Approve / Dismiss actions at the bottom
 *
 * Approve → POST /api/dashboard/jobs/[job_id]/approve → status transitions to
 *   `submitted` (reviewer vouched that the agent filled everything correctly
 *   and can click submit on the replay page manually, OR the reviewer intends
 *   to treat the Stagehand session as good-enough evidence of submission).
 *
 * Dismiss → POST /api/dashboard/jobs/[job_id]/dismiss → status → `ignored`.
 *   Use when the form was partial enough that re-driving from scratch via a
 *   later smoke run is the right move, or the posting just isn't worth it.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  supabase,
  type Job,
  type SubmissionPacket,
  type FilledField,
  type SkippedField,
  type PacketScreenshot,
} from "../../../lib/supabase";

// Skipped fields whose reason starts with this prefix are hard-required
// fields the classifier couldn't answer — the reviewer absolutely needs to
// see them.
const HARD_REQUIRED_PREFIX = "required custom question";
// Effectively-required, but policy-skipped (work auth, visa, etc. the
// classifier elected to skip). Less urgent but still worth a glance.
const EFFECTIVELY_REQUIRED_PREFIX = "effectively-required custom question";

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

function confidenceColor(c: number | null | undefined): string {
  if (c === null || c === undefined) return "text-neutral-500";
  if (c >= 0.7) return "text-emerald-300";
  if (c >= 0.55) return "text-amber-300";
  return "text-red-300";
}

// Posting Legitimacy pill (J-2). Renders nothing if scorer didn't emit
// a category. Tooltip shows the reasoning for a fuller explanation.
function LegitimacyPill({ job }: { job: Job }) {
  if (!job.legitimacy) return null;
  const styles: Record<NonNullable<Job["legitimacy"]>, string> = {
    high_confidence: "border-emerald-800/60 bg-emerald-900/30 text-emerald-300",
    proceed_with_caution: "border-amber-800/60 bg-amber-900/30 text-amber-300",
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

function ScreenshotRow({ shot }: { shot: PacketScreenshot }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Screenshots live in job-materials bucket alongside the resume/cover
      // PDFs; same service-role signing pattern as the /api/materials route.
      // We do this client-side against the anon key because the bucket is
      // private but the dashboard is already auth-gated by middleware — this
      // keeps the detail page a single Supabase round-trip without another
      // API route.
      const { data, error } = await supabase.storage
        .from("job-materials")
        .createSignedUrl(shot.storage_path, 60 * 10);
      if (error || !data?.signedUrl) setErr(error?.message ?? "failed to sign");
      else setSignedUrl(data.signedUrl);
    })();
  }, [shot.storage_path]);

  return (
    <li className="rounded border border-neutral-800 bg-neutral-950 p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs text-neutral-400">{shot.label}</span>
        <span className="text-[10px] font-mono text-neutral-600 truncate max-w-[50%]">
          {shot.storage_path}
        </span>
      </div>
      {signedUrl ? (
        <a
          href={signedUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded border border-neutral-800 overflow-hidden hover:border-neutral-600"
        >
          <img
            src={signedUrl}
            alt={shot.label}
            className="w-full max-h-[600px] object-contain bg-neutral-900"
          />
        </a>
      ) : err ? (
        <div className="text-xs text-red-400/70">could not load: {err}</div>
      ) : (
        <div className="text-xs text-neutral-600">signing…</div>
      )}
    </li>
  );
}

function FilledFieldsTable({ fields }: { fields: FilledField[] }) {
  if (fields.length === 0) {
    return (
      <div className="text-sm text-neutral-500 italic">
        No fields were filled on this attempt.
      </div>
    );
  }
  return (
    <div className="rounded border border-neutral-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900/80 text-[10px] uppercase tracking-widest text-neutral-500">
          <tr>
            <th className="text-left px-3 py-2 font-normal">Label</th>
            <th className="text-left px-3 py-2 font-normal">Value</th>
            <th className="text-right px-3 py-2 font-normal w-20">Conf.</th>
            <th className="text-left px-3 py-2 font-normal w-20">Kind</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => (
            <tr key={i} className="border-t border-neutral-900">
              <td className="px-3 py-2 text-neutral-200 align-top">{f.label}</td>
              <td className="px-3 py-2 text-neutral-400 align-top font-mono text-xs break-words max-w-[400px]">
                {f.value || <span className="italic text-neutral-600">(empty)</span>}
              </td>
              <td
                className={`px-3 py-2 text-right font-mono text-xs align-top ${confidenceColor(f.confidence)}`}
              >
                {f.confidence.toFixed(2)}
              </td>
              <td className="px-3 py-2 align-top">
                <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-500">
                  {f.kind}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkippedFieldsTable({ fields }: { fields: SkippedField[] }) {
  if (fields.length === 0) {
    return (
      <div className="text-sm text-neutral-500 italic">
        Nothing skipped — every field the adapter touched got a value.
      </div>
    );
  }
  return (
    <div className="rounded border border-neutral-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900/80 text-[10px] uppercase tracking-widest text-neutral-500">
          <tr>
            <th className="text-left px-3 py-2 font-normal w-[40%]">Label</th>
            <th className="text-left px-3 py-2 font-normal">Reason</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => {
            const isHard = f.reason.startsWith(HARD_REQUIRED_PREFIX);
            const isEff = f.reason.startsWith(EFFECTIVELY_REQUIRED_PREFIX);
            const severity = isHard
              ? "border-l-2 border-l-red-700"
              : isEff
              ? "border-l-2 border-l-amber-700"
              : "";
            return (
              <tr key={i} className={`border-t border-neutral-900 ${severity}`}>
                <td className="px-3 py-2 align-top">
                  <div className="text-neutral-200">{f.label}</div>
                  {isHard && (
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-red-400">
                      Blocking
                    </div>
                  )}
                  {isEff && !isHard && (
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-amber-400">
                      Effectively required
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-400 align-top break-words">
                  {f.reason}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ReviewDetailPage() {
  const params = useParams<{ job_id: string }>();
  const router = useRouter();
  const jobId = params?.job_id;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<"approve" | "dismiss" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();
      if (error) setError(error.message);
      else if (!data) setError("Job not found");
      else setJob(data as Job);
      setLoading(false);
    })();
  }, [jobId]);

  async function doAction(kind: "approve" | "dismiss") {
    if (!job || actionBusy) return;
    setActionBusy(kind);
    setActionError(null);
    try {
      const res = await fetch(`/api/dashboard/jobs/${job.id}/${kind}`, {
        method: "POST",
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `${kind} failed: ${res.status}`);
      }
      router.push("/dashboard/review");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      setActionBusy(null);
    }
  }

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
        <Link href="/dashboard/review" className="text-sm text-neutral-500 hover:text-neutral-200">
          ← Review queue
        </Link>
        <div className="mt-6 rounded border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error ?? "Job not found"}
        </div>
      </main>
    );
  }

  const packet: SubmissionPacket | null = job.submission_log ?? null;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-12 max-w-5xl mx-auto bg-black text-neutral-100">
      <Link
        href="/dashboard/review"
        className="text-xs text-neutral-500 hover:text-neutral-200"
      >
        ← Review queue
      </Link>

      <header className="mt-4 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold">{job.title}</h1>
            <p className="text-sm text-neutral-400 mt-1">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
            </p>
            {relativeTime(job.status_updated_at) && (
              <p className="text-[11px] text-neutral-600 font-mono mt-1">
                Landed in review {relativeTime(job.status_updated_at)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {packet && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                  Confidence
                </div>
                <div className={`font-mono text-2xl ${confidenceColor(packet.confidence)}`}>
                  {packet.confidence.toFixed(2)}
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

        {(packet || job.legitimacy) && (
          <div className="mt-4 flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-widest">
            {packet && (
              <>
                <span className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-400">
                  adapter: <span className="text-neutral-200">{packet.adapter}</span>
                </span>
                <span className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-400">
                  attempt {packet.attempt_n}
                </span>
                <span className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-400">
                  {packet.filled_fields.length} filled
                </span>
                <span className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-amber-300">
                  {packet.skipped_fields.length} skipped
                </span>
              </>
            )}
            <LegitimacyPill job={job} />
          </div>
        )}
      </header>

      {!packet && (
        <div className="mb-8 rounded border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          This job is in needs_review but has no submission_log packet. Either
          the submitter crashed before writing it, or the row was manually
          transitioned. Use the posting link above and decide manually.
        </div>
      )}

      {packet?.reason && (
        <section className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
            Why it needs review
          </div>
          <p className="text-sm text-neutral-200 leading-relaxed">{packet.reason}</p>
        </section>
      )}

      {packet?.browserbase_replay_url && (
        <section className="mb-8">
          <a
            href={packet.browserbase_replay_url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-violet-800/60 bg-violet-950/30 hover:bg-violet-950/60 transition p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-violet-400 mb-1">
                  Watch the agent run
                </div>
                <div className="font-medium text-violet-200">
                  Open Browserbase session replay ↗
                </div>
                <div className="text-xs text-neutral-500 mt-1 break-all">
                  {packet.browserbase_replay_url}
                </div>
              </div>
              <div className="text-violet-300 text-2xl shrink-0">▶</div>
            </div>
          </a>
          {packet.stagehand_session_id && (
            <div className="mt-2 text-[10px] font-mono text-neutral-600">
              stagehand_session_id: {packet.stagehand_session_id}
            </div>
          )}
        </section>
      )}

      {packet?.agent_reasoning && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-2">
            Agent reasoning
          </h2>
          <pre className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-xs text-neutral-300 whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-y-auto">
            {packet.agent_reasoning}
          </pre>
        </section>
      )}

      {packet && (
        <>
          <section className="mb-8">
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-3">
              Filled fields
              <span className="text-neutral-600 ml-2">({packet.filled_fields.length})</span>
            </h2>
            <FilledFieldsTable fields={packet.filled_fields} />
          </section>

          <section className="mb-8">
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-3">
              Skipped fields
              <span className="text-neutral-600 ml-2">({packet.skipped_fields.length})</span>
            </h2>
            <SkippedFieldsTable fields={packet.skipped_fields} />
          </section>

          {packet.screenshots.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-3">
                Screenshots
                <span className="text-neutral-600 ml-2">({packet.screenshots.length})</span>
              </h2>
              <ul className="grid gap-3">
                {packet.screenshots.map((s, i) => (
                  <ScreenshotRow key={`${s.label}-${i}`} shot={s} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section className="sticky bottom-0 pt-6 pb-4 bg-gradient-to-t from-black via-black to-transparent">
        {actionError && (
          <div className="mb-3 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {actionError}
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => doAction("approve")}
            disabled={actionBusy !== null}
            className="px-4 py-2 rounded border border-emerald-700 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 text-sm transition disabled:opacity-50"
          >
            {actionBusy === "approve" ? "Approving…" : "Approve (mark submitted)"}
          </button>
          <button
            onClick={() => doAction("dismiss")}
            disabled={actionBusy !== null}
            className="px-4 py-2 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-sm transition disabled:opacity-50"
          >
            {actionBusy === "dismiss" ? "Dismissing…" : "Dismiss (archive)"}
          </button>
          <span className="text-xs text-neutral-500 ml-auto">
            Approve if the replay shows a clean submission. Dismiss if the job
            isn&apos;t worth reopening.
          </span>
        </div>
      </section>
    </main>
  );
}
