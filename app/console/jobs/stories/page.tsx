"use client";

/**
 * /console/jobs/stories — STAR+R interview-prep bank (J-3).
 *
 * Browse stories generated as a side effect of every tailoring run.
 * Filter by archetype + tag, multi-select to mark "master" stories, and
 * export the selected set as a markdown brief for an upcoming interview.
 *
 * Star/unstar is optimistic with visible rollback + toast on failure.
 */

import { useEffect, useMemo, useState } from "react";
import { Btn } from "../components/Button";
import DashboardNav from "../components/DashboardNav";
import { Pill } from "../components/JobBadges";
import { Skeleton, SkeletonRows } from "../components/Skeleton";
import { requestJSON } from "../lib/api";
import { useOptimisticAction } from "../lib/useOptimisticAction";

type StarStory = {
  id: number;
  job_id: string | null;
  archetype: string | null;
  company: string | null;
  role: string | null;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  tags: string[];
  is_master: boolean;
  created_at: string;
};

function MasterStarToggle({
  isMaster,
  pending,
  onChange,
}: {
  isMaster: boolean;
  pending: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!isMaster)}
      aria-busy={pending || undefined}
      className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-150 active:duration-0 ${
        pending ? "opacity-50" : ""
      } ${
        isMaster
          ? "border-amber text-amber"
          : "border-rule text-ink-faint hover:border-amber hover:text-amber"
      }`}
      title={isMaster ? "In master set" : "Mark as master"}
    >
      {isMaster ? "★ master" : "☆ promote"}
    </button>
  );
}

function StoryCard({
  story,
  selected,
  starPending,
  onToggleSelect,
  onToggleMaster,
}: {
  story: StarStory;
  selected: boolean;
  starPending: boolean;
  onToggleSelect: () => void;
  onToggleMaster: (next: boolean) => void;
}) {
  const fields: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: "Situation", value: story.situation },
    { label: "Task", value: story.task },
    { label: "Action", value: story.action },
    { label: "Result", value: story.result },
    { label: "Reflection", value: story.reflection, accent: true },
  ];
  return (
    <article
      className={`border bg-bg-raised p-4 transition-colors duration-150 ${
        selected ? "border-amber bg-bg-card" : "border-rule"
      }`}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-ink-dim">
            {story.company ?? "—"}
            {story.role ? ` · ${story.role}` : ""}
          </div>
          {story.archetype && (
            <span className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              {story.archetype}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MasterStarToggle
            isMaster={story.is_master}
            pending={starPending}
            onChange={onToggleMaster}
          />
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-3.5 w-3.5 accent-amber"
            title="Include in export"
            aria-label={`Select story from ${story.company ?? "unknown"}`}
          />
        </div>
      </header>

      <dl className="space-y-2 text-xs leading-relaxed">
        {fields.map((f) => (
          <div key={f.label}>
            <dt
              className={`text-[10px] uppercase tracking-[0.18em] ${
                f.accent ? "text-amber" : "text-ink-faint"
              }`}
            >
              {f.label}
            </dt>
            <dd className={f.accent ? "text-amber" : "text-ink-dim"}>{f.value}</dd>
          </div>
        ))}
      </dl>

      {story.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {story.tags.map((t) => (
            <Pill key={t} tone="dim">
              {t}
            </Pill>
          ))}
        </div>
      )}
    </article>
  );
}

function exportToMarkdown(stories: StarStory[]): string {
  const lines: string[] = [];
  lines.push("# Master STAR+R Stories");
  lines.push("");
  lines.push(
    `Exported ${stories.length} stories on ${new Date().toLocaleDateString()}.`,
  );
  lines.push("");
  for (const s of stories) {
    const heading = `${s.company ?? "Story"}${s.role ? ` · ${s.role}` : ""}`;
    lines.push(`## ${heading}`);
    if (s.archetype) lines.push(`*Archetype: ${s.archetype}*`);
    if (s.tags?.length) lines.push(`*Tags: ${s.tags.join(", ")}*`);
    lines.push("");
    lines.push(`**Situation.** ${s.situation}`);
    lines.push("");
    lines.push(`**Task.** ${s.task}`);
    lines.push("");
    lines.push(`**Action.** ${s.action}`);
    lines.push("");
    lines.push(`**Result.** ${s.result}`);
    lines.push("");
    lines.push(`**Reflection.** ${s.reflection}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

export default function StoriesPage() {
  const [stories, setStories] = useState<StarStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archetypeFilter, setArchetypeFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [masterOnly, setMasterOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const act = useOptimisticAction();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/console/dashboard/stories", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          stories?: StarStory[];
          error?: string;
        };
        if (!res.ok)
          setError(json.error ?? `Failed to load stories (${res.status})`);
        else setStories(json.stories ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, []);

  const archetypes = useMemo(() => {
    const set = new Set<string>();
    for (const s of stories) {
      if (s.archetype) set.add(s.archetype);
    }
    return Array.from(set).sort();
  }, [stories]);

  const filtered = useMemo(() => {
    return stories.filter((s) => {
      if (archetypeFilter !== "all" && s.archetype !== archetypeFilter)
        return false;
      if (tagFilter.trim()) {
        const needle = tagFilter.toLowerCase();
        if (!s.tags?.some((t) => t.toLowerCase().includes(needle))) return false;
      }
      if (masterOnly && !s.is_master) return false;
      return true;
    });
  }, [stories, archetypeFilter, tagFilter, masterOnly]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMaster(id: number, next: boolean) {
    void act.run(`star:${id}`, {
      optimistic: () => {
        setStories((prev) =>
          prev.map((s) => (s.id === id ? { ...s, is_master: next } : s)),
        );
        return () =>
          setStories((prev) =>
            prev.map((s) => (s.id === id ? { ...s, is_master: !next } : s)),
          );
      },
      perform: () =>
        requestJSON("PATCH", `/api/console/dashboard/stories/${id}`, {
          is_master: next,
        }),
      errorLabel: next ? "Promote" : "Unstar",
    });
  }

  function exportSelected() {
    const picked = stories.filter((s) => selectedIds.has(s.id));
    if (picked.length === 0) return;
    const md = exportToMarkdown(picked);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `master-stories-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <DashboardNav />
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
        <header className="mb-6">
          <h1 className="font-serif text-[26px] tracking-tight text-ink">
            STAR+R stories
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-dim">
            Stories generated as a side effect of every tailoring run.
            Filter by archetype or tag, mark{" "}
            <span className="text-amber">★ master</span> the 5–10 you&apos;ll
            lean on in interviews, multi-select to export a markdown brief
            for an upcoming round.
          </p>
        </header>

        <section className="mb-6 flex flex-wrap items-center gap-2 border border-rule bg-bg-raised p-3 text-xs">
          <select
            value={archetypeFilter}
            onChange={(e) => setArchetypeFilter(e.target.value)}
            className="border border-rule bg-bg px-2 py-1.5 font-mono text-xs text-ink focus:border-amber focus:outline-none"
            aria-label="Filter by archetype"
          >
            <option value="all">all archetypes</option>
            {archetypes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="filter tags…"
            className="border border-rule bg-bg px-2 py-1.5 font-mono text-xs text-ink placeholder:text-ink-faint focus:border-amber focus:outline-none"
          />

          <label className="flex items-center gap-1.5 text-ink-dim">
            <input
              type="checkbox"
              checked={masterOnly}
              onChange={(e) => setMasterOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-amber"
            />
            master only
          </label>

          <span className="ml-auto text-[11px] text-ink-faint tabular-nums">
            {filtered.length} / {stories.length} stories
            {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
          </span>

          <Btn
            variant="primary"
            onClick={exportSelected}
            disabled={selectedIds.size === 0}
          >
            export {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}as markdown
          </Btn>
        </section>

        {error && (
          <div className="mb-4 border border-red-dim px-3 py-2 text-xs text-red">
            {error}
          </div>
        )}

        {loading ? (
          <>
            <Skeleton className="mb-3 h-4 w-32" />
            <SkeletonRows rows={4} rowClassName="h-44" />
          </>
        ) : filtered.length === 0 ? (
          <p className="border border-dashed border-rule px-4 py-8 text-center text-xs text-ink-faint">
            {stories.length === 0
              ? "No stories yet — run the tailor on an approved job to seed the bank."
              : "No stories match the current filters."}
          </p>
        ) : (
          <ul className="grid gap-3">
            {filtered.map((s) => (
              <li key={s.id}>
                <StoryCard
                  story={s}
                  selected={selectedIds.has(s.id)}
                  starPending={act.isPending(`star:${s.id}`)}
                  onToggleSelect={() => toggleSelect(s.id)}
                  onToggleMaster={(next) => toggleMaster(s.id, next)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
