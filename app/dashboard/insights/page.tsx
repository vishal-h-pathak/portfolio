"use client";

/**
 * Hunter Insights — meta-visualization of the job-hunter's behaviour.
 *
 * This page aggregates the same `jobs` table the rest of the dashboard
 * reads. We pull every row once, then compute every chart's data set
 * client-side via the helpers in this file. Aggregations are O(n) over a
 * few hundred rows, so doing them in the browser is faster than five
 * round-trips to Postgres.
 *
 * Charts shipped in V1:
 *   - KPI tiles (total / by status / by tier)
 *   - Source share pie
 *   - Tier yield by source (stacked bar)
 *   - Score histogram by source (stacked bar)
 *   - Daily inflow over time (line)
 *   - Application funnel (horizontal bar)
 *
 * Deliberately deferred to a later pass:
 *   - Dead-link rate by source — would need a `validated`/`is_dead` column
 *     on jobs (the validator currently only logs to agent.log).
 *   - Per-run SerpAPI / LinkedIn budget meter — would need a `hunter_runs`
 *     table that records search counts per invocation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardNav from "../components/DashboardNav";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase, type Job } from "../../lib/supabase";

// ── Color palette — kept here so all charts share a single identity ──
// One color per source. New sources fall back to neutral grey.
const SOURCE_COLORS: Record<string, string> = {
  greenhouse:    "#10b981", // emerald
  ashby:         "#a855f7", // violet
  lever:         "#84cc16", // lime
  serpapi:       "#3b82f6", // blue
  linkedin:      "#0ea5e9", // sky
  hn_whoshiring: "#f97316", // orange
  "80kh":        "#eab308", // amber
  remoteok:      "#14b8a6", // teal
  indeed:        "#ec4899", // pink
};
const FALLBACK_COLOR = "#525252"; // neutral-600

// One color per tier (mirrors the dashboard tier badge palette).
const TIER_COLORS: Record<string, string> = {
  "1":         "#10b981", // emerald
  "2":         "#f59e0b", // amber
  "3":         "#0ea5e9", // sky
  disqualify:  "#ef4444", // red
  skip:        "#525252", // neutral
  unknown:     "#404040", // neutral-700
};

// How often we re-pull the jobs table while the page is open. The hunter
// streams new rows every few seconds during a run, so 30s is a good
// balance between freshness and read load. Pauses automatically when the
// tab is hidden — see the visibilitychange listener in InsightsPage.
const REFRESH_INTERVAL_MS = 30_000;

// Canonical M-2 lifecycle order, top-to-bottom. Legacy buckets land
// at the bottom — migration 007 collapsed every existing row out of
// them, but stragglers can still appear when an older client writes a
// row before being upgraded, and the tiles need to surface them.
const STATUS_LABEL: Record<string, string> = {
  discovered: "Discovered",
  new: "New",
  approved: "Approved",
  preparing: "Preparing",
  ready_for_review: "Ready for review",
  prefilling: "Pre-filling",
  awaiting_human_submit: "Awaiting submit",
  applied: "Applied",
  failed: "Failed",
  skipped: "Skipped",
  expired: "Expired",
  ignored: "Ignored",
  // Legacy (read-only post-migration 007)
  ready_to_submit: "Ready (legacy)",
  submit_confirmed: "Confirmed (legacy)",
  submitting: "Submitting (legacy)",
  needs_review: "Needs review (legacy)",
  submitted: "Submitted (legacy)",
};


// ── Helpers ──────────────────────────────────────────────────────────────

function colorForSource(source: string): string {
  return SOURCE_COLORS[source] ?? FALLBACK_COLOR;
}

function tierKey(t: Job["tier"] | string | null | undefined): string {
  if (t === null || t === undefined || t === "") return "unknown";
  // jobs.tier in Supabase is text; can be "1" | "2" | "3" | "disqualify" | "skip"
  return String(t);
}

function scoreBucket(score: Job["score"] | string | null | undefined): string {
  if (score === null || score === undefined || score === "") return "—";
  // Score is text in the DB; coerce.
  const n = typeof score === "number" ? score : parseInt(String(score), 10);
  if (Number.isNaN(n)) return "—";
  return String(Math.max(1, Math.min(10, n)));
}

function dateKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // YYYY-MM-DD in user's local TZ — good enough for daily inflow.
  return d.toISOString().slice(0, 10);
}


// ── Aggregations ─────────────────────────────────────────────────────────

type SourceShare = { source: string; count: number };
function aggregateSourceShare(jobs: Job[]): SourceShare[] {
  const counts: Record<string, number> = {};
  for (const j of jobs) {
    const s = j.source ?? "unknown";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

type TierYieldRow = {
  source: string;
  "1": number;
  "2": number;
  "3": number;
  disqualify: number;
  skip: number;
  unknown: number;
  total: number;
};
function aggregateTierYield(jobs: Job[]): TierYieldRow[] {
  const map: Record<string, TierYieldRow> = {};
  for (const j of jobs) {
    const s = j.source ?? "unknown";
    if (!map[s]) {
      map[s] = {
        source: s, "1": 0, "2": 0, "3": 0,
        disqualify: 0, skip: 0, unknown: 0, total: 0,
      };
    }
    const tk = tierKey(j.tier);
    if (tk === "1" || tk === "2" || tk === "3" || tk === "disqualify" || tk === "skip") {
      map[s][tk] += 1;
    } else {
      map[s].unknown += 1;
    }
    map[s].total += 1;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

type ScoreHistRow = { score: string } & Record<string, number | string>;
function aggregateScoreHist(jobs: Job[], sources: string[]): ScoreHistRow[] {
  // Build x-axis: scores 1..10. Each bucket carries one numeric column per source.
  const buckets: Record<string, ScoreHistRow> = {};
  for (let n = 1; n <= 10; n++) {
    const s = String(n);
    const row: ScoreHistRow = { score: s };
    sources.forEach((src) => { row[src] = 0; });
    buckets[s] = row;
  }
  for (const j of jobs) {
    const sb = scoreBucket(j.score);
    if (sb === "—") continue;
    const src = j.source ?? "unknown";
    if (!buckets[sb][src] && buckets[sb][src] !== 0) buckets[sb][src] = 0;
    buckets[sb][src] = (buckets[sb][src] as number) + 1;
  }
  return Object.values(buckets);
}

type DailyRow = { date: string; total: number } & Record<string, number | string>;
function aggregateDaily(jobs: Job[], sources: string[]): DailyRow[] {
  // Maps date → row of {date, source1: n, source2: n, total}.
  const map: Record<string, DailyRow> = {};
  for (const j of jobs) {
    const d = dateKey(j.created_at);
    if (!d) continue;
    if (!map[d]) {
      const row: DailyRow = { date: d, total: 0 };
      sources.forEach((s) => { row[s] = 0; });
      map[d] = row;
    }
    const src = j.source ?? "unknown";
    map[d][src] = ((map[d][src] as number) ?? 0) + 1;
    map[d].total += 1;
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

type FunnelRow = { stage: string; count: number };
const APPROVED_OR_LATER = new Set([
  "approved", "preparing", "ready_to_submit",
  "submit_confirmed", "submitting", "submitted",
  "applied", "needs_review", "failed",
]);
const READY_OR_LATER = new Set([
  "ready_to_submit", "submit_confirmed", "submitting",
  "submitted", "applied", "needs_review",
]);
const SUBMITTED_OR_APPLIED = new Set([
  "submitted", "submit_confirmed", "applied",
]);
function aggregateFunnel(jobs: Job[]): FunnelRow[] {
  let total = 0, notify = 0, approved = 0, ready = 0, submitted = 0;
  for (const j of jobs) {
    total += 1;
    const status = j.status ?? "new";
    // ``notified`` mirrors the scorer's "notify" recommendation.
    // Field is denormalised across two columns; either signal is enough.
    const isNotify = j.notified === true || (j as unknown as { action?: string }).action === "notify";
    if (isNotify) notify += 1;
    if (APPROVED_OR_LATER.has(status)) approved += 1;
    if (READY_OR_LATER.has(status)) ready += 1;
    if (SUBMITTED_OR_APPLIED.has(status)) submitted += 1;
  }
  return [
    { stage: "Discovered",       count: total },
    { stage: "Notify-flagged",   count: notify },
    { stage: "Approved+",        count: approved },
    { stage: "Materials ready+", count: ready },
    { stage: "Submitted/Applied", count: submitted },
  ];
}

type Kpis = {
  total: number;
  byStatus: Record<string, number>;
  byTier: Record<string, number>;
  bySource: Record<string, number>;
};
function computeKpis(jobs: Job[]): Kpis {
  const k: Kpis = { total: 0, byStatus: {}, byTier: {}, bySource: {} };
  for (const j of jobs) {
    k.total += 1;
    const s = j.status ?? "new";
    k.byStatus[s] = (k.byStatus[s] ?? 0) + 1;
    const t = tierKey(j.tier);
    k.byTier[t] = (k.byTier[t] ?? 0) + 1;
    const src = j.source ?? "unknown";
    k.bySource[src] = (k.bySource[src] ?? 0) + 1;
  }
  return k;
}


// ── Layout primitives ────────────────────────────────────────────────────

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-medium text-neutral-200">{title}</h3>
      {subtitle && (
        <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 ${className}`}>
      {children}
    </section>
  );
}

/**
 * ChartFrame — fixed-height wrapper that only renders its children after the
 * client has mounted. Recharts' ResponsiveContainer measures with
 * ``getBoundingClientRect`` on first paint; under Turbopack/Next 16 that can
 * fire before layout, returning -1×-1 and producing a noisy console warning.
 * Gating the children on ``mounted`` skips that first paint entirely.
 */
function ChartFrame({
  mounted,
  children,
  height = 288,
}: {
  mounted: boolean;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      {mounted ? children : null}
    </div>
  );
}

function relativeAgo(d: Date | null): string {
  if (!d) return "";
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

function RefreshIndicator({
  lastUpdated,
  refreshing,
  onRefresh,
}: {
  lastUpdated: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  // Tick once a second so the "Xs ago" string updates between polls.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const label = lastUpdated ? `Updated ${relativeAgo(lastUpdated)}` : "Loading…";
  return (
    <div className="flex items-center gap-1 text-[11px] text-neutral-500">
      <span className="font-mono">{label}</span>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="ml-1 px-2 py-1 rounded border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-100 hover:border-neutral-700 disabled:opacity-50"
        title="Refresh now"
        aria-label="Refresh"
      >
        {refreshing ? (
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          "↻"
        )}
      </button>
    </div>
  );
}

function KpiTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3"
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">
        {label}
      </div>
      <div className="text-2xl font-semibold text-neutral-100 mt-0.5 font-mono">
        {value}
      </div>
      {hint && <div className="text-[10px] text-neutral-600 mt-0.5">{hint}</div>}
    </div>
  );
}


// ── Pattern Analysis (J-6) ────────────────────────────────────────────
//
// Reads the most recent row from the `pattern_analyses` table written by
// `job-applicant/scripts/analyze_patterns.py`. The script runs on a
// schedule (cron); this section just renders whatever the latest run
// produced — flagged groups + a horizontal bar of response rates.

type PatternGroupRow = {
  name: string;
  n: number;
  applied: number;
  responded: number;
  interviewed: number;
  offered: number;
  applied_rate: number;
  response_rate: number;
  interview_rate: number;
  offer_rate: number;
};

type PatternFlagged = {
  group: string;
  n: number;
  applied: number;
  response_rate: number;
  delta_pp_vs_global: number;
  direction: "above" | "below";
};

type PatternAnalysisRow = {
  id: number;
  created_at: string;
  num_jobs_analyzed: number;
  dimensions: string;
  payload: {
    groups: PatternGroupRow[];
    flagged_patterns: PatternFlagged[];
  };
};

function PatternAnalysisSection({ mounted }: { mounted: boolean }) {
  const [row, setRow] = useState<PatternAnalysisRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("pattern_analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) setError(error.message);
      else setRow((data as PatternAnalysisRow) ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <>
        <PanelHeader title="Pattern analysis" subtitle="loading…" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PanelHeader title="Pattern analysis" subtitle={error} />
      </>
    );
  }

  if (!row) {
    return (
      <>
        <PanelHeader
          title="Pattern analysis"
          subtitle="No analysis yet. Run `python -m scripts.analyze_patterns` from the job-applicant repo to seed this section."
        />
      </>
    );
  }

  const subtitle = `${row.num_jobs_analyzed} jobs analyzed by ${row.dimensions} · ${new Date(row.created_at).toLocaleDateString()}`;
  const groups = (row.payload?.groups ?? [])
    .filter((g) => g.applied > 0)
    .sort((a, b) => b.response_rate - a.response_rate)
    .slice(0, 12);
  const flagged = row.payload?.flagged_patterns ?? [];

  const chartData = groups.map((g) => ({
    name: g.name,
    response_rate: Math.round(g.response_rate * 100),
    n: g.n,
    applied: g.applied,
  }));

  return (
    <>
      <PanelHeader title="Pattern analysis (J-6)" subtitle={subtitle} />
      {flagged.length > 0 && (
        <div className="mb-4 grid gap-2">
          {flagged.map((p) => (
            <div
              key={p.group}
              className={`rounded border px-3 py-2 text-xs flex items-center justify-between gap-3 ${
                p.direction === "above"
                  ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-200"
                  : "border-red-800/60 bg-red-950/30 text-red-200"
              }`}
            >
              <code className="font-mono">{p.group}</code>
              <span>
                response rate {Math.round(p.response_rate * 100)}% (
                {p.delta_pp_vs_global > 0 ? "+" : ""}
                {p.delta_pp_vs_global.toFixed(1)}pp vs global) · n={p.n} · applied={p.applied}
              </span>
            </div>
          ))}
        </div>
      )}
      <ChartFrame mounted={mounted} height={Math.max(160, chartData.length * 28)}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: "#a3a3a3", fontSize: 11 }}
              unit="%"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={220}
              tick={{ fill: "#a3a3a3", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #262626",
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <Bar dataKey="response_rate" fill="#a855f7" name="Response rate %" />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </>
  );
}


// ── Page ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // ``mounted`` gates Recharts rendering until the client has run a
  // layout pass. Recharts measures its container with getBoundingClientRect
  // on its first render; under Turbopack/Next 16 the parent often reports
  // 0×0 on initial render and emits a console warning. Skipping the first
  // pass entirely silences the warnings without affecting the visible
  // result — charts mount the moment hydration finishes.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Hold the latest fetch promise so a manual refresh during a polled
  // refresh doesn't double-set state in surprising orders.
  const inFlight = useRef<Promise<void> | null>(null);

  const loadJobs = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    setRefreshing(true);
    const p = (async () => {
      const { data, error: fetchError } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (fetchError) setError(fetchError.message);
      else {
        setJobs((data ?? []) as Job[]);
        setError(null);
        setLastUpdated(new Date());
      }
      setLoading(false);
      setRefreshing(false);
    })();
    inFlight.current = p;
    try {
      await p;
    } finally {
      inFlight.current = null;
    }
  }, []);

  // Initial load + polling. We pause polling while the tab is hidden to
  // avoid wasted reads, and force a refresh the moment the tab becomes
  // visible again so the user sees fresh data without manually clicking.
  useEffect(() => {
    void loadJobs();
    let timer: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (timer) return;
      timer = setInterval(() => { void loadJobs(); }, REFRESH_INTERVAL_MS);
    }
    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadJobs();
        start();
      } else {
        stop();
      }
    }
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadJobs]);

  const kpis = useMemo(() => computeKpis(jobs), [jobs]);
  const sourceShare = useMemo(() => aggregateSourceShare(jobs), [jobs]);
  const tierYield = useMemo(() => aggregateTierYield(jobs), [jobs]);
  const sources = useMemo(
    () => sourceShare.map((s) => s.source),
    [sourceShare],
  );
  const scoreHist = useMemo(() => aggregateScoreHist(jobs, sources), [jobs, sources]);
  const daily = useMemo(() => aggregateDaily(jobs, sources), [jobs, sources]);
  const funnel = useMemo(() => aggregateFunnel(jobs), [jobs]);

  if (loading) {
    return (
      <>
        <DashboardNav />
        <main className="min-h-[60vh] flex items-center justify-center bg-black text-neutral-500 text-sm">
          loading insights…
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardNav
        rightSlot={
          <RefreshIndicator
            lastUpdated={lastUpdated}
            refreshing={refreshing}
            onRefresh={loadJobs}
          />
        }
      />
      <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-12 max-w-6xl mx-auto bg-black text-neutral-100">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-100">
            Hunter insights
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            How the job-hunter is behaving — sources, tier yield, scoring,
            inflow, and the application funnel.
          </p>
        </header>

      {error && (
        <div className="mb-6 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── KPI tiles ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <KpiTile label="Total jobs" value={kpis.total} />
        <KpiTile
          label="Tier 1"
          value={kpis.byTier["1"] ?? 0}
          accent={TIER_COLORS["1"]}
          hint={`${(((kpis.byTier["1"] ?? 0) / Math.max(kpis.total, 1)) * 100).toFixed(0)}% of all`}
        />
        <KpiTile
          label="Tier 2"
          value={kpis.byTier["2"] ?? 0}
          accent={TIER_COLORS["2"]}
          hint={`${(((kpis.byTier["2"] ?? 0) / Math.max(kpis.total, 1)) * 100).toFixed(0)}% of all`}
        />
        <KpiTile
          label="Tier 3"
          value={kpis.byTier["3"] ?? 0}
          accent={TIER_COLORS["3"]}
          hint={`${(((kpis.byTier["3"] ?? 0) / Math.max(kpis.total, 1)) * 100).toFixed(0)}% of all`}
        />
        <KpiTile
          label="Notify-flagged"
          value={funnel.find((f) => f.stage === "Notify-flagged")?.count ?? 0}
          hint="Score & tier worth pursuing"
        />
        <KpiTile
          label="Approved+"
          value={funnel.find((f) => f.stage === "Approved+")?.count ?? 0}
          hint="You took action on these"
        />
        <KpiTile
          label="Materials ready+"
          value={funnel.find((f) => f.stage === "Materials ready+")?.count ?? 0}
          hint="Resume & cover letter generated"
        />
        <KpiTile
          label="Submitted/Applied"
          value={funnel.find((f) => f.stage === "Submitted/Applied")?.count ?? 0}
          hint="End of the funnel"
        />
      </section>

      {/* ── Pattern Analysis (J-6) — latest row from `pattern_analyses` ── */}
      <Panel className="mb-4">
        <PatternAnalysisSection mounted={mounted} />
      </Panel>

      {/* ── Pie + tier yield (side by side on wide, stacked on narrow) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Panel>
          <PanelHeader
            title="Source share"
            subtitle="Where every job in the database came from."
          />
          <ChartFrame mounted={mounted} height={288}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={sourceShare}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  {sourceShare.map((entry) => (
                    <Cell key={entry.source} fill={colorForSource(entry.source)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a", border: "1px solid #262626",
                    borderRadius: 6, fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Panel>

        <Panel>
          <PanelHeader
            title="Tier yield by source"
            subtitle="Which sources actually find Tier 1/2/3 roles?"
          />
          <ChartFrame mounted={mounted} height={288}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={tierYield}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="source" tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a", border: "1px solid #262626",
                    borderRadius: 6, fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="1"          stackId="t" fill={TIER_COLORS["1"]}        name="Tier 1" />
                <Bar dataKey="2"          stackId="t" fill={TIER_COLORS["2"]}        name="Tier 2" />
                <Bar dataKey="3"          stackId="t" fill={TIER_COLORS["3"]}        name="Tier 3" />
                <Bar dataKey="disqualify" stackId="t" fill={TIER_COLORS.disqualify}  name="Disqualify" />
                <Bar dataKey="skip"       stackId="t" fill={TIER_COLORS.skip}        name="Skip" />
                <Bar dataKey="unknown"    stackId="t" fill={TIER_COLORS.unknown}     name="Unknown" />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Panel>
      </div>

      {/* ── Score histogram + daily line ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Panel>
          <PanelHeader
            title="Score histogram by source"
            subtitle="Stacked counts of Claude-assigned 1–10 scores. Right-skew = sources that surface high-quality matches."
          />
          <ChartFrame mounted={mounted} height={288}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={scoreHist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="score" tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a", border: "1px solid #262626",
                    borderRadius: 6, fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {sources.map((src) => (
                  <Bar
                    key={src}
                    dataKey={src}
                    stackId="s"
                    fill={colorForSource(src)}
                    name={src}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Panel>

        <Panel>
          <PanelHeader
            title="Daily inflow"
            subtitle="Total new jobs surfaced per day. Spikes correspond to hunter runs."
          />
          <ChartFrame mounted={mounted} height={288}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a", border: "1px solid #262626",
                    borderRadius: 6, fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone" dataKey="total"
                  stroke="#e5e5e5" strokeWidth={2}
                  name="All sources" dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Panel>
      </div>

      {/* ── Funnel ─────────────────────────────────────────────────── */}
      <Panel className="mb-4">
        <PanelHeader
          title="Application funnel"
          subtitle="Stages collapse — every job in stage N is also in stage N-1. Drop-offs show where work is happening (or stalling)."
        />
        <ChartFrame mounted={mounted} height={256}>
          <ResponsiveContainer>
            <BarChart data={funnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 11 }} />
              <YAxis
                type="category" dataKey="stage" width={140}
                tick={{ fill: "#a3a3a3", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a", border: "1px solid #262626",
                  borderRadius: 6, fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="#10b981" name="Jobs at stage" />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Panel>

      {/* ── Status tiles (smaller, end-of-page reference) ──────────── */}
      <Panel>
        <PanelHeader
          title="By status"
          subtitle="Snapshot of every status bucket on the jobs table."
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {Object.entries(STATUS_LABEL).map(([s, label]) => (
            <KpiTile key={s} label={label} value={kpis.byStatus[s] ?? 0} />
          ))}
        </div>
      </Panel>

        <p className="text-[10px] uppercase tracking-widest text-neutral-700 mt-8 text-center">
          Live from Supabase · {jobs.length} rows · charts deferred for v2:
          dead-link rate, SerpAPI budget meter
        </p>
      </main>
    </>
  );
}
