# REPORT — Refactor Step 1b: microcopy tone pass + live "last updated" dates

Branch: `refactor/site` (in-place, after s1). Copy + small-data pass only — no
layout/section/component restructuring, no theming, no new routes. Cross-machine
WIP untouched. `npm run build` green. Not pushed.

---

## Part A — flattened microcopy (before → after)

### `components/Bench.tsx`
| Slot | Before | After |
|------|--------|-------|
| Heading | `The bench.` | `Bench` |
| Intro paragraph | "These are the tools I build with agentic systems — learned from the inside, not from a podcast. All independent: nothing here was built at GTRI or with GTRI resources." | `Personal projects, built independently of GTRI.` |
| Margin `WHAT` | "Real tools, built end-to-end with agentic workflows — an LLM in the loop, shipped solo across domains." | `Tools I build end-to-end, solo, with agentic workflows.` |
| Margin `VELOCITY` | "1 weekend → in production. Boring infra, just less of it." | **removed** |
| Margin `WHY HERE` | "Evidence of range — and that I take an idea all the way to something real, on my own initiative." | **removed** |
| Margin `click any row to expand` | (kept) | (kept) |
| Header status summary | `2 LIVE · 1 SHIPPED · 1 WIP` (with live pulse dot) | `5 projects` (neutral count, pulse dot dropped) |

### `components/Experience.tsx`
| Slot | Before | After |
|------|--------|-------|
| Margin `NOTE` | "Paid work, in reverse chron. The bench section below is for personal builds — kept separate on purpose." | `Professional experience, most recent first.` |
| Margin `FOOTNOTE` | "The Loihi work and the Rain PCBs were team efforts. The connectome work is current and ongoing." | **removed** |

Hero, Lineage, and all project one-liners/paragraphs left untouched.

---

## Part B — live "last updated" date (replaces the status pill)

### Registry (`content/projects/`)
- `schema.ts`: added optional `repo?: string` (GitHub `owner/name`) and
  `updated?: string` (manual `YYYY-MM` fallback). Both additive; the existing
  `status`/`statusLabel` fields stay in the data, now simply unused by the UI.
- Each of the 5 entries got `repo` + `updated` per the brief.

### Data util — `app/lib/last-updated.ts` (server-only)
- `getLastUpdated(repo)`: fetches `https://api.github.com/repos/${repo}`, reads
  `pushed_at`. Sends `Authorization: Bearer ${GITHUB_TOKEN}` **only if** the env
  var is set; otherwise tokenless (works for public repos). Cached via
  `next: { revalidate: 1800 }` (~30 min ISR). Returns `null` on any
  error/non-200 — never throws.
- `formatUpdatedLabel(date)`: relative + plain — `updated today`,
  `updated 3d ago`, `updated 2w ago`, else `updated Mon YYYY`.
- `formatUpdatedFallback("YYYY-MM")`: → `updated Mon YYYY`; `null` if malformed.
- Server-only by construction (reads `process.env`, imported only from the
  server `app/page.tsx`); the token never reaches the client bundle. Did **not**
  add the `server-only` package (not installed; would be a new dependency) — the
  brief's constraint is "no client dependency," which this respects.

### Wiring (no client fetching)
- `app/page.tsx` (server, `revalidate = 300`) is now `async`. `resolveUpdatedMap()`
  resolves all repos in parallel (`Promise.all`): live `pushed_at` →
  `formatUpdatedLabel`, else `updated` fallback → `formatUpdatedFallback`, else
  the slug is omitted. The `Record<slug, string>` is passed as
  `<Bench updatedMap=…>`.
- `Bench.tsx` forwards `updatedMap?.[project.slug]` as `<Project updatedLabel=…>`.
- `Project.tsx` renders `updatedLabel` (plain `.updated` mono text) in the exact
  slot the `pill ${status}` element used to occupy; renders nothing when the
  label is missing (no "undefined"). The `/` route stays statically prerendered
  with 5m ISR.
- `.updated` CSS added next to `.pill` in `app/globals.css` (mono, 10px,
  `--ink-faint`, no border) — pill→date text in the same slot, no layout shift.

---

## GITHUB_TOKEN — is it needed?

Verified each repo tokenless against the GitHub API (2026-06-26):

| slug | repo | tokenless result | card label (today) |
|------|------|------------------|--------------------|
| meridian | `vishal-h-pathak/trading-agent` | **200** · pushed 2026-06-04 | `updated 3w ago` |
| papercuts | `vishal-h-pathak/papercuts-site` | **404** (private or renamed) | `updated Jun 2026` (fallback) |
| job-pipeline | `vishal-h-pathak/job-pipeline` | **200** · pushed 2026-06-26 | `updated today` |
| cellular-gaits | `vishal-h-pathak/cellular-gaits` | **200** · pushed 2026-06-23 | `updated 3d ago` |
| this-site | `vishal-h-pathak/portfolio` | **200** · pushed 2026-06-26 | `updated today` |

**Conclusion:** 4 of 5 resolve **live without a token** — no `GITHUB_TOKEN`
required for them. Only **`papercuts-site`** 404s tokenless (private, or the repo
is named differently than `papercuts-site`); it gracefully shows the
`updated Jun 2026` fallback. To make papercuts resolve live, the owner adds a
read-only `GITHUB_TOKEN` (fine-grained: metadata read) to the portfolio env
(`.env.local` + Vercel) **and** confirms the repo slug is correct — if the actual
private repo isn't `papercuts-site`, update `repo` in
`content/projects/papercuts.ts`. Documented the env var in `.env.example`.

---

## Acceptance
- `npm run build` — green; `/` prerendered, 5m revalidate.
- Bench cards now show `updated …` instead of `LIVE/WIP/SHIPPED`. Pushing to a
  resolved repo changes its card within the ~30-min cache window (confirmed the
  live API values above drive the labels).
- Flattened Bench + Experience copy; Hero/Lineage prose unchanged.

## Files
- `components/Bench.tsx`, `components/Experience.tsx`, `components/Project.tsx`
- `content/projects/schema.ts` + 5 entry files
- `app/lib/last-updated.ts` (new), `app/page.tsx`, `app/globals.css`, `.env.example`
