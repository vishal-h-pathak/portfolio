"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InflightButton } from "./components/Button";

/**
 * ManualTailorPanel — paste a posting URL, get a tailored row.
 *
 * The form POSTs to /api/dashboard/runs/tailor-manual which inserts a
 * runs row (kind='tailor_manual') and dispatches tailor-manual.yml. The
 * panel then polls /api/dashboard/runs?limit=20, locates its run by id,
 * and surfaces the back-channel result jsonb the CLI writes:
 *
 *   { job_id, status, confidence, title, company,
 *     review_url | materials_url }
 *
 * High-confidence flow ends with a "Review materials" button that opens
 * /dashboard/review/{job_id}. Low-confidence flow (Amendment 1) ends
 * with a "Verify in review" button to the same page — the existing
 * review surface is the verification surface for both confidence
 * tiers; the only difference is what's already there (tailored
 * materials vs. just a scraped row awaiting human approval).
 *
 * Mounted on /dashboard between the header and RunsPanel so the paste-
 * a-URL affordance lives next to the bulk pipeline-runs controls
 * without becoming a separate page.
 */

type RunStatus = "pending" | "running" | "completed" | "failed";

type ResultPayload = {
  job_id?: string;
  status?: string;
  confidence?: "high" | "low";
  title?: string;
  company?: string | null;
  review_url?: string | null;
  materials_url?: string | null;
};

type Run = {
  id: string;
  kind: "hunt" | "tailor" | "tailor_manual";
  status: RunStatus;
  result: ResultPayload | null;
  failure_reason: string | null;
  github_run_url: string | null;
  created_at: string;
  started_at: string | null;
};

const POLL_INTERVAL_MS = 5000;

function isTerminal(s: RunStatus): boolean {
  return s === "completed" || s === "failed";
}

function looksLikeUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ManualTailorPanel() {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const trimmedUrl = url.trim();
  const canSubmit = !submitting && !runId && looksLikeUrl(trimmedUrl);

  const fetchRun = useCallback(async (id: string): Promise<Run | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/dashboard/runs?limit=50`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { runs?: Run[] };
      return json.runs?.find((r) => r.id === id) ?? null;
    } catch {
      return null;
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Poll the runs list for our specific row until it terminates.
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    const tick = async () => {
      const next = await fetchRun(runId);
      if (cancelled || !next) return;
      setRun(next);
    };
    tick();
    const t = window.setInterval(() => {
      if (run && isTerminal(run.status)) return;
      tick();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [runId, run, fetchRun]);

  const dispatch = async (target: string) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/dashboard/runs/tailor-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        run_id?: string;
        error?: string;
      };
      if (res.ok && json.run_id) {
        setRunId(json.run_id);
        setRun(null);
      } else {
        setSubmitError(
          json.error ?? `Failed to dispatch (${res.status})`,
        );
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    await dispatch(trimmedUrl);
  };

  // Re-dispatch the same URL after a failed run. The url input state
  // survives the whole run lifecycle (reset() is the only thing that
  // clears it), so the failed run's target is still in `url`.
  const retry = async () => {
    if (submitting || !looksLikeUrl(trimmedUrl)) return;
    setRunId(null);
    setRun(null);
    await dispatch(trimmedUrl);
  };

  const reset = () => {
    setUrl("");
    setRunId(null);
    setRun(null);
    setSubmitError(null);
  };

  const inflightState = submitting ? "queueing" : "idle";

  const statusLabel = useMemo(() => {
    if (!run) return runId ? "Queued — waiting for GHA…" : null;
    switch (run.status) {
      case "pending":
        return "Queued — waiting for GHA…";
      case "running":
        return "Scraping + tailoring…";
      case "completed":
        return null; // rendered as result panel instead
      case "failed":
        return null;
    }
  }, [run, runId]);

  return (
    <section
      aria-label="Manual job-URL tailor"
      className="mb-6 rounded border border-neutral-800 bg-neutral-950/60 p-4"
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-xs uppercase tracking-widest text-neutral-500">
          Paste a posting URL
        </h2>
        {runId && (
          <button
            type="button"
            onClick={reset}
            className="text-[11px] text-neutral-500 hover:text-neutral-100 px-1"
          >
            ← submit another
          </button>
        )}
      </div>

      {!runId && (
        <form onSubmit={submit} className="flex items-center gap-2 flex-wrap">
          <label htmlFor="manual-tailor-url" className="sr-only">
            Posting URL
          </label>
          <input
            id="manual-tailor-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://jobs.lever.co/company/posting-id"
            className="flex-1 min-w-[280px] bg-neutral-900 border border-neutral-800 rounded px-3 py-1.5 text-sm placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600"
            aria-invalid={!!submitError}
            aria-describedby={submitError ? "manual-tailor-error" : undefined}
          />
          <InflightButton
            type="submit"
            state={inflightState}
            idleLabel="Tailor this URL"
            queueingLabel="Dispatching…"
            disabled={!canSubmit}
          />
        </form>
      )}

      {submitError && (
        <p
          id="manual-tailor-error"
          role="alert"
          className="text-xs text-red-400 mt-2 font-mono"
        >
          {submitError}
          {looksLikeUrl(trimmedUrl) && !submitting && (
            <button
              type="button"
              onClick={() => void retry()}
              className="ml-2 text-red-300 hover:text-red-100 underline underline-offset-2"
            >
              Retry
            </button>
          )}
        </p>
      )}

      {statusLabel && (
        <p
          aria-live="polite"
          className="text-xs text-neutral-400 mt-3 flex items-center gap-2"
        >
          <svg
            className="animate-spin h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {statusLabel}
          {run?.github_run_url && (
            <a
              href={run.github_run_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-neutral-500 hover:text-neutral-200 underline-offset-2 hover:underline"
            >
              GHA &rarr;
            </a>
          )}
        </p>
      )}

      {run && run.status === "completed" && run.result?.job_id && (
        <ResultCard result={run.result} />
      )}

      {run && run.status === "failed" && (
        <div
          role="alert"
          className="mt-3 rounded border border-red-900/60 bg-red-950/30 px-3 py-2"
        >
          <div className="text-[10px] uppercase tracking-widest text-red-400 mb-1">
            Tailor failed
          </div>
          <p className="text-xs text-red-200 leading-relaxed whitespace-pre-wrap break-words">
            {run.failure_reason ?? "Unknown error. Check the GHA log."}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => void retry()}
              disabled={submitting || !looksLikeUrl(trimmedUrl)}
              className="text-xs text-red-300 hover:text-red-100 underline underline-offset-2 disabled:opacity-50"
            >
              {submitting ? "Retrying…" : "Retry this URL"}
            </button>
            {run.github_run_url && (
              <a
                href={run.github_run_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-300 hover:text-red-100 underline-offset-2 hover:underline"
              >
                View GHA run &rarr;
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ResultCard({ result }: { result: ResultPayload }) {
  const isLow = result.confidence === "low";
  const linkHref =
    result.materials_url ?? result.review_url ?? `/dashboard/review/${result.job_id}`;
  const linkLabel = isLow ? "Verify in review" : "Review materials";
  const accent = isLow
    ? "border-amber-700 bg-amber-900/40 text-amber-100 hover:bg-amber-800/60"
    : "border-emerald-700 bg-emerald-900/40 text-emerald-100 hover:bg-emerald-800/60";

  return (
    <div className="mt-3 rounded border border-neutral-800 bg-neutral-900/60 px-3 py-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
            {isLow ? "Low confidence — verify before tailoring" : "Tailored"}
          </div>
          <p className="text-sm text-neutral-100 font-medium truncate">
            {result.title ?? "(no title)"}
          </p>
          <p className="text-xs text-neutral-400 truncate">
            {result.company ?? "(unknown company)"}
            {result.job_id && (
              <span className="font-mono text-neutral-600 ml-2">
                {result.job_id}
              </span>
            )}
          </p>
        </div>
        <Link
          href={linkHref}
          className={
            "inline-flex items-center justify-center gap-1.5 rounded border " +
            "transition-colors text-xs px-3 py-1.5 " +
            accent +
            " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
            "focus-visible:ring-offset-black focus-visible:ring-amber-500"
          }
        >
          {linkLabel}
        </Link>
      </div>
    </div>
  );
}
