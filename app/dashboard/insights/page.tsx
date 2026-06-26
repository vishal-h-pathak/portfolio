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
 * Charts: KPI tiles, source share pie, tier yield by source, score
 * histogram by source, daily inflow, application funnel, pattern
 * analysis (J-6), status snapshot.
 *
 * Chart palette: recharts paints SVG `fill` attributes, which can't
 * resolve var() — so the token hexes are mirrored here verbatim
 * (#6FE39A green / #E89B3D amber / ink grays / #E0655B red). If the
 * tokens in globals.css ever change, update CHART below.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardNav from "../components/DashboardNav";
import { Skeleton, SkeletonRows } from "../components/Skeleton";
import { STATUS_LABEL } from "../lib/lifecycle";
import { formatUsd } from "../lib/format";
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
import type { Job } from "../../lib/supabase";

// ── Token-mirrored chart constants ───────────────────────────────────
const CHART = {
  green: "#6FE39A",
  greenDim: "rgba(111, 227, 154, 0.45)",
  amber: "#E89B3D",
  amberDim: "rgba(232, 155, 61, 0.45)",
  ink: "#E8E6DF",
  inkDim: "#8C8B83",
  inkFaint: "#7E7A6D",
  rule: "rgba(232, 230, 223, 0.12)",
  ruleSoft: "rgba(232, 230, 223, 0.06)",
  red: "#E0655B",
  raised: "#101012",
};

// Sources cycle through the two accents + ink steps — same family the
// rest of the register uses, no new hues.
const SOURCE_PALETTE = [
  CHART.green,
  CHART.amber,
  CHART.inkDim,
  CHART.greenDim,
  CHART.amberDim,
  CHART.ink,
  CHART.inkFaint,
  "rgba(232, 230, 223, 0.25)",
];

const TIER_COLORS: Record<string, string> = {
  "1": CHART.green,
  "1.5": CHART.greenDim,
  "2": CHART.amber,
  "3": CHART.inkDim,
  disqualify: CHART.red,
  skip: CHART.inkFaint,
  unknown: "rgba(232, 230, 223, 0.25)",
};

const TOOLTIP_STYLE = {
  background: CHART.raised,
  border: `1px solid ${CHART.rule}`,
  borderRadius: 0,
  fontSize: 11,
  fontFamily: "var(--mono)",
} as const;

const TICK = { fill: CHART.inkFaint, fontSize: 10 } as const;

// How often we re-pull the jobs table while the page is open. Pauses
// automatically when the tab is hidden.
const REFRESH_INTERVAL_MS = 30_000;

// ── Helpers ──────────────────────────────────────────────────────────────

function tierKeyStr(t: Job["tier"] | string | null | undefined): string {
  if (t === null || t === undefined || t === "") return "unknown";
  // jobs.tier is text; "1" | "1.5" | "2" | "3" | "disqualify" | "skip"
  return String(t);
}

function scoreBucket(score: Job["score"] | string | null | undefined): string {
  if (score === null || score === undefined || score === "") return "—";
  const n = typeof score === "number" ? score : parseInt(String(score), 10);
  if (Number.isNaN(n)) return "—";
  return String(Math.max(1, Math.min(10, n)));
}

function dateKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
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

const TIER_YIELD_KEYS = ["1", "1.5", "2", "3", "disqualify", "skip"] as const;
type TierYieldRow = { source: string; total: number } & Record<string, number | string>;
function aggregateTierYield(jobs: Job[]): TierYieldRow[] {
  const map: Record<string, TierYieldRow> = {};
  for (const j of jobs) {
    const s = j.source ?? "unknown";
    if (!map[s]) {
      const row: TierYieldRow = { source: s, total: 0 };
      TIER_YIELD_KEYS.forEach((k) => (row[k] = 0));
      row.unknown = 0;
      map[s] = row;
    }
    const tk = tierKeyStr(j.tier);
    const bucket = (TIER_YIELD_KEYS as readonly string[]).includes(tk)
      ? tk
      : "unknown";
    map[s][bucket] = (map[s][bucket] as number) + 1;
    map[s].total += 1;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

type ScoreHistRow = { score: string } & Record<string, number | string>;
function aggregateScoreHist(jobs: Job[], sources: string[]): ScoreHistRow[] {
  const buckets: Record<string, ScoreHistRow> = {};
  for (let n = 1; n <= 10; n++) {
    const s = String(n);
    const row: ScoreHistRow = { score: s };
    sources.forEach((src) => {
      row[src] = 0;
    });
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
  const map: Record<string, DailyRow> = {};
  for (const j of jobs) {
    const d = dateKey(j.created_at);
    if (!d) continue;
    if (!map[d]) {
      const row: DailyRow = { date: d, total: 0 };
      sources.forEach((s) => {
        row[s] = 0;
      });
      map[d] = row;
    }
    const src = j.source ?? "unknown";
    map[d][src] = ((map[d][src] as number) ?? 0) + 1;
    map[d].total += 1;
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

type FunnelRow = { stage: string; count: number };
// Canonical-only since migration 011 (Session E) — the legacy aliases
// (ready_to_submit / submit_confirmed / submitting / submitted /
// needs_review) no longer exist in data.
const APPROVED_OR_LATER = new Set([
  "approved", "preparing", "ready_for_review",
  "prefilling", "awaiting_human_submit",
  "applied", "failed",
]);
const READY_OR_LATER = new Set([
  "ready_for_review", "prefilling",
  "awaiting_human_submit", "applied",
]);
const SUBMITTED_OR_APPLIED = new Set(["applied"]);
function aggregateFunnel(jobs: Job[]): FunnelRow[] {
  let total = 0, notify = 0, approved = 0, ready = 0, submitted = 0;
  for (const j of jobs) {
    total += 1;
    const status = j.status ?? "new";
    // ``notified`` mirrors the scorer's "notify" recommendation.
    const isNotify =
      j.notified === true ||
      (j as unknown as { action?: string }).action === "notify";
    if (isNotify) notify += 1;
    if (APPROVED_OR_LATER.has(status)) approved += 1;
    if (READY_OR_LATER.has(status)) ready += 1;
    if (SUBMITTED_OR_APPLIED.has(status)) submitted += 1;
  }
  return [
    { stage: "Discovered", count: total },
    { stage: "Notify-flagged", count: notify },
    { stage: "Approved+", count: approved },
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
    const t = tierKeyStr(j.tier);
    k.byTier[t] = (k.byTier[t] ?? 0) + 1;
    const src = j.source ?? "unknown";
    k.bySource[src] = (k.bySource[src] ?? 0) + 1;
  }
  return k;
}

// ── Spend (cost tracker S5) ───────────────────────────────────────────────
// Shape returned by GET /api/dashboard/costs (aggregated from cost_events).
type CostsSummary = {
  total: { allTime: number; d30: number; d7: number };
  byStage: Record<string, number>;
  byService: Record<string, number>;
  byModel: Record<string, number>;
  daily: { date: string; usd: number }[];
  costPerApplied: number | null;
  appliedCount: number;
};

type StageSpendRow = { stage: string; usd: number };
function aggregateStageSpend(byStage: Record<string, number>): StageSpendRow[] {
  return Object.entries(byStage)
    .map(([stage, usd]) => ({ stage, usd }))
    .filter((r) => r.usd > 0)
    .sort((a, b) => b.usd - a.usd);
}

// ── Layout primitives ────────────────────────────────────────────────────

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-rule bg-bg-raised p-4 ${className}`}>
      {children}
    </section>
  );
}

/**
 * ChartFrame — fixed-height wrapper that only renders its children after
 * the client has mounted. Recharts' ResponsiveContainer measures with
 * getBoundingClientRect on first paint; under Turbopack/Next 16 that can
 * fire before layout and produce a noisy console warning.
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
  return <div style={{ height }}>{mounted ? children : null}</div>;
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
  const label = lastUpdated ? `updated ${relativeAgo(lastUpdated)}` : "loading…";
  return (
    <div className="flex items-center gap-1 text-[11px] text-ink-faint">
      <span className="tabular-nums">{label}</span>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="ml-1 border border-rule px-2 py-1 text-ink-dim transition-colors duration-150 hover:border-amber hover:text-amber disabled:opacity-50"
        title="Refresh now"
        aria-label="Refresh"
        aria-busy={refreshing || undefined}
      >
        {refreshing ? (
          <span className="inline-block h-1.5 w-1.5 bg-current motion-safe:animate-pulse" />
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
      className="border border-rule bg-bg-raised px-4 py-3"
      style={accent ? { borderLeft: `2px solid ${accent}` } : undefined}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </div>
      <div className="mt-0.5 text-2xl text-ink tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-ink-faint">{hint}</div>}
    </div>
  );
}

// ── Pattern Analysis (J-6) ────────────────────────────────────────────

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
      try {
        const res = await fetch("/api/dashboard/pattern-analyses", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          analysis?: PatternAnalysisRow | null;
          error?: string;
        };
        if (!res.ok) setError(json.error ?? `Failed to load (${res.status})`);
        else setRow(json.analysis ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <>
        <PanelHeader title="Pattern analysis" />
        <SkeletonRows rows={2} rowClassName="h-8" />
      </>
    );
  }

  if (error) {
    return <PanelHeader title="Pattern analysis" subtitle={error} />;
  }

  if (!row) {
    return (
      <PanelHeader
        title="Pattern analysis"
        subtitle="No analysis yet — run `python -m scripts.analyze_patterns` from the job-applicant repo to seed this section."
      />
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
              className={`flex items-center justify-between gap-3 border border-l-2 px-3 py-2 text-[11px] ${
                p.direction === "above"
                  ? "border-green-dim text-green"
                  : "border-red-dim text-red"
              }`}
            >
              <code>{p.group}</code>
              <span className="tabular-nums">
                response rate {Math.round(p.response_rate * 100)}% (
                {p.delta_pp_vs_global > 0 ? "+" : ""}
                {p.delta_pp_vs_global.toFixed(1)}pp vs global) · n={p.n} ·
                applied={p.applied}
              </span>
            </div>
          ))}
        </div>
      )}
      <ChartFrame mounted={mounted} height={Math.max(160, chartData.length * 28)}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.ruleSoft} />
            <XAxis type="number" domain={[0, 100]} tick={TICK} unit="%" />
            <YAxis type="category" dataKey="name" width={220} tick={TICK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar
              dataKey="response_rate"
              fill={CHART.green}
              name="Response rate %"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [costs, setCosts] = useState<CostsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Gates Recharts rendering until the client has run a layout pass.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const inFlight = useRef<Promise<void> | null>(null);

  const loadJobs = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    setRefreshing(true);
    const p = (async () => {
      // Spend summary is best-effort and independent of jobs — a costs
      // failure must not blank the rest of the page, so it rides alongside
      // but never sets the page-level error.
      const costsP = (async () => {
        try {
          const res = await fetch("/api/dashboard/costs", {
            cache: "no-store",
          });
          if (!res.ok) return;
          const json = (await res.json().catch(() => null)) as CostsSummary | null;
          if (json && json.total) setCosts(json);
        } catch {
          // Transient — the next poll retries.
        }
      })();
      try {
        const res = await fetch("/api/dashboard/jobs?view=insights", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          jobs?: Job[];
          error?: string;
        };
        if (!res.ok) setError(json.error ?? `Failed to load jobs (${res.status})`);
        else {
          setJobs(json.jobs ?? []);
          setError(null);
          setLastUpdated(new Date());
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      await costsP;
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

  // Initial load + polling; paused while the tab is hidden.
  useEffect(() => {
    void loadJobs();
    let timer: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (timer) return;
      timer = setInterval(() => {
        void loadJobs();
      }, REFRESH_INTERVAL_MS);
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
  const sources = useMemo(() => sourceShare.map((s) => s.source), [sourceShare]);
  const sourceColor = useCallback(
    (src: string) => {
      const i = sources.indexOf(src);
      return SOURCE_PALETTE[(i < 0 ? 0 : i) % SOURCE_PALETTE.length];
    },
    [sources],
  );
  const scoreHist = useMemo(
    () => aggregateScoreHist(jobs, sources),
    [jobs, sources],
  );
  const daily = useMemo(() => aggregateDaily(jobs, sources), [jobs, sources]);
  const funnel = useMemo(() => aggregateFunnel(jobs), [jobs]);
  const stageSpend = useMemo(
    () => (costs ? aggregateStageSpend(costs.byStage) : []),
    [costs],
  );

  const tierShare = (k: string) =>
    `${(((kpis.byTier[k] ?? 0) / Math.max(kpis.total, 1)) * 100).toFixed(0)}% of all`;

  if (loading) {
    return (
      <>
        <DashboardNav />
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
          <Skeleton className="mb-2 h-8 w-56" />
          <Skeleton className="mb-8 h-4 w-80" />
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <SkeletonRows rows={2} rowClassName="h-72" />
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
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <header className="mb-6">
          <h1 className="font-serif text-[26px] tracking-tight text-ink">
            Hunter insights
          </h1>
          <p className="mt-1 text-xs text-ink-dim">
            How the job-hunter is behaving — sources, tier yield, scoring,
            inflow, and the application funnel.
          </p>
        </header>

        {error && (
          <div className="mb-6 border border-red-dim px-3 py-2 text-xs text-red">
            {error}
          </div>
        )}

        {/* ── KPI tiles ─────────────────────────────────────────── */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile label="Total jobs" value={kpis.total} />
          <KpiTile
            label="Tier 1"
            value={kpis.byTier["1"] ?? 0}
            accent={TIER_COLORS["1"]}
            hint={tierShare("1")}
          />
          <KpiTile
            label="Tier 1.5"
            value={kpis.byTier["1.5"] ?? 0}
            accent={TIER_COLORS["1.5"]}
            hint={tierShare("1.5")}
          />
          <KpiTile
            label="Tier 2"
            value={kpis.byTier["2"] ?? 0}
            accent={TIER_COLORS["2"]}
            hint={tierShare("2")}
          />
          <KpiTile
            label="Tier 3"
            value={kpis.byTier["3"] ?? 0}
            accent={TIER_COLORS["3"]}
            hint={tierShare("3")}
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
            label="Submitted/Applied"
            value={funnel.find((f) => f.stage === "Submitted/Applied")?.count ?? 0}
            hint="End of the funnel"
          />
          {/* ── Spend (cost tracker S5) — amber accent groups these ── */}
          <KpiTile
            label="Total spend"
            value={formatUsd(costs?.total.allTime)}
            accent={CHART.amber}
            hint="All-time, from cost_events"
          />
          <KpiTile
            label="This week"
            value={formatUsd(costs?.total.d7)}
            accent={CHART.amber}
            hint="Trailing 7 days"
          />
          <KpiTile
            label="Cost-per-applied"
            value={formatUsd(costs?.costPerApplied)}
            accent={CHART.amber}
            hint={`Total ÷ ${costs?.appliedCount ?? 0} applied`}
          />
        </section>

        {/* ── Pattern Analysis (J-6) ────────────────────────────── */}
        <Panel className="mb-4">
          <PatternAnalysisSection mounted={mounted} />
        </Panel>

        {/* ── Pie + tier yield ──────────────────────────────────── */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                    stroke={CHART.raised}
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {sourceShare.map((entry) => (
                      <Cell key={entry.source} fill={sourceColor(entry.source)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </ChartFrame>
          </Panel>

          <Panel>
            <PanelHeader
              title="Tier yield by source"
              subtitle="Which sources actually find Tier 1/1.5/2/3 roles?"
            />
            <ChartFrame mounted={mounted} height={288}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={tierYield}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.ruleSoft} />
                  <XAxis dataKey="source" tick={TICK} />
                  <YAxis tick={TICK} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="1" stackId="t" fill={TIER_COLORS["1"]} name="Tier 1" />
                  <Bar dataKey="1.5" stackId="t" fill={TIER_COLORS["1.5"]} name="Tier 1.5" />
                  <Bar dataKey="2" stackId="t" fill={TIER_COLORS["2"]} name="Tier 2" />
                  <Bar dataKey="3" stackId="t" fill={TIER_COLORS["3"]} name="Tier 3" />
                  <Bar dataKey="disqualify" stackId="t" fill={TIER_COLORS.disqualify} name="Disqualify" />
                  <Bar dataKey="skip" stackId="t" fill={TIER_COLORS.skip} name="Skip" />
                  <Bar dataKey="unknown" stackId="t" fill={TIER_COLORS.unknown} name="Unknown" />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </Panel>
        </div>

        {/* ── Score histogram + daily line ──────────────────────── */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              title="Score histogram by source"
              subtitle="Stacked counts of Claude-assigned 1–10 scores. Right-skew = sources that surface high-quality matches."
            />
            <ChartFrame mounted={mounted} height={288}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={scoreHist}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.ruleSoft} />
                  <XAxis dataKey="score" tick={TICK} />
                  <YAxis tick={TICK} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {sources.map((src) => (
                    <Bar
                      key={src}
                      dataKey={src}
                      stackId="s"
                      fill={sourceColor(src)}
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
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.ruleSoft} />
                  <XAxis dataKey="date" tick={TICK} />
                  <YAxis tick={TICK} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={CHART.ink}
                    strokeWidth={1.5}
                    name="All sources"
                    dot={{ r: 2, fill: CHART.ink }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          </Panel>
        </div>

        {/* ── Spend (cost tracker S5) ───────────────────────────── */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              title="Daily spend"
              subtitle="USD per day across every billable call (scorer, tailor, chat, insight). The SerpAPI budget meter, realized."
            />
            <ChartFrame mounted={mounted} height={288}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={costs?.daily ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.ruleSoft} />
                  <XAxis dataKey="date" tick={TICK} />
                  <YAxis tick={TICK} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => formatUsd(Number(v), 4)}
                  />
                  <Line
                    type="monotone"
                    dataKey="usd"
                    stroke={CHART.amber}
                    strokeWidth={1.5}
                    name="Spend"
                    dot={{ r: 2, fill: CHART.amber }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          </Panel>

          <Panel>
            <PanelHeader
              title="Cost by stage"
              subtitle="Where the money goes — which pipeline stage incurs the spend."
            />
            <ChartFrame mounted={mounted} height={288}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={stageSpend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.ruleSoft} />
                  <XAxis dataKey="stage" tick={TICK} />
                  <YAxis tick={TICK} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => formatUsd(Number(v), 4)}
                  />
                  <Bar dataKey="usd" fill={CHART.amber} name="Spend" />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </Panel>
        </div>

        {/* ── Funnel ────────────────────────────────────────────── */}
        <Panel className="mb-4">
          <PanelHeader
            title="Application funnel"
            subtitle="Stages collapse — every job in stage N is also in stage N-1. Drop-offs show where work is happening (or stalling)."
          />
          <ChartFrame mounted={mounted} height={256}>
            <ResponsiveContainer>
              <BarChart data={funnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.ruleSoft} />
                <XAxis type="number" tick={TICK} />
                <YAxis type="category" dataKey="stage" width={140} tick={TICK} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill={CHART.green} name="Jobs at stage" />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Panel>

        {/* ── Status tiles (end-of-page reference) ──────────────── */}
        <Panel>
          <PanelHeader
            title="By status"
            subtitle="Snapshot of every status bucket on the jobs table."
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {Object.entries(STATUS_LABEL).map(([s, label]) => (
              <KpiTile key={s} label={label} value={kpis.byStatus[s] ?? 0} />
            ))}
          </div>
        </Panel>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Live from Supabase · {jobs.length} rows · charts deferred for v2:
          dead-link rate
        </p>
      </main>
    </>
  );
}
