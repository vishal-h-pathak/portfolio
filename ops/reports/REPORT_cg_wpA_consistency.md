# WP-A — Narrative consistency pass · report

**Wave:** WP-A (first of the cellular-gaits site redesign). Content/framing only — no new
visualizations, no data dependency. **Branch:** `feat/cg-redesign` (fast-forwarded to `main` =
`1bdd9c2`, then committed on top). **Not merged.** Executed in a separate worktree
(`../portfolio-wt/cg-redesign`) so the watcher session's uncommitted WIP on
`feat/dual-machine-watcher` was never touched.

Source of truth used: `docs/cellular-gaits/REDESIGN_REVIEW.md` (§0, §4, §5),
`../cellular-gaits/docs/embodied/REPORT.md` (§5 results, §6 decisions, §7 limits),
`VOICE_PROFILE.md`, `AGENT_SAFETY.md`.

**The honest line held throughout** (REPORT.md §7): the claim is *"the real connectome routes a
looming cue to an embodied escape,"* **not** a calibrated escape threshold or in-vivo selectivity
(the isolated Giant Fiber saturates; direction comes from the **sensory** looming bias, not the GF
L/R difference). Every flip from "someday/frontier" to "built" carries that caveat at the same
prominence the existing behavior pages give theirs.

---

## Files changed (before → after framing decision)

### 1. `content/projects.ts` — homepage card (B-04 Cellular Gaits)
- **oneLiner**: `"evolved cellular automaton walks a simulated fly"` →
  **`"a real fly connectome, run as a spiking brain, drives a real fly body"`**
- **paragraphs**: rewrote so the connectome escape loop is the *result* and the NCA walker is the
  *starting point*. Para 1 now leads with the 138,639-neuron FlyWire spiking network routing
  looming → LC4/LPLC2 → Giant Fiber (DNp01) → bolt, closed through physics. Para 2 (dim) frames the
  660-param NCA as the null-model placeholder the line climbs from, and carries the §7 caveat
  ("routing a looming cue to an embodied escape, not a calibrated escape threshold — in isolation
  the Giant Fiber saturates").
- **meta**: `STACK` `FlyGym · MuJoCo · CMA-ES · Next` → `FlyWire · LIF brain · NeuroMechFly · MuJoCo`;
  `CONTROLLER` `660-param neural CA` → `real connectome · 138,639-neuron LIF`;
  `RESULT` `~29 mm/s gait` → `looming → Giant Fiber → escape bolt`.
- **status/statusLabel**: kept `shipped` / `SHIPPED · v1` (the embodied loop is built + validated;
  the climax *page* is WP-E, but the science is done and the card should stop telling the stale
  story — which is the entire point of WP-A).

### 2. `app/projects/cellular-gaits/page.tsx` — Frame lede, tab index, metadata, hero video bug
- **Hero lede** (`cg-pitch`): see exact copy below. Two sentences, in-voice, leads with the achieved
  endgame; NCA reframed as the null-model rung.
- **`TAB_INDEX`**: (a) added the missing **Behaviors** and **Appendix** entries (was 7 of the 10
  tabs; now 9 — Frame is the page itself, so the index lists the other 9). (b) Rewrote the
  **Embodied** `q` from the VNC-leg ladder (`NCA → CPG → closed loop → the real FlyWire VNC
  connectome`) to **`"the real connectome in the loop: a looming threat → the Giant Fiber → an
  escape bolt."`** Left Body/Controller/Mapping/Objective/Optimizer `q`s untouched (none implied the
  connectome is purely future). **Left Sensing's `q`** ("…the closed proprioceptive loop that comes
  next") as-is — it's about the proprioceptive loop, not the connectome, and the Sensing rewrite is
  **WP-B** (see reconciliation notes).
- **metadata.description**: lightly updated from "whether local structure produces locomotion" to
  lead with the embodied brain → escape (still mentions the NCA null-model baseline).
- **Blank/duplicate hero video (rec #19)**: best.mp4 **exists** (`public/cellular-gaits/best.mp4`,
  1.8 MB) — so the blank box was an autoplay/render issue, and the clip is **redundant** with the
  `CAPlayer` directly below (same `best.mp4`). **Decision: dropped the standalone `cg-hero-video`
  block entirely** and let `CAPlayer` (in the § ORIENTATION section) be the single canonical player.
  This resolves both the blank-box bug and the double-clip in one move (the lower-risk option named
  in the prompt). The `.cg-hero-video` CSS in `globals.css` is now unused but left in place (not my
  file to rewrite; harmless).

### 3. `components/cellular-gaits/ControllerLadder.tsx` — retargeted ladder (rec #4)
- Was 4 rungs: `01·TODAY NCA / 02·NEXT CPG / 03·STAGE 2 closed loop / 04·FRONTIER FlyWire VNC
  connectome` (dashed). **Dropped the never-built CPG rung.** Retargeted to **3 built rungs** (exact
  copy below), all `kind: "today"` (solid green), the connectome rung marked **`03 · LIVE`** and
  retargeted from the VNC-leg walker to the **brain escape circuit (LC4/LPLC2 → DNp01)**.
- Geometry: 3 rungs respread at y = 64 / 196 / 328 (was 4 at 44/154/264/374). Kept the SVG layout
  language — same RUNG_X/W/H, RAIL, slot+body fixed blocks, popout machinery. **Retarget, not
  rebuild.**
- Connectors rung→rail: all 3 solid green (were nca-green / cpg+loop-dashed / vnc-frontier). Rail
  spine now spans `midY("nca") → midY("brain")`. Live-path label `▷ live today` → `▷ live · all
  rungs built`.
- **Legend**: collapsed `today (live) / roadmap / frontier / held fixed` → **`built · live` /
  `held fixed`** (no roadmap/frontier rungs remain).
- The brain rung's popout body links to `/projects/cellular-gaits/embodied` and carries the §7 GF-
  saturation caveat. `<desc>` (the prose/SR mirror) and the file docstring updated to match.
- Note: `Kind` type and `PALETTE` still define `roadmap`/`frontier` keys (now unused) — left intact
  to keep the change minimal and avoid touching the `Record<Kind,…>` shape. No TS error.

### 4. `app/projects/cellular-gaits/controller/page.tsx` — frontier slot (rec #6)
- `frontier` explainer: was "Replace the generic rule with the real *Drosophila* VNC leg connectome
  …". The VNC walker was never built; the **brain** escape loop was. Rewrote to: "Replaced — and not
  with a leg circuit, with the brain. The real FlyWire escape wiring (LC4/LPLC2 → the Giant Fiber,
  DNp01) now runs as a spiking connectome in a closed loop … the honest version — it shows the
  connectome routing the cue, not a calibrated escape threshold." Keeps the Embodied link.
- Left the **`alternatives`** mention of "a CPG of coupled oscillators" — that's a legitimate
  *alternative controller*, not the dropped ladder rung. Correct to keep.

### 5. `app/projects/cellular-gaits/mapping/page.tsx` — frontier slot (rec #6)
- `frontier` explainer: was "…the interface Eon names as unsolved — here it's a hand-wired stand-in
  for it." This is now exactly what the embodied motor-map implements (DNp01 rate → drive). Upgraded
  "someday" → "now built": "in the embodied loop the Giant Fiber's (DNp01) firing rate becomes the
  escape drive. It is still a hand-tuned, single-neuron stand-in for the whole descending hierarchy,
  but it is the realized version, not a someday." Added the Embodied link.

### 6. `app/projects/cellular-gaits/behaviors/escape/page.tsx` — flip tense to "built" (rec #8)
- **metadata.description**: "…the seam where a real FlyWire sub-circuit *later drops in*." → "…and
  that circuit is now wired in, run as a spiking connectome in the embodied loop."
- **lead**: "This is the on-ramp to the endgame … the seam where a FlyWire sub-circuit later drops
  in." → "This is the bridge to the endgame — and the endgame is now built … which now runs in the
  loop … (the Embodied tab)."
- **"The real circuit" block**: heading "…and where ours plugs in" → "**…now in the loop**"; added a
  sentence that the green hand-built stand-in "is now only half the story — the real LC4/LPLC2 →
  DNp01 wiring has since been run as a spiking connectome in a closed loop," with an inline Embodied
  link; caption flipped from "later replaces the hand-built front-end" → "is now wired in — run as a
  spiking connectome alongside the hand-built front-end."
- **Caveat list (first item)**: rescoped to "The looming front-end **here** is hand-built" (i.e. on
  *this* page), and notes the connectome swap is no longer the endgame — the real wiring runs in the
  embodied loop (Embodied link); the bilateral loom channels "were the clean seam it dropped into."
- **`connectome` explainer part**: "The endgame is to replace our hand-built front-end with the
  *actual* FlyWire wiring …" → "That circuit is now in the loop … walked out on the Embodied tab.
  The honest line: this shows the connectome routing the cue, not a calibrated escape threshold — in
  isolation the Giant Fiber saturates."

### 7. `components/cellular-gaits/EscapeCircuit.tsx` — relabel the seam (rec #8)
- SVG seam label: `↳ the real FlyWire LC4/LPLC2 → DNp01 wiring **drops in HERE**` → `… **is wired in
  HERE**`. SVG `<desc>` and the seam group `aria-label` updated to "is now wired in, run as a
  spiking connectome in the embodied loop."
- `SEAM_PLAIN` popout: "**The endgame seam.** Replace the hand-built front-end with …" → "**The
  seam, now wired.** The actual LC4/LPLC2 → DNp01 wiring — pulled from FlyWire and run as a spiking
  connectome — is now in the loop … (the Embodied tab)." Popout title fallback `FlyWire drop-in` →
  `FlyWire seam`. File docstring + the two internal `// drop-in seam` comments aligned.
- **Did not restructure the SVG** — relabel only, as instructed.

### 8. `app/projects/cellular-gaits/behaviors/page.tsx` — lead with escape (rec #11)
- Reordered the `BEHAVIORS` array so **Escape is first** (was 3rd), flagged in its `why` as "the
  connectome bridge … now wired into the embodied loop → Embodied." Navigation (the `// TODO`-stub
  behavior the review calls least connectome-aligned) stays **last** (already was; kept demoted).
- Rewrote the § THE BEHAVIORS section lead to lead with escape as the connectome bridge (with an
  Embodied link) rather than "sequenced cheapest-first."
- **Side fix**: the closing paragraph referenced "the math **and build-plan DAG** are in the
  appendix" — since WP-A removes `BuildPlanDAG` (below), changed to "the math is in the appendix."

### 9. `app/projects/cellular-gaits/appendix/page.tsx` — cut stale BuildPlanDAG (rec #17)
- Removed the `BuildPlanDAG` import and the entire **§ ROADMAP · BUILD PLAN** section (the stale
  internal build plan — nodes "A · Export fly MJCF," "E1–E7," "F · Integrate" — that leaked the
  build process and predated every behavior + the refocus). Updated metadata.description (dropped
  "plus the living build plan").
- **`components/cellular-gaits/BuildPlanDAG.tsx` left on disk, unimported** (the preferred,
  lower-risk option) — not deleted. It is now dead code; WP-B/WP-C can delete it if desired.

---

## Exact new copy (for voice continuity across waves)

**Frame hero lede** (`app/projects/cellular-gaits/page.tsx`, `cg-pitch`):
> A real fly connectome, run as a spiking brain, drives a real fly body — a looming threat becomes a
> Giant-Fiber spike becomes an escape bolt, closed through the physics. The evolved cellular
> automaton that walks that same body is the null-model rung this climbs from: the question
> throughout is whether structure, embodied, is enough to produce behavior.

**Homepage card oneLiner** (`content/projects.ts`):
> a real fly connectome, run as a spiking brain, drives a real fly body

**Retargeted ladder rungs** (`ControllerLadder.tsx`), top → bottom (all green, `built · live`):
1. `01 · DONE` — **NCA — null model** · "generic local rule" — *the placeholder the brain replaces;
   the line climbs from here.*
2. `02 · DONE` — **Closed proprioceptive loop** · "sensing → controller" — *live across the
   perturbation, chemotaxis, and escape behaviors.*
3. `03 · LIVE` — **Real connectome brain in the loop** · "looming → Giant Fiber → escape" — *the real
   FlyWire connectome as a spiking brain; looming routes through measured wiring to the Giant Fiber
   (DNp01) and bolts the body. Built and validated. Caveat carried: routing the cue, not a calibrated
   threshold; the isolated GF saturates. Links to the Embodied tab.*

(`slot` "controller slot · 42 targets/step" and `body` "FlyGym body" rungs unchanged — held fixed.)

---

## What later waves must reconcile

**WP-E (Embodied climax page — owns `embodied/page.tsx` prose; I did NOT touch it):**
- `embodied/page.tsx:140` still reads *"pull the real **VNC leg circuit** from FlyWire and wire it
  directly to the legs"* and *"CPG and closed-loop are the rungs in between"* (the `alternatives`
  explainer). **Both are now stale** — they describe the old 4-rung VNC ladder that WP-A retired.
  WP-E must rewrite this prose to match the new 3-rung brain ladder. (Left untouched per the
  forward-reference rule; flagged here.)
- The page's `cg-ladder-anchor` figure ("RUNG 01 · LIVE TODAY → Body tab") still works — WP-A kept
  rung 01 = NCA. But the figcaption "every rung above replaces only what fills this slot" now has 3
  rungs, not 4; verify it still reads correctly after WP-E's rewrite.
- The Embodied page lead ("The endpoint: a real connectome, embodied — does real structure produce
  real behaviour?") is future-framed; WP-E flips it to "built."
- The `ControllerLadder` brain-rung popout now links **into** `/embodied` — WP-E's rebuilt page is
  the link target; make sure the climax content lands there.

**WP-B (IA restructure — owns `tabs.ts`, Sensing rewrite, Objective→Optimizer merge):**
- **Sensing `q`** in the Frame `TAB_INDEX` still says the closed loop "comes next" — left as WP-B
  territory. The closed loop is actually done (behaviors run closed-loop); WP-B's "Sensing & Loop"
  retitle should also fix this tab-index line.
- The Frame `TAB_INDEX` is an on-page list **independent of `tabs.ts` nav order**. WP-B reorders
  `tabs.ts` (moves Embodied to penultimate, merges Objective→Optimizer). When it does, the
  `TAB_INDEX` array order + entries in `page.tsx` must be re-synced (it currently mirrors the present
  10-tab order: Body, Controller, Sensing, Mapping, Objective, Optimizer, Embodied, Behaviors,
  Appendix).
- The `Kind`/`PALETTE` `roadmap`+`frontier` entries in `ControllerLadder.tsx` are now dead; safe to
  prune during any further ladder work.

**WP-C (reuse-only viz — owns `SystemDiagram`, rec #18):**
- The Appendix **§ SYSTEM DESIGN** lead still describes the system as NCA+CMA-ES only, with the
  proprioceptive arc "**not yet wired** … closes the loop in Stage 2." That's stale (loop is closed)
  but it's `SystemDiagram`'s framing — **WP-C territory (rec #18)**, left untouched. WP-C should add
  the brain↔body loop or scope the title to "the walking system," and update this lead.
- `BuildPlanDAG.tsx` is now dead code (unimported). WP-C can delete it.

**Shared/CSS:**
- `.cg-hero-video` in `app/globals.css` is now unused (hero video removed). Harmless; a later wave
  can prune it. Did not edit `globals.css` (append-only rule).
- `EscapeCircuit`'s house-style classes (`sysdiagram`, `sysdiagram-pop*`) are shared with
  `ControllerLadder`, `SystemDiagram`, `ClosedLoopDiagram`, `FeelerField` (comment-only ref). No CSS
  changed; only text/labels.

---

## Verification
- **`npx tsc --noEmit` passes** (exit 0, no output) — run via the main checkout's `node_modules`
  symlinked into the worktree (worktree is a fresh checkout with no deps); symlink + the copied
  `next-env.d.ts` removed after. Both are gitignored anyway.
- **Stale-phrase grep** over `app/ components/ content/`: `~29 mm/s` → 0 hits; `FRONTIER` → 0;
  "VNC leg" → 1 (in `embodied/page.tsx`, WP-E's, intentionally left); "drops in HERE"/"later drops
  in" → 0 in UI copy (the two remaining `drop-in` hits were code comments, since aligned). All
  remaining hits are intentional and flagged above.
- **Dead-link check**: every `/projects/cellular-gaits/{embodied,behaviors,appendix}` href added
  resolves to an existing `page.tsx`. Confirmed against the route listing.
- Did not run a dev server; relied on tsc + grep + route listing per the prompt.

## Git
- **Branch:** `feat/cg-redesign` — fast-forwarded from a stale June-18 ancestor to `main` (`1bdd9c2`,
  non-destructive; it was a strict ancestor), worked in worktree `../portfolio-wt/cg-redesign`.
- **Committed (not merged):** the 9 source files above + `docs/cellular-gaits/REDESIGN_REVIEW.md`
  (the review doc, carried over and committed so the next waves' prompts can read it) + this report.
- **`ops/prompts/PROMPT_cg_wpA_consistency.md`** was carried into the worktree but is **gitignored**
  (`.gitignore:43 PROMPT_*.md`, the project's ops convention) — left local, not force-committed.
- **Commit:** a **single commit** on `feat/cg-redesign`, child of `main` (`1bdd9c2`). This report is
  amended into that same commit, so its own SHA is the value `git log --oneline -1 feat/cg-redesign`
  (equivalently `git log main..feat/cg-redesign`) prints — i.e. the branch HEAD. Not pushed, not
  merged.
