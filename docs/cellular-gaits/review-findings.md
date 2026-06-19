# Cellular Gaits — Fly site review findings

Branch: `feat/fly-review` (off `feat/c2-perturbation` @ 218acfe). Reviewer: Claude.
Audit method: Playwright (real Chrome via extension relay), full-page screenshots of
every route at **1280px** and a representative set at **375px**. Screenshots live in
`scratch/review/`. Console captured per route.

> **Browser note.** The extension relay disconnected partway through the 375px pass
> (after index / body / perturbation were captured at 375; all 11 routes were captured
> at 1280). The eight remaining 375px routes were assessed from the shared
> `ConceptScaffold` single-column layout + each module's viewBox-scaled SVG, not direct
> screenshots — see *Readability* for the one residual 375px risk worth a direct re-check.
> No app-level console errors appeared on any route (only Next HMR/Fast-Refresh logs; the
> `webpack-hmr` WebSocket errors are post-disconnect dev-server noise).

Legend: **[FIXED]** done on this branch · **[PROPOSE]** left for your call · **[OK]** no action.

---

## Cross-cutting

### C1 — Garbled feedback-arc label on Sensing's closed-loop diagram  **[FIXED]**
`SignalPathDiagram` (Sensing only) renders **two** rotated `<text>` labels at the **same
x (222)**, their rotation centres only 14px apart. After `rotate(90)` both become vertical
columns on the same x and overlap into unreadable stacked text — this is the known bug
("joint angles + foot contacts… / planned · not wired · Stage 2"). The near-identical
`ClosedLoopDiagram` (Behaviors hub) renders cleanly precisely because it *staggers* its two
labels (x 248 vs 260). Fix: collapsed to a **single** clean rotated label
("joint angles + foot contacts"); the "Stage 2 / not wired" status is already carried by the
figure caption and the dashed stroke, so the second column was redundant. (`SignalPathDiagram.tsx`)

### C2 — HeadingError diagram: clipped ray + colliding callout  **[FIXED]**
On `behaviors/perturbation`, the `HeadingError` SVG geometry breaks at the real data
(openDeg 56.6°, closedDeg 26.5°): with `L=250` and `viewBox` height 300, the **open-loop ray
runs off the bottom** (endpoint y≈359) and its label is clipped, and the **closed-loop ray
label collides** with the top-right "HEADLINE SINGLE SHOVE" callout (overlapping x≈400–480,
y≈30–40). Fix: enlarged the viewBox height, lowered ray length / origin so both rays + labels
fit, and moved the headline callout to the bottom-right where neither ray reaches. (`HeadingError.tsx`)

### C3 — The repeated plain walking clip  **[FIXED for the one real duplicate; rest OK]**
Inventory of the plain native-gain walking loop:

| Route | Asset | How it appears | Verdict |
|---|---|---|---|
| Index hero | `best.mp4` | autoplay loop | **canonical home** — keep |
| Index "Orientation" | `best.mp4` | `CAPlayer` scrubber, synced to the 4-channel CA grid | distinct purpose (CA-state teaching), same page — **keep** |
| Body | `clip_gain_native.mp4` | `FlyStage` **fallback only** (live fly is primary) | not shown unless WASM fails — **keep** |
| Sensing | `clip_gain_native.mp4` | `FlyStage` **fallback only** | **keep** |
| Mapping | `clip_gain_native.mp4` | `MotorMap` **fallback only** | **keep** |
| Controller | `clip_gain_native.mp4` | middle of GaitClips' labeled low/native/high triptych | contextual, labeled — **keep** |
| **Embodied** | `clip_gain_native.mp4` | **unconditional autoplay `<video>`** ("Rung 01 — NCA null model walking the body") | **redundant** — same loop Body shows live, for no added reason |

Only **Embodied** shows the identical plain loop on a separate page with no distinct purpose.
Fixed: replaced its inline autoplay clip with a link-card to the canonical **live fly on Body**
(its Rung-01 *is* that fly), keeping the narrative and pointing at the one canonical home.

### C4 — Param counts (660 vs 948)  **[PROPOSE — small copy decision]**
"660" is used consistently and is always the open-loop NCA (8×8×4 grid). **"948" never appears
user-facing** — it only lives in `docs/cellular-gaits/research-roadmap.md` (the Stage-2
closed-loop controller, 6→16 channels). So there is no "660 vs 948" clash on the live site.
The *real* latent confusion is the **other direction**: the Perturbation tab's closed-loop
controller is a **different, larger** network than the 660-param NCA (its `SensorChannels`
shows an `8×8` grid with `4 state + 2 sensor` input channels, not the `8×8×4 · 660 θ` motor
NCA), yet the page never gives it a parameter count or names it as a distinct controller.
A reader could assume Perturbation is still "the 660-param rule." Suggest: on Perturbation,
add one clause naming the closed-loop controller as the larger Stage-2 net (and optionally its
param count) so the two controllers are unambiguous. Not done — it's a content call.

### C5 — Sensing diagram contradicts its own (updated) prose  **[PROPOSE — narrative call]**
`SignalPathDiagram`'s closed-loop panel is drawn **dashed** and captioned "closed loop · Stage 2
… the dashed arc isn't wired yet / planned · not wired." But the Campaign-2 Sensing copy around
it now says the closed loop is **"done (Stage 2)… now wired and trained,"** linking to a live
Perturbation demo. The diagram still tells the pre-C2 "not wired yet" story. Flipping the arc to
**solid/wired** (like the Behaviors-hub `ClosedLoopDiagram`) would match the prose — but that
changes the Sensing tab's teaching beat (its whole frame is "open loop today, here's what closing
it would add"). Left for your call; I only fixed the garble, not the semantics.

### C6 — Floating "N" nav marker overlaps body text at 375px  **[PROPOSE — verify + small CSS]**
A circled **"N"** control sits in the left gutter (fine at 1280px) but at 375px there is no
gutter, so it overlaps the body copy and a stat readout (visible on index and body at 375px).
Likely a quick CSS fix (hide below a breakpoint, or move it inline/bottom). I didn't touch it
because it's a global/layout element outside the cellular-gaits modules and I wanted to confirm
its source with you first. (Seen in `scratch/review/01-index-375.png`, `02-body-375.png`.)

### C7 — Fly-direct visuals on Controller & Sensing  **[FIXED — see Phase 2.3]**
Per the brief: Controller had only abstract panels + recorded gain clips (no *live* fly tied to
the criticality knob); Sensing had a live fly but **no sensor overlay** ("sensory feedback none"),
so "sensing" was shown only as a block diagram. Both addressed — details under each route.

---

## Per route

### Index (`/`)  — 1280 ✓ / 375 ✓
- **[OK]** Hero video, Orientation `CAPlayer` + 4-channel grid, tab-map table. Clean; table
  reflows to stacked rows at 375px with no horizontal overflow.
- **[note]** `best.mp4` appears twice (hero + scrubber) — see C3; kept (distinct purposes).
- **[PROPOSE]** C6 "N" overlap at 375px.

### Body (`/body`)  — 1280 ✓ / 375 ✓
- **[OK]** Canonical live fly (`FlyStage`/`BodyFlyDemo`) + `PlantSchematic` + 4-panel explainer.
  House style intact (themed SVG, `var(--mono)`, green/amber palette, popout interaction).
- **[PROPOSE]** *Readability:* `PlantSchematic` leg/DoF labels get quite small at 375px (SVG text
  scales with the viewBox). Legible-ish but the tightest text on the site — worth a direct 375px
  re-check (browser dropped before I could screenshot this route at 375). Possible mitigation:
  bump min font size or a 375px-specific layout. Not changed.

### Controller (`/controller`)  — 1280 ✓ / 375 (inferred)
- **[FIXED · 2.3]** Added a **compact live `FlyStage` driven by the criticality knob** inside
  `CriticalityPlayground`: turning the gain slider rebuilds `makeNcaController(ctrl, { gain })`
  and restarts the gait, so the abstract λ / heatmaps now visibly move the **real body** (native
  → ordered → chaos). Lazy-loaded (`next/dynamic`, `ssr:false`), modest height, pauses offscreen.
- **[OK]** `GaitClips` (low/native/high recorded triptych) kept under "THE ANSWER" as recorded
  sweep evidence + WASM fallback; it complements (recorded reference points) rather than
  duplicates the live knob-driven fly. Noted for your review in case you'd rather drop it now.
- **[OK]** "660-param" labeling consistent.

### Sensing (`/sensing`)  — 1280 ✓ / 375 (inferred)
- **[FIXED · C1]** Garbled `SignalPathDiagram` arc label.
- **[FIXED · 2.3]** Added a **live sensor overlay on the fly**: the open-loop NCA stage now
  samples `sim.footContacts()` (6 per-leg) + `sim.actuatorLengths()` (42 joint angles) every
  control step and renders a HUD over the stage — a hexapod foot-contact map + a 42-joint angle
  strip — with the teaching frame that *this open-loop controller ignores exactly this body
  state* (which Perturbation feeds back). "Sensing" is now shown on the body, not only as a block
  diagram.
- **[PROPOSE · C5]** Dashed "not wired yet" closed-loop panel vs "done/wired" prose.

### Mapping (`/mapping`)  — 1280 ✓ / 375 (inferred)
- **[OK]** `MotorMap`: grid↔leg decorrelation + a live fly with a meaningful joint-override
  interaction (pin one joint). House style consistent. No issues found.

### Objective (`/objective`)  — 1280 ✓ / 375 (inferred)
- **[OK]** KaTeX fitness formula + `ObjectiveChart` (distance-vs-gain bars, native peak in amber).
  No live fly, appropriately (it's the fitness function). Native gain 86.6 mm consistent.

### Optimizer (`/optimizer`)  — 1280 ✓ / 375 (inferred)
- **[OK]** `ToyCmaEs` covariance-ellipse animation (clearly labeled "illustrative") +
  precomputed real fitness-vs-generation chart. "660 params" consistent. No issues.

### Embodied (`/embodied`)  — 1280 ✓ / 375 (inferred)
- **[FIXED · C3]** Replaced the redundant unconditional `clip_gain_native.mp4` autoplay with a
  link-card to the canonical live fly on Body.
- **[OK]** `ControllerLadder` + references section. House style intact.

### Appendix (`/appendix`)  — 1280 ✓ / 375 (inferred)
- **[OK]** Dense KaTeX (update rule, motor map, fitness, CMA-ES, criticality) + `SystemDiagram` +
  `BuildPlanDAG`. Appropriate density for an appendix.
- **[PROPOSE]** *Readability:* the two diagrams (`SystemDiagram`, `BuildPlanDAG`) pack a lot of
  small mono text; at 375px they will be the smallest text on the site. Worth a direct 375px
  re-check; consider horizontal-scroll wrappers if they compress too far. Not changed.

### Behaviors hub (`/behaviors`)  — 1280 ✓ / 375 (inferred)
- **[OK]** `ClosedLoopDiagram` open-vs-closed (renders **cleanly** — the reference for the C1 fix),
  + the four-behavior list (Perturbation LIVE, Chemotaxis LIVE SOON, Escape/Obstacle QUEUED).

### Perturbation (`/behaviors/perturbation`)  — 1280 ✓ / 375 ✓
- **[FIXED · C2]** `HeadingError` clipping + callout collision.
- **[OK]** Page-specific shove/recovery clips (open vs closed), live `PerturbationDemo`
  (controller toggle + shove), `SensorChannels`. Content fits the 375px frame; no horizontal
  overflow.
- **[PROPOSE · C4]** Name/param-count the closed-loop controller as distinct from the 660 NCA.

---

## Summary

**Fixed on this branch:** C1 (garbled Sensing arc label), C2 (HeadingError clip+collision),
C3 (embodied walking-clip duplicate), 2.3 Controller live knob-driven fly, 2.3 Sensing live
sensor overlay.

**Left for your call:** C4 (name the closed-loop controller / 948), C5 (Sensing diagram dashed
vs "done" prose), C6 (global "N" marker 375px overlap), plus two 375px readability re-checks
(PlantSchematic; Appendix diagrams) once the browser relay is back.
