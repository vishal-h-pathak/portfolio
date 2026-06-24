# REPORT — cg wire-w3 (Mac wave 3): wire the wave-2 render assets into the site

**Branch:** `feat/cg-redesign` (worktree `portfolio-wt/cg-redesign`) · **Portfolio-only, no compute.**
Copied the staged wave-2 assets in and wired them up. `npx tsc --noEmit` clean. Committed, **not pushed** —
human QAs the gait filmstrip, the legible behavior clips, and the point-cloud backdrop on `localhost`, then pushes.

Spec: `../cellular-gaits/ops/reports/REPORT_cg_renders_w2.md`. Staged source:
`~/dev/jarvis/cellular-gaits/outputs/r2_renders_w2/`.

---

## Task 1 — S&O gait filmstrip ✅

- **Assets:** copied `gait_gen0.mp4` / `gait_mid.mp4` / `gait_final.mp4` →
  `public/cellular-gaits/data-opt/` (new bundle dir).
- **`components/cellular-gaits/GaitGenerations.tsx`:** replaced the three `PendingFrame` SVG placeholders
  with autoplaying `<video autoPlay muted loop playsInline preload="auto">` panels, one per slot. Kept the
  ①②③ badges and the F captions (gen-0 ≈0 / gen-~34 ≈62 / gen-50 86.6 mm) and the per-clip gait blurbs.
  Removed the old `PendingFrame` component, the `Slot.accent`-only placeholder path, and the
  "RENDER PENDING" glyph. Rewrote the "to be rendered — not faked" note into a now-true caption: same fly,
  three replayed champions through one shared world-fixed camera at the same scale/frame count, so the
  growing displacement *is* the fitness climb. Updated the file's doc header to match.
- **`app/globals.css`:** added `.cg-opt-gen-clip` (4:3 `aspect-ratio`, `object-fit: cover`, faint frame
  border/bg) so the videos sit in the same footprint the placeholders had. Existing `.cg-opt-gens` 3-up
  grid + mobile 1-col stack unchanged.
- Server component stays server-only (muted-loop autoplay needs no client JS).

## Task 2 — legible behavior clips ✅ (clean swap, no code change)

Copied the wave-2 re-renders over the existing clips using the identical filenames the components already
reference:
- `approach_left.mp4` / `approach_right.mp4` → `public/cellular-gaits/data-ch/`
- `perturbation_openloop.mp4` / `perturbation_closedloop.mp4` → `public/cellular-gaits/data-c2/`

Verified the referencing call-sites are unchanged and already point at these paths
(`ChemotaxisDemo.tsx`, `PerturbationDemo.tsx`, `behaviors/chemotaxis/page.tsx`,
`behaviors/perturbation/page.tsx`). New footage is world-fixed: open-loop drifts off the corridor, closed
loop holds heading; the chemotaxis approach reads against a static arena.

## Task 3 — point-cloud backdrop ✅

- **Asset:** copied `backdrop_positions.json` (40k subsampled FlyWire v783 points, 0.84 MB) →
  `public/cellular-gaits/data-eb/`.
- **`components/cellular-gaits/ConnectomeCloud.tsx`:** the existing `backdropUrl` loader only understood
  `{ neurons: [...] }` / `number[][]` — but the staged export uses the compact **flat `points` array**
  (`[x0,y0,z0, x1,y1,z1, ...]`). Extended the loader to handle `points` first (the other two shapes still
  work), applying the same center/scale/axis-negate transform as the 316 circuit so the backdrop registers
  in the circuit's frame. Added a conditional legend key ("resting brain — positions only", grey #2a3340)
  shown only when a backdrop is loaded. Updated the doc header (the backdrop is loaded now, labeled honestly
  as positions-only, not computed activity).
- **`app/projects/cellular-gaits/embodied/page.tsx`:** passed
  `backdropUrl="/cellular-gaits/data-eb/backdrop_positions.json"` to `<SimultaneousEscape>`.
- **`components/cellular-gaits/SimultaneousEscape.tsx`:** rewrote the stale "~139k full-brain backdrop is a
  flagged wave-2 add (the hook is in place)" honesty line into the now-true label: a 40k-point full-brain
  backdrop in the same FlyWire frame — **resting brain, positions only, not computed activity**. Only the
  316 circuit neurons carry real firing. The dim grey layer renders behind the lit circuit
  (`AdditiveBlending`, opacity 0.22) and never breaks the circuit if it fails to load.

## Task 4 — in-scene markers / web overlays ⚠️ deferred (flagged)

Skipped per the prompt's "skip + flag if it's not clean." The world-fixed cameras (Task 2) already make
each behavior legible — the chemotaxis approach reads toward a point against a static arena; the
perturbation open-vs-closed lateral drift reads against the static grid. A faithful odor-source dot /
shove-direction arrow overlay needs the clip's **world→screen projection** (camera pose + fovy) to place
the marker in registration with the rendered frame; that mapping isn't exposed to the web layer, and a
guessed placement would risk sitting off the true source/shove point. The data exists for a later pass
(`data-ch/trajectories.json` carries `odor_source_xy`; the perturbation trace carries
`impulse_onset_step` / `impulse_force`) — best done either as a proper in-scene env.py marker geom in a
compute wave, or with the camera projection plumbed through to a DOM/Canvas overlay.

---

## Verify / deliver

- `npx tsc --noEmit` → **EXIT=0** (clean).
- Did not start a dev server (one is live in this worktree).
- **Files touched:** `components/cellular-gaits/GaitGenerations.tsx`,
  `components/cellular-gaits/ConnectomeCloud.tsx`, `components/cellular-gaits/SimultaneousEscape.tsx`,
  `app/projects/cellular-gaits/embodied/page.tsx`, `app/globals.css`, plus the copied binaries under
  `public/cellular-gaits/{data-opt,data-ch,data-c2,data-eb}/` and this report.
- Scope respected: optimizer page / embodied page / the four behavior bundles / `globals.css` only. No
  shared infra, no other pages, no cellular-gaits repo changes.

**STOP — human QA:** confirm on `localhost` that (1) the three gait clips autoplay side-by-side
(stagger → lurch → clean walk), (2) the chemotaxis + perturbation pages now show world-fixed footage, and
(3) the dim resting-brain backdrop sits behind the lit escape circuit in the paired Embodied view. Then push.
