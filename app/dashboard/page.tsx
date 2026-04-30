"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, type Job, type JobStatus } from "../lib/supabase";
import { AdapterBadge } from "./components/AdapterBadge";
import {
  DestructiveButton,
  GhostButton,
  InflightButton,
  PrimaryButton,
  SecondaryButton,
  type InflightState,
} from "./components/Button";
import DashboardNav from "./components/DashboardNav";
import { isActionNeeded, statusTone, toneStripeHex } from "./lib/lifecycle";
import MatchAgent from "./MatchAgent";
import ReviewPanel from "./ReviewPanel";
import RunsPanel from "./RunsPanel";

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
    ready_for_review: { bg: "bg-orange-900/40 text-orange-300 border-orange-800/60", label: "Ready for Review", icon: "orange" },
    prefilling: { bg: "bg-violet-900/40 text-violet-300 border-violet-800/60", label: "Pre-filling", icon: "spinner" },
    awaiting_human_submit: { bg: "bg-amber-900/40 text-amber-300 border-amber-800/60", label: "Awaiting Submit", icon: "orange" },
    ready_to_submit: { bg: "bg-orange-900/40 text-orange-300 border-orange-800/60", label: "Ready", icon: "orange" },
    submit_confirmed: { bg: "bg-yellow-900/40 text-yellow-300 border-yellow-800/60", label: "Confirmed" },
    submitting: { bg: "bg-violet-900/40 text-violet-300 border-violet-800/60", label: "Submitting", icon: "spinner" },
    needs_review: { bg: "bg-amber-900/40 text-amber-300 border-amber-800/60", label: "Needs Review", icon: "orange" },
    submitted: { bg: "bg-emerald-900/40 text-emerald-300 border-emerald-800/60", label: "Submitted", icon: "check" },
    applied: { bg: "bg-emerald-900/40 text-emerald-300 border-emerald-800/60", label: "Applied", icon: "check" },
    failed: { bg: "bg-red-900/40 text-red-300 border-red-800/60", label: "Failed", icon: "x" },
    skipped: { bg: "bg-neutral-900/40 text-neutral-500 border-neutral-800", label: "Skipped" },
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
  "submitting",
  "needs_review",
  "submitted",
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
  const [reviewJob, setReviewJob] = useState<Job | null>(null);

  function openJobPanel(job: Job) {
    if ((job.status ?? "new") === "ready_to_submit") {
      setReviewJob(job);
    } else {
      setMatchJob(job);
    }
  }

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
      <DashboardNav
        rightSlot={<ViewToggle view={view} onChange={chooseView} />}
      />
      {view === "swipe" ? (
        <SwipeView
          jobs={jobs}
          error={error}
          updateStatus={updateStatus}
          openMatch={openJobPanel}
        />
      ) : (
        <BrowseView
          jobs={jobs}
          error={error}
          updateStatus={updateStatus}
          openMatch={openJobPanel}
        />
      )}
      {matchJob && <MatchAgent job={matchJob} onClose={() => setMatchJob(null)} />}
      {reviewJob && (
        <ReviewPanel
          job={reviewJob}
          onClose={() => setReviewJob(null)}
          onUpdateStatus={updateStatus}
        />
      )}
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
}: {
  jobs: Job[];
  error: string | null;
  updateStatus: (j: Job, s: JobStatus) => void;
  openMatch: (j: Job) => void;
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
          <h1 className="text-2xl font-semibold mb-6">Job swipe</h1>
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
        <span className="text-xs text-neutral-500 font-mono">
          {current ? `${index + 1} / ${queue.length}` : `${queue.length} done`}
        </span>
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
        <p className="text-sm text-neutral-400 mt-1">
          {job.company}
          {job.location ? ` · ${job.location}` : ""}
        </p>
        {relativeTime(job.created_at) && (
          <p className="text-[11px] text-neutral-500 mt-1 font-mono">
            Found {relativeTime(job.created_at)}
          </p>
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
}: {
  jobs: Job[];
  error: string | null;
  updateStatus: (j: Job, s: JobStatus) => void;
  openMatch: (j: Job) => void;
}) {
  const [tierFilter, setTierFilter] = useState<"all" | 1 | 2 | 3>("all");
  const [minScore, setMinScore] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
      if (statusFilter !== "all") {
        const js = j.status ?? "new";
        if (statusFilter === "unreviewed" && js !== "new") return false;
        if (
          statusFilter === "in_progress" &&
          // M-2 in-flight system work + legacy 'submitting'
          !["approved", "preparing", "prefilling", "submitting"].includes(js)
        )
          return false;
        if (
          statusFilter === "needs_action" &&
          // M-2 reviewer-attention states + legacy aliases
          ![
            "ready_for_review",
            "awaiting_human_submit",
            "ready_to_submit",
            "submit_confirmed",
            "needs_review",
          ].includes(js)
        )
          return false;
        if (
          statusFilter === "done" &&
          // M-2 terminal states + legacy 'submitted'
          !["applied", "submitted", "failed", "ignored", "skipped", "expired"].includes(js)
        )
          return false;
      }
      if (locationFilter !== "all" && locationBucket(j.location) !== locationFilter) return false;
      return true;
    });
  }, [jobs, tierFilter, minScore, sourceFilter, statusFilter, locationFilter]);

  // PR-23 — split the filtered list into rows that need the user's
  // attention vs. everything else. Action-needed rows render in a
  // dedicated section at the top regardless of tier; they are
  // intentionally NOT duplicated into the tier groupings below.
  const actionNeededList = useMemo(
    () => filtered.filter((j) => isActionNeeded(j.status)),
    [filtered],
  );

  const grouped = useMemo(() => {
    const g: Record<string, Job[]> = { "1": [], "2": [], "3": [], other: [] };
    filtered.forEach((j) => {
      if (isActionNeeded(j.status)) return;
      const k = j.tier ? String(j.tier) : "other";
      if (!g[k]) g[k] = [];
      g[k].push(j);
    });
    return g;
  }, [filtered]);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-12 max-w-6xl mx-auto bg-black text-neutral-100">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-100">
          Job dashboard
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {`${filtered.length} of ${jobs.length} jobs`}
        </p>
      </header>

      <RunsPanel />

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
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="in_progress">In Progress</option>
            <option value="needs_action">Needs Action</option>
            <option value="done">Done / Archived</option>
          </select>
        </label>
      </section>

      {error && (
        <div className="mb-6 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* PR-23 add (b) — Action needed section is always rendered, even
          when empty, so the dashboard's vertical rhythm doesn't shift
          as rows transition through this state. */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-neutral-200 uppercase tracking-wide mb-3 flex items-center gap-2">
          Action needed
          {actionNeededList.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-700 bg-amber-900/40 text-amber-200">
              {actionNeededList.length}
            </span>
          )}
        </h2>
        {actionNeededList.length === 0 ? (
          <p className="text-sm text-neutral-500 italic">
            All caught up — no actions waiting.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {actionNeededList.map((job) => (
              <BrowseCard
                key={job.id}
                job={job}
                onStatus={(s) => updateStatus(job, s)}
                onApply={() => openMatch(job)}
              />
            ))}
          </div>
        )}
      </section>

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

// Review Materials Link — styled like an InflightButton-warn since the
// surrounding lifecycle stripe is amber on `ready_for_review` rows. We
// don't use the Button primitive here because Next.js Link renders its
// own anchor and we want to preserve client-side navigation semantics.
const REVIEW_LINK_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded border " +
  "transition-colors text-xs px-3 py-1.5 " +
  "border-amber-700 bg-amber-900/40 text-amber-100 hover:bg-amber-800/60 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-black focus-visible:ring-amber-500";

function ActionButtons({
  job,
  onStatus,
  onOpen,
}: {
  job: Job;
  onStatus: (s: JobStatus) => void;
  onOpen: () => void;
}) {
  const s = job.status ?? "new";

  // PR-14 — per-row tailor dispatch state. Local to this card; the
  // parent's poll will replace the optimistic "queued" state with the
  // real "preparing" status the moment the GHA workflow picks up the
  // row. Error state is surfaced inline so a 400 (e.g. row no longer
  // approved, GHA dispatch 404) is visible without opening DevTools.
  const [tailorState, setTailorState] = useState<
    "idle" | "queueing" | "queued" | "error"
  >("idle");
  const [tailorError, setTailorError] = useState<string | null>(null);

  // PR-23 add (a) — Reject is destructive (the row was already
  // approved + tailored, so reverting wipes that work). Confirm before
  // firing so an accidental click doesn't lose materials.
  const handleReject = () => {
    const ok = window.confirm(
      "Reject this row? Tailored materials will be discarded.",
    );
    if (ok) onStatus("new");
  };

  const handleTailor = async () => {
    setTailorState("queueing");
    setTailorError(null);
    try {
      const res = await fetch("/api/dashboard/runs/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        run_id?: string;
        error?: string;
      };
      if (res.ok && json.run_id) {
        setTailorState("queued");
      } else {
        setTailorState("error");
        setTailorError(
          json.error ?? `Failed to dispatch tailor (${res.status})`,
        );
      }
    } catch (e) {
      setTailorState("error");
      setTailorError(e instanceof Error ? e.message : String(e));
    }
  };

  switch (s) {
    case "new":
      return (
        <div className="flex items-center gap-2">
          <PrimaryButton
            onClick={() => {
              onStatus("approved");
              onOpen();
            }}
          >
            Approve
          </PrimaryButton>
          <SecondaryButton onClick={() => onStatus("ignored")}>
            Ignore
          </SecondaryButton>
        </div>
      );

    case "approved": {
      // PR-14: per-row Tailor button. While the row is still 'approved'
      // (i.e. the GHA workflow hasn't picked it up yet), show a button
      // that POSTs job_id to /api/dashboard/runs/tailor. Once the
      // workflow flips the row to 'preparing', the parent re-renders
      // and the 'preparing' branch below takes over.
      if (tailorState === "queued") {
        return (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-violet-400 italic">
              Tailor queued…
            </span>
            <GhostButton onClick={() => onStatus("new")}>Undo</GhostButton>
          </div>
        );
      }
      const inflightState: InflightState =
        tailorState === "queueing" ? "queueing" : "idle";
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <InflightButton
            onClick={handleTailor}
            state={inflightState}
            idleLabel="Tailor"
            queueingLabel="Queueing…"
          />
          <GhostButton onClick={() => onStatus("new")}>Undo</GhostButton>
          {tailorState === "error" && tailorError && (
            <span
              className="text-[11px] text-red-400 truncate max-w-xs"
              title={tailorError}
            >
              {tailorError.slice(0, 80)}
            </span>
          )}
        </div>
      );
    }
    case "preparing":
      return (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-500 italic">
            Agent is tailoring materials…
          </span>
          <GhostButton onClick={() => onStatus("new")}>Undo</GhostButton>
        </div>
      );

    case "ready_for_review":
    case "ready_to_submit":
      // M-2/M-6: tailored materials are ready. Hand off to the cockpit at
      // /dashboard/review/[job_id] which is the new source of truth for
      // pre-fill + Mark Applied. ready_to_submit is a legacy alias kept
      // for safety after migration 007 collapsed it.
      return (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/review/${job.id}`} className={REVIEW_LINK_CLASS}>
            Review Materials
          </Link>
          <DestructiveButton onClick={handleReject}>Reject</DestructiveButton>
        </div>
      );

    case "submit_confirmed":
      return (
        <span className="text-[11px] text-yellow-400/70 italic">
          Awaiting submission…
        </span>
      );

    case "applied":
      return (
        <span className="text-[11px] text-emerald-400/70">
          Applied {relativeTime(job.applied_at) ?? ""}
        </span>
      );

    case "failed":
      return (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-red-400/70">
            Failed
            {job.failure_reason ? `: ${job.failure_reason.slice(0, 60)}` : ""}
          </span>
          <SecondaryButton onClick={() => onStatus("approved")}>
            Retry
          </SecondaryButton>
        </div>
      );

    case "ignored":
      return (
        <GhostButton onClick={() => onStatus("new")}>Restore</GhostButton>
      );

    default:
      return null;
  }
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
  const age = relativeTime(job.created_at);
  const tone = statusTone(job.status);
  const stripe = toneStripeHex(tone);
  // Muted lifecycle states (skipped / ignored / expired) fade so the
  // active rows dominate the visual hierarchy without disappearing
  // entirely — the user can still see them when scanning history.
  const cardOpacity = tone === "muted" ? "opacity-60" : "";

  return (
    <article
      className={`rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 flex flex-col gap-2 ${cardOpacity}`}
      style={stripe ? { borderLeft: `3px solid ${stripe}` } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 flex-wrap">
            <LocationBadge bucket={bucket} />
            <StatusBadge status={job.status} />
            {age && (
              <span className="text-[10px] text-neutral-600 font-mono">{age}</span>
            )}
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

      <div className="flex items-center justify-between mt-1 gap-2 flex-wrap">
        <ActionButtons job={job} onStatus={onStatus} onOpen={onApply} />
        <div className="flex items-center gap-2 ml-auto">
          {job.source && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-950 text-neutral-600">
              {job.source}
            </span>
          )}
          <AdapterBadge atsKind={job.ats_kind} />
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-2.5 py-1 rounded border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
            >
              Posting ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
