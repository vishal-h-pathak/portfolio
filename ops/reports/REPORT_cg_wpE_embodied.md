# REPORT — CG Redesign · WP-E · The Embodied Fly (the climax page)

**Wave:** WP-E (final of the cellular-gaits site redesign). The big one — rebuilds the Embodied
tab into the site's climax and builds the four new anatomy-grounded visuals against the WP-D
`data-eb` bundle. **Branch:** `feat/cg-redesign-wpE` (off `feat/cg-redesign`). **Not merged.**
Executed in worktree `../portfolio-wt/cg-wpE`, so the watcher checkout on
`feat/dual-machine-watcher` was never touched.

Source of truth: `../cellular-gaits/ops/reports/REPORT_cg_wpD_export.md` (THE DATA SPEC),
`../cellular-gaits/docs/embodied/REPORT.md` (§3 four-part loop, §5 result, §6 decisions, §7 limits),
`docs/cellular-gaits/REDESIGN_REVIEW.md` (§3 new visuals, §5 recs #1/#2/#7/#9/#10/#20),
`ops/reports/REPORT_cg_wpA_consistency.md` (the stale ladder prose to remove), `VOICE_PROFILE.md`.

**The honest line held throughout** (REPORT.md §7 / WP-D §0): the claim is *"the real connectome
routes a looming cue to an embodied escape,"* **not** a calibrated escape threshold — the isolated
Giant Fiber saturates; direction is bearing-driven and deterministic, the per-side 133-vs-100
magnitude is seeded and can swap ±1 step. §7 is carried at full visual prominence.

---

## 1. The page — `app/projects/cellular-gaits/embodied/page.tsx` (rebuilt)

Flipped from a future-framed reading list ("The endpoint … *does* real structure produce real
behaviour?") to **the built result**. The page is now a server component that imports the small
static bundle JSON (`manifest.json`, `circuit.json`, `gf_response.json`) — the same import-and-bake
idiom as `GainSweepChart` — parses them against the WP-D schema, and feeds the four new client
components. **No science number is hardcoded**; every GF peak / drive / synapse / turn value flows
from the bundle (verified, see §4).

Structure mirrors `REPORT.md` §3 → §5 → §7, in the site's `§ EYEBROW` house style:

1. **§ THE EMBODIED FLY** — lead flipped to achieved; the `<EmbodiedLoop>` hero; the §1 prose
   (138,639-neuron connectome → body, the Eon recreation, the honest line).
2. **§ THE ESCAPE CIRCUIT · WHERE IT SITS** — `<BrainCircuitMap>` + the §3 prose (counts + the
   right>left synapse asymmetry, read off the figure).
3. **§ THE GIANT FIBER · AS AN INSTRUMENT** — `<GfResponse>` (the curve + silencing toggle).
4. **§ THE RESULT · LOOMING → ESCAPE** — `<EmbodiedConditions>` (the three panels), §5 headline.
5. **§ BUILT ONCE, THEN STEPPED** — the rec #20 timing instrument (see §3 below).
6. **§ HONEST LIMITS** — the §7 + WP-D §6 list, full prominence (amber-railed panel).
7. **§ THE LINE THIS COMPLETES** — the retargeted `ControllerLadder`, **demoted below the hero**,
   with the rung-01 → Body anchor figure (figcaption rewritten for the 3-rung ladder).
8. **§ REFERENCES** — kept as a footer (Shiu / FlyWire / Wang-Chen / von Reyn / Ache / Eon), trimmed
   and re-pointed to the parts actually used (added von Reyn & Ache for the escape circuit).

**Stale prose removed** (flagged by WP-A): the `alternatives` "pull the real VNC leg circuit / CPG
rungs" paragraph and the `frontier` "this tab is the on-ramp; that's the build-out" paragraph are
gone (the whole `ConceptScaffold` reading-list framing was replaced). Grep on the page for `VNC leg`,
`on-ramp`, `build-out`, future-tense "produce … behaviour", "the endpoint", "reading list" → **0
hits**.

## 2. New components (4) + what they reuse

All four match the dark `cg-*` token system, `var(--mono)`, the site green=live / amber=real-circuit
palette, and the **EscapeCircuit popout idiom** (hover · tap · focus reveals a one-liner;
keyboard-focusable, Esc to dismiss, edge-aware positioning). Pure SVG + React state — no three.js /
WASM is pulled onto this content route.

- **`EmbodiedLoop.tsx`** (rec #1, #2) — the hero. The four-part loop (① sense → ② brain → ③ descend
  → ④ body → loop closes through the physics) drawn on a **top-down fly silhouette** built in the
  `PlantSchematic` idiom (head / thorax / abdomen / eyes / legs), each stage anchored on the animal
  (sense→eyes, brain→head, descend→neck, body→thorax). A **condition toggle** (left / right /
  baseline) drives every number from `manifest.conditions[]` + the `config` motor map; the active
  eye lights, the threat draws in on the chosen azimuth, and a **spike animates** (SMIL
  `animateMotion`) along the LC4/LPLC2 → DNp01 converging edges in the brain card — gated off for
  baseline (GF silent). Reuses EscapeCircuit's popout machinery (replicated; it isn't an exported
  hook) for per-stage detail. The drive is **derived from the bundle config**
  (`drive = drive_peak · clip(GF / dnp01_ref_hz)`), not hardcoded — it reproduces the traces'
  `drive_peak` exactly (0.1778 / 0.1333 / 0).
- **`BrainCircuitMap.tsx`** (rec #7) — a **schematic dorsal-brain silhouette** (hand-drawn SVG,
  labelled *schematic · approximate — not a literal FlyWire render*). LC4 + LPLC2 in the lobula
  complex (lateral, behind each eye), DNp01 central → descending toward the VNC. Bilateral. Node
  sub-labels = `neurons.{LC4,LPLC2,DNp01}.{left,right}` counts; **edge thickness =
  `convergence_syn_ge_1.total_synapses`**, scaled so the **right > left** asymmetry is visible
  (LC4 374→2.0px / 431→3.8px; LPLC2 458→4.7px / 622→10px). Nodes *and* edges are interactive
  (EscapeCircuit popouts); the eye → lobula sense arrows anchor the looming input.
- **`GfResponse.tsx`** (rec #9) — **recharts** `LineChart` (the prompt-named lib; recharts ^3.8.1 was
  already a dep, used on `/dashboard/insights`). Plots `response.input_hz` vs `dnp01_hz` (rises,
  saturates ≈201.5 Hz). A **toggle** swaps in `silenced` (flat 0) — "silence LC4/LPLC2, the Giant
  Fiber goes quiet". Below it, the `channels_at_150hz` sub-additive bars (LPLC2 160 > LC4 109, both
  184.5 ≪ 269). Inline caveat (rec #10): brain-only circuit response, **not** an escape threshold —
  the isolated GF saturates.
- **`EmbodiedConditions.tsx`** (§5) — the three panels, driven by `manifest.conditions[]`; the three
  heavy traces are **client-fetched** from `/cellular-gaits/data-eb/` (mirroring how the behavior
  demos pull `data-x`). Each panel: the mp4 clip, the **GF mean trace** (`brain.dnp01_mean` vs
  `brain.t_s`, baseline flat 0, **shared y-axis** so 133/100/0 reads across panels, onset marked at
  `threat_onset_step · control_dt_s`), a **top-down body replay** (`body.thorax_xy`, pre-onset walk
  dim / post-onset bolt bright), and the **escape signature** (`summary.turn_vs_baseline_deg` at
  60/100/160/200 ms; baseline null → "the reference"). Brain (75) and body (301) are each plotted on
  their **own `t_s`** — never index-joined (the caveat is in the caption).

CSS: one appended block in `app/globals.css` (`/* WP-E · The Embodied Fly */`, append-only — no
existing rule edited), all under new `cg-eb-*` / `cg-gf-*` classes; the SVG components reuse the
existing `.sysdiagram` / `.sysdiagram-pop` shell (confirmed `position: relative`, so popouts
position correctly).

## 3. Optional rec #20 — done (compact)

The "built once, then stepped" timing instrument is included as a small inline timeline: a one-time
`build ≈ 14 s · once` bar then fast `15 ms` step ticks (the sync window pulled from
`config.sync_window_s`). High "this was actually run" signal, low footprint. The 14 s / ~150 ms
figures are timings from the WP-D export run (cited as such, not bundle-numeric — they aren't GF/turn
values that could drift on re-export); the sync window is read live from the bundle config.

## 4. Verification

- **`npx tsc --noEmit` → exit 0, clean.** Run via a temp `node_modules` symlink + copied
  `next-env.d.ts` (the worktree is a fresh checkout); both removed after, both gitignored.
- **`next build` is NOT usable here** — Turbopack rejects the symlinked worktree `node_modules`
  (`Symlink [project]/node_modules is invalid, it points out of the filesystem root`), exactly the
  prior-wave failure the prompt anticipates. Per the prompt, `tsc --noEmit` is the accepted check.
  A real render should be done after integration onto `feat/cg-redesign` (which has a real
  `node_modules`), or via a non-symlinked install.
- **Data-logic validated against the real bundle** (node script, not hand-asserted): `derive()`
  reproduces the trace summaries — drive 0.1778 / 0.1333 / 0, turn sign +1 / −1 / 0, side
  left/right/none; edge widths LC4 2.0→3.8, LPLC2 4.7→10 (right>left **true** for both); GF response
  peak 201.5, silenced max 0, channels 109+160=269 ≫ 184.5; all three traces parse with
  `brain.len=75` / `body.len=301`, onset 0.464 s, turn@160ms = −67 / +32.81 / null; all three clips
  present.
- **Grep clean** on the embodied page: no `VNC leg connectome`, `on-ramp`, `that's the build-out`, or
  future-tense "does structure produce behaviour". The retargeted `ControllerLadder` (WP-A) is kept
  but demoted below the hero; its LIVE rung links here, and this page is now the payoff.
- **All numbers trace to the bundle** — manifest/circuit/gf_response are imported and parsed; the
  three traces are fetched; nothing GF/turn/synapse is a literal in the source.

## 5. Reconciliation / left for final integration

- **Anchors resolve:** the `ControllerLadder` LIVE rung and the WP-A Mapping/Controller/Escape
  "→ Embodied" links land on `/projects/cellular-gaits/embodied`, which is now the climax content.
- **`tabs.ts` untouched** (Embodied stays penultimate, WP-B's IA preserved).
- **Anatomy rule honored** — every new visual maps onto the real fly (eyes / lobula / descending /
  thorax-legs); the brain outline is labelled schematic where it is one.
- **Next step (not this wave):** integrate `feat/cg-redesign-wpE` → `feat/cg-redesign`, then do the
  live render pass there (the three clips play from `data-eb`, the GF curve + silencing toggle, the
  condition toggle on the loop hero, the brain-map right>left edges, no console errors) before the
  whole redesign + embodied climax goes to review for `main`.

## Git
- **Branch:** `feat/cg-redesign-wpE`, child of `feat/cg-redesign`. Worked in `../portfolio-wt/cg-wpE`.
- **Committed (not merged):** `app/projects/cellular-gaits/embodied/page.tsx` (rebuilt),
  `app/globals.css` (appended), the 4 new components, this report, and a `SYNC.md` sync-log entry.
- `ops/prompts/PROMPT_cg_wpE_embodied.md` is gitignored (`.gitignore PROMPT_*.md`), left local.
