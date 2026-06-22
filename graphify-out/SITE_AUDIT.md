# SITE AUDIT — vishal.pa.thak.io portfolio

Adversarial IA audit ahead of a redesign. Goal under audit (from CLAUDE.md):
*"a person with a specific long-running obsession, not a generated candidate
page. The thread Hodgkin-Huxley → memristors → spiking networks → connectomics
should be legible."* Owner's complaint: scale too high, unhappy with aesthetics.

**Headline:** the *public portfolio* is small and good. The repo is enormous
because a private job-pipeline cockpit, a trading dashboard, and a 10-tab
research microsite all live in the same Next.js app and bleed into the public
surface. The "scale" the owner feels is mostly (a) one project (Cellular Gaits)
ballooning into a 10-route, 32-component microsite, and (b) ~3.5k lines of
private tooling sharing the same shell, footer, and 2,974-line stylesheet.

---

## 1. COMPLETE INVENTORY

**Totals:** ~38 routes (14 public/semi-public pages + ~21 API routes + login/agents).
125 `.ts/.tsx` files in `app/`+`components/`. **48 components** total —
**32 bespoke in `components/cellular-gaits/`** alone. `app/globals.css` is a
single **2,974-line** monolith.

### Public portfolio (the actual "site")

| Route | Purpose | Components |
|---|---|---|
| `/` (`app/page.tsx`) | Single-scroll homepage: notebook column + workshop rail | Nav, Notebook, Hero, Lineage, Experience, Bench, Contact, WorkshopRail, Footer, KbdHint |
| `#about` Hero | Thesis: EE/neuromorphic, agentic side-work | HHTrace (HH action-potential trace) |
| `#lineage` Lineage | Click-to-expand year pins; the through-line | content/lineage.ts |
| `#experience` Experience | Paid work, reverse-chron | ExperienceEntry, content/experience.ts |
| `#bench` Bench | 5 personal projects (Meridian, Papercuts, Job Pipeline, Cellular Gaits, This site) | Project, content/projects.ts |
| `#contact` Contact | Contact block | — |
| WorkshopRail (right rail) | Live jobpipe telemetry: status, now-playing, ledger, legend | rail/StatusBlock, NowPlaying, RecentLedger, Legend |

### Cellular Gaits microsite (`/projects/cellular-gaits/*`) — 10 routes

Shared shell: `layout.tsx` (topbar + `CgTabNav` + footer). Nav source of truth
`components/cellular-gaits/tabs.ts` lists **10 tabs**.

| Route | Purpose | Bespoke components |
|---|---|---|
| `/` Frame | Hero video + framing + tab index | CAPlayer |
| `/body` | The FlyGym Drosophila plant | ConceptScaffold, BodyFlyDemo (→FlyStage, PlantSchematic) |
| `/controller` | NCA at edge of chaos + gain→gait sweep | ConceptScaffold, CriticalityPlayground, GainSweepChart, GaitClips |
| `/sensing` | Open-loop vs closed proprioceptive loop | ConceptScaffold, SensingModule (→SignalPathDiagram, SensorOverlay) |
| `/mapping` | 42 grid cells → 42 joint targets | ConceptScaffold, MotorMap |
| `/objective` | Fitness function | ConceptScaffold, ObjectiveChart, Math |
| `/optimizer` | CMA-ES | ConceptScaffold, OptimizerModule (→ToyCmaEs) |
| `/embodied` | Ladder: NCA→CPG→closed-loop→connectome | ConceptScaffold, ControllerLadder |
| `/behaviors` (hub) | Closed-loop premise + 4 behavior cards | ClosedLoopDiagram |
| `/behaviors/perturbation` | Shove → hold heading | ConceptScaffold, SensorChannels, HeadingError, PerturbationDemo |
| `/behaviors/chemotaxis` | Bilateral odor gradient foraging | ConceptScaffold, GradientField, ChemoTrajectories, ChemotaxisDemo |
| `/behaviors/escape` | Looming → Giant-Fiber circuit | ConceptScaffold, EscapeCircuit, EscapeDemo, EscapeTrajectories |
| `/behaviors/navigation` | Seek + avoid feelers (building) | ConceptScaffold, FeelerField |
| `/appendix` | KaTeX math + system diagram + build-plan DAG | Math, SystemDiagram, BuildPlanDAG |

Low-level/shared CG components: `FlyStage` (MuJoCo-WASM engine, wrapped by all 4
demos + BodyFlyDemo), `CACanvas` (inside CAPlayer), `Math` (objective+appendix).
**No CG component is truly dead** — the graph's "orphan" flags (SignalPathDiagram,
SensorOverlay, SignalPath in ClosedLoopDiagram) are imported by other components,
not pages.

### Private tooling sharing the app (NOT portfolio)

| Route | Purpose | Gating |
|---|---|---|
| `/meridian` (1,469 lines, one file) | Trading-agent telemetry: 6-signal radar, reasoning view | **Ungated**, footer "APPENDIX" link |
| `/agents/[token]` (441 lines) | Agent ops status board (Meridian/hunt/applicant) | Token in env, no link |
| `/dashboard` | Job triage/browse cockpit | Password (middleware) |
| `/dashboard/login` | Cookie gate | — |
| `/dashboard/insights` | Recharts: KPIs, funnel, tier yield, pattern analysis | Password |
| `/dashboard/stories` | STAR story bank + export | Password |
| `/dashboard/review` + `/review/[job_id]` | Submit-lane queue + per-job materials cockpit | Password |
| `app/api/*` (~21 routes) | 14 dashboard + chat + materials + meridian + bench + login | Mixed |

Private-tooling panels: BrowseView (1,304 lines), RunsPanel, MatchAgent,
ManualTailorPanel, plus `dashboard/components/*` and `dashboard/lib/*`.

---

## 2. INFORMATION ARCHITECTURE (current)

```
/  (homepage, single scroll)
├── Nav: §1 ABOUT · §2 LINEAGE · §3 EXPERIENCE · §4 BENCH · §5 CONTACT  (anchor jumps, keys 1–5)
├── #about → #lineage → #experience → #bench → #contact
├── WorkshopRail (live telemetry, no outbound links except legend)
├── Bench cards → external/internal:
│     ├── Meridian      → /meridian   (+ github)
│     ├── Papercuts     → papercuts.cc
│     ├── Job Pipeline  → github only
│     ├── Cellular Gaits→ /projects/cellular-gaits
│     └── This site     → (no link)
└── Footer "APPENDIX": → /meridian · → /dashboard (private)

/projects/cellular-gaits  (own shell, own 10-tab nav, "← BACK" to /)
└── CgTabNav: Frame · Body · Controller · Sensing · Mapping · Objective ·
              Optimizer · Embodied · Behaviors · Appendix
    ├── Frame hero → tab index (lists only 7 of 10 tabs)
    ├── /behaviors (hub) → perturbation · chemotaxis · escape · navigation
    └── cross-links: Sensing↔Behaviors↔Appendix (diagram references)

[ISLANDS, reachable only by direct URL or footer]
/dashboard/* (password)   /agents/[token] (token)   /meridian (footer)
```

**IA observations:**
- Two completely different nav systems (homepage section-nav vs CG tab-nav) with
  no shared chrome. CG is effectively a second site.
- The homepage `Bench` and the CG microsite are the *only* doorway to the deep
  research content — and Cellular Gaits is just 1 of 5 equal bench cards, despite
  being the single best embodiment of the site's stated thesis.
- Private tooling is wired into the *public footer* of a job-seeker's portfolio.

---

## 3. ADVERSARIAL CRITIQUE

**A. The "scale" is one project metastasizing.** Cellular Gaits is **10 routes
and 32 bespoke components** — bigger than the rest of the portfolio combined. It's
a self-justifying microsite with its own shell, footer, tab nav, and build-plan
DAG describing *its own future*. The thesis wanted *one legible obsession*; the
execution turned one bench item into a 13-page technical reference with a roadmap
tab. This is the over-engineering the owner is feeling.

**B. Diagram-component sprawl (the graph's flag is real).** Five overlapping
node/box diagram components: `SystemDiagram` (491), `ClosedLoopDiagram` (381),
`BuildPlanDAG`, `SignalPathDiagram`, plus `EscapeCircuit`. SystemDiagram and
ClosedLoopDiagram both render the same forward path (controller→mapping→body) with
a dashed proprioceptive arc — the graph correctly tagged them
`semantically_similar`. Two trajectory components (`ChemoTrajectories` 235,
`EscapeTrajectories` 240) are near-duplicate top-down path plotters. Four live-sim
wrappers (BodyFlyDemo, PerturbationDemo, ChemotaxisDemo, EscapeDemo) each
re-wrap `FlyStage` with bespoke controls. There is real factoring debt: one
`<LoopDiagram>` and one `<TrajectoryMap>` and one `<FlyDemo>` could replace ~8
components.

**C. Single-use everything.** 19 of 32 CG components are imported by exactly one
page. `CriticalityPlayground` (534), `MotorMap` (542), `ControllerLadder` (626),
`FeelerField` (833 — for a behavior that isn't even live yet), `ToyCmaEs` (476).
Each tab got its own hand-built interactive. That's a lot of surface area for a
side project, and `FeelerField` at 833 lines for a "building" status behavior is
pure speculative build.

**D. Private tooling pollutes the portfolio.** `/dashboard` (job cockpit),
`/meridian` (1,469-line trading UI), `/agents/[token]` (ops board) are admin
tooling living in the same app, sharing the same `globals.css`. The dashboard
alone is ~3.5k lines (BrowseView is 1,304). A recruiter who opens the footer
"APPENDIX → dashboard/meridian" links sees the candidate's *private job-hunting
machine* — that's an own-goal on a job-seeking site. None of this belongs in the
portfolio's repo surface or footer.

**E. The 2,974-line `globals.css` monolith.** Every page — public, CG, dashboard,
meridian — shares one stylesheet. This is almost certainly a chunk of the
"unhappy with aesthetics + scale" feeling: there's no design-token layer, no
per-surface theming, just one giant file accreting `cg-*`, `dashboard-*`,
`meridian-*`, and homepage classes together.

**F. Inconsistencies / dead ends:**
- Frame hero `TAB_INDEX` lists **7** tabs; `CgTabNav` shows **10**. The hero index
  silently omits Behaviors and Appendix. Two sources of truth for "the tabs."
- `behaviors/page.tsx` renders status `"building"` as the label **"live soon"**
  while the legend implies live/queued — three concepts, two labels, mislabeled.
- Navigation behavior is "building" but ships an 833-line `FeelerField` — a route
  that's a weak/dead end for visitors.
- `README.md` is **stale**: references `ReviewPanel.tsx` (renamed/removed), wrong
  companion-repo names (`job-hunter`/`job-applicant` vs current `job-pipeline`),
  and an old `app/` tree.
- `Project` card "This site" says `STACK: HTML · vanilla JS` — it's Next.js/React.
  Small, but it's a factual self-description error on the portfolio.

**G. Thesis dilution.** The stated thread is HH→memristors→spikes→connectomics.
The homepage *says* it (Hero + Lineage do this well). But the deep content the
visitor can actually explore is **agentic side-projects** (Meridian trading,
Papercuts book club, the job pipeline) — none neuromorphic. Cellular Gaits is the
only deep artifact on-thesis, and it's buried as 1-of-5 bench cards. The site's
*surface area* argues "agentic builder," not "neuromorphic obsessive."

---

## 4. WHAT'S SACRED (preserve through any redesign)

1. **The notebook + workshop-rail metaphor** (Hero copy): "research on the left,
   builds on the right." This is the single strongest identity move — it *is* the
   thesis as layout. Keep it.
2. **HHTrace in the Hero.** An actual simulated Hodgkin-Huxley action potential as
   the opening figure — literally the first node of the through-line. Perfect.
3. **Lineage's "same instinct, different substrates"** click-to-expand timeline.
   This is the legible obsession the brief asks for. Keep verbatim.
4. **The voice.** Bench/Hero copy matches VOICE_PROFILE.md — dry, concrete,
   undersells ("trivial means to begin working with agentic AI"). Do not let a
   redesign sand this into marketing.
5. **Cellular Gaits Frame + Orientation + best.mp4 + CAPlayer.** The walking fly
   beside the pulsing CA grid is the best single artifact on the whole site and
   the only deep thing on-thesis (connectome→dynamics→behavior). Keep the *core*;
   cut the sprawl around it.
6. **`content/*.ts` data-driven model.** projects/lineage/experience as typed data
   is clean and right.

---

## 5. THREE RESTRUCTURE OPTIONS

### Option 1 — Minimal Consolidation (lowest risk)
Keep the IA; cut the fat.
```
/                       (unchanged homepage)
/projects/cellular-gaits
  /            Frame (hero + orientation + how-it-works inline)
  /behaviors   (one page: tabbed/anchored, all 4 behaviors)
  /appendix    (math + ONE unified system diagram)
```
- **Merge:** collapse Body/Controller/Sensing/Mapping/Objective/Optimizer/Embodied
  (7 routes) into long-scroll sections of Frame (or 2 pages). Fold the 4 behavior
  routes into one. **10 routes → 3.**
- **Cut:** SystemDiagram+ClosedLoopDiagram → one `<LoopDiagram>`;
  ChemoTrajectories+EscapeTrajectories → one `<TrajectoryMap>`; the 4 demo wrappers
  → one `<FlyDemo behavior=…>`. Drop the BuildPlanDAG/roadmap tab (it documents the
  site's own future — not for visitors). Park `navigation`/FeelerField until live.
- **Move out:** extract `/dashboard`, `/meridian`, `/agents` to a separate app or
  subdomain; remove footer "APPENDIX" links. Split `globals.css` per surface.
- **Tradeoff:** preserves all content and the existing aesthetic; doesn't fix the
  "two-sites" feel or re-center the thesis. Fastest path to "less bloated."

### Option 2 — Hub-and-Spoke (recommended)
Re-center the homepage as the hub; make Cellular Gaits a first-class spoke, demote
the rest to honest side-notes.
```
/                       Hub: Hero(HHTrace) · Lineage · Experience · Bench(rail)
/work/cellular-gaits    The one deep project — single rich scroll page:
                          Frame → live fly+CA → how it works (the 7 "choices"
                          as collapsible sections) → behaviors (anchored) → math
/notes (optional)       Short index of the other bench builds (Meridian, Papercuts,
                          Job Pipeline) as cards/links, NOT full microsites
```
- **Merge/cut:** same component de-duplication as Opt 1; CG becomes **one route**
  with in-page sections instead of 10 routes. Kill the second nav system entirely —
  CG inherits the homepage chrome.
- **Move out:** all private tooling to its own deployment. Footer becomes clean.
- **Keep:** notebook/rail metaphor, Lineage, voice, CG core artifact.
- **Tradeoff:** more work than Opt 1 and you lose deep-linkable per-concept URLs
  (mitigate with anchor links). Payoff: the site reads as *one obsession with one
  flagship artifact*, exactly the brief. Recenters thesis, kills the two-sites
  problem, and the homepage stops treating a trading bot and a book club as peers
  of the neuromorphic work.

### Option 3 — Full Reimagining: "The Through-Line"
Make the IA *be* the HH→memristors→spikes→connectomics arc.
```
/                The thread, as a single vertical scroll / horizontal timeline:
  Hodgkin-Huxley → memristors (Rain) → spiking nets (GTRI/Loihi) →
  embodied/connectomics (Cellular Gaits)  — each node expands inline
/the-fly         Cellular Gaits embedded as the arc's terminal, present-tense node
(bench/side-work demoted to a single quiet "off-hours" footer strip)
```
- **Merge:** Lineage + Experience + Bench collapse into the one timeline; each
  career node carries its evidence inline. Cellular Gaits is the living end of the
  thread, not a separate project page.
- **Cut:** the entire microsite framing, both nav systems, ~half the CG components.
  Private tooling gone from the repo.
- **Tradeoff:** highest effort and highest risk to the voice/content you already
  have; could over-design into a "generated candidate page" if the execution gets
  precious — the exact failure mode the brief warns against. Biggest upside if it
  lands: the site is unmistakably one person's obsession and nothing else.

### Recommendation — **Option 2 (Hub-and-Spoke).**
It fixes every concrete problem the owner named: it deflates the scale (10 CG
routes → 1, ~8 redundant components → 3), removes the private tooling and the
2,974-line shared-CSS coupling, and kills the second nav system that makes the
site feel like two apps. Crucially it *re-centers the thesis* — Cellular Gaits
stops being 1-of-5 equal cards and becomes the flagship that earns the
"neuromorphic/connectomics obsession" claim, while Meridian/Papercuts/Job-Pipeline
stay present but honestly sized as off-hours notes. It does this without throwing
away the sacred elements (Option 3's risk) and without leaving the two-sites feel
intact (Option 1's gap). It is the smallest change that makes the site match its
own stated goal.
```
```
