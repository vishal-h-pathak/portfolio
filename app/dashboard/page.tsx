"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, type Job, type JobStatus } from "../lib/supabase";
import MatchAgent from "./MatchAgent";

type TierFilter = "all" | 1 | 2 | 3;
type ViewMode = "swipe" | "browse";
type LocationBucket = "local" | "elsewhere";
type LocationFilter = "all" | LocationBucket;

function locationBucket(location: string | null | undefined): LocationBucket {
  if (!location) return "elsewhere";
  const l = location.toLowerCase();
  if (l.includes("atlanta") || /\bga\b/.test(l)) return "local";
  if (l.includes("remote") || l.includes("anywhere")) return "local";
  if (l.includes("hybrid")) {
    // "Hybrid" alone → local; "Hybrid - NYC" or "Hybrid, SF" → elsewhere
    const stripped = l.replace(/hybrid/g, "").replace(/[\s,\-/|()]+/g, "");
    if (stripped.length === 0) return "local";
    return "elsewhere";
  }
  return "elsewhere";
}

function LocationBadge({ bucket }: { bucket: LocationBucket }) {
  const cls =
    bucket === "local"
      ? "bg-emerald-900/40 text-emerald-300 border-emerald-800/60"
      : "bg-amber-900/40 text-amber-300 border-amber-800/60";
  return (
    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${cls}`}>
      {bucket === "local" ? "Local/Remote" : "Elsewhere"}
    </span>
  );
}

function StatusBadge({ status }: { status: JobStatus | null }) {
  const s = status ?? "new";
  const config: Record<string, { bg: string; label: string; icon?: string }> = {
    new: { bg: "bg-neutral-800 text-neutral-300 border-neutral-700", label: "New" },
    approved: { bg: "bg-blue-900/40 text-blue-300 border-blue-800/60", label: "Approved" },
    preparing: { bg: "bg-violet-900/40 text-violet-300 border-violet-800/60", label: "Preparing", icon: "spinner" },
    ready_to_submit: { bg: "bg-orange-900/40 text-orange-300 border-orange-800/60", label: "Ready", icon: "orange" },
    submit_confirmed: { bg: "bg-yellow-900/40 text-yellow-300 border-yellow-800/60", label: "Confirmed" },
    applied: { bg: "bg-emerald-900/40 text-emerald-300 border-emerald-800/60", label: "Applied", icon: "check" },
    failed: { bg: "bg-red-900/40 text-red-300 border-red-800/60", label: "Failed", icon: "x" },
    ignored: { bg: "bg-neutral-900/40 text-neutral-500 border-neutral-800", label: "Ignored" },
  };
  const c = config[s] ?? config.new;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${c.bg}`}>
      {c.icon === "spinner" && (
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {c.icon === "check" && <span>&#10003;</span>}
      {c.icon === "x" && <span>&#10007;</span>}
      {c.icon === "orange" && <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />}
      {c.label}
    </span>
  );
}

const STATUSES: JobStatus[] = [
  "new",
  "approved",
  "preparing",
  "ready_to_submit",
  "submit_confirmed",
  "applied",
  "failed",
  "ignored",
];
const TIERS = [1, 2, 3] as const;

const tierLabel: Record<number, string> = {
  1: "Tier 1 — Neuro / neuromorphic / BCI",
  2: "Tier 2 — Sales engineering",
  3: "Tier 3 — Mission-driven ML/CV",
};

const VIEW_STORAGE_KEY = "dashboard:viewMode";

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "today" : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchJob, setMatchJob] = useState<Job | null>(null);

  const [view, setView] = useState<ViewMode | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null;
    if (stored === "swipe" || stored === "browse") {
      setView(stored);
    } else {
      setView(window.innerWidth < 768 ? "swipe" : "browse");
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("score", { ascending: false });
      if (error) setError(error.message);
      else setJobs((data ?? []) as Job[]);
      setLoading(false);
    })();
  }, []);

  function chooseView(v: ViewMode) {
    setView(v);
    localStorage.setItem(VIEW_STORAGE_KEY, v);
  }

  async function updateStatus(job: Job, status: JobStatus) {
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status } : j)));
    const { error } = await supabase.from("jobs").update({ status }).eq("id", job.id);
    if (error) setError(error.message);
  }

  if (loading || view === null) {
    return (
      <main className="min-h-screen flex items-center justify-center text-neutral-500 text-sm bg-black">
        loading…
      </main>
    );
  }

  return (
    <>
      {view === "swipe" ? (
        <SwipeView
          jobs={jobs}
          error={error}
          updateStatus={updateStatus}
          openMatch={setMatchJob}
          viewToggle={<ViewToggle view={view} onChange={chooseView} />}
        />
      ) : (
        <BrowseView
          jobs={jobs}
          error={error}
          updateStatus={updateStatus}
          openMatch={setMatchJob}
          viewToggle={<ViewToggle view={view} onChange={chooseView} />}
        />
      )}
      {matchJob && <MatchAgent job={matchJob} onClose={() => setMatchJob(null)} />}
    </>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-neutral-800 bg-neutral-950 p-0.5 text-xs">
      {(["swipe", "browse"] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-full transition ${
            view === v
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-400 hover:text-neutral-100"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Swipe view ---------------- */

function SwipeView({
  jobs,
  error,
  updateStatus,
  openMatch,
  viewToggle,
}: {
  jobs: Job[];
  error: string | null;
  updateStatus: (j: Job, s: JobStatus) => void;
  openMatch: (j: Job) => void;
  viewToggle: React.ReactNode;
}) {
  const [tierFilter, setTierFilter] = useState<TierFilter | null>(null);
  const [index, setIndex] = useState(0);
  const [locationBucketFilter, setLocationBucketFilter] = useState<LocationBucket>("local");

  const queue = useMemo(() => {
    if (tierFilter === null) return [];
    return jobs.filter((j) => {
      if ((j.status ?? "new") !== "new") return false;
      if (tierFilter !== "all" && j.tier !== tierFilter) return false;
      if (locationBucket(j.location) !== locationBucketFilter) return false;
      return true;
    });
  }, [jobs, tierFilter, locationBucketFilter]);

  const tierCounts = useMemo(() => {
    const c = { all: 0, 1: 0, 2: 0, 3: 0 } as Record<string, number>;
    jobs.forEach((j) => {
      if ((j.status ?? "new") !== "new") return;
      if (locationBucket(j.location) !== locationBucketFilter) return;
      c.all += 1;
      if (j.tier === 1 || j.tier === 2 || j.tier === 3) c[String(j.tier)] += 1;
    });
    return c;
  }, [jobs, locationBucketFilter]);

  function changeBucket(b: LocationBucket) {
    setLocationBucketFilter(b);
    setIndex(0);
  }

  function handleSwipe(job: Job, direction: "left" | "right") {
    if (direction === "right") {
      updateStatus(job, "approved");
      openMatch(job);
    } else {
      updateStatus(job, "ignored");
    }
    setIndex((i) => i + 1);
  }

  if (tierFilter === null) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-black text-neutral-100">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Job swipe</h1>
            {viewToggle}
          </div>
          <p className="text-sm text-neutral-500 mb-4">Pick a tier to start.</p>
          <div className="mb-6">
            <BucketToggle bucket={locationBucketFilter} onChange={changeBucket} />
          </div>
          {error && (
            <div className="mb-4 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <TierButton
              label="All tiers"
              count={tierCounts.all}
              onClick={() => setTierFilter("all")}
            />
            {[1, 2, 3].map((t) => (
              <TierButton
                key={t}
                label={tierLabel[t]}
                count={tierCounts[String(t)]}
                onClick={() => setTierFilter(t as 1 | 2 | 3)}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const current = queue[index];
  const next = queue[index + 1];
  const remaining = queue.length - index;

  return (
    <main className="min-h-screen flex flex-col bg-black text-neutral-100 overflow-hidden">
      <header className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0 gap-3">
        <button
          onClick={() => {
            setTierFilter(null);
            setIndex(0);
          }}
          className="text-sm text-neutral-400 hover:text-neutral-100"
        >
          ← tiers
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 font-mono">
            {current ? `${index + 1} / ${queue.length}` : `${queue.length} done`}
          </span>
          {viewToggle}
        </div>
      </header>

      <div className="px-4 pb-2 shrink-0">
        <BucketToggle bucket={locationBucketFilter} onChange={changeBucket} />
      </div>

      <div className="relative flex-1 px-4 pb-4">
        {current ? (
          <>
            {next && <SwipeCard key={`next-${next.id}`} job={next} behind />}
            <SwipeCard
              key={`cur-${current.id}`}
              job={current}
              onSwipe={(dir) => handleSwipe(current, dir)}
            />
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-500 text-sm text-center">
            <div>
              <div className="mb-2">No more jobs in this tier.</div>
              <button
                onClick={() => {
                  setTierFilter(null);
                  setIndex(0);
                }}
                className="text-neutral-300 underline underline-offset-4"
              >
                Pick another tier
              </button>
            </div>
          </div>
        )}
      </div>

      {current && (
        <div className="flex items-center justify-center gap-10 pb-10 pt-2 shrink-0">
          <button
            onClick={() => handleSwipe(current, "left")}
            aria-label="Skip"
            className="w-16 h-16 rounded-full border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 active:scale-95 transition flex items-center justify-center text-2xl text-red-400"
          >
            ✕
          </button>
          <button
            onClick={() => handleSwipe(current, "right")}
            aria-label="Interested"
            className="w-16 h-16 rounded-full border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 active:scale-95 transition flex items-center justify-center text-2xl text-emerald-400"
          >
            ✓
          </button>
        </div>
      )}

      <div className="px-4 pb-3 text-center text-[10px] uppercase tracking-widest text-neutral-700 shrink-0">
        {remaining > 0 && `${remaining} left`}
      </div>
    </main>
  );
}

function BucketToggle({
  bucket,
  onChange,
}: {
  bucket: LocationBucket;
  onChange: (b: LocationBucket) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-neutral-800 bg-neutral-950 p-0.5 text-xs">
      {(["local", "elsewhere"] as const).map((b) => (
        <button
          key={b}
          onClick={() => onChange(b)}
          className={`px-3 py-1 rounded-full transition ${
            bucket === b
              ? b === "local"
                ? "bg-emerald-500/90 text-neutral-900"
                : "bg-amber-500/90 text-neutral-900"
              : "text-neutral-400 hover:text-neutral-100"
          }`}
        >
          {b === "local" ? "Local/Remote" : "Elsewhere"}
        </button>
      ))}
    </div>
  );
}

function TierButton({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  const disabled = count === 0;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left px-4 py-4 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 disabled:opacity-40 disabled:hover:bg-neutral-950 flex items-center justify-between"
    >
      <span className="text-sm">{label}</span>
      <span className="text-xs font-mono text-neutral-500">{count}</span>
    </button>
  );
}

function SwipeCard({
  job,
  onSwipe,
  behind,
}: {
  job: Job;
  onSwipe?: (dir: "left" | "right") => void;
  behind?: boolean;
}) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [flying, setFlying] = useState<"left" | "right" | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const interactive = !!onSwipe && !behind;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || flying) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0 });
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || flying) return;
    const start = startRef.current;
    if (!start) return;
    setDrag({ x: e.clientX - start.x, y: e.clientY - start.y });
  }

  function onPointerUp() {
    if (!interactive || flying) return;
    const d = drag;
    startRef.current = null;
    if (!d) return;
    const threshold = 110;
    if (d.x > threshold) {
      setFlying("right");
      setTimeout(() => onSwipe?.("right"), 280);
    } else if (d.x < -threshold) {
      setFlying("left");
      setTimeout(() => onSwipe?.("left"), 280);
    } else {
      setDrag(null);
    }
  }

  const dx = flying === "right" ? 600 : flying === "left" ? -600 : drag?.x ?? 0;
  const dy = drag?.y ?? 0;
  const rot = dx / 18;
  const opacity = flying ? 0 : 1;

  const tierColor =
    job.tier === 1
      ? "bg-emerald-900/40 text-emerald-300 border-emerald-800/60"
      : job.tier === 2
      ? "bg-amber-900/40 text-amber-300 border-amber-800/60"
      : job.tier === 3
      ? "bg-sky-900/40 text-sky-300 border-sky-800/60"
      : "bg-neutral-800 text-neutral-400 border-neutral-700";

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`absolute inset-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col select-none ${
        behind ? "pointer-events-none" : "touch-none cursor-grab active:cursor-grabbing"
      }`}
      style={{
        transform: behind
          ? "scale(0.95) translateY(12px)"
          : `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
        opacity: behind ? 0.5 : opacity,
        transition:
          flying || (!drag && !behind)
            ? "transform 280ms ease-out, opacity 280ms ease-out"
            : behind
            ? "transform 200ms ease-out"
            : "none",
        zIndex: behind ? 1 : 2,
        boxShadow: behind ? "none" : "0 20px 60px -20px rgba(0,0,0,0.8)",
      }}
    >
      {!behind && drag && Math.abs(drag.x) > 20 && (
        <div
          className={`absolute top-6 ${
            drag.x > 0 ? "left-6 border-emerald-400 text-emerald-400" : "right-6 border-red-400 text-red-400"
          } border-2 rounded-md px-3 py-1 text-sm font-bold tracking-wider rotate-[-8deg]`}
          style={{ opacity: Math.min(1, Math.abs(drag.x) / 110) }}
        >
          {drag.x > 0 ? "APPROVE" : "SKIP"}
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${tierColor}`}>
            {job.tier ? `Tier ${job.tier}` : "Untiered"}
          </span>
          <LocationBadge bucket={locationBucket(job.location)} />
        </div>
        <div className="text-right">
          <div className="text-xs text-neutral-500 uppercase tracking-wide">Score</div>
          <div className="font-mono text-xl text-neutral-100">{job.score ?? "—"}</div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold text-neutral-100 leading-tight">
          {job.title}
        </h2>
        <p className="text-sm text-neutral-400 mt-1">{job.company}</p>
        {relativeTime(job.created_at) && (
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {relativeTime(job.created_at)}
          </p>
        )}
        {job.location && (
          <p className="text-xs text-neutral-500 mt-0.5">{job.location}</p>
        )}
      </div>

      {job.reasoning && (
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="text-[10px] uppercase tracking-widest text-neutral-600 mb-2">
            Why it matched
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
            {job.reasoning}
          </p>
        </div>
      )}

      {job.url && !behind && (
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="mt-4 text-xs text-neutral-500 hover:text-neutral-200 self-start"
        >
          View posting ↗
        </a>
      )}
    </div>
  );
}

/* ---------------- Browse view ---------------- */

function BrowseView({
  jobs,
  error,
  updateStatus,
  openMatch,
  viewToggle,
}: {
  jobs: Job[];
  error: string | null;
  updateStatus: (j: Job, s: JobStatus) => void;
  openMatch: (j: Job) => void;
  viewToggle: React.ReactNode;
}) {
  const [tierFilter, setTierFilter] = useState<"all" | 1 | 2 | 3>("all");
  const [minScore, setMinScore] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("local");

  const sources = useMemo(() => {
    const s = new Set<string>();
    jobs.forEach((j) => j.source && s.add(j.source));
    return Array.from(s).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (tierFilter !== "all" && j.tier !== tierFilter) return false;
      if ((j.score ?? 0) < minScore) return false;
      if (sourceFilter !== "all" && j.source !== sourceFilter) return false;
      if (statusFilter !== "all" && (j.status ?? "new") !== statusFilter) return false;
      if (locationFilter !== "all" && locationBucket(j.location) !== locationFilter) return false;
      return true;
    });
  }, [jobs, tierFilter, minScore, sourceFilter, statusFilter, locationFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, Job[]> = { "1": [], "2": [], "3": [], other: [] };
    filtered.forEach((j) => {
      const k = j.tier ? String(j.tier) : "other";
      if (!g[k]) g[k] = [];
      g[k].push(j);
    });
    return g;
  }, [filtered]);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-12 max-w-6xl mx-auto bg-black text-neutral-100">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-100">
            Job dashboard
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {`${filtered.length} of ${jobs.length} jobs`}
          </p>
        </div>
        {viewToggle}
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs uppercase tracking-wide">Location</span>
          <select
            className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value as LocationFilter)}
          >
            <option value="all">All</option>
            <option value="local">Local+Remote only</option>
            <option value="elsewhere">Elsewhere only</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs uppercase tracking-wide">Tier</span>
          <select
            className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5"
            value={String(tierFilter)}
            onChange={(e) =>
              setTierFilter(e.target.value === "all" ? "all" : (Number(e.target.value) as 1 | 2 | 3))
            }
          >
            <option value="all">All</option>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                Tier {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs uppercase tracking-wide">
            Min score: {minScore}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="accent-neutral-300 mt-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs uppercase tracking-wide">Source</span>
          <select
            className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">All</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-neutral-500 text-xs uppercase tracking-wide">Status</span>
          <select
            className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as JobStatus | "all")}
          >
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && (
        <div className="mb-6 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {(["1", "2", "3", "other"] as const).map((k) => {
        const list = grouped[k];
        if (!list || list.length === 0) return null;
        return (
          <section key={k} className="mb-10">
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-3">
              {k === "other" ? "Untiered" : tierLabel[Number(k)]}
              <span className="text-neutral-600 ml-2">({list.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((job) => (
                <BrowseCard
                  key={job.id}
                  job={job}
                  onStatus={(s) => updateStatus(job, s)}
                  onApply={() => openMatch(job)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

function BrowseCard({
  job,
  onStatus,
  onApply,
}: {
  job: Job;
  onStatus: (s: JobStatus) => void;
  onApply: () => void;
}) {
  const bucket = locationBucket(job.location);
  return (
    <article className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <LocationBadge bucket={bucket} />
            <StatusBadge status={job.status} />
          </div>
          <h3 className="font-medium text-neutral-100 truncate">{job.title}</h3>
          <p className="text-sm text-neutral-400 truncate">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end shrink-0 text-xs">
          <span className="font-mono text-neutral-300">{job.score ?? "—"}</span>
          {job.tier && (
            <span className="text-neutral-500 mt-0.5">T{job.tier}</span>
          )}
        </div>
      </div>

      {job.reasoning && (
        <p className="text-xs text-neutral-500 leading-relaxed line-clamp-4">
          {job.reasoning}
        </p>
      )}

      <div className="flex items-center gap-2 mt-1">
        <select
          value={job.status ?? "new"}
          onChange={(e) => onStatus(e.target.value as JobStatus)}
          className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-300"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={onApply}
          className="text-xs px-2.5 py-1 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-100"
        >
          Apply
        </button>
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs px-2.5 py-1 rounded border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 ml-auto"
          >
            Posting ↗
          </a>
        )}
      </div>

      {(job.source || job.created_at) && (
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          {job.source && (
            <span className="px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-950">
              {job.source}
            </span>
          )}
          {relativeTime(job.created_at) && <span>{relativeTime(job.created_at)}</span>}
        </div>
      )}
    </article>
  );
}
