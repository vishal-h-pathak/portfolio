# REPORT — CG Round 3 · WP3c · Loop & sensing diagrams (Sensing + Behaviors hub)

Branch: `feat/cg-r3c` (isolated worktree; merged into `feat/cg-redesign` with the other R3 chunks
after the human validates). `npx tsc --noEmit` clean. No `app/globals.css` edits — all new styling
reuses existing classes (`.sysdiagram`, `.sysdiagram-pop`, `.cg-loop-*`, `.cg-inline-link`) plus
inline SVG, so the four parallel branches merge clean.

## The complaint
The open-vs-closed-loop diagram was **duplicated** across two pages and weak:
- **Sensing** rendered `SignalPathDiagram` — two near-identical panels (open today / closed "Stage 2")
  differing by one dashed arc, framed as a *future* "Stage 2 / not wired yet."
- **Behaviors hub** rendered `ClosedLoopDiagram` — the *same* open-vs-closed motif again, two panels
  differing by one arc.

(The prompt named `ClosedLoopDiagram` as the thing on both pages; the actual duplication is
`SignalPathDiagram` on Sensing ↔ `ClosedLoopDiagram` on Behaviors. Confirmed with the user.)

Both were a toy before/after, both reused a right-column label hack from R2 (the original vertical
text), and both were promissory even though the loop is now closed and live across the behaviors.

## What was consolidated
The before/after pair is gone. The loop-as-it-is-now diagram now lives **once**, on Sensing. The
Behaviors hub gets a *different* diagram that answers the question the hub actually raises: how the
implemented behaviors connect.

### 1. `SignalPathDiagram.tsx` → one "system now" loop (Sensing)
Rewrote from two static panels into a **single** interactive diagram of the current system:
- Forward spine **NCA grid → motor map → fly body** (solid green), as before.
- The proprioceptive return arc is drawn **solid** (not dashed) — the loop is closed. Horizontal
  right-column labels: `joint angles / + foot contacts / closed · live`. No vertical text.
- The connectome brain is shown as a **labeled branch on the left** (`connectome brain → Embodied`,
  `rung 3 · alt controller`), tied to the controller slot with a dim dashed connector — *not* a second
  full arc. Per the design call: Sensing owns the proprioceptive loop; the brain loop is Embodied's
  job, so it's a pointer here, not a duplicate of Embodied.
- Keeps the SystemDiagram popout house style (hover · tap · focus reveals each block/arc/branch's
  one-liner; keyboard-focusable, Esc to dismiss, edge-aware positioning). Pure SVG + React state — no
  three.js/WASM on the content route.

### 2. `ClosedLoopDiagram.tsx` → `BehaviorMap` (Behaviors hub)
Repurposed the file (kept the filename to avoid a cross-branch rename; export renamed to `BehaviorMap`,
the one import in `behaviors/page.tsx` updated). It is now a small **block diagram of how the behaviors
connect**: a shared base block — *the closed proprioceptive loop* — branches to the four behaviors,
each = the same loop **plus one new sense and a reward**:
- Perturbation — *the loop, under a shove* → hold heading (live)
- Chemotaxis — *+ bilateral odor gradient* → reach the source (live)
- Escape — *+ looming detector* → flee; **bridges right to a `connectome brain (Embodied →)` chip** —
  the one behavior that maps onto a real, mapped circuit (live)
- Navigation — *+ feelers + goal bearing* → seek + avoid (drawn dashed/dim — building)

Pure static SVG, horizontal labels only, status pills (`live` / `building`) matching the card grid,
which is unchanged below it.

### 3. Copy → current "done" state, not "someday"
- `SensingModule.tsx`: the signal-path section retitled **"The loop, closed"**; prose now says the
  return arc is *solid: wired, trained, and live across the behaviors* (was "unwired in the open-loop
  default / Stage 2"), notes the live walker above is the open-loop null model, and points the
  connectome rung at Embodied. Header comment updated.
- `sensing/page.tsx`: already read as done (lead "The loop is closed", frontier "done (Stage 2)",
  Perturbation A/B link) — left as is.
- `behaviors/page.tsx`: the "§ OPEN LOOP → CLOSED LOOP" section became **"§ HOW THEY CONNECT"**
  (intro to the block map: "Not four separate projects — one closed loop with four payoffs"). The
  framing prose dropped the "dashed arc finally going solid" before/after language for "the closed
  proprioceptive loop … now solid and live. Each behavior below builds on it." `next leap` softened to
  the prerequisite being *now done*.

## Verify
- `npx tsc --noEmit` → exit 0.
- Rendered both SVGs headless (static HTML reproduction, 820px viewport) and screenshotted: no
  overlaps, no clipping, no vertical text, all labels horizontal and legible; the Sensing loop reads
  as one closed system, the Behaviors map shows the behaviors connected with Escape as the connectome
  bridge.
- Did **not** run `npm run dev` / `next build` (symlinked node_modules breaks Turbopack) — the human
  does the localhost:3000 visual pass.

## Files touched
- `components/cellular-gaits/SignalPathDiagram.tsx` (rewritten)
- `components/cellular-gaits/ClosedLoopDiagram.tsx` (rewritten → `BehaviorMap`)
- `components/cellular-gaits/SensingModule.tsx` (copy + render)
- `app/projects/cellular-gaits/behaviors/page.tsx` (import + section copy)

STOP — human validates on localhost:3000 and pushes.
