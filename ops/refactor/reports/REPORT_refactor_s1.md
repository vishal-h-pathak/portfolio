# REPORT — Refactor Step 1: content registry + neuromorphic→professional reframe

**Branch:** `refactor/site` (worktree `portfolio-wt/refactor`) · **Pushed:** no (local QA pending)
**Build:** `npm run build` green. No UI/UX/layout change — only reworded copy, one
corrected stack label, and an internal content-file reorg.

---

## What changed

### 1A — Hygiene
- `content/projects/this-site.ts` (was `projects.ts` B-05) `STACK` label:
  `HTML · vanilla JS · taste` → `Next 16 · React 19 · TypeScript`.

### 1B — Content registry
- Split the single `content/projects.ts` into a typed, validated directory:
  ```
  content/projects/
    schema.ts          types — preserves every original field, ADDS classification fields
    meridian.ts        B-01   papercuts.ts      B-02   job-pipeline.ts B-03
    cellular-gaits.ts  B-04   this-site.ts      B-05
    index.ts           barrel: aggregate (canonical order) + integrity guard + re-export
  ```
- **Deleted** `content/projects.ts` so the directory resolves under `@/content/projects`.
- `schema.ts`: all original fields kept verbatim (`num,title,oneLiner,status,
  statusLabel,paragraphs,meta,actions`). Added — none read by the current UI:
  `slug`, `tier:"project"|"lab"`, `domain` (enum `agentic|trading|social|tooling|
  bio-sim|neuro|cv-ml|site`), `year:number`, `featured?`, `tags?`, `summary?`,
  `builtWith?`, `embed?`, `links?`, `thumbnail?`. `ProjectStatus` also gained
  `"archived"` (additive; unused by current entries).
- Per-project files: each original entry ported **verbatim** + new fields. Assignments:
  | file | slug | tier | domain | year | featured |
  |---|---|---|---|---|---|
  | meridian | meridian | project | trading | 2026 | ✅ |
  | papercuts | papercuts | project | social | 2026 | |
  | job-pipeline | job-pipeline | project | agentic | 2026 | |
  | cellular-gaits | cellular-gaits | lab | bio-sim | 2026 | ✅ |
  | this-site | this-site | project | site | 2026 | |
- `index.ts`: aggregates in the same order (`meridian, papercuts, jobPipeline,
  cellularGaits, thisSite`); **plain-TS build-time integrity guard** (no zod, no
  client-bundle weight) that throws on duplicate `slug`/`num` or malformed
  `num` (`/^B-\d{2}$/`) / `slug` (`/^[a-z0-9-]+$/`); `export * from "./schema"`;
  exports `PROJECTS`, `byTier`, `bySlug`.
- `Bench.tsx` / `Project.tsx` were **not** edited for resolution — they resolve to
  the new `index.ts` unchanged. Confirmed only those two files import the registry.

### 1C — Reframe copy (copy only)
Section order, the HH trace figure, and all styling are unchanged. Accent spans kept
(`accent-a` on the agentic phrase, `accent-g` on the neuro phrase).

**`components/Hero.tsx`**
- H1 — before:
  > Electrical engineer in Atlanta. **Neuromorphic hardware** for ten years — memristors on a PCB, spikes on Loihi, neurons in VHDL — and lately a lot of **agentic systems**, off-hours, with an LLM in the loop.
- H1 — after:
  > Electrical engineer in Atlanta, building **agentic systems** with an LLM in the loop. Ten years in **neuromorphic hardware** before this — memristors on a PCB, spikes on Loihi, neurons in VHDL — and it's still how I think about systems.
- `LOOKING FOR` margin — before: `neuromorphic · mission-driven ML · SE at an AI co.`
  → after: `applied / agentic AI · forward-deployed / SE · mission-driven ML`
  (matches `job-pipeline/profile/profile.yml` tiers).
- Thesis ¶1 — before: "…The notebook traces the through-line of neuromorphic work; the
  bench is what I've been building on evenings and weekends to learn how agentic systems
  actually behave." → after: "…The notebook traces the through-line that got me here —
  neuromorphic hardware to now; the bench is what I build with agentic systems."
- Thesis ¶2 (dim, GTRI note kept secondary) — before: "…Looking for neuromorphic /
  mission-driven ML, or sales engineering at an AI company doing something worth caring
  about." → after: "…Looking for applied / agentic AI, forward-deployed / sales
  engineering, or mission-driven ML — somewhere doing something worth caring about."

**`content/lineage.ts` — "now" pin** (lead agentic; honest GTRI clause kept; dropped "mostly off-hours")
- summary — before: "Day-job at GTRI — embedded ML / CV. Off-hours: agentic systems,
  with an LLM in the loop." → after: "Building agentic systems with an LLM in the loop.
  Day-job at GTRI — embedded ML / CV."
- body — before: "**Agentic systems, mostly off-hours.** Day-job is still GTRI… The thing
  I've actually been spending my evenings on is what LLM agents can and can't do…" →
  after: "**Agentic systems, with an LLM in the loop.** What LLM agents can and can't do
  when you wire them into a real loop: trading, job pipelines, small private tools for
  friends. Day-job is still GTRI — embedded ML and computer vision. The bench section is
  the honest version of this pin."

**`components/Bench.tsx`** (downplay hobby framing; keep clean-IP line)
- Heading — `The bench, off-hours.` → `The bench.`
- Margin `WHAT` — before: "Personal projects. Built in evenings + weekends, mostly with
  an LLM as a pair-programmer." → after: "Real tools, built end-to-end with agentic
  workflows — an LLM in the loop, shipped solo across domains."
- Margin `WHY HERE` — before: "To make the seam between paid work and side work visible
  — not blurred." → after: "Evidence of range — and that I take an idea all the way to
  something real, on my own initiative."
- Intro — before: "These are mine, on my time. They're where I learn agentic systems from
  the inside — not from a podcast. Nothing here was built at GTRI or with GTRI
  resources." → after: "These are the tools I build with agentic systems — learned from
  the inside, not from a podcast. All independent: nothing here was built at GTRI or with
  GTRI resources."

---

## Acceptance
- ✅ `npm run build` green.
- ✅ Homepage visually identical except the reframed Hero/Lineage/Bench copy + corrected
  "This site" stack label.
- ✅ Integrity guard verified: temporarily duplicating a `slug` failed the build with
  `Error: [content/projects] duplicate slug "meridian"`; file restored.
- ✅ Only `Bench.tsx` (`PROJECTS`) + `Project.tsx` (`Project` type) import the registry;
  `@/content/projects` resolves to the new directory.

## Deviations
- `VELOCITY` margin block in `Bench.tsx` left unchanged — the prompt scoped the rewrite to
  `WHAT`/`WHY HERE` + intro, and that block contains none of the removed off-hours/side-work
  phrasing.
- `ProjectStatus` gained `"archived"` (matches the canonical schema in REFACTOR_PLAN §2.2);
  purely additive, no current entry uses it.
- `node_modules` was absent in this fresh worktree; ran `npm install` to build. No change
  to `package.json` / `package-lock.json`.

Not pushed — awaiting localhost QA.
