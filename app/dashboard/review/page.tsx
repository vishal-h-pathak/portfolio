"use client";

/**
 * /dashboard/review — Review queue list.
 *
 * Shows every job whose status is `needs_review`, sorted by when the submitter
 * last touched them (most recent first). Each card links to
 * /dashboard/review/[job_id] for the full packet detail view. Approve /
 * dismiss actions are deliberately kept on the detail page — a one-line row
 * doesn't show enough context to make that call.
 *
 * Wired to the same Supabase client + dashboard_auth cookie that protects the
 * rest of /dashboard/*. No new API calls on this page; the detail page does
 * the transitions.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase, type Job } from "../../lib/supabase";
import DashboardNav from "../components/DashboardNav";

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "1h ago" : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function ConfidenceBadge({ c }: { c: number | null }) {
  if (c === null || c === undefined) {
    return (
      <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-500">
        no score
      </span>
    );
  }
  // Policy: 0.8+ is the auto_submit threshold elsewhere, so anything on the
  // review queue is by definition <0.8. Split high/mid/low inside that.
  const cls =
    c >= 0.7
      ? "bg-emerald-900/40 text-emerald-300 border-emerald-800/60"
      : c >= 0.55
      ? "bg-amber-900/40 text-amber-300 border-amber-800/60"
      : "bg-red-900/40 text-red-300 border-red-800/60";
  return (
    <span
      className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border font-mono ${cls}`}
    >
      {c.toFixed(2)}
    </span>
  );
}

export default function ReviewQueuePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // status_updated_at is more useful than created_at here — it reflects
      // when the submitter last pushed the row into needs_review.
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "needs_review")
        .order("status_updated_at", { ascending: false });
      if (error) setError(error.message);
      else setJobs((data ?? []) as Job[]);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    // Group by adapter so reviewers can batch-trust Greenhouse rows and
    // scrutinize generic-agent rows more carefully.
    const out: Record<string, Job[]> = {};
    jobs.forEach((j) => {
      const a = j.submission_log?.adapter ?? "unknown";
      (out[a] ||= []).push(j);
    });
    return out;
  }, [jobs]);

  if (loading) {
    return (
      <>
        <DashboardNav />
        <main className="min-h-[60vh] flex items-center justify-center bg-black text-neutral-500 text-sm">
          loading…
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardNav />
      <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-12 max-w-5xl mx-auto bg-black text-neutral-100">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold">Review queue</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {jobs.length === 0
              ? "Nothing waiting — every submission either cleared or was dismissed."
              : `${jobs.length} submission${jobs.length === 1 ? "" : "s"} waiting on human review`}
          </p>
        </header>

      {error && (
        <div className="mb-6 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {jobs.length === 0 && !error && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-8 text-center text-sm text-neutral-500">
          The review queue is empty. When the submitter can&apos;t confidently
          finish a form, the application will land here with a Browserbase
          replay you can audit before approving.
        </div>
      )}

      {Object.entries(grouped).map(([adapter, list]) => (
        <section key={adapter} className="mb-10">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-3">
            {adapter}
            <span className="text-neutral-600 ml-2">({list.length})</span>
          </h2>
          <ul className="grid gap-3">
            {list.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/dashboard/review/${job.id}`}
                  className="block rounded-lg border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/80 hover:border-neutral-700 transition p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2 flex-wrap">
                        <ConfidenceBadge c={job.submission_log?.confidence ?? job.confidence ?? null} />
                        <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-500">
                          attempt {job.submission_log?.attempt_n ?? "?"}
                        </span>
                        {relativeTime(job.status_updated_at) && (
                          <span className="text-[10px] font-mono text-neutral-600">
                            {relativeTime(job.status_updated_at)}
                          </span>
                        )}
                      </div>
                      <div className="font-medium truncate">{job.title}</div>
                      <div className="text-sm text-neutral-400 truncate">
                        {job.company}
                        {job.location ? ` · ${job.location}` : ""}
                      </div>
                      {job.submission_log?.reason && (
                        <div className="text-xs text-neutral-500 mt-1.5 line-clamp-2">
                          {job.submission_log.reason}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-neutral-600 font-mono">
                        {(job.submission_log?.filled_fields?.length ?? 0)} filled
                      </div>
                      <div className="text-xs text-amber-500/80 font-mono">
                        {(job.submission_log?.skipped_fields?.length ?? 0)} skipped
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
