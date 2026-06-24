# REPORT — R2-WP4 · The escape-circuit point cloud (+ two nits)

Branch: `feat/cg-redesign`. Portfolio-only, no compute (data was pre-staged).
Verified with `npx tsc --noEmit` (clean). Dev server left to the human for localhost QA.

## What shipped

### 1. The marquee — `ConnectomeCloud.tsx`
A new client component that renders the **real escape circuit in real 3-D space, lighting up** — the
honest, anatomical counterpart to the schematic `BrainCircuitMap`.

- **Data.** Copied the staged positions to
  `public/cellular-gaits/data-eb/positions.json` (316 neurons: 104 LC4 + 210 LPLC2 + 2 DNp01, each
  `{id, type, hemisphere, x, y, z, soma}` at FlyWire v783 / FAFB-v14.1 coordinates). Activity comes from
  the existing `trace_{left,right,baseline}.json` — `brain.hz_L/hz_R` (LC4/LPLC2 drive per side) and
  `brain.dnp01_L/dnp01_R` (Giant-Fiber rate per side), per 15 ms sync-window.
- **Render.** Raw **Three.js (`three@0.184`)** — no React-three-fiber, no extra deps. One
  `THREE.Points` of 316 vertices on a pure-black field, a custom `ShaderMaterial` with **additive
  blending** so firing cells bloom (Eon's look). Positions are centred + uniformly scaled, with FAFB y
  negated (dorsal up) and z negated (anterior faces the camera) → a clean frontal/anterior default with
  the two lateral lobula clusters and the central Giant-Fiber pair. Gentle auto-rotate + pointer-drag
  orbit, hand-rolled (no `OrbitControls` import).
- **Tied to the condition toggle** (left / right / baseline) and **scrubbable along the escape
  timeline** (a range input over the 75 windows, plus play/pause autoplay). A live L/R Giant-Fiber
  readout makes the asymmetry legible numerically alongside the visual.

#### Activity → colour mapping
Per neuron, per window `w`, activity ∈ [0,1]:
- **LC4 / LPLC2** (detectors): `clip( (hemisphere==left ? hz_L[w] : hz_R[w]) / hzRef )`, `hzRef` =
  max `hz_L/hz_R` across all three runs (≈ 39.2 Hz, derived from the data, not hardcoded).
- **DNp01** (Giant Fiber): `clip( (hemisphere==left ? dnp01_L[w] : dnp01_R[w]) / gfRef )`, `gfRef` =
  max `dnp01_L/R` across all runs (≈ 133.3 Hz, derived).

Colour is a smoothstep lerp from a **cool resting palette** to a **warm firing palette**:
- detectors: dim teal → **amber** (`#E89B3D`, the site's circuit colour)
- Giant Fiber: dim violet → **warm gold** (`#F8D26B`), blooming toward white near peak.

Activity also drives point size (firing cells grow) and additive alpha (firing cells glow). Result:
**resting = quiet/cool/dim; a loom warms the threat side's detectors and blooms DNp01 gold; baseline
stays dark** (GF silent → the fly walks). The **left>right detector split** (left run: `hz_L` 39 vs
`hz_R` 16) and the **right>left Giant-Fiber asymmetry** (right run: `dnp01_L` 67 vs `dnp01_R` 133) are
both visible as which points flare, and echoed in the live readout.

#### Honesty
Only the 316 neurons we actually computed light up; the caption + a dedicated honesty line label this as
**measured LIF activity** (not predicted/decorative, the explicit edge over Eon's "decorative" glowing
brain) at **real FlyWire v783 annotation positions** (not a neuropil mesh).

#### The 139k backdrop — built-in hook, flagged follow-up
The dim full-brain ~139k backdrop (Eon's exact "circuit flares against the whole connectome" look) is
**not in `positions.json`** (that bundle is the 316-circuit only), so it is **not built here**. The
component takes an optional `backdropUrl` prop and renders it as a dim static `THREE.Points` layer
behind the circuit when present (accepts either `{neurons:[{x,y,z}]}` or a raw `[[x,y,z]]` array, reusing
the same centring transform). **Follow-up (cellular-gaits, wave 2): extract the ~139k full-brain
resting positions** into a `data-eb/backdrop.json` and pass it in — a cheap static WebGL asset, no
new viz code required.

#### Perf / mobile / a11y
316 points is trivial. All WebGL is **disposed on unmount** (geometry, material, backdrop, renderer;
canvas removed; RAF cancelled; listeners removed). Auto-rotate **and** timeline autoplay honour
`prefers-reduced-motion` (static, seated at the peak-activity window so the circuit still reads as lit).
Touch: `touch-action: pan-y` keeps the page scrollable; horizontal drag orbits. WebGL-failure / failed
fetch degrades to a readable note pointing back at the schematic map. The canvas is `aria-hidden`; an
`aria-live` status carries the current condition + L/R GF rate to screen readers.

### 2. Integration on the Embodied page
Added a **new beat** (`§ THE REAL CIRCUIT · FIRING IN ANATOMICAL SPACE`) **between** the schematic
`BrainCircuitMap` (§2, "where it sits") and the GF-response instrument (§3). The schematic is **kept**,
not replaced — it carries the synapse-count edges, the asymmetry-as-thickness, the labelled cell-type
cards and popouts (the *clarity* read). The cloud is framed as the deliberate next step ("the schematic
above is for reading the wiring; this is the same circuit told straight"), so the two **reinforce**
(schematic → real anatomy → it fires) rather than fight. The narrative now escalates:
where it sits → watch it fire in real space → GF as instrument → the three-condition result.

Data plumbing mirrors `EmbodiedConditions` (client-fetch the `data-eb` bundle rather than bloating the
server document); the component fetches positions + the three traces once and runs its own condition +
timeline state.

### 3. Two nits (owned this pass)
- **Nav label** — `app/projects/cellular-gaits/behaviors/page.tsx`: the Obstacle-navigation entry read
  `building` → "live soon". Added an `"exploratory"` status (badge text "exploratory", amber dashed
  style) and switched navigation to it, matching the page's honest framing (the live demo is a flagged
  compute follow-up). Updated the one inline "is building" → "is exploratory" for consistency.
- **Sensing connector** — `components/cellular-gaits/SignalPathDiagram.tsx`: the connectome-brain branch
  tie was a **dim dashed** connector (read as "planned/unwired"). It's built and live, so it's now a
  **solid thin tie** (dash removed, full opacity, 1.4 px) and the chip's resting stroke firmed up
  (0.55 → 0.85, 1.2 px) — reads "real, swappable rung → Embodied".

## Files
- `public/cellular-gaits/data-eb/positions.json` — staged 316-neuron positions (new, copied).
- `components/cellular-gaits/ConnectomeCloud.tsx` — the point cloud (new).
- `app/projects/cellular-gaits/embodied/page.tsx` — new §2b beat + bridge line.
- `app/globals.css` — `.cg-cc-*` styles + `.cg-sr-only` + `exploratory` badge style.
- `app/projects/cellular-gaits/behaviors/page.tsx` — nav label nit.
- `components/cellular-gaits/SignalPathDiagram.tsx` — connector nit.

## Verify
- `npx tsc --noEmit` → clean.
- Did **not** run `npm run dev` / `next build` (the human's dev server is live for localhost QA).

## Follow-up flagged (do not block)
- **cellular-gaits, wave 2:** extract the ~139k full-brain resting positions → `data-eb/backdrop.json`;
  drop into `<ConnectomeCloud backdropUrl=… />`. No new viz code needed — the layer hook is in place.
