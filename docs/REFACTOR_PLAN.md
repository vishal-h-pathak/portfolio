# Portfolio Refactor Plan — Code-Grounded

> **Status:** implementation-grade. Supersedes the conceptual `docs/REDESIGN_PLAN.md`
> on the points where the real code differs from its assumptions (flagged inline as
> **[REALITY CHECK]**). Verified against the actual tree on 2026-06-26.
>
> **Primary objective (the user's words):** cleanup + a scalable structure so new
> projects "connect up to the site for showcasing" with minimal friction. The
> single most important deliverable is the **add-a-new-project workflow** (§3): drop
> one file → it appears, tagged and routed, with no hand-wiring.
>
> **Hard constraints (respect, do not relitigate):** stay on **Next.js 16** (no
> Astro); **one** animation lib (Motion) with GSAP/R3F as isolated lazy
> reduced-motion-guarded exceptions; dismantle `app/globals.css` to tokens
> *incrementally*; **consolidate** private tooling (`/dashboard`, `/meridian`,
> `/agents`) into a single **gated in-app console** that stays on
> `vishal.pa.thak.io`, is reachable from the landing page, and is accessible
> **only to the owner** (never deleted, never moved to another domain); lazy-load
> heavy assets.
> **Earned-motion principle:** animation must encode real data or be cut.
>
> **[OWNER DECISIONS — 2026-06-26]** (1) **Cellular Gaits: lossless.** Reduce route
> sprawl and duplicate components, but keep **every** visual, demo, and explanation
> intact, reorganized into a few well-grouped sections (not one giant page). (2)
> **Tooling: gated, in-app, owner-only.** Keep it on the portfolio domain, reachable
> from the landing page behind auth — consolidated into one console, hidden from
> visitors. NOT a separate deployment, NOT removed.

---

## 1. Current-state map (verified against real files)

### Stack (from `package.json`, `app/layout.tsx`)
- Next 16.2.3, React 19.2.4, TypeScript 5, Tailwind v4 (`@tailwindcss/postcss`).
- Fonts: `Source_Serif_4` + `JetBrains_Mono` via `next/font/google` (`app/layout.tsx:5-18`). Already self-hosted, no CLS risk.
- Installed heavy deps: `@mujoco/mujoco` 3.9, `three` 0.184, `recharts` 3.8, `katex` 0.17, `@anthropic-ai/sdk`, `@supabase/supabase-js`.
- **No animation library installed.** No `motion` / `framer-motion` / `gsap`. `three` is present only for MuJoCo/FlyStage.
- `next.config.ts` is empty (no image config, no bundle analyzer).

### Real route tree (from `find app -type f`)
**Public portfolio (the actual site):**
- `app/page.tsx` (35 lines) — single-scroll homepage. Composes `Nav · Notebook(Hero, Lineage, Experience, Bench, Contact) · WorkshopRail · Footer · KbdHint`. `export const revalidate = 300` (ISR for the live rail).
- `app/layout.tsx` — root, fonts, Person JSON-LD, imports `./globals.css`.
- `app/opengraph-image.tsx`, `app/icon.svg`, `app/loading.tsx`, `app/not-found.tsx`.

**Cellular Gaits microsite — `app/projects/cellular-gaits/*` (16 page files, 10 nav tabs):**
- `layout.tsx` — its **own** topbar + `CgTabNav` + footer (the second nav system).
- Routes: `page.tsx` (Frame, 144 lines), `body`, `controller`, `sensing`, `mapping`, `objective`, `optimizer`, `embodied`, `behaviors` + `behaviors/{escape,chemotaxis,navigation,perturbation}`, `appendix` (166 lines).
- `components/cellular-gaits/` = **32 `.tsx` components** + `tabs.ts` (10-tab table) + `CgTabNav.tsx`.
- Assets: `public/cellular-gaits/` = **24 MB**, including `wasm/mujoco.wasm` at **8.8 MB**.
  - **[REALITY CHECK]** `FlyStage` is **already** wrapped in `next/dynamic` in every demo (`EscapeDemo.tsx:30`, `PerturbationDemo.tsx:34`, `ChemotaxisDemo.tsx:33`, `MotorMap.tsx:31`, `CriticalityPlayground.tsx:21`). The 8.8 MB WASM is already route-split out of the main bundle — the conceptual plan's "never bundle the 9 MB WASM globally" is **already done**. The remaining win is page-count/component collapse and asset weight, not bundle-splitting.

**Private tooling sharing the app (NOT portfolio):**
- `app/meridian/page.tsx` — **1,469 lines, one file**. Ungated. **Linked from the public footer.**
- `app/agents/[token]/page.tsx` — 441 lines. Token-gated, unlinked.
- `app/dashboard/**` — **7,056 lines** of `.ts/.tsx`. Password-gated via `middleware.ts`. **Linked from the public footer.**
- `app/api/**` — **22 `route.ts`** files (14 under `/api/dashboard`, plus `chat`, `materials`, `meridian`, `bench/activity`, `dashboard-login`).
- `app/_internal.css` (142 lines) — separate sheet, already partly isolated.

### Content registries (`content/*.ts`) — the good bones
- `content/projects.ts` (157 lines): `PROJECTS: Project[]` with `B-01..B-05` numbers (the "Bench" plate codes). `Project` type = `{ num, title, oneLiner, status, statusLabel, paragraphs, meta, actions }`. **No `slug`, `tier`, `domain`, `featured`, `built_with`, or `embed` fields.** Detail content lives inline as `paragraphs` and is rendered by expanding a card in place (`components/Bench.tsx` + `Project.tsx`), **not** by routing to a detail page.
- `content/experience.ts` (51 lines): `EXPERIENCE: Role[]`.
- `content/lineage.ts` (48 lines): `LINEAGE: LineagePin[]` — HH 2016 → Memristors 2017 → Spiking 2018 → Agents now.

### Where coupling / sprawl actually lives
1. **Three nav systems, zero shared chrome.** (a) `components/Nav.tsx` — homepage anchor nav, hardcoded `NAV_ITEMS` (`§1..§5`), keys 1–5. (b) `components/cellular-gaits/CgTabNav.tsx` from `tabs.ts` — the CG microsite's 10-tab nav + its own topbar in `layout.tsx:19-28`. (c) `app/dashboard/components/DashboardNav.tsx`.
2. **`app/globals.css` = 2,974 lines, 443 `.cg-*` selectors** (`grep -c '\.cg-'`). **[REALITY CHECK]** a real `:root` token block **already exists** at lines 8-37 (`--bg`, `--ink`, `--green`, `--amber`, `--serif`, `--mono`, etc.). So "no token layer" is wrong — tokens exist but are (a) not in a separate file, (b) not Tailwind v4 `@theme`, (c) drowned under 2,900 lines of component CSS. The `.cg-*` rules run from line **244 to 2973** — roughly **2,700 of the 2,974 lines are Cellular Gaits CSS.** That single surface is ~90% of the monolith.
3. **`components/Footer.tsx` links private tooling** to `/meridian` and `/dashboard` (lines 7, 9) — on a job-seeker's public footer.
4. **No project-detail route.** Adding a deep project today = hand-cloning the CG microsite (own layout, own nav, own CSS block). Project content is trapped inline in `projects.ts` `paragraphs[]`.
5. **Self-description bug:** `projects.ts:151` — "This site" claims `STACK: "HTML · vanilla JS · taste"`. It's Next 16 / React 19.
6. **Two-sources-of-truth:** CG Frame hero lists 7 tabs; `CgTabNav` shows 10 (per audit §F).
7. **Committed `tsconfig.tsbuildinfo`** (262 KB) in the repo root.

### What's already right (preserve)
- `content/*.ts` typed registries — the spine to extend.
- `lib/useReducedMotion.ts`, `lib/useScrollSpy.ts`, `lib/useLiveClock.ts` — reusable hooks.
- **`app/lib/bench-activity.ts` + `components/WorkshopRail.tsx`**: already fetch **real, sanitized jobpipe telemetry** (run kinds, statuses, relative timestamps, totals) server-side with graceful null-degradation. **This is the real-data source the earned-cadence animation needs — it already exists.**
- `FlyStage` dynamic-import pattern — the template for "live demos mount, not merge."
- `Section` / `Margin` / `Notebook` primitives.

---

## 2. Target architecture

### 2.1 Route tree (`app/`)

```
app/
  layout.tsx                 root: fonts, JSON-LD, <SiteChrome> (ONE nav + footer)
  page.tsx                   / — Hub: signature hero + lineage spine + featured feed
  about/page.tsx             the story (AI since 2017): roots → range → present
  work/page.tsx              professional timeline (EXPERIENCE + LINEAGE)
  projects/
    page.tsx                 /projects — auto-generated index (tier:"project")
    [slug]/page.tsx          /projects/:slug — generic detail renderer (datasheet)
  lab/
    page.tsx                 /lab — auto-generated index (tier:"lab")
    [slug]/page.tsx          /lab/:slug — generic detail (reuses detail renderer)
  now/page.tsx               /now — nownownow convention
  uses/page.tsx              /uses — stack + agentic workflow + AI-policy line
  colophon/page.tsx          /colophon — how the site is built
  opengraph-image.tsx, icon.svg, loading.tsx, not-found.tsx

  console/                   /console — ONE gated hub for all private tooling (§7)
    layout.tsx               auth gate (middleware) + single console nav
    page.tsx                 console home (links to the sub-tools)
    meridian/page.tsx        moved from app/meridian (unchanged internals)
    agents/[token]/page.tsx  moved from app/agents (unchanged internals)
    jobs/**                  moved from app/dashboard (unchanged internals)
  # private api/** stays in-app, but its routes move under /api/console/* and
  # remain gated by middleware (see §7).
```

**Cellular Gaits** stops being a *separate site* (its own topbar/nav/footer) but
keeps all of its content. It is consolidated into a registry-driven **project with a
few grouped sub-sections** that render inside the one site chrome — a lossless
reorganization, not a deletion (§5). Genuine duplicate components are merged; every
visual, demo, and explanation is preserved.

> **[REALITY CHECK / route-collision]** `app/projects/cellular-gaits/` currently
> occupies a *static* segment that would shadow the new `app/projects/[slug]/`
> dynamic segment. The consolidation (§5) replaces the old per-tab routes with a
> grouped section set under `app/projects/cellular-gaits/` that resolves explicitly
> (static segment wins over `[slug]` for this one project — intended), so there is
> no collision; the deep section URLs are preserved or redirected (§5.1, §7.3).

### 2.2 Content-registry design (extend `content/projects.ts`)

Author each project/experiment as **one file** under `content/projects/<slug>.ts`
(keep `.ts`, not MDX, for the registry record — it stays type-checked and needs no
new build tooling; long-form body goes in a co-located `.mdx` referenced by `body`).
A Zod schema validates every entry at module load so a malformed file **fails the
build** — the junk drawer cannot form silently.

**New file: `content/schema.ts`**

```ts
import { z } from "zod";

export const Tier = z.enum(["project", "lab"]);          // drives which index
export const Status = z.enum(["live", "wip", "shipped", "archived"]);
export const Domain = z.enum([
  "agentic", "bio-sim", "trading", "social", "tooling", "neuro", "cv-ml",
]);

export const ProjectSchema = z.object({
  // identity ----------------------------------------------------------------
  slug: z.string().regex(/^[a-z0-9-]+$/),     // URL + file key, must be unique
  num: z.string().regex(/^B-\d{2}$/),         // the Bench plate code (B-06, …)
  title: z.string(),
  oneLiner: z.string(),

  // classification (the anti-junk-drawer fields) ----------------------------
  tier: Tier,                                  // project | lab
  status: Status,
  statusLabel: z.string(),                     // e.g. "LIVE · 14d"
  domain: Domain,
  tags: z.array(z.string()).default([]),
  year: z.number().int(),
  featured: z.boolean().default(false),        // surfaces on the homepage feed

  // body --------------------------------------------------------------------
  summary: z.string(),                         // one line for index cards
  body: z.string().optional(),                 // path to co-located .mdx, optional
  paragraphs: z.array(z.object({               // back-compat: inline body
    text: z.string(), dim: z.boolean().optional(),
  })).default([]),

  // the agentic-credibility signal ------------------------------------------
  built_with: z.array(z.string()).default([]), // e.g. ["anthropic-sdk","multi-machine-agents"]
  buildLog: z.string().optional(),             // "how this was built with agents" note / mdx path

  // datasheet meta + actions (reuse existing shapes) ------------------------
  meta: z.array(z.object({
    key: z.string(), value: z.string(), build: z.boolean().optional(),
  })).default([]),
  actions: z.array(z.object({
    label: z.string(), href: z.string(), primary: z.boolean().optional(),
  })).default([]),

  // live demo / dashboard MOUNTS, never merges ------------------------------
  embed: z.object({
    component: z.string(),     // key into the lazy embed registry (§2.4)
    poster: z.string(),        // /public path to a static poster (reduced-motion + LCP)
    height: z.number().optional(),
  }).optional(),

  links: z.object({ repo: z.string().optional(), demo: z.string().optional() }).optional(),
  thumbnail: z.string().optional(),            // /public path
});

export type Project = z.infer<typeof ProjectSchema>;
```

**New file: `content/projects/index.ts`** — the glob + validation aggregator:

```ts
import { ProjectSchema, type Project } from "../schema";
// One static import per file keeps it type-checked and tree-shakeable.
import { meridian } from "./meridian";
import { papercuts } from "./papercuts";
import { jobPipeline } from "./job-pipeline";
import { cellularGaits } from "./cellular-gaits";
import { thisSite } from "./this-site";

const RAW = [meridian, papercuts, jobPipeline, cellularGaits, thisSite];

// Validate at module load → malformed entry throws → build fails.
export const PROJECTS: Project[] = RAW.map((p) => ProjectSchema.parse(p));

// Guard: unique slugs / nums.
const slugs = new Set<string>();
for (const p of PROJECTS) {
  if (slugs.has(p.slug)) throw new Error(`Duplicate project slug: ${p.slug}`);
  slugs.add(p.slug);
}

export const byTier = (t: Project["tier"]) => PROJECTS.filter((p) => p.tier === t);
export const featured = () => PROJECTS.filter((p) => p.featured);
export const bySlug = (s: string) => PROJECTS.find((p) => p.slug === s);
```

> **Why static imports over a filesystem glob:** Next 16 App Router + Turbopack
> resolves `import.meta.glob`-style patterns inconsistently across server/edge, and
> a hand-maintained `index.ts` barrel keeps the registry fully type-checked with
> zero new build deps. Adding a project = add one import line (one-liner, see §3).
> If you later want true drop-in-no-edit, swap the barrel for a `require.context`
> webpack glob — the index pages don't change, only the aggregator.

### 2.3 Index pages auto-generate from the registry

**`app/projects/page.tsx`** (server component):

```tsx
import { byTier } from "@/content/projects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { IndexFilters } from "@/components/projects/IndexFilters"; // client: domain/status filter

export default function ProjectsIndex() {
  const items = byTier("project").sort((a, b) => b.year - a.year);
  return (
    <main className="bench-index">
      <IndexFilters items={items} render={(it) => <ProjectCard key={it.slug} p={it} />} />
    </main>
  );
}
```

`app/lab/page.tsx` is the same file with `byTier("lab")`. Cards link to
`/{tier}/{slug}`. Filtering is client-side over the already-loaded array (no API).
**Adding work is a registry row, never a page edit.**

### 2.4 Project detail route — one generic renderer

**`app/projects/[slug]/page.tsx`**:

```tsx
import { notFound } from "next/navigation";
import { bySlug, byTier } from "@/content/projects";
import { ProjectDatasheet } from "@/components/projects/ProjectDatasheet";

export function generateStaticParams() {
  return byTier("project").map((p) => ({ slug: p.slug }));
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = bySlug(slug);
  if (!p || p.tier !== "project") notFound();
  return <ProjectDatasheet p={p} />;
}
```

`app/lab/[slug]/page.tsx` mirrors it with `tier !== "lab"`. **One renderer,
`components/projects/ProjectDatasheet.tsx`**, produces the schematic "datasheet"
look (title block, part number = `num`, status, `built_with`, meta table, MDX body,
optional `<EmbedMount>`).

### 2.5 Live demo / dashboard "mounts" (lazy), never bloats the bundle

**New file: `components/projects/EmbedMount.tsx`** — a thin client wrapper that
reads `p.embed.component`, looks it up in a lazy registry, and renders it behind a
poster + reduced-motion guard. This generalizes the existing `FlyStage` pattern:

```tsx
"use client";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/lib/useReducedMotion";

// Lazy embed registry: each value is a next/dynamic() with ssr:false.
const EMBEDS = {
  "cellular-gaits": dynamic(() => import("@/components/embeds/CellularGaitsSim"), {
    ssr: false, loading: () => <div className="embed-skeleton" />,
  }),
  // future demos register here, one line each
} as const;

export function EmbedMount({ embed }: { embed: NonNullable<Project["embed"]> }) {
  const reduced = useReducedMotion();
  const Comp = EMBEDS[embed.component as keyof typeof EMBEDS];
  if (reduced || !Comp) {
    return <img src={embed.poster} alt="" className="embed-poster" loading="lazy" />;
  }
  return <Comp />; // 8.8 MB WASM only loads here, client-side, on this one page
}
```

**Net:** heavy interactive things stay self-contained client modules; the registry
*references* them by key; nothing heavy enters the main bundle. This is exactly how
`FlyStage` already works — we're just making it the general mechanism.

---

## 3. THE "ADD A NEW PROJECT" WORKFLOW (the centerpiece)

This is the deliverable. After the refactor, showcasing a new build is:

**Step 1 — Create one file:** `content/projects/<slug>.ts`

```ts
import type { Project } from "../schema";

export const myNewThing: Project = {
  slug: "my-new-thing",
  num: "B-06",                       // next free Bench plate code
  title: "My New Thing",
  oneLiner: "one-line hook · status · cadence",
  tier: "lab",                       // "lab" = experiment (default home); "project" = polished
  status: "wip",
  statusLabel: "WIP · v0",
  domain: "tooling",
  tags: ["next", "supabase"],
  year: 2026,
  featured: false,                   // flip true to surface on the homepage feed
  summary: "One sentence for the index card.",
  body: "./my-new-thing.mdx",        // optional long-form write-up
  built_with: ["anthropic-sdk"],     // powers the agentic-credibility line
  meta: [{ key: "STACK", value: "Next · Supabase" },
         { key: "BUILD", value: "Solo · Claude · 1 evening", build: true }],
  actions: [{ label: "→ open", href: "https://…", primary: true }],
  // embed: { component: "my-new-thing", poster: "/projects/my-new-thing/poster.png" }, // optional live demo
  links: { repo: "https://github.com/…" },
  thumbnail: "/projects/my-new-thing/cover.png",
};
```

**Step 2 — Register it (one line):** add to `content/projects/index.ts`:
```ts
import { myNewThing } from "./my-new-thing";   // ← add import
const RAW = [meridian, papercuts, jobPipeline, cellularGaits, thisSite, myNewThing]; // ← add to array
```

**Step 3 — Drop assets:** put `cover.png` / `poster.png` / `*.mdx` under
`public/projects/<slug>/` (and co-locate the `.mdx` next to the `.ts`).

**Step 4 (only if it has a live demo):** add one line to the `EMBEDS` map in
`components/projects/EmbedMount.tsx` pointing at a `components/embeds/<X>.tsx`.

**That's it. With zero further edits it now:**
- appears on **`/lab`** (or **`/projects`** if `tier:"project"`), tagged by `domain`/`status`, filterable;
- gets a detail page at **`/lab/<slug>`** rendered by the generic datasheet;
- shows in the **homepage featured feed** if `featured:true`;
- shows in the **"from the lab" recent strip** (sorted by `year`);
- **fails the build** with a clear Zod error if a required field is missing or the slug collides.

No nav arrays to touch (one registry-driven nav, §4). No new route file. No CSS. No second microsite.

---

## 4. Theming layer (oscilloscope / schematic / Bench — swappable)

The goal: change the *look* without touching content (`content/*`) or routing
(`app/*`). Three-layer separation.

### 4.1 Token layer (single source of truth)
Extract the existing `:root` block (`globals.css:8-37`) into **`app/tokens.css`** as
Tailwind v4 `@theme`:

```css
/* app/tokens.css — the ONLY place colors/space/type live */
@theme {
  --color-bg: #0B0B0C;          --color-bg-raised: #101012;   --color-bg-card: #14130F;
  --color-ink: #E8E6DF;         --color-ink-dim: #8C8B83;     --color-ink-faint: #7E7A6D;
  --color-green: #6FE39A;       --color-amber: #E89B3D;
  --rule: rgba(232,230,223,.12);
  --font-serif: var(--font-source-serif), Georgia, serif;
  --font-mono:  var(--font-jetbrains), ui-monospace, monospace;
  /* theme switch hook: */
  --theme: "schematic"; /* "oscilloscope" | "schematic" | "bench" */
}
```
A theme is a token *override file* (`app/themes/oscilloscope.css`, `…/schematic.css`)
that re-binds the same variable names — components never hardcode a hex.

### 4.2 Presentational components (swappable skins)
Split structural from presentational:
- **`components/projects/ProjectCard.tsx`** + **`ProjectDatasheet.tsx`** read only
  tokens and a `data-theme` attribute on `<html>` (set in `layout.tsx`). The
  oscilloscope grid / schematic title-block / Bench plate-number styling lives in
  `app/themes/<name>.css` keyed on `[data-theme="…"] .datasheet { … }`.
- Because the card/datasheet consume registry data (`Project`) and only tokens for
  color, switching `--theme` (or the `<html data-theme>` value) reskins the whole
  index + detail surface with **no content or routing change.**

### 4.3 Where the earned cadence animation gets its real data
**[REALITY CHECK — the data already exists.]** `app/lib/bench-activity.ts`
already returns `{ events[], totals }` (run kinds, statuses, relative timestamps,
roles-tracked / scored-7d / applications-out) and `components/WorkshopRail.tsx`
already renders it server-side. The **build-cadence trace** (the one justified
signature animation) is driven by **this real telemetry plus project `year`/`status`
from the registry** — an oscilloscope/schematic trace whose pulses are actual ship
events, not noise. Concretely: a `components/hero/CadenceTrace.tsx` plots one tick
per registry entry (x = `year`/date, y = `tier`) overlaid with the live
`bench-activity` events. **If we can't bind it to those real values, we cut it** —
no free-floating decorative wave.

**Motion budget:** Motion (Framer) for card hover-lift + index filter transitions
(cheap, justified as affordance feedback). The **one** signature moment = the
cadence trace (real data). GSAP/R3F only if a scroll-sequence hero is chosen, behind
`useReducedMotion` + `next/dynamic({ssr:false})` + static poster — the FlyStage
pattern. Everything else: quiet scroll-reveal already in `globals.css:735` (`SECTION
ENTRANCE REVEAL`).

---

## 5. Cellular Gaits consolidation (lossless — sprawl down, content intact)

**[OWNER DECISION] Lossless.** Keep **every** visual, demo, and explanation. The job
is to (a) stop CG being a second website with its own topbar/nav/footer, (b) merge
genuine duplicate components, and (c) regroup 10 thin tabs into a **few coherent
sections** under the one site chrome — *not* one giant page (that much content on a
single page is unreadable), and *not* a content cull.

**Target shape:** CG becomes a registry `project` entry whose detail renders a
**grouped section set** — a small in-project section nav (lightweight, part of the
site chrome — not a second topbar) over ~4 grouped routes instead of 10:

```
app/projects/cellular-gaits/
  layout.tsx        uses SiteChrome + a slim <SectionNav> (replaces CgTabNav/topbar)
  page.tsx          Overview — the hook, the live FlyDemo, the loop diagram
  system/page.tsx   Body · Controller · Sensing · Mapping  (was 4 tabs → 1 grouped page w/ anchors)
  behavior/page.tsx Objective · Optimizer · Embodied · Behaviors+4  (grouped, all demos kept)
  appendix/page.tsx Math + diagrams (unchanged)
```

Exact grouping is tunable; the point is **~10 → ~4 routes by grouping, zero content
loss.** Every explanation moves into its section verbatim (voice is sacred, §9).

### 5.1 Routes: regroup, don't delete content
Replace the 16 page files with the ~4 grouped pages above. The old per-tab prose and
figures are **moved**, not dropped, into the grouped pages as anchored subsections
(e.g. `/projects/cellular-gaits/system#sensing`). Preserve old deep links via
`redirects()` mapping each retired tab URL to its new section anchor (§7.3) — no dead
links, no lost content.

### 5.2 Components: merge true duplicates only (32 → ~20, nothing visual lost)
**Merge genuine near-duplicates (audit-confirmed identical render paths):**
- `SystemDiagram` (491) + `ClosedLoopDiagram` (381) → one `<LoopDiagram>` (same
  forward path + dashed proprioceptive arc).
- `ChemoTrajectories` (235) + `EscapeTrajectories` (240) → one `<TrajectoryMap>`.
- `BodyFlyDemo` + `PerturbationDemo` + `ChemotaxisDemo` + `EscapeDemo` → one
  `<FlyDemo behavior="…">` (each just re-wraps `FlyStage` with bespoke controls — the
  behaviors are preserved as props, not removed).

**Keep (all the explanatory/visual components — these ARE the content):**
- `FlyStage` (MuJoCo engine), `CAPlayer` + `CACanvas`, `Math`, and the figure/diagram
  components: `CriticalityPlayground`, `ToyCmaEs`, `ControllerLadder`, `MotorMap`,
  `GainSweepChart`, `OptimizerModule`, `SensingModule`, `SignalPathDiagram`,
  `SensorOverlay`, `SensorChannels`, `HeadingError`, `GradientField`, `EscapeCircuit`,
  `FeelerField`, `PlantSchematic`, `ConceptScaffold` — all retained, just rehomed
  under their grouped section.

**Retire only:** `CgTabNav` + `tabs.ts` (replaced by the slim `<SectionNav>`), and
`BuildPlanDAG` (documents the *site's own* build roadmap — internal, not visitor
content; move to `/docs` rather than delete). Everything that explains the science or
shows a visual stays.

`FlyStage` moves under `components/embeds/` so the homepage/overview can lazy-mount it
via `<EmbedMount>` (§2.5); the deep sections import the same engine directly.

### 5.3 Assets
Keep all of `public/cellular-gaits/` (24 MB) — the WASM, `best.mp4`, CA-state JSON,
model dumps. They load lazily per section (the WASM already via `next/dynamic`). Only
strip a per-tab asset if §5.1 proves it genuinely orphaned; default is keep.

---

## 6. CSS de-monolithing (incremental, off `globals.css`)

`globals.css` = 2,974 lines; **`.cg-*` rules span lines 244–2973 (~2,700 lines,
~90% of the file).** So the CG consolidation (§5) is *also* the single biggest CSS
win — but because CG content is **kept** (§5 is lossless), these rules are
**relocated to a scoped CG stylesheet, not deleted.** Net effect on `globals.css` is
the same (it shrinks ~90%); the styles live on, scoped to the CG surface.

**Order (each step ships independently, never big-bang):**
1. **Extract tokens** → `app/tokens.css` (`@theme`, §4.1). Import it first in
   `layout.tsx`. Leave the old `:root` values until everything references the new
   names, then delete the `:root` block. *Acceptance: site visually identical.*
2. **Relocate the CG CSS (don't delete it).** When §5 lands, move the `.cg-*` rules
   into a single scoped stylesheet imported only by the CG surface
   (`app/projects/cellular-gaits/cellular-gaits.css`), or CSS Modules co-located with
   the grouped sections. Since CG content is preserved (§5 lossless), nearly all of
   these rules move rather than disappear. Drop only rules whose selectors no longer
   exist after the duplicate-component merges (§5.2). *Acceptance: `grep -c '\.cg-'
   app/globals.css` drops from 443 toward ~0, with the same selectors now present in
   the scoped CG sheet; CG renders identically.*
3. **Tailwind-ify the public surface, highest-traffic first** (nav → cards → hero),
   deleting utility-duplicating CSS as you go. Keep CSS Modules for genuinely
   stateful per-surface layout.
4. **Shrink `globals.css` to tokens-import + resets + a handful of true globals**
   (focus rings `:766`, `::selection`, the section-reveal keyframes). Target < 300
   lines. `app/_internal.css` (142 lines) leaves with the evicted tooling (§7).

---

## 7. Private tooling — consolidate into a gated in-app console (owner-only)

**[OWNER DECISION] Keep it on the portfolio, reachable from the landing page, but
visible/usable only to the owner.** No separate deployment, no removal. Today
`/dashboard`, `/meridian`, `/agents/[token]` are three separate surfaces with three
nav systems, and two of them (`/meridian`, `/dashboard`) are **linked from the public
footer** and one (`/meridian`) is **ungated**. The fix is consolidation + one gate.

### 7.1 One gated console hub (same app, same domain)
Create `app/console/` as the single authenticated umbrella and move the existing
tools under it **unchanged internally**:
- `app/meridian/page.tsx` → `app/console/meridian/page.tsx`
- `app/agents/[token]/**` → `app/console/agents/[token]/**`
- `app/dashboard/**` → `app/console/jobs/**`
- `app/console/layout.tsx` provides ONE console nav (replacing `DashboardNav` +
  meridian's bespoke chrome) and sits behind the auth gate.

**Gating:** extend `middleware.ts` so its matcher guards **all of `/console/**` and
`/api/console/**`** (today it only guards `/dashboard` + some `/api`). Meridian, which
is currently ungated, inherits the gate by moving under `/console`. Move the private
API routes under `/api/console/*` so one matcher covers everything. Keep
`app/dashboard-login` as `app/console/login`.

### 7.2 Reachable from the landing page, hidden from visitors
- Add a discreet console entry to the site chrome that is **auth-aware**: render a
  small "console" link (e.g. a lock glyph in the footer or nav) **only when the
  `dashboard_auth` cookie is present**; visitors never see it. The owner can also just
  hit `/console` directly and authenticate. Either way it's one click from the landing
  page once logged in.
- **Remove the public, unauthenticated footer links** to `/meridian` and `/dashboard`
  (`components/Footer.tsx` lines 7, 9) so visitors don't see private machinery.

### 7.3 What stays public / cleanup
- **`app/api/bench/activity/route.ts`** + `app/lib/bench-activity.ts` +
  `components/WorkshopRail.tsx` stay **public** — the sanitized telemetry feed (no
  company names/titles/URLs) that powers the live cadence (§4.3).
- Meridian / Job-Pipeline also get **public registry write-ups** (`tier:"lab"`
  entries): the polished story is public; the live dashboard sits in the gated
  console. Story public, machinery gated.
- **`content/projects.ts`** Meridian action `{ href: "/meridian" }` → `/console/meridian`
  (gated) or its public `/lab/meridian` write-up.
- `redirects()` in `next.config.ts`: `/meridian` → `/console/meridian`,
  `/dashboard/:path*` → `/console/jobs/:path*`, plus the CG section redirects (§5.1).
- `app/_internal.css` stays (it styles the console); scope it to the console surface
  rather than the global sheet.

---

## 8. Sequenced phases / PRs (low-risk first, each ships independently)

### Phase 0 — Hygiene (½ day, zero design risk)
- **Changes:** rm committed `tsconfig.tsbuildinfo`, add to `.gitignore`. Fix the
  self-description bug `content/projects.ts:151` (`HTML · vanilla JS` → `Next 16 ·
  React 19 · TypeScript`). Fix the CG 7-vs-10 tab mismatch (moot after Phase 4 but
  cheap now).
- **Files:** `.gitignore`, `content/projects.ts`.
- **Acceptance:** `git status` clean of build artifact; card reads correctly.

### Phase 1 — Console consolidation + gating (1–1.5 days, highest perceived-bloat reduction)
- **Changes:** §7. Create `app/console/` and move `meridian/`, `agents/`,
  `dashboard/` (→`jobs/`) under it with one console nav; move private `api/**` under
  `/api/console/*`. Extend `middleware.ts` to gate all of `/console/**` +
  `/api/console/**` (closes the ungated `/meridian` hole). Add the auth-aware console
  link to the chrome; remove the public footer `/meridian` + `/dashboard` links. Add
  redirects.
- **Files:** new `app/console/**`; move (not delete) the tool dirs; edit
  `middleware.ts`, `components/Footer.tsx`, `content/projects.ts`, `next.config.ts`.
- **Acceptance:** every private tool reachable only under a gated `/console/*`;
  `/meridian` now redirects + is gated; public footer has no private links; an
  authenticated owner sees the console link from the landing page; `npm run build`
  green; `/api/bench/activity` still serves the rail.

### Phase 2 — Token layer (½ day)
- **Changes:** §6.1 — extract `:root` → `app/tokens.css` (`@theme`); import first.
- **Files:** `app/tokens.css` (new), `app/globals.css`, `app/layout.tsx`.
- **Acceptance:** visual diff identical; tokens resolve from one file.

### Phase 3 — Content registry + Zod (1–2 days, the centerpiece enabler)
- **Changes:** §2.2 — add `content/schema.ts`; split `PROJECTS` into
  `content/projects/<slug>.ts` files + `content/projects/index.ts` barrel with Zod
  validation + unique-slug guard. Backfill `slug/tier/domain/featured/built_with/
  embed` on the five existing entries (Meridian/Papercuts/Job-Pipeline→`lab`,
  Cellular-Gaits→`project`+`embed`, This-site→`project`). Add `zod` to deps.
- **Files:** `content/schema.ts`, `content/projects/*.ts`, delete old
  `content/projects.ts`; update `components/Bench.tsx` import.
- **Acceptance:** `npm run build` validates all entries; a deliberately-broken entry
  fails the build with a Zod error.

### Phase 4 — Index + detail routes + CG consolidation (2–4 days)
- **Changes:** §2.3–2.5 + §5. Add `app/projects/page.tsx`, `app/lab/page.tsx`,
  `app/{projects,lab}/[slug]/page.tsx`, `ProjectCard`, `ProjectDatasheet`,
  `IndexFilters`, `EmbedMount`. Consolidate CG **losslessly** (§5): regroup the 16
  route files into ~4 grouped sections under `app/projects/cellular-gaits/` using the
  one site chrome + a slim `<SectionNav>`; merge only the true duplicate components
  (§5.2); move `FlyStage` to `components/embeds/`. Relocate `.cg-*` CSS to a scoped CG
  stylesheet (§6.2) — keep the styles, just out of `globals.css`. Add per-tab→section
  redirects.
- **Files:** new `app/{projects,lab}/**`, `components/projects/**`,
  `components/embeds/**`; restructure `app/projects/cellular-gaits/**` (regroup, not
  remove); merge the duplicate `components/cellular-gaits/**` trio/pairs, keep the
  rest.
- **Acceptance:** `/projects` + `/lab` render from the registry; CG shows ~4 grouped
  sections with **all** demos/figures/explanations intact + the lazy sim; every old CG
  tab URL redirects to its new section anchor (no dead links, no lost content);
  `grep -c '\.cg-' app/globals.css` near 0 with the same selectors now in the scoped CG
  sheet; main-bundle JS unchanged (WASM still split).

### Phase 5 — New homepage + secondary routes (3–5 days)
- **Changes:** rebuild `app/page.tsx` as the hub (signature cadence-trace hero on
  real `bench-activity` + registry data; featured feed; lineage spine). One
  `<SiteChrome>` (single nav + footer) replacing `Nav.tsx`'s hardcoded array — nav
  links derived from routes, not three arrays. Add `/about`, `/work`, `/now`,
  `/uses`, `/colophon`. Add `motion` dep; wire Motion micro-interactions; theme
  override files (§4.2).
- **Files:** `app/page.tsx`, `components/SiteChrome.tsx`, `components/hero/CadenceTrace.tsx`,
  `app/{about,work,now,uses,colophon}/page.tsx`, `app/themes/*.css`.
- **Acceptance:** one nav system site-wide; hero animation bound to real data (or
  absent); Lighthouse LCP ≤ 2.5s.

### Phase 6 — Credibility + perf pass (1–2 days)
- **Changes:** per-project build-logs (`buildLog` MDX on detail pages); AI-policy
  line on `/uses`; name the stack. Add `@next/bundle-analyzer` + image config to
  `next.config.ts`; `next/image` for thumbnails; Lighthouse CI on PRs.
- **Acceptance:** build-log renders on `/projects/:slug`; bundle report in CI;
  INP ≤ 200ms, CLS ≤ 0.1.

---

## 9. Risks & explicit non-goals

**Risks**
- **Route precedence** `app/projects/cellular-gaits/` (static, kept as the grouped
  section set) vs `[slug]` (dynamic). Next resolves the static segment first, which is
  exactly what we want for CG; just ensure `bySlug("cellular-gaits")` still backs the
  card/links and that no *other* project reuses that static path. (§2.1, §5)
- **MDX tooling creep.** Adding `@next/mdx` for `body`/`buildLog` is the one new
  build dep — keep it minimal; `paragraphs[]` stays as the no-MDX fallback so a
  project needs zero MDX to ship.
- **Voice regression.** The Bench/Hero/Lineage copy (VOICE_PROFILE.md) is sacred;
  do not let `ProjectDatasheet` sand it into marketing. Migrate copy verbatim.
- **Telemetry coupling.** The public rail depends on `supabase-admin` + the `runs`/
  `jobs` tables that move with the cockpit. Keep `app/api/bench/activity` + its
  service-role read on the portfolio side, reading the same DB read-only.

**Non-goals (do NOT do — this is the overengineering line)**
- **No Astro / framework migration.** (Constraint, and the FlyStage split already
  delivers Astro's island win.)
- **No second animation library.** Motion only; GSAP/R3F isolated-lazy-guarded
  exceptions, never baseline. No Lenis unless the scroll-sequence hero is chosen.
- **No "chat with my site" LLM widget** — reads as low-effort; the site quality is
  the proof.
- **No filesystem-glob content engine / CMS / generic plugin loader.** The barrel +
  Zod (§2.2) is the right size; a `require.context` swap is a *later* option, not now.
- **No big-bang CSS rewrite.** Token-extract + CG-scope + surface-by-surface only.
- **No decorative-only motion.** If a planned animation can't bind to
  `bench-activity` or registry data, it is cut, not kept "for polish."
- **No content loss in Cellular Gaits.** [OWNER DECISION] The consolidation is
  lossless — regroup routes and merge duplicate components, but keep every visual,
  demo, and explanation, and **redirect every old per-tab URL** to its new section
  anchor. Do not cull content to slim the page.
- **No separate deployment / removal of the tooling.** [OWNER DECISION] The console
  stays in-app on `vishal.pa.thak.io`, reachable from the landing page, gated to the
  owner. Don't move it to another domain or delete it.
```
