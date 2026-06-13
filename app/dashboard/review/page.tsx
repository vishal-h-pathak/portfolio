"use client";

/**
 * /dashboard/review — Review queue list.
 *
 * Shows every job awaiting human review. Under the M-2 lifecycle a row
 * lands here in two ways:
 *
 *   - `ready_for_review` — the tailor finished generating materials
 *     (resume + cover letter + form-answer drafts) and the human needs
 *     to inspect before pre-filling. This is the common path.
 *   - `needs_review` — legacy alias for the same state, kept for any
 *     straggler rows that haven't been migrated.
 *
 * Sorted by `status_updated_at` (most recent first). Each card links to
 * /dashboard/review/[job_id] for the full packet detail view. Approve /
 * dismiss actions are deliberately kept on the detail page — a one-line
 * row doesn't show enough context to make that call.
 *
 * Reads via /api/dashboard/jobs?view=review-queue behind the same
 * dashboard_auth cookie that protects the rest of /dashboard/*. The
 * detail page does the transitions.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Job } from "../../lib/supabase";
import DashboardNav from "../components/DashboardNav";
import { ConfidenceBadge, Pill } from "../components/JobBadges";
import { Skeleton, SkeletonRows } from "../components/Skeleton";
import { relativeTime } from "../lib/format";

export default function ReviewQueuePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // status_updated_at reflects when the row last transitioned —
      // under M-2 that's when the tailor finished materials
      // (`ready_for_review`) OR when the submitter legitimately
      // couldn't finish (legacy `needs_review`). Either way the human
      // review owner is now on the hook → most-recently-updated first.
      try {
        const res = await fetch("/api/dashboard/jobs?view=review-queue", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          jobs?: Job[];
          error?: string;
        };
        if (!res.ok) setError(json.error ?? `Failed to load queue (${res.status})`);
        else setJobs(json.jobs ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
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

  return (
    <>
      <DashboardNav />
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
        <header className="mb-6">
          <h1 className="font-serif text-[26px] tracking-tight text-ink">
            Review queue
          </h1>
          <p className="mt-0.5 text-[11px] text-ink-faint tabular-nums">
            {loading
              ? "loading…"
              : jobs.length === 0
                ? "nothing waiting"
                : `${jobs.length} submission${jobs.length === 1 ? "" : "s"} waiting on human review`}
          </p>
        </header>

        {error && (
          <div className="mb-6 border border-red-dim px-3 py-2 text-xs text-red">
            {error}
          </div>
        )}

        {loading ? (
          <>
            <Skeleton className="mb-3 h-4 w-28" />
            <SkeletonRows rows={4} rowClassName="h-24" />
          </>
        ) : (
          <>
            {jobs.length === 0 && !error && (
              <p className="border border-dashed border-rule px-4 py-8 text-center text-xs text-ink-faint">
                Queue empty — when the tailor finishes materials for an
                approved job, it lands here.
              </p>
            )}

            {Object.entries(grouped).map(([adapter, list]) => (
              <section key={adapter} className="mb-8">
                <h2 className="mb-2.5 flex items-baseline gap-2 border-b border-rule-soft pb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                  {adapter}
                  <span className="tabular-nums">({list.length})</span>
                </h2>
                <ul className="grid gap-2.5">
                  {list.map((job) => (
                    <li key={job.id}>
                      <Link
                        href={`/dashboard/review/${job.id}`}
                        className="block border border-rule bg-bg-raised p-3.5 transition-colors duration-150 hover:border-amber"
                        style={{ borderLeft: "2px solid var(--amber)" }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <ConfidenceBadge
                                c={job.submission_log?.confidence ?? job.confidence ?? null}
                              />
                              <Pill tone="dim">
                                attempt {job.submission_log?.attempt_n ?? "?"}
                              </Pill>
                              {relativeTime(job.status_updated_at) && (
                                <span className="text-[10px] text-ink-faint tabular-nums">
                                  {relativeTime(job.status_updated_at)}
                                </span>
                              )}
                            </div>
                            <div className="truncate text-[13px] font-medium text-ink">
                              {job.title}
                            </div>
                            <div className="truncate text-xs text-ink-dim">
                              {job.company}
                              {job.location ? ` · ${job.location}` : ""}
                            </div>
                            {job.submission_log?.reason && (
                              <div className="mt-1.5 line-clamp-2 text-[11px] text-ink-faint">
                                {job.submission_log.reason}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right text-[11px] tabular-nums">
                            <div className="text-ink-dim">
                              {(job.submission_log?.filled_fields?.length ?? 0)} filled
                            </div>
                            <div className="text-amber">
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
          </>
        )}
      </main>
    </>
  );
}
