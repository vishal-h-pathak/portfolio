# Portfolio Redesign Plan — Scalable Personal Hub

> **Thesis (rev 2, mid-2026):** *"Working in AI since 2017 brought me here."* The site showcases one thing — **him** — as a present-tense **agentic builder** who uses frontier AI workflows to ship tools across many domains. Neuromorphics is the deep origin discovered one layer in, not the front door. The diverse project set is the *evidence*, not sprawl.
>
> **How this was produced.** Three passes: (1) a design agent that drafted an ideal IA blind to the repo; (2) a repo-crawl agent that mapped ground truth; (3) two web-research agents on current builder-portfolio design and on scalable architecture/animation tooling. This document reconciles all four. Rev 2 reframes the earlier neuro-first version after the positioning flip to agentic-builder.
>
> **Headline:** your *public* portfolio is already small and on-voice. The work is (a) drawing a clean boundary around the private tooling that's cohabiting the app, (b) turning your existing `content/*.ts` registries into the spine that makes new projects drop-in, and (c) spending a tight motion budget on **one** signature landing moment. **No framework migration.**

---

## 1. The repositioning, in one screen

Three layers, three jobs — the old plan collapsed two of them under "neuromorphics":

- **Roots** — neuromorphics / SNNs / brain-inspired computing. Your intellectual depth and the reason you think in systems and emergence. Explains *why you're credible*; not the pitch.
- **Range** — the GTRI years. CV, embedded ML, VHDL, real deployment. Proof you operate well outside the niche. (Full breadth lives in the `portfolio` and `job-pipeline` docs — pull from those.)
- **Present tense** — agentic workflows. What you do now and want to keep doing: building real tools fast, across domains, with frontier agentic methods.

The organizing idea moves from *"emergence as navigation"* to **"the method is the throughline."** Your one-liner is the homepage thesis verbatim: *"I want a new job that lets me continue doing what I've been doing — using frontier agentic workflows to build tools for whomever needs them."* The reframe that makes the whole site click: **the diversity of your projects stops being sprawl and becomes the entire argument.** A neuro person who shipped a bio-sim, a trading dashboard, a book-club site, and an autonomous job pipeline — that range *is* the proof of "tools for whomever needs them," and the agentic method is what makes it possible.

---

## 2. Ground truth (what exists today)

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Tailwind v4 *plus* a ~2,974-line hand-written `app/globals.css`, on Vercel at `vishal.pa.thak.io`.

**Good bones already in place** — keep and extend:

- `content/experience.ts` (`EXPERIENCE: Role[]`), `content/lineage.ts` (`LINEAGE` — HH 2016 → Memristors 2017 → Spiking nets 2018 → Agents now), `content/projects.ts` (`PROJECTS` — Meridian, Papercuts, Job Pipeline, Cellular Gaits, This site).
- Reusable primitives (`Section`, `Margin`, `Notebook`) and hooks (`useScrollSpy`, `useLiveClock`, `useReducedMotion`). You already have a reduced-motion hook — good instinct to build on.

**Where it strains:**

1. **One project metastasized.** Cellular Gaits = ~10 routes + ~13 pages + 32 bespoke components + ~24 MB assets (incl. 9.2 MB MuJoCo WASM) — larger than the rest of the site combined, with its own topbar/nav/footer. Effectively a second site at `/projects/cellular-gaits/*`.
2. **Three disconnected nav systems**, no shared chrome: homepage anchor-nav, the Cellular Gaits microsite nav, the dashboard nav.
3. **Private tooling pollutes the public portfolio.** `/dashboard` (~3.5k lines, password-gated job-hunt cockpit), `/meridian` (1,469-line single-file trading telemetry), `/agents/[token]` all live in the same app, share `globals.css`, and `/meridian` + `/dashboard` are **linked from the public footer**.
4. **CSS monolith.** ~2,974 lines, ~445 `.cg-*` selectors, no token layer.
5. **No scalable slot for new projects.** Adding a deep project means hand-cloning the Cellular Gaits microsite. Nav arrays hardcoded in three places.
6. **Self-description bug:** the "This site" card claims `HTML · vanilla JS · taste` — it's Next.js 16 / React 19.

---

## 3. Information architecture

Flat, few top-level routes, organized by the journey rather than by tech:

```
/                  Hub. The one-liner + the "AI since 2017" spine + selected work + a live "from the lab" feed.
/about             The story: AI since 2017 — roots (neuromorphics) → GTRI breadth → agentic now. Personal layer at the bottom as texture.
/work              Professional experience as a timeline (recruiter-shaped). Driven by experience.ts + lineage.ts.
/projects          Auto-generated index of POLISHED, narrative projects. The portfolio tier.
/projects/:slug    Project detail (rich MDX + optional embedded live demo + a short "how it was built" build-log).
/lab               Auto-generated index of EXPERIMENTS, dashboards, utilities. Lower bar; "things in motion." Proof of velocity.
/lab/:slug         Experiment detail / embed.
/now               What he's building & looking for right now (nownownow.com convention — cheap, high-personality).
/uses              Stack / tools / agentic workflow. Signals he's plugged into builder culture and makes the "I build with AI" claim concrete.
/colophon          How the site is built (the site itself is the proof artifact).
```

**The `/projects` vs `/lab` split is the anti-junk-drawer mechanism**, and it now does double duty:

- `/projects` = curated, finished, real write-ups. What you show a hiring manager.
- `/lab` = the velvet-rope junk drawer that *absorbs* every new dashboard/utility so it never pollutes the portfolio — and reframes as **proof of cadence**: "one person + agents ships like a small team." New tinkering lands in `/lab` by default; it graduates to `/projects` only when it earns a narrative.

This is the standard scalable pattern from digital-garden practice (Maggie Appleton's seedling/budding/evergreen growth stages; the "gallery = portfolio, greenhouse = lab" split): readers forgive roughness when it's *labeled* as in-progress.

**Where today's content maps:** homepage → `/` + `/work`; Cellular Gaits microsite → one rich `/projects/cellular-gaits` page (collapsed, §5); Meridian / Job Pipeline → `/lab` entries *or* evicted to private deployment (§6); `/dashboard` + `/agents` → evicted (§6); Papercuts → `/projects` or the `/about` personal layer.

---

## 4. The "I build with AI" credibility layer (new, and important for your target roles)

Research with technical hiring audiences is blunt: showcasing AI use reads as **impressive when it shows understanding and ownership**, and as **slop when it reads "prompted it, shipped whatever came out."** Concrete signals to bake in:

- **Per-project build-logs.** A short "how this was built with agents" note on each `/projects/:slug` — the decisions made, what the human validated, the multi-machine orchestration. Your existing AI-policy line ("human in the loop; I review, validate, and own it") belongs on the site verbatim, likely on `/uses` or `/colophon`.
- **Velocity as the proof.** The `/lab` cadence *is* the argument. Make recency visible (dates, a "from the lab" feed on the homepage).
- **The site is the artifact.** "This site was built with the same agentic workflow I'd bring to your team" is credible *only because the site is good.* The medium is the proof — which is exactly why the build quality matters more than any "chat with my site" gimmick (a bare LLM widget now reads as low-effort; skip it).
- **Name the stack** so it's concrete, not buzzword: Anthropic SDK, multi-machine agent orchestration, Supabase, Next/React, Playwright.

---

## 5. Scalable content pattern (extend what you already have)

Generalize `content/*.ts` into a typed registry that *auto-generates* both index pages. The target DX: **add a file → it shows up, validated and consistent.**

- Author each project/experiment as `content/<kind>/<slug>.mdx` with YAML frontmatter (or keep `.ts` entries — same idea).
- Validate frontmatter with a **Zod schema** per kind so a malformed entry **fails the build** — the junk drawer can't form silently. (This is exactly what Astro's Content Collections formalize; you replicate the DX in Next with `gray-matter` + Zod + a glob helper — no migration needed.)

```yaml
title: Cellular Gaits
slug: cellular-gaits
tier: project            # project | lab   ← drives which index it lands in
status: active           # active | wip | archived
domain: bio-sim          # bio-sim | trading | social | tooling | neuro ...
tags: [flygym, mujoco, gymnasium]
year: 2026
summary: One line.
featured: true           # surfaces on the homepage "selected work"
built_with: [anthropic-sdk, multi-machine-agents]   # powers the build-log/agentic signal
embed: /dashboards/cellular-gaits/   # optional: live sub-app mount
links: { repo: ..., demo: ... }
thumbnail: ./cover.png
```

Two rules keep it from re-sprawling:

1. **Required, fixed `domain` + `tier`.** The `/projects` and `/lab` pages glob the registry, filter by `tier`, render a tagged, filterable, status-bearing grid. Adding work is a row, never a redesign.
2. **Live dashboards mount, not merge.** Heavy interactive things (Cellular Gaits' MuJoCo sim, future dashboards) stay self-contained and are *embedded* via `embed:` / lazy-loaded client components — a 9 MB WASM blob never enters the main bundle. The portfolio *references* them; it doesn't *absorb* them.

**Cellular Gaits specifically:** collapse the 13-page microsite to **one rich `/projects/cellular-gaits` page** (narrative + embedded live sim + a single appendix/MDX section), deduping ~8 overlapping diagram/trajectory components down to ~3. This alone removes most of the "site is huge" feeling.

---

## 6. The boundary fix (highest-leverage change)

Your portfolio isn't bloated — it's *entangled*. **Evict the private tooling** (`/dashboard`, `/agents/[token]`, `/meridian`) to its own deployment (e.g. `cockpit.vishal.pa.thak.io` or a separate Vercel project), gated as it already is. It shares *nothing* with the portfolio except a stylesheet it shouldn't share. Removing it cuts the public footer links to private machinery, shrinks the portfolio's CSS/bundle, and drops ~3.5k lines + ~21 API routes from the public surface's mental model. Fallback if you'd rather keep them reachable: surface only behind auth, never linked publicly. A separate deployment is cleaner.

(Note: Meridian and the job pipeline can *also* exist as **public `/lab` write-ups** — the polished story of the tool — while the **live private dashboards** move to the cockpit deployment. Story on the portfolio, machinery off it.)

---

## 7. Tech architecture — stay on Next.js

Both the blind design and the architecture research landed here, for the same reason: **your hybrid (content-heavy portfolio + live interactive dashboards behind one shell) is exactly the case where Astro's main advantage erodes.** Astro ships zero JS by default and wins on read-mostly sites — but every dashboard island still pulls the React runtime, so you'd capture Astro's win only on static pages while re-implementing your dashboard plumbing in a new mental model. For someone already productive in Next 16, that migration is net-negative. Astro's killer feature (typed Content Collections) is replicable in Next with Zod + glob (§5).

**Verdict: no migration. Adopt Astro's *patterns* — static-first, lazy islands, typed content — not Astro itself.**

---

## 8. The landing page — one signature moment, discovered one layer in

You want unique, impressive, fun — without overengineering. The research consensus and your own feedback point the same way: **one signature moment + quiet micro-interactions everywhere else.** Animating everything reads as noise (and measurably hurts comprehension); the craft is the *contrast* between one "wow" and an otherwise calm, fast page. The current cliché to avoid is the dark-single-column template with an animated-underline nav (the most-cloned look on the internet) and the spinning-3D-blob hero.

The earlier connectome mockup failed because it made *neuromorphics* the headline. The fix: the signature moment should foreground **the builder and the journey**, with the neuro origin as a layer you *reach*, not the front door. Three concrete directions, in rough order of recommendation:

- **A — The "AI since 2017" living spine (recommended).** Hero leads with the one-liner and a sense of *range + cadence* (a quiet, auto-updating "recently shipped" strip pulled from `/lab`). Scrolling reveals the journey as chapters — 2017 roots → GTRI breadth → agentic now — a scroll-driven narrative (à la Joe Garner's chaptered site). The *neuromorphic* waypoint is where a small, optional live signal/neuron motif appears — depth discovered one layer in, not imposed up top. This tells the whole story in one scroll and is the most on-thesis.
- **B — Terminal / CLI hero.** A terminal that auto-runs one command and prints the one-liner, then offers real commands (`projects`, `lab`, `now`). Fits genuinely ("multi-machine agent orchestration" — you live in a shell), low-to-medium build cost, very "builder." Risk: don't force visitors to type to find basics.
- **C — Minimal + one WebGL refraction/signal moment.** Dark, fast, one restrained effect tied to identity (à la Dorian Lods' single refraction). Cleanest, least risky, least distinctive.

**Recommendation:** lead with **A**, optionally with a **B** flavor (a small interactive terminal as a secondary delight on `/uses`). Spend the *entire* motion budget on the one hero moment; everywhere else use quiet scroll-reveal and a subtle hover-lift on project cards.

---

## 9. Motion & 3D strategy (tasteful, not overengineered)

- **One animation library: Motion (Framer Motion)** (~30 KB gzip) for component enter/exit and micro-interactions — declarative, React-native, matches how you already think. Add **Lenis** (tiny) only if you want smooth-scroll for the chaptered hero.
- **GSAP + ScrollTrigger is opt-in for the *one* signature scroll sequence only** — not a baseline dependency. Running GSAP *and* Motion together, or stacking ScrollSmoother on Lenis, is the overengineering line. Don't cross it.
- **If the hero uses Three.js / React Three Fiber, isolate it ruthlessly:** wrap the `<Canvas>` in `next/dynamic` with `ssr: false` (route-splits the entire three.js graph out of the main bundle), use `frameloop="demand"` so it doesn't burn cycles when static, and gate it behind `prefers-reduced-motion` + a viewport check with a **static poster fallback**. Your existing `useReducedMotion` hook is the seam. Net: WebGL lives on exactly one page, lazy, client-only, zero cost to the rest of the site.
- **Always wrap motion in `prefers-reduced-motion`** — accessibility and taste, both.

---

## 10. CSS refactor — off the monolith, incrementally

You're on Tailwind v4 already; the monolith is the problem, not the tooling. Never big-bang a 2,974-line file.

1. **Promote design tokens first.** Extract colors, spacing, type scale, radii into Tailwind v4 `@theme` CSS custom properties — single source of truth.
2. **Tailwind-ify surface by surface**, highest-traffic first (nav → cards → hero), deleting utility-duplicating CSS as you go.
3. **Keep CSS Modules for genuinely complex, stateful per-surface styles** (a dashboard's bespoke layout). Hybrid is fine.
4. Shrink the global file to **tokens + resets + a few true globals.** The `.cg-*` rules move into the scoped Cellular Gaits surface (or its embedded sub-app).

---

## 11. Performance & robustness guardrails

Targets: **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.**

- `next/image` for all media; `fetchPriority="high"` on the LCP hero image.
- `next/dynamic` for every heavy widget (3D, charts, video, WASM) — load only where used.
- `next/font` (already in use) to self-host fonts and avoid CLS.
- `@next/bundle-analyzer` in CI; lazy anything >30–50 KB not in the first viewport.
- Lazy heavy assets explicitly: poster-frame the Cellular Gaits video, defer the MuJoCo WASM to its page, never bundle three.js globally.
- Vercel Analytics or Lighthouse CI on PRs so regressions are caught before merge.

---

## 12. Refactor roadmap (low-risk → high-value)

A sequence designed so each phase ships independently and de-risks the next.

1. **Boundary cut.** Evict `/dashboard`, `/agents`, `/meridian` to a separate deployment; remove their public footer links. Biggest perceived-bloat reduction, lowest design risk. Fix the small stuff here too (self-description bug, committed `tsconfig.tsbuildinfo`, the two-sources-of-truth CG tab count).
2. **CSS tokens.** Extract the `@theme` token layer; don't refactor everything yet — just establish the single source of truth.
3. **Content registry + Zod.** Add `tier` / `status` / `domain` / `featured` / `built_with` to the registry; build the glob + validation helper; generate `/projects` and `/lab` as filterable, tagged, status-bearing indexes. Backfill existing entries.
4. **Collapse Cellular Gaits** from microsite to one rich page + embedded sim + appendix; dedupe its components; move `.cg-*` CSS into the scoped surface.
5. **New homepage.** Build the "AI since 2017" spine (concept A) pulling featured/recent from the registry; add the one signature hero moment with Motion (+ optional isolated R3F island). Add `/about`, `/work`, `/now`, `/uses`, `/colophon`.
6. **Credibility layer.** Per-project build-logs; the AI-policy line; name the stack on `/uses`.
7. **Perf pass.** Bundle-analyzer audit, lazy-load heavy assets, Lighthouse CI.

---

## 13. Open questions

1. **Landing concept — A, B, or a blend?** (§8) The hero direction drives the whole build; worth deciding before phase 5. Recommendation is A (the journey spine) with a B flavor on `/uses`.
2. **Private tooling — separate deployment, or co-located behind auth?** (§6) Affects how aggressive phase 1 is.
3. **`/lab` → `/projects` promotion bar.** What earns graduation — a written narrative + build-log, or a live demo/result too? Defining this now is what keeps `/projects` curated a year out.
4. **Recruiter vs. researcher above the fold.** A Tier-1 agentic hire wants the builder/range and the method; the homepage's first screen has to pick a lean. The journey spine hedges, but the first viewport still chooses.

---

## Sources

Design & positioning: Maggie Appleton digital garden (maggieappleton.com); nesslabs digital-garden guide; nownownow.com; Joe Garner / Dorian Lods / Valeriia Shchebetovska (reallygooddesigns.com interactive portfolios); brittanychiang.com (the cloned template); satnaing/terminal-portfolio; hiring-audience AI-credibility (secondtalent, aquent agentic-hiring guides).

Architecture & animation: Astro Islands & Content Collections docs (docs.astro.build); Astro vs Next comparisons (LogRocket, Contentful); React Three Fiber scaling-performance (r3f.docs.pmnd.rs); Motion vs GSAP (motion.dev, pkgpulse); Lenis (github.com/darkroomengineering/lenis); Tailwind v4 vs CSS Modules; Next.js Core Web Vitals (patterns.dev, QED42).

*Full URL list retained in the research notes for this plan.*
