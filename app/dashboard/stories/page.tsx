"use client";

/**
 * /dashboard/stories — STAR+R interview-prep bank (J-3).
 *
 * Browse stories generated as a side effect of every tailoring run.
 * Filter by archetype + tag, multi-select to mark "master" stories, and
 * export the selected set as a markdown brief for an upcoming interview.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  onChange,
}: {
  isMaster: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!isMaster)}
      className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border transition ${
        isMaster
          ? "border-amber-700 bg-amber-900/40 text-amber-200"
          : "border-neutral-800 bg-neutral-900 text-neutral-500 hover:text-neutral-300"
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
  onToggleSelect,
  onToggleMaster,
}: {
  story: StarStory;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleMaster: (next: boolean) => void;
}) {
  return (
    <article
      className={`rounded-lg border p-4 transition ${
        selected
          ? "border-orange-700 bg-orange-950/20"
          : "border-neutral-800 bg-neutral-950"
      }`}
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-neutral-500">
            {story.company ?? "—"}
            {story.role ? ` · ${story.role}` : ""}
          </div>
          {story.archetype && (
            <span className="text-[10px] uppercase tracking-widest text-violet-400">
              {story.archetype}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MasterStarToggle isMaster={story.is_master} onChange={onToggleMaster} />
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 accent-orange-500"
            title="Include in export"
          />
        </div>
      </header>

      <dl className="space-y-2 text-sm leading-relaxed">
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-neutral-500">
            Situation
          </dt>
          <dd className="text-neutral-200">{story.situation}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-neutral-500">
            Task
          </dt>
          <dd className="text-neutral-200">{story.task}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-neutral-500">
            Action
          </dt>
          <dd className="text-neutral-200">{story.action}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-neutral-500">
            Result
          </dt>
          <dd className="text-neutral-200">{story.result}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-amber-400">
            Reflection
          </dt>
          <dd className="text-amber-200">{story.reflection}</dd>
        </div>
      </dl>

      {story.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {story.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] px-2 py-0.5 rounded-full border border-neutral-800 bg-neutral-900 text-neutral-400"
            >
              {t}
            </span>
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
  lines.push(`Exported ${stories.length} stories on ${new Date().toLocaleDateString()}.`);
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

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("star_stories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) setError(error.message);
      else setStories((data as StarStory[]) ?? []);
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
      if (archetypeFilter !== "all" && s.archetype !== archetypeFilter) return false;
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

  async function toggleMaster(id: number, next: boolean) {
    setStories((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_master: next } : s))
    );
    const { error } = await supabase
      .from("star_stories")
      .update({ is_master: next })
      .eq("id", id);
    if (error) {
      // Roll back the optimistic update if the write failed.
      setStories((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_master: !next } : s))
      );
      setError(error.message);
    }
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
    <main className="min-h-screen bg-black text-neutral-100 px-4 sm:px-8 py-8 max-w-5xl mx-auto">
      <Link href="/dashboard" className="text-xs text-neutral-500 hover:text-neutral-200">
        ← Dashboard
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold">STAR+R Stories</h1>
        <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
          Stories generated as a side effect of every tailoring run. Filter
          by archetype or tag, mark <span className="text-amber-300">★ master</span> the
          5–10 you'll lean on in interviews, multi-select to export a
          markdown brief for an upcoming round.
        </p>
      </header>

      <section className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <select
          value={archetypeFilter}
          onChange={(e) => setArchetypeFilter(e.target.value)}
          className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-200"
        >
          <option value="all">All archetypes</option>
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
          placeholder="Filter tags…"
          className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-200 placeholder:text-neutral-600"
        />

        <label className="flex items-center gap-1.5 text-neutral-400">
          <input
            type="checkbox"
            checked={masterOnly}
            onChange={(e) => setMasterOnly(e.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
          Master only
        </label>

        <span className="ml-auto text-xs text-neutral-500">
          {filtered.length} / {stories.length} stories
          {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
        </span>

        <button
          onClick={exportSelected}
          disabled={selectedIds.size === 0}
          className="px-3 py-1.5 rounded border border-orange-800 bg-orange-900/40 hover:bg-orange-800/60 text-orange-200 text-xs uppercase tracking-widest disabled:opacity-30 disabled:hover:bg-orange-900/40"
        >
          Export {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}as markdown
        </button>
      </section>

      {error && (
        <div className="mb-4 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-neutral-500 italic">loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-neutral-500 italic">
          {stories.length === 0
            ? "No stories yet — run the tailor on an approved job to seed the bank."
            : "No stories match the current filters."}
        </div>
      ) : (
        <ul className="grid gap-4">
          {filtered.map((s) => (
            <li key={s.id}>
              <StoryCard
                story={s}
                selected={selectedIds.has(s.id)}
                onToggleSelect={() => toggleSelect(s.id)}
                onToggleMaster={(next) => toggleMaster(s.id, next)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
