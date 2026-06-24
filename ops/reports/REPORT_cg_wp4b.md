# REPORT — R2-WP4b · Pair the point cloud WITH the fly (Eon-style "simultaneous" view)

Branch: `feat/cg-redesign`. Portfolio-only, no compute (reused the WP4 assets). Verified with
`npx tsc --noEmit` (clean). Dev server left to the human for localhost QA of the synced playback.

## The problem (WP4 → WP4b)
The WP4 connectome cloud stood alone, reading as abstract/disconnected. Eon's version works because the
brain point cloud runs **right next to the fly in its world, simultaneously**. WP4b rebuilds the cloud's
home around that pairing and de-duplicates the clips.

## What shipped

### 1. `SimultaneousEscape.tsx` — the side-by-side synced view (new)
The centerpiece of "§ THE RESULT": **left = the fly in its world** (the bird's-eye `flee_<cond>.mp4` /
`walk_baseline.mp4`); **right = its brain** (the `ConnectomeCloud`, lit by that condition's real
per-window activity). **One shared control** drives both — a single condition toggle (left / right /
baseline) and a single play/scrub timeline.

**Sync model — the video is the master clock.** A `requestAnimationFrame` reads the `<video>`'s
normalised playback progress (`currentTime / duration`) and maps it onto the cloud's window index
(`round(progress · 74)`). The clip is **4 s**; the brain trace is **~1.2 s of sim time** — different
absolute timebases — so they co-progress **by playback, not by the millisecond** (the prompt's
explicit allowance; the caption says so honestly). They **start, run, and end together**. Scrubbing
sets the window directly and seeks the video to the matching frame; play/pause drives the video, and
the rAF follows. The video loops, so the cloud wraps with it.

**Annotated shared timeline.** The scrubber carries two marks — **threat onset**
(`threat_onset_step · control_dt_s`) and the **escape pivot** (`summary.pivot_t_s`) — placed at their
fraction of the trace timeline (onset ≈ 39 %, pivot ≈ 47 % for the threat runs; none for baseline).
Onset labels above the track, pivot below, so the two (≈8 % apart) never collide. "Threat appears →
circuit fires → fly pivots" reads on one pass. A live `Giant Fiber now · L/R Hz` readout shows the
asymmetry at the scrubbed instant.

**Graceful degradation / a11y / mobile.** A failed clip falls back to the cloud alone (note in the fly
panel); a failed WebGL context to the clip alone (the cloud's own note). `prefers-reduced-motion`:
no autoplay, parked on the lit **peak window**, the clip seeked to that frame — still legible, fully
scrubbable. Panels are a 2-col grid that **stacks** under 640 px. An `aria-live` status carries the
condition + L/R GF rate.

### 2. `ConnectomeCloud.tsx` — refactored to a controlled renderer
The cloud no longer owns data/UI; it's now a **controlled canvas** taking
`{ positions, brain, windowIndex, hzRef, gfRef, backdropUrl }`. It keeps only the WebGL concerns:
build the scene once, **repaint on `brain`/`windowIndex` change**, gentle auto-rotate + pointer-drag
orbit, dispose-on-unmount, `prefers-reduced-motion` (rotation), WebGL-failure note, and the
LC4/LPLC2/DNp01 legend. The activity→colour mapping is unchanged from WP4 (detectors dim teal → amber
by `hz_L/R`; DNp01 dim violet → warm gold, blooming white, by `dnp01_L/R`; baseline dark). Canvas
aspect set to **4:3** to match the 320×240 clip so the two panels line up. The data fetch
(positions + the three traces) and the normalisers (`hzRef ≈ 39 Hz`, `gfRef ≈ 133 Hz`, derived) moved
up into `SimultaneousEscape`. The **~139k backdrop hook is preserved** (`backdropUrl` passthrough);
still a flagged cellular-gaits wave-2 follow-up, not built.

### 3. De-duplication — `EmbodiedConditions.tsx` + page
The fly was about to appear twice (paired view + the three `EmbodiedConditions` clip panels). Removed
the per-panel `<video>` and its autoplay effect; `EmbodiedConditions` is now the **clip-less
3-condition comparison strip** (the Giant-Fiber trace, top-down body path, and escape signature on
shared axes — the numbers behind the clip). The clips now live **once**, in the paired view.

### 4. Page restructure — `embodied/page.tsx`
Removed the standalone WP4 cloud beat (§2b). Fixed the §2 bridge line (it pointed at the removed
section → now points forward to the result). Rebuilt **"§ THE RESULT · LOOMING → ESCAPE"** as one
coherent section: lead → the paired `SimultaneousEscape` (centerpiece, "watch one closely") → a
sub-lead → the `EmbodiedConditions` comparison strip ("then all three, the numbers"). The schematic
`BrainCircuitMap` stays earlier (§2, the wiring-clarity beat); the GF-response instrument stays §3.

New page flow: hero loop → where the circuit sits (schematic) → drive it, the GF fires (instrument) →
**the result: the fly + its brain together, then the 3-way comparison** → built-once-then-stepped →
honest limits → the line this completes → references.

## Files
- `components/cellular-gaits/SimultaneousEscape.tsx` — the paired synced view (new).
- `components/cellular-gaits/ConnectomeCloud.tsx` — refactored to a controlled canvas.
- `components/cellular-gaits/EmbodiedConditions.tsx` — clips removed (comparison strip).
- `app/projects/cellular-gaits/embodied/page.tsx` — §2b removed, §2 bridge fixed, § THE RESULT rebuilt.
- `app/globals.css` — replaced the WP4 standalone-cloud CSS with the controlled-canvas styles +
  `.cg-se-*` paired-layout styles (panels grid, synced timeline + event marks, asym readout, captions).

## Verify
- `npx tsc --noEmit` → clean. All `cg-cc-*` / `cg-se-*` classes used are defined.
- Did **not** run `npm run dev` / `next build` (the human's dev server is live for localhost QA).

## QA notes for the human
- The intended read: pick a condition, hit play — the clip and the cloud run together; at ~39 % the
  onset mark + the threat-side detectors warming should land together, and the Giant Fiber blooms gold
  near the pivot mark. Exact ms-alignment isn't claimed (clip 4 s vs trace ~1.2 s); visible
  co-progression is the bar.
- Could not browser-verify here (dev server not reachable from the sandbox; not started per the
  prompt). Worth a glance: the synced playback, the side-by-side panel heights (4:3 match), and the
  onset/pivot mark positions.

## Follow-up still flagged (unchanged)
- **cellular-gaits, wave 2:** extract the ~139k full-brain resting positions → `data-eb/backdrop.json`;
  pass via `<ConnectomeCloud backdropUrl=… />`. The layer hook is in place.
