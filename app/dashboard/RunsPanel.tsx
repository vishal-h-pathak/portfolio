"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GhostButton,
  InflightButton,
  SecondaryButton,
} from "./components/Button";

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
 *
 * PR-23 — UX polish:
 *   - Per-row dismiss + panel-level "Clear completed", with dismissed
 *     ids persisted to localStorage (see DISMISSED_LS_KEY note below).
 *   - Animated spinner in the `running` status badge.
 *   - Chevron expand for failure rows revealing failure_reason and the
 *     `log_excerpt` column (already fetched, previously unrendered).
 *   - Buttons unified through the dashboard Button primitives.
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

/**
 * Dismissed-run ids are stored device-locally in localStorage so a
 * stale completed/failed row stays out of the user's sight on this
 * browser. This is INTENTIONALLY not synced across devices or
 * browsers — runs are an ephemeral operational signal, not a user
 * setting, and a row dismissed on the laptop should reappear on the
 * phone if the user opens the dashboard there. Don't "fix" this by
 * persisting to Supabase; if multi-device sync is wanted, that's a
 * deliberate scope expansion, not a bug.
 */
const DISMISSED_LS_KEY = "dashboard:runs:dismissed";

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

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveDismissed(s: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISSED_LS_KEY, JSON.stringify([...s]));
  } catch {
    // localStorage can be full or disabled (private browsing, etc.).
    // Silent failure is fine — the user can dismiss again next session.
  }
}

function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${statusBadgeClass(status)}`}
    >
      {status === "running" && (
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
      )}
      {status}
    </span>
  );
}

export default function RunsPanel() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inFlight = useRef(false);

  // Hydrate dismissed set from localStorage after mount (avoids SSR
  // hydration mismatch — the server can't read window.localStorage).
  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

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
  const visibleRuns = useMemo(
    () => runs.filter((r) => !dismissed.has(r.id)),
    [runs, dismissed],
  );
  const hasActive = useMemo(() => visibleRuns.some(isActive), [visibleRuns]);
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

  const dismissRow = (id: string) => {
    if (isOptimisticId(id)) return;
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  };

  const clearCompleted = () => {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const r of visibleRuns) {
        if (r.status === "completed" || r.status === "failed") {
          if (!isOptimisticId(r.id)) next.add(r.id);
        }
      }
      saveDismissed(next);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const huntBusy = visibleRuns.some(
    (r) => r.kind === "hunt" && isActive(r),
  );
  const tailorBusy = visibleRuns.some(
    (r) => r.kind === "tailor" && isActive(r),
  );
  const hasDismissibleCompleted = visibleRuns.some(
    (r) =>
      (r.status === "completed" || r.status === "failed") &&
      !isOptimisticId(r.id),
  );

  return (
    <section className="mb-8 rounded border border-neutral-800 bg-neutral-950/60 p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-xs uppercase tracking-widest text-neutral-500">
          Pipeline runs
        </h2>
        <div className="flex items-center gap-2">
          {hasDismissibleCompleted && (
            <GhostButton
              onClick={clearCompleted}
              aria-label="Clear completed runs from this device"
            >
              Clear completed
            </GhostButton>
          )}
          <SecondaryButton
            type="button"
            onClick={() => dispatchRun("hunt")}
            disabled={huntBusy}
          >
            {huntBusy ? "Hunt running…" : "Run hunt"}
          </SecondaryButton>
          <InflightButton
            type="button"
            onClick={() => dispatchRun("tailor")}
            state={tailorBusy ? "running" : "idle"}
            idleLabel="Run tailor — all approved"
            runningLabel="Tailor running…"
            title="Bulk action — tailors every row in 'approved'. The per-row Tailor button on each card is the common case."
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-2 font-mono">{error}</p>
      )}

      {visibleRuns.length === 0 ? (
        <p className="text-xs text-neutral-600">
          {runs.length === 0
            ? "No runs yet."
            : "All runs cleared from this view."}
        </p>
      ) : (
        <ul className="max-h-72 overflow-y-auto divide-y divide-neutral-900 text-sm">
          {visibleRuns.map((r) => {
            const expanded = expandedId === r.id;
            const canExpand = !!(r.failure_reason || r.log_excerpt);
            const isDismissible = !isOptimisticId(r.id);
            const timeIso =
              r.status === "running" && r.started_at
                ? r.started_at
                : r.created_at;
            const timeLabel =
              r.status === "running" && r.started_at
                ? `started ${relativeTime(timeIso)}`
                : relativeTime(timeIso);

            return (
              <li key={r.id} className="py-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-neutral-400 uppercase tracking-wide w-12">
                      {r.kind}
                    </span>
                    <StatusBadge status={r.status} />
                    {r.failure_reason && !expanded && (
                      <span
                        className="text-[10px] text-red-400 truncate"
                        title={r.failure_reason}
                      >
                        {r.failure_reason}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 shrink-0">
                    <span className="font-mono">{timeLabel}</span>
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
                    {canExpand && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(r.id)}
                        aria-expanded={expanded}
                        aria-label={
                          expanded ? "Collapse run details" : "Expand run details"
                        }
                        className="text-neutral-500 hover:text-neutral-100 px-1 transition-colors"
                      >
                        {expanded ? "▴" : "▾"}
                      </button>
                    )}
                    {isDismissible && (
                      <button
                        type="button"
                        onClick={() => dismissRow(r.id)}
                        aria-label="Dismiss this run"
                        title="Dismiss (device-local)"
                        className="text-neutral-600 hover:text-neutral-100 px-1 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {expanded && canExpand && (
                  <div className="mt-2 ml-14 mr-2 space-y-2">
                    {r.failure_reason && (
                      <div className="rounded border border-red-900/60 bg-red-950/30 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-widest text-red-400 mb-1">
                          Failure reason
                        </div>
                        <p className="text-xs text-red-200 leading-relaxed whitespace-pre-wrap break-words">
                          {r.failure_reason}
                        </p>
                      </div>
                    )}
                    {r.log_excerpt && (
                      <div className="rounded border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                          Log excerpt
                        </div>
                        <pre className="text-[11px] text-neutral-300 leading-relaxed whitespace-pre-wrap break-words font-mono max-h-48 overflow-y-auto">
                          {r.log_excerpt}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
