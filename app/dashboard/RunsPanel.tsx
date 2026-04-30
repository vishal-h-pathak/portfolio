"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * RunsPanel — dashboard "Run hunt" / "Run tailor" buttons + recent
 * runs list (Phase 3 dashboard run-buttons).
 *
 * Mounted in app/dashboard/page.tsx between the header row and the
 * filters section. Reads/writes go through:
 *   GET  /api/dashboard/runs?limit=10
 *   POST /api/dashboard/runs/hunt
 *   POST /api/dashboard/runs/tailor
 *
 * Polls the GET endpoint every 5s while any visible row is pending or
 * running; stops otherwise. Per-kind buttons are disabled while a run
 * of that kind is pending or running.
 *
 * "Run submit" is intentionally absent — visible-browser pre-fill needs
 * a human at the keyboard, so the per-row "Pre-fill" button at
 * /dashboard/review/[job_id] remains the only entry to the submit phase.
 */

type RunKind = "hunt" | "tailor";
type RunStatus = "pending" | "running" | "completed" | "failed";

type Run = {
  id: string;
  kind: RunKind;
  status: RunStatus;
  triggered_by: string;
  args: Record<string, unknown> | null;
  started_at: string | null;
  ended_at: string | null;
  log_excerpt: string | null;
  failure_reason: string | null;
  github_run_url: string | null;
  created_at: string;
};

const POLL_INTERVAL_MS = 5000;
const LIST_LIMIT = 10;

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusBadgeClass(status: RunStatus): string {
  switch (status) {
    case "pending":
      return "bg-neutral-800 text-neutral-300 border-neutral-700";
    case "running":
      return "bg-violet-900/40 text-violet-300 border-violet-800/60";
    case "completed":
      return "bg-emerald-900/40 text-emerald-300 border-emerald-800/60";
    case "failed":
      return "bg-red-900/40 text-red-300 border-red-800/60";
  }
}

function isActive(r: Run): boolean {
  return r.status === "pending" || r.status === "running";
}

function isOptimisticId(id: string): boolean {
  return id.startsWith("optimistic-");
}

export default function RunsPanel() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/dashboard/runs?limit=${LIST_LIMIT}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(`GET /api/dashboard/runs failed: ${res.status}`);
        return;
      }
      const json = (await res.json()) as { runs?: Run[] };
      const serverRuns = json.runs ?? [];
      // Preserve any optimistic temp rows that don't yet appear on the
      // server (the POST is still in flight). Once the server returns
      // the real id we replace the temp row in dispatchRun().
      setRuns((prev) => {
        const optimistic = prev.filter((r) => isOptimisticId(r.id));
        return [...optimistic, ...serverRuns];
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
    }
  };

  // Initial load.
  useEffect(() => {
    refresh();
  }, []);

  // Conditional polling — only while something is in flight.
  const hasActive = useMemo(() => runs.some(isActive), [runs]);
  useEffect(() => {
    if (!hasActive) return;
    const t = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [hasActive]);

  const dispatchRun = async (kind: RunKind) => {
    const tempId = `optimistic-${kind}-${Date.now()}`;
    const optimistic: Run = {
      id: tempId,
      kind,
      status: "pending",
      triggered_by: "dashboard",
      args: null,
      started_at: null,
      ended_at: null,
      log_excerpt: null,
      failure_reason: null,
      github_run_url: null,
      created_at: new Date().toISOString(),
    };
    setRuns((prev) => [optimistic, ...prev]);
    setError(null);

    try {
      const res = await fetch(`/api/dashboard/runs/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        run_id?: string;
        error?: string;
      };
      if (res.ok && json.run_id) {
        // Swap optimistic id for the real one; next poll will fill in
        // the rest of the columns.
        setRuns((prev) =>
          prev.map((r) =>
            r.id === tempId ? { ...r, id: json.run_id as string } : r,
          ),
        );
      } else {
        const reason =
          json.error ?? `Failed to dispatch ${kind} (${res.status})`;
        setRuns((prev) =>
          prev.map((r) =>
            r.id === tempId
              ? {
                  ...r,
                  status: "failed",
                  failure_reason: reason,
                  ended_at: new Date().toISOString(),
                }
              : r,
          ),
        );
        setError(reason);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRuns((prev) =>
        prev.map((r) =>
          r.id === tempId
            ? {
                ...r,
                status: "failed",
                failure_reason: msg,
                ended_at: new Date().toISOString(),
              }
            : r,
        ),
      );
      setError(msg);
    }
  };

  const huntBusy = runs.some((r) => r.kind === "hunt" && isActive(r));
  const tailorBusy = runs.some((r) => r.kind === "tailor" && isActive(r));

  return (
    <section className="mb-8 rounded border border-neutral-800 bg-neutral-950/60 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xs uppercase tracking-widest text-neutral-500">
          Pipeline runs
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dispatchRun("hunt")}
            disabled={huntBusy}
            className={`text-xs px-3 py-1.5 rounded border transition ${
              huntBusy
                ? "border-neutral-800 bg-neutral-900 text-neutral-600 cursor-not-allowed"
                : "border-blue-800/60 bg-blue-900/30 text-blue-200 hover:bg-blue-800/50"
            }`}
          >
            {huntBusy ? "Hunt running…" : "Run hunt"}
          </button>
          <button
            type="button"
            onClick={() => dispatchRun("tailor")}
            disabled={tailorBusy}
            className={`text-xs px-3 py-1.5 rounded border transition ${
              tailorBusy
                ? "border-neutral-800 bg-neutral-900 text-neutral-600 cursor-not-allowed"
                : "border-violet-800/60 bg-violet-900/30 text-violet-200 hover:bg-violet-800/50"
            }`}
          >
            {tailorBusy ? "Tailor running…" : "Run tailor"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-2 font-mono">{error}</p>
      )}

      {runs.length === 0 ? (
        <p className="text-xs text-neutral-600">No runs yet.</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto divide-y divide-neutral-900 text-sm">
          {runs.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 py-1.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-wide w-12">
                  {r.kind}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${statusBadgeClass(r.status)}`}
                >
                  {r.status}
                </span>
                {r.failure_reason && (
                  <span
                    className="text-[10px] text-red-400 truncate"
                    title={r.failure_reason}
                  >
                    {r.failure_reason}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-500 shrink-0">
                <span>{relativeTime(r.created_at)}</span>
                {r.github_run_url ? (
                  <a
                    href={r.github_run_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-neutral-100 underline-offset-2 hover:underline"
                  >
                    GHA &rarr;
                  </a>
                ) : (
                  <span className="text-neutral-700">—</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
