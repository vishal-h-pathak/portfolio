# WP-C — Reuse-only visualization wins + cleanup · report

**Wave:** WP-C (runs in parallel with WP-B; disjoint files). Reuse-only — no new data, no
compute dependency, no new pipelines. **Branch:** `feat/cg-redesign-wpC`, off `feat/cg-redesign`
(WP-A's branch, at `68b6293`). Worktree: `../portfolio-wt/cg-wpC`. **Committed, not merged.**

Source of truth used: `docs/cellular-gaits/REDESIGN_REVIEW.md` (§3 fly-connection gap, recs #12/#16;
§5 recs #12/#16/#17/#18), `ops/reports/REPORT_cg_wpA_consistency.md` (the "→ **WP-C**" reconciliation
block), `VOICE_PROFILE.md`. (`AGENT_SAFETY.md`/`PARTNER_BRIEF.md` live in the sibling cellular-gaits
repo, not this one — their rules as inlined in the prompt were followed: stayed in WP-C's named-file
lane; deleted only verified-dead code; did not fabricate or scrape any real-fly asset.)

The honesty line from WP-A was held throughout: the connectome work "routes a looming cue to an
embodied escape," not a calibrated threshold (the isolated Giant Fiber saturates). Nothing here
overclaims relative to the rest of the site.

---

## 1. `PlantSchematic` on the Body page (rec #12)

**Where it landed:** inside the Body page's existing `ConceptScaffold` **`module`** slot, paired
directly below the live `BodyFlyDemo` (`app/projects/cellular-gaits/body/page.tsx`). The module is
now a fragment: the live fly you watch walk, a one-line bridging caption (`.cg-plant-note`, an
existing class), then `<PlantSchematic />`.

- One import (`PlantSchematic`) + render + caption. **Zero new logic, zero new CSS** — the
  `.cg-plant` / `.cg-plant-note` / `.cg-plant-cap` styles already shipped in `globals.css` (lines
  ~1718–1760), clearly authored for exactly this orphan; it was imported nowhere until now.
- The caption ties the two together: *watch it walk above; trace which `u[i…j]` moves which leg
  here* — i.e. the same body, once as live physics, once as the static 6-leg → 7-DoF → `u[i..j]`
  anatomy map the Body prose asserts ("42 actuators across ~87 joints, 7 DoF each") but never showed.
- House figure styling matches (`var(--mono)`, site palette, rounded rects, hover/tap/focus popouts).

## 2. Side-by-side escape clips (rec #16)

**Decision: enhanced the page's existing two-up rather than add a second, redundant one.** The escape
page (`behaviors/escape/page.tsx`) already renders a `cg-perturb-clips` two-up of `flee_left.mp4` /
`flee_right.mp4` (the "Same controller, opposite threats → opposite bolts" block). The review itself
flags redundancy clusters as a problem, so duplicating that grid would have been a regression.
Rec #16's *distinct* value — the **shared circuit labeled across both panels** and the **real-fly
reference slot** — was folded into that existing block:

- **Shared-circuit cross-panel label:** a `.cg-sense-cap` line (existing class) beneath the two
  panels reads *"Shared circuit across both panels: **LC4 / LPLC2 → Giant Fiber (DNp01)** — the same
  measured wiring drives both bolts; only the left−right looming asymmetry differs."* So the
  left-threat-bolts-right vs right-threat-bolts-left contrast now reads as *one circuit, two cues*.
- **Real-fly reference placeholder:** a clearly-marked JSX comment sits inside the clip grid, after
  the second figure — a complete, ready-to-uncomment `<figure className="cg-perturb-clip">` for a
  third panel (`/cellular-gaits/data-x/real_fly_loom.mp4`), with an explicit note that it is
  **deliberately not built**: we do not fabricate or scrape a reference clip (licensing +
  link-safety); Vishal supplies a licensed asset, then uncomments it. The shared-circuit caption also
  names the gap so it's visible in-page, not just in code.
- WP-A's honest framing kept: this is the sim escape (analytic looming front-end, learned response);
  the real wiring runs in the embodied loop, linked from the same page.

**→ Follow-up for whoever has the asset:** drop a licensed real-*Drosophila* looming-takeoff clip at
`public/cellular-gaits/data-x/real_fly_loom.mp4` and uncomment the placeholder panel. The grid is a
`grid-template-columns` two-up that collapses to one column on mobile (CSS at globals.css ~2502);
a third panel will reflow cleanly.

## 3. `SystemDiagram` — reflect the embodied loop (rec #18)

**Framing decision: the safe retitle + relead (the prompt's preferred, lower-risk option). I did NOT
add a brain block to the SVG** — the prompt marks that a bonus, not the requirement, and a 138k-neuron
loop doesn't belong inside this NCA+CMA-ES diagram. Concretely:

- **(a) Un-staled the Sensing arc.** The `sensing` block moved `kind: "planned"` → `"runtime"` (solid
  green, no longer dashed); its sub is now "closed · runs in behaviors" and its popout says the closed
  proprioceptive loop runs across perturbation, chemotaxis, and escape (v1 walking is the open-loop
  default). The `FEEDBACK_EDGES` are now solid green with the green arrowhead (were dashed gray); the
  arc annotation reads "proprioceptive feedback · closed across the behaviors · v1 walk open-loop";
  the legend's stale dashed "sensing (v1 walk open-loop)" entry is now a solid-green
  "feedback · closed (v1 walk open-loop)". `<title>`/`<desc>` rewritten to match.
- **(b) Scoped the diagram to the walking + training system** and added an Embodied pointer: the
  title is now "the walking and training system," the docstring carries a SCOPE note, and a footer
  line in the SVG reads *"↳ the embodied brain↔body loop is a separate system — see the Embodied
  tab."* (The actual `<a>` link lives in the Appendix lead, where HTML links work — SVG text can't
  carry one cleanly.)
- **(c) Fixed the Appendix § SYSTEM DESIGN lead** (`appendix/page.tsx`). Was: "the dashed arc is
  proprioceptive feedback that is **not yet wired** … closes the loop in Stage 2." Now: the arc is
  **closed** (runs across the behaviors; v1 walking stays open-loop), the diagram is scoped to the
  walking system, and the embodied brain↔body loop is named as a separate system with an inline
  link to the Embodied tab (added `CG_BASE` import).
- **Living-doc upkeep:** removed the "(companion to BuildPlanDAG)" line from the docstring (that
  component is deleted in #4) and rewrote the colour-semantics block so it no longer says
  "planned/sensing = dashed gray — NOT yet implemented."

## 4. Cleanup (WP-A deferred)

- **Deleted `components/cellular-gaits/BuildPlanDAG.tsx`** (`git rm`). Verified no importers before
  removal: the only code reference was the file's own `export`; the two remaining mentions were
  docstring comments in `SystemDiagram.tsx` and `PlantSchematic.tsx`, both now fixed. (Markdown docs
  under `docs/cellular-gaits/` still mention it historically — out of scope, not UI.)
- **Pruned `.cg-hero-video` CSS** (`globals.css`, the two rules at the old ~931–940). Verified the
  class is referenced nowhere in `app/` or `components/` (WP-A removed the only element using it).
- **Pruned dead `roadmap` + `frontier` keys** in `ControllerLadder.tsx`: `Kind` is now
  `"today" | "fixed"` and `PALETTE` carries only those two. Verified both keys were unreferenced
  (all rungs are `today`; the slot/body are `fixed`; connectors + legend use `PALETTE.today` /
  `PALETTE.fixed` only). `Record<Kind, …>` is still fully satisfied — tsc clean.
- **Fixed `PlantSchematic.tsx` docstring** ("SystemDiagram / BuildPlanDAG" → "SystemDiagram") so it
  doesn't reference the deleted file.

---

## What I deliberately left for later waves (stayed in lane)

- **`ConceptScaffold.tsx:73` still reads** *"The math behind this — equations, constants, and the
  build-plan DAG — is in the appendix."* That **build-plan DAG no longer exists** (WP-A removed the
  Appendix § ROADMAP section; WP-C deleted the component). This line renders on **every concept tab**,
  so it's a real stale public reference — but `ConceptScaffold.tsx` is **not in WP-C's named-file
  lane** (nor WP-B's), so I left it untouched. **A later wave should change it to
  "equations and constants."**
- **`SystemDiagram.tsx`** now has an unused `planned` entry in `Kind`/`PALETTE` and an unused
  `sysd-gray` marker def (no block is `planned` anymore). Left in place to keep the change minimal and
  avoid touching the `Record<Kind,…>` shape mid-wave; harmless (tsc clean). A future ladder/diagram
  pass can prune them the same way WP-C pruned ControllerLadder's.

## Verification

- **`npx tsc --noEmit` → exit 0**, no output. Run via the main checkout's `node_modules` symlinked
  into the worktree + a copied `next-env.d.ts`; both removed after (gitignored regardless).
- **`grep -rn BuildPlanDAG app components content` → none.** `grep -rn cg-hero-video app components`
  → none. `grep roadmap\|frontier components/cellular-gaits/ControllerLadder.tsx` → none.
- Did not run a dev server (none of the changes are runtime-data-dependent; all are reuse of
  already-rendering components + copy). Relied on tsc + greps per the prompt.

## Files changed

```
 M app/globals.css                                    (pruned .cg-hero-video)
 M app/projects/cellular-gaits/appendix/page.tsx      (§ SYSTEM DESIGN lead + CG_BASE import)
 M app/projects/cellular-gaits/behaviors/escape/page.tsx  (shared-circuit label + real-fly placeholder)
 M app/projects/cellular-gaits/body/page.tsx          (PlantSchematic paired with BodyFlyDemo)
 D components/cellular-gaits/BuildPlanDAG.tsx          (deleted — dead code)
 M components/cellular-gaits/ControllerLadder.tsx      (pruned roadmap/frontier Kind+PALETTE keys)
 M components/cellular-gaits/PlantSchematic.tsx        (docstring: drop BuildPlanDAG ref)
 M components/cellular-gaits/SystemDiagram.tsx         (un-stale sensing, scope framing, Embodied pointer)
```

## Git
- **Branch:** `feat/cg-redesign-wpC`, child of `feat/cg-redesign` (`68b6293`). **Not merged.**
- Disjoint from WP-B's files (`tabs.ts`, optimizer/objective/sensing pages, `next.config.ts`, Frame
  `TAB_INDEX`) — both branches should merge cleanly.
- **STOPPED here** — did not merge, did not start WP-D/WP-E.
