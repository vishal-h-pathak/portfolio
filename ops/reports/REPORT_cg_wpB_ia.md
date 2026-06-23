# WP-B — Information-architecture restructure · report

**Wave:** WP-B (second of the cellular-gaits site redesign). Content/structure +
routing only — no new data, no new viz components. **Branch:** `feat/cg-redesign-wpB`,
off `feat/cg-redesign` (WP-A's branch, at `68b6293`). **Not merged.** Worked in a
separate worktree (`../portfolio-wt/cg-wpB`) so the watcher session on
`feat/dual-machine-watcher` was never touched. Runs in parallel with WP-C; files are
disjoint (see "Lane check").

Source of truth used: `docs/cellular-gaits/REDESIGN_REVIEW.md` (§2 spine, §5 recs #13/#14),
`ops/reports/REPORT_cg_wpA_consistency.md` (the WP-B reconciliation block), `VOICE_PROFILE.md`.
Note: `AGENT_SAFETY.md` does not exist in this repo — honored its spirit by editing only the
files this wave names.

---

## 1. Final tab order (`components/cellular-gaits/tabs.ts`)

The new 9-tab spine (`CgTabNav` renders straight off this table — verified the nav
follows automatically; no edit to `CgTabNav.tsx` needed):

> Frame → Body → Controller → **Sensing & Loop** → Mapping → **Search & Objective** →
> Behaviors → **Embodied** → Appendix

Changes vs the old 10-tab order:
- **Renamed** Sensing → **"Sensing & Loop"** (label only; `/sensing` route unchanged).
- **Merged** Objective + Optimizer → one **"Search & Objective"** entry; kept `/optimizer`
  as the home, dropped the `/objective` nav entry.
- **Moved Embodied to penultimate** (now after Behaviors, before Appendix).

## 2. The merge — Objective → Optimizer as "Search & Objective"

- **Route kept:** `/projects/cellular-gaits/optimizer`. **Route retired:** `/objective`.
- **Redirect added** in `next.config.ts` (`redirects()`):
  `/projects/cellular-gaits/objective` → `/projects/cellular-gaits/optimizer`,
  `permanent: true` (a deliberate IA move; deep-links exist, so redirect not 404).
- **Old page removed:** `app/projects/cellular-gaits/objective/page.tsx` deleted (the
  redirect intercepts the route before filesystem routing, so the page was dead). The
  `ObjectiveModule` was an inline (non-exported) function there — its content was folded
  into the merged page, so nothing else imported it. **`ObjectiveChart.tsx` kept** — now
  rendered on the merged page.
- **Merged page structure** (`optimizer/page.tsx`): a single `SearchObjectiveModule` that
  leads with *what fitness rewarded* (the `F` formula via `Math` + `ObjectiveChart`,
  carrying WP-A's honesty: the stability penalty never fired — `ObjectiveChart` already
  surfaces this), then *how that rule was found* (`OptimizerModule` = toy CMA-ES +
  the real precomputed evolution curve). The objective gloss's closing line — "This is what
  the search below was selected against" — now reads literally (the optimizer is below it).
- **Two duplicated MAP-Elites "Stage 3" frontiers collapsed into one.** Both old pages
  ended their `frontier` explainer with the identical quality-diversity/MAP-Elites archive
  pitch; the merged page states it once.
- **metadata** updated: title `Search & Objective — Cellular Gaits`, description
  "What fitness rewarded and how that rule was found: the objective the controller was
  selected against, then the CMA-ES search that climbed it."

## 3. New copy

**"Search & Objective" lead** (`optimizer/page.tsx`):
> What counts as a good walk, and how the rule was found: the fitness the search maximized —
> the single-peaked curve it actually rewarded — and the gradient-free evolution that climbed it.

The four-part explainer was merged so each part covers objective **and** search: `chose`
("Two choices, one tab…" — objective scalar + CMA-ES pop 32 / σ₀ 0.3 / 50 gens, F ≈ 86.6 mm);
`why` (simplest signal that walks + non-differentiable MuJoCo score → gradient-free, precomputed);
`alternatives` (energy/symmetry/speed/robustness objectives; RL / differentiable physics /
MAP-Elites searches); `frontier` (the single MAP-Elites archive paragraph).

**"Sensing & Loop" lead** (`sensing/page.tsx`):
> The loop is closed. The default walker runs blind — the grid never reads the legs it moves —
> but a controller that feels its body now recovers from a shove the open-loop one can't.

Sensing rewrite (rec #14): the tab now **states the closed loop is done up front** and
presents open-vs-closed directly. Touched `SensingModule.tsx` because the
"promissory-note-plus-correction" structure lived there:
- The bottom block "The experiment that tells them apart" (a perturbation test framed as one
  it *can't yet run*, then a disclaimer correcting it) → a single direct block **"Open vs
  closed, settled"**: the two loops walk identically on flat ground and diverge when shoved;
  the closed loop is built and trained; the live A/B is on **Perturbation** (heading error
  56.6°→26.5°). No promise of a test on another tab — a link to the result.
- The SignalPathDiagram intro's stale "the return arc … is **not wired yet**" → scoped to
  "unwired in the open-loop default shown here, wired in the trained closed-loop controller on
  the Perturbation tab."
- Docstring updated to match (dropped "the perturbation-recovery test we can't yet run").
- `SensorOverlay` and the live `FlyStage` module left intact, as required.

## 4. Frame on-page `TAB_INDEX` re-sync (`app/projects/cellular-gaits/page.tsx`)

`TAB_INDEX` is independent of `tabs.ts`; re-synced to mirror the new spine exactly (Body,
Controller, Sensing & Loop, Mapping, Search & Objective, Behaviors, Embodied, Appendix):
- Merged the Objective + Optimizer entries into one **"Search & Objective"** line (href
  `/optimizer`), `q` combining what-rewarded + the CMA-ES search.
- Renamed Sensing → **"Sensing & Loop"** and **fixed its `q`**: was "…the closed proprioceptive
  loop that **comes next**" → "…the closed proprioceptive loop that **now recovers from a
  shove**" (the loop is done, per the WP-A reconciliation note).
- Moved Embodied to the penultimate slot.
- Left the Body / Controller / Mapping / Embodied `q` copy WP-A set intact.
- Light merge-consistency touch to the §THE FRAME prose: "…the objective, the optimizer…" →
  "…and the search and its objective…" (the two are now one tab).

## 5. Straggler fixed outside the named-file list

`app/projects/cellular-gaits/controller/page.tsx` had an inline cross-link
`href="/projects/cellular-gaits/objective"` labeled "Objective". The redirect would keep it
working, but a link to a retired route reading the old label is exactly the straggler the
verification warns about — repointed to `/optimizer`, label "Search & Objective". This file is
not claimed by WP-C/WP-D/WP-E, so the edit is conflict-free.

## 6. Verification

- **`npx tsc --noEmit` passes** (exit 0) — run via the main checkout's `node_modules`
  symlinked into the worktree + copied `next-env.d.ts`; both removed after (gitignored). tsc
  type-checks `next.config.ts`, so the `redirects()` shape is validated.
- **`npm run build` not completable in this worktree:** Turbopack rejects the symlinked
  `node_modules` ("Symlink … points out of the filesystem root") — an environment artifact,
  not a code error (the `prebuild` status-type check passed first; the panic is the symlink,
  never the source). Same limitation WP-A hit; tsc + grep + route inspection used instead.
- **Grep stragglers (clean):** no `cellular-gaits/objective` href anywhere in `app/`+`components/`;
  no nav label "Objective"/"Optimizer" in `tabs.ts` (only the merged "Search & Objective" +
  an explanatory comment); no Sensing "comes next"; no "not wired yet"/"can't yet run"
  promissory framing in the Sensing copy (remaining "can't run" hits are unrelated WASM-fallback
  comments). `TAB_INDEX` order matches `tabs.ts` order.
- **Routes:** `/objective` directory removed; redirect resolves it to `/optimizer`. Every other
  route's `page.tsx` still present.

## Lane check (parallel with WP-C)

Files touched: `tabs.ts`, `optimizer/page.tsx`, `objective/page.tsx` (deleted),
`sensing/page.tsx`, `SensingModule.tsx`, `next.config.ts`, Frame `page.tsx`, and
`controller/page.tsx` (the one merge straggler). **None overlap WP-C's set** (`body/page.tsx`,
`PlantSchematic.tsx`, `SystemDiagram.tsx`, `appendix/page.tsx`, `behaviors/escape/page.tsx`,
`globals.css`, `BuildPlanDAG.tsx`, `ControllerLadder.tsx`). Clean merge back into
`feat/cg-redesign` expected.

## Notes for WP-E (Embodied page) and final integration

- **Embodied's new nav position is penultimate** (index 7 of 9, after Behaviors, before
  Appendix) in both `tabs.ts` and the Frame `TAB_INDEX`. The `/embodied` **route is unchanged**;
  only its order moved. WP-E owns `embodied/page.tsx` prose — its content was not touched here.
- All inbound links to `/embodied` (Sensing `frontier`, the WP-A ladder/escape links) still
  resolve; WP-E is the link target for the climax content.
- The merged "Search & Objective" tab is the single home for the fitness curve; WP-A's
  Controller→Objective cross-link now points here. Any future reference to "the Objective tab"
  should use "Search & Objective" at `/optimizer`.
- No new CSS introduced — reused existing `cg-*` classes (`cg-obj-module`, `cg-mathblock`,
  `cg-sense-*`). `globals.css` untouched (WP-C's file).

## Git

- **Branch:** `feat/cg-redesign-wpB`, child of `feat/cg-redesign` (`68b6293`). One commit; this
  report amended in. Not pushed, not merged. STOP — did not start WP-C/WP-D/WP-E.
