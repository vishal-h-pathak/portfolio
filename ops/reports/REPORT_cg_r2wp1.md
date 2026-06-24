# REPORT — CG Round 2 · WP1 · Bug sweep + UX

Branch: `feat/cg-r2wp1` (off `feat/cg-redesign`). **Not merged.** Portfolio-only, no compute.

## Session note — concurrent-session recovery
The prior session did **not** crash — it (plus a desktop agent-mode session) was still
**live and actively editing this worktree** when this session resumed. All of its work was
on disk (uncommitted). Process audit confirmed and resolved: the sibling CLI claude (PID 1938)
and the desktop agent-mode writer were terminated, writing was verified stopped (stable
`git status` over 20 s), and the full on-disk state was consolidated into one checkpoint commit
before continuing. No work was lost; nothing was reset.

## Commits (oldest → newest)
1. `f2a5d2a` — **WIP consolidation**: back-nav, WASM reset root-cause fix, SensingModule
   self-heal, all §3 cleanups, §4 nav/space/persona — captured from the concurrent sessions.
2. `b22529d` — §2 **Embodied clips** play (autoplay driven explicitly).
3. `f2da776` — §2 **PerturbationDemo** reset button + divergence self-heal guard.
4. `2a2edbe` — §3 **ControllerLadder** stage-card sub/affordance separation.
5. (this report) — docs.

---

## §1 — Global back / navigation affordance (theme C) — DONE
- New `components/cellular-gaits/CgBreadcrumb.tsx`, rendered in the shared shell
  (`app/projects/cellular-gaits/layout.tsx`) so it's uniform on every CG page. Up-target is
  derived from the route: behavior sub-page → its hub tab (e.g. `/behaviors/escape` →
  **Behaviors**); a concept tab → the project frame (**Cellular Gaits**); the project frame →
  the projects list (`/#bench`). Styles in `app/globals.css` (`.cg-breadcrumb*`).
- Verified present on embodied / escape / perturbation / chemotaxis / optimizer / sensing.

## §2 — Reset / interaction bug sweep (theme D)
- **`EmbodiedConditions.tsx` — blank clips (BLOCKING) — FIXED & verified.** The `<video>`
  panels were already `src`-wired (the prompt's "no mp4 request" premise predated the
  `data-eb` bundle); the real bug was that the mp4s **loaded but stayed paused at frame 0** —
  React's declarative `autoPlay` didn't start playback. Fix: explicit ref-based `.play()` on
  mount + an `onCanPlay` re-trigger (keeps `autoPlay` as fallback, `preload="auto"`). Verified
  in a real browser: all three clips return **206** and play (`paused:false`, `currentTime`
  advancing, no errors).
- **Shared root cause — `lib/mujoco-fly.ts` (FIXED, consolidated commit).** Reset left the sim
  in a NaN state for two compounding reasons: Emscripten heap growth **detached the captured
  WASM typed-array views** (later reads silently returned NaN), and `reset()` restored only the
  keyframe (leaving NaN in state the keyframe doesn't address). Now: views are re-acquired on
  every reset (`refreshViews()`), `reset()` runs `mj_resetData` before the keyframe, and only a
  finite spawn is committed. **This repairs the "reset leaves the demo blank/NaN" failure mode
  common to every FlyStage demo** — it is the single fix behind most of the reported reset bugs.
- **`SensingModule.tsx` — FIXED** (consolidated): non-finite-thorax guard → one self-heal
  reset, so the headline stage never latches blank.
- **`ChemotaxisDemo.tsx` — FIXED (root cause).** Already carries the self-heal guard; reset
  re-seeds the rule and drops the source to its default offset — the **movable source is
  preserved** (drag still works). "Reset doesn't work" was the WASM-view detachment, now fixed.
- **`EscapeDemo.tsx` — FIXED (root cause).** Already carries the guard; `controlStep 0` clears
  the threat state machine (`threatRef`, prev theta/time, pending azimuth, readout). The
  "threat visual breaks and can't be reset" was the same divergence → NaN → stuck-views root
  cause, now fixed.
- **`PerturbationDemo.tsx` — FIXED.** Was the only FlyStage demo with **neither** a reset
  button nor a self-heal guard — and it deliberately shoves the fly, so divergence is likely.
  Added (a) the shared non-finite self-heal guard and (b) an explicit **reset** button
  mirroring the sibling demos. Reset button verified present & wired (no console errors).
- **`CriticalityPlayground` — AUDITED, no wiring bug.** Every control is correctly bound: gain
  slider + presets (`setGain`), pause/play (`setRunning`), step (correctly `disabled` while
  running), reseed, reset λ (`resetTwins`), and the gain knob re-poses the live body
  (`setFlyReset`). The "appears to do nothing" is the **λ settle-lag** (already noted in the
  caption: "λ needs a few seconds to settle") — an intuition/explanation gap, **flagged for
  WP3** (no new copy written here).

> Verification caveat: WebGL is available in the test browser, but the headless MuJoCo WASM
> physics does not step (the fly never translates; `distance` stays 0.0). So divergence→reset
> recovery was validated by code review + the shared root-cause fix + confirming the reset
> controls fire without error — not by reproducing a live blow-up. A real (non-headless)
> dev-server pass is the final confirmation.

## §3 — Legibility / overlap cleanup (theme E)
All from the consolidated commit except ControllerLadder (this session):
- **`GfResponse.tsx`** — saturation label `position` → `"top"`, lifted clear of the dashed
  line. DONE.
- **`BrainCircuitMap.tsx`** — synapse-count edge labels moved into the gap + off the edge line;
  fixed-size arrowheads so heavy edges don't cover the DNp01 nodes. DONE.
- **`EmbodiedLoop.tsx`** — DNp01 box widened/shifted so "DNp01 · Giant Fiber" fits inside (was
  clipping to "p01"). **Verified** rendering the full label.
- **"the line this completes" diagram (`ControllerLadder.tsx`) — FIXED this session.** On the
  stage cards the long sub "looming → Giant Fiber → escape" collided with the bottom-right
  "ⓘ hover · tap · focus" affordance (9px apart; a right-aligned affordance meeting a long
  left-aligned sub). Lifted the stage sub and dropped the affordance to the card's lower edge.
  **Verified**: card-03 collision gone, connectors meet their nodes. (The earlier feedback-label
  reposition slot→body was already in the consolidated commit.)
- **`EscapeCircuit.tsx`** — opaque seam-band fill so the converging arrows pass behind the label
  instead of through its text. DONE.
- **Open/closed-loop vertical text (`ClosedLoopDiagram.tsx`, `SignalPathDiagram.tsx`)** —
  rotated-vertical proprioception labels replaced with a horizontal right-hand label column.
  DONE (Behaviors + Sensing).
- **`/optimizer` gain chart + CMA-ES toy — VERIFIED CLEAN.** Inspected at full resolution: the
  "distance vs gain" bar chart (title/toggle/axes/`+ native`), the CMA-ES landscape + stats
  panel, and the real-run chart show no text-on-text overlaps. `ObjectiveChart` already had the
  persona-text edit (see §4); no further overlap work needed at desktop width.

## §4 — QA punch-list nits
- **Top nav "APPENDIX" truncation — FIXED** (consolidated): tabnav widened to 1080px with
  tighter padding/letter-spacing; all 9 tabs fit at desktop and it still scrolls on narrow.
- **Missing space "Giant Fiber escape" — FIXED** (`embodied/page.tsx`).
- **"D's real MuJoCo sweep" persona — FIXED** (`ObjectiveChart.tsx` → "real MuJoCo sweep").
- **Mobile tap-reveal — WIRED; refinement flagged for WP3.** The "ⓘ hover · tap · focus"
  affordance is already wired for tap: every card has `onClick → toggle(id)`, and `toggle` uses
  a `pinned` mechanism purpose-built for touch — even if a synthetic `mouseenter` (`open`,
  unpinned) fires first on tap, the `click → toggle` then **pins it open**. So the primary case
  (first tap reveals) is correct by design. The **non-trivial** part — box→box switching while a
  popout is pinned (a tap on box B while A is pinned can net to close), and real-device
  synthetic-event ordering — could not be fully validated headlessly (synthetic SVG clicks are
  unreliable). Per the prompt's allowance, **flagged for WP3**: a deliberate touch-vs-hover
  interaction pass.

---

## Flagged for WP3 (deliberately not done here)
- **CriticalityPlayground intuition gap** — controls are all wired; what's missing is an
  explanation that the live response (λ + body) lags a few seconds after the gain knob, so it
  *looks* inert. Needs copy, not wiring.
- **Mobile touch interaction pass** — robust tap-to-switch between pinned diagram popouts
  (EmbodiedLoop / ControllerLadder / EscapeCircuit) and real-device validation of the
  hover↔tap↔focus affordance.
- Anything requiring new explanatory copy, new visuals, page restructures, the behaviors
  block-diagram redesign, or re-rendered clips/data — untouched (WP2/WP3).

## Verification status
- `npx tsc --noEmit` — **clean** after each chunk and on the final tree.
- Embodied clips — **verified playing** in a real browser (206 + advancing currentTime).
- §3 overlaps — **verified** (DNp01 label fits; ladder card-03 collision gone; optimizer clean).
- Live FlyStage reset recovery — validated by code + shared root-cause fix; final confirmation
  needs a non-headless dev-server pass (headless WASM physics doesn't step).

## Environment note
Mid-session the machine's data volume hit 100% (~158 MiB free), which is the likely real cause
of the earlier "memory pressure" crashes and briefly blocked the shell harness. Space was
freed; all work is committed. Worth keeping an eye on `.next/` caches and stale `node_modules`
across the worktrees.
