import { createAdminClient } from "@/app/lib/supabase-admin";

/**
 * Sanitized jobpipe telemetry for the public workshop rail.
 *
 * Server-only: reads runs/jobs on the service role (both tables are
 * service-role-only under RLS). The return value is world-readable on
 * the portfolio, so it carries ONLY aggregates — no company names, job
 * titles, URLs, run args, or ids. Every field is built explicitly
 * below; never spread a DB row into the result.
 *
 * Returns null on any failure — consumers degrade to their static
 * placeholder, they never error.
 */

export type BenchEventKind = "hunt" | "tailor" | "tailor_manual";
export type BenchEventStatus = "pending" | "running" | "completed" | "failed";

export type BenchEvent = {
  kind: BenchEventKind;
  status: BenchEventStatus;
  /** Relative, e.g. "2h ago" — may be up to one revalidate window stale. */
  ago: string;
  /** Hunts only: jobs first seen during the run's window, when > 0. */
  new_roles?: number;
};

export type BenchActivity = {
  events: BenchEvent[];
  totals: {
    roles_tracked: number;
    scored_7d: number;
    applications_out: number;
  };
};

const KINDS: ReadonlySet<string> = new Set(["hunt", "tailor", "tailor_manual"]);
const STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "running",
  "completed",
  "failed",
]);

function relAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export async function getBenchActivity(): Promise<BenchActivity | null> {
  try {
    const admin = createAdminClient();
    if (!admin) return null;

    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();

    const [runsRes, trackedRes, scoredRes, appliedRes] = await Promise.all([
      admin
        .from("runs")
        .select("kind, status, started_at, ended_at, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      admin.from("jobs").select("id", { count: "exact", head: true }),
      admin
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .not("score", "is", null)
        .gte("created_at", sevenDaysAgo),
      admin
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "applied"),
    ]);

    if (runsRes.error || trackedRes.error || scoredRes.error || appliedRes.error) {
      return null;
    }
    const runs = runsRes.data ?? [];

    // new_roles per hunt = jobs first seen inside the run's window.
    // One query for everything since the oldest finished hunt, bucketed here.
    const huntWindows = runs.filter(
      (r) => r.kind === "hunt" && r.started_at && r.ended_at,
    );
    let jobCreatedTimes: number[] = [];
    if (huntWindows.length > 0) {
      const oldest = huntWindows
        .map((r) => r.started_at as string)
        .sort()[0];
      const { data: jobRows } = await admin
        .from("jobs")
        .select("created_at")
        .gte("created_at", oldest)
        .limit(2000);
      jobCreatedTimes = (jobRows ?? []).map((j) => Date.parse(j.created_at));
    }

    const events: BenchEvent[] = [];
    for (const r of runs) {
      if (!KINDS.has(r.kind) || !STATUSES.has(r.status)) continue;
      const event: BenchEvent = {
        kind: r.kind as BenchEventKind,
        status: r.status as BenchEventStatus,
        ago: relAgo(r.ended_at ?? r.started_at ?? r.created_at),
      };
      if (r.kind === "hunt" && r.started_at && r.ended_at) {
        const start = Date.parse(r.started_at);
        const end = Date.parse(r.ended_at);
        const n = jobCreatedTimes.filter((t) => t >= start && t <= end).length;
        if (n > 0) event.new_roles = n;
      }
      events.push(event);
    }

    return {
      events,
      totals: {
        roles_tracked: trackedRes.count ?? 0,
        scored_7d: scoredRes.count ?? 0,
        applications_out: appliedRes.count ?? 0,
      },
    };
  } catch {
    return null;
  }
}
