"use client";

/**
 * <ChemotaxisDemo> — the live, in-browser place-the-source forager (Behaviors /
 * chemotaxis, CH-C). The killer demo: one live MuJoCo FlyStage runs the trained
 * 8→16 chemotaxis controller, and you drag the food source around a top-down
 * arena. Each control step the loop reads the fly's thorax xy + yaw straight from
 * the sim (`lib/mujoco-fly.ts`), places the two antennae per the export's
 * geometry (forward 1.0, lateral 2.0), evaluates the odor field
 * `C(p)=exp(-‖p−src‖/λ)` (λ=12) at each antenna against the *draggable* source,
 * and feeds the two readings into the controller (`lib/nca.ts`). The turn toward
 * the source is emergent — it falls out of the `cL − cR` asymmetry, no hard-coded
 * rule. Nothing here is recorded; `fallbackClipSrc` shows a recorded approach
 * where WASM can't run.
 *
 * The 3D stage shows the real fly; the 2D arena is the control surface — it's
 * fly-centred (north = world +y up), so as the fly walks toward the source the
 * source drifts in toward the centre. The source is draggable by pointer and by
 * keyboard (focus it, arrow keys nudge), with an aria-live readout of cL/cR.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  loadChemo,
  makeChemoController,
  odorConcentration,
  antennaPositions,
  type ChemoController,
} from "@/lib/nca";
import type { FlyStageCtx, FlyStageMetrics } from "@/components/cellular-gaits/FlyStage";

const FlyStage = dynamic(
  () => import("@/components/cellular-gaits/FlyStage").then((m) => m.FlyStage),
  { ssr: false },
);

const GREEN = "#6FE39A";
const AMBER = "#E89B3D";
const INK = "#E8E6DF";
const SUB = "#8C8B83";

// Fly-centred arena: world units → px, with the fly pinned at the centre.
const PX_PER_UNIT = 7;
const ARENA_H = 300;
// Where the default source sits relative to the spawn pose (world units):
// ahead and to the fly's left, so there's an immediate gradient to climb and the
// emergent left turn is visible on load.
const DEFAULT_FWD = 14;
const DEFAULT_LAT = 7;
// Iso-concentration rings drawn around the source (C levels of the odor field).
const ISO_LEVELS = [0.6, 0.35, 0.18];

type Pose = { x: number; y: number; yaw: number };
type Source = { x: number; y: number };

export function ChemotaxisDemo() {
  const [ready, setReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [readout, setReadout] = useState<{ cL: number; cR: number; dist: number } | null>(null);

  const chemoRef = useRef<ReturnType<typeof makeChemoController> | null>(null);
  const sensingRef = useRef<ChemoController["sensing"] | null>(null);
  const poseRef = useRef<Pose>({ x: 0, y: 0, yaw: 0 });
  const sourceRef = useRef<Source | null>(null);
  const sensRef = useRef<{ cL: number; cR: number; dist: number }>({ cL: 0, cR: 0, dist: 0 });
  const zero = useRef(new Float32Array(42));
  // Set when the physics blows up to NaN (e.g. the fly tumbles after overshooting
  // a far source into untrained territory) — we self-heal with one reset.
  const diverged = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<HTMLButtonElement | null>(null);
  const dragging = useRef(false);
  const prevStep = useRef(-1);

  // Default source from the current spawn pose, using the antenna geometry frame.
  const defaultSource = useCallback((p: Pose): Source => {
    const fx = Math.cos(p.yaw);
    const fy = Math.sin(p.yaw);
    const lx = -Math.sin(p.yaw);
    const ly = Math.cos(p.yaw);
    return {
      x: p.x + DEFAULT_FWD * fx + DEFAULT_LAT * lx,
      y: p.y + DEFAULT_FWD * fy + DEFAULT_LAT * ly,
    };
  }, []);

  // Load the trained chemotaxis controller once (tiny JSON; WASM loads in
  // parallel inside FlyStage). loadChemo also pulls v1's motor_cells + the
  // antenna geometry / λ from the export's sensors spec.
  useEffect(() => {
    let alive = true;
    (async () => {
      const ctrl = await loadChemo();
      if (!alive) return;
      chemoRef.current = makeChemoController(ctrl);
      sensingRef.current = ctrl.sensing;
      setReady(true);
    })().catch((e) => console.error("[ChemotaxisDemo] controller load failed", e));
    return () => {
      alive = false;
    };
  }, []);

  // The live controller handed to FlyStage. Reads the body pose + computes the
  // bilateral odor reading against the draggable source every control step.
  const controller = useCallback(
    (ctx: FlyStageCtx): Float32Array => {
      const chemo = chemoRef.current;
      const sensing = sensingRef.current;
      if (!chemo || !sensing) return zero.current;

      const [tx, ty] = ctx.sim.thoraxXyz();
      const yaw = ctx.sim.thoraxYaw();

      // Guard the physics: if the sim has gone non-finite, stop driving it and
      // ask the stage for one clean re-pose (self-heal), keeping the last good
      // pose so the arena doesn't try to draw NaN.
      if (!Number.isFinite(tx) || !Number.isFinite(ty) || !Number.isFinite(yaw)) {
        if (!diverged.current) {
          diverged.current = true;
          setResetSignal((r) => r + 1);
        }
        return zero.current;
      }

      const pose = { x: tx, y: ty, yaw };
      poseRef.current = pose;

      // On a fresh start (reset / first run), re-seed the rule and drop the
      // source back to its default offset from the new spawn.
      if (ctx.controlStep === 0 && prevStep.current !== 0) {
        chemo.reset();
        sourceRef.current = defaultSource(pose);
        diverged.current = false;
      }
      prevStep.current = ctx.controlStep;

      const src = sourceRef.current ?? defaultSource(pose);
      sourceRef.current = src;

      const { left, right } = antennaPositions(
        tx,
        ty,
        yaw,
        sensing.antenna_forward,
        sensing.antenna_lateral,
      );
      const cL = odorConcentration(left[0], left[1], src.x, src.y, sensing.odor_lambda);
      const cR = odorConcentration(right[0], right[1], src.x, src.y, sensing.odor_lambda);
      sensRef.current = { cL, cR, dist: Math.hypot(src.x - tx, src.y - ty) };

      return chemo.motors(ctx.sim.actuatorLengths(), ctx.sim.footContacts(), cL, cR);
    },
    [defaultSource],
  );

  // ── arena drawing (fly-centred top-down) ────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || 320;
    const cssH = ARENA_H;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const cx = cssW / 2;
    const cy = cssH / 2;
    const pose = poseRef.current;
    const src = sourceRef.current;
    const sensing = sensingRef.current;

    // world → screen, fly pinned at centre, world +y up.
    const toScreen = (wx: number, wy: number): [number, number] => [
      cx + (wx - pose.x) * PX_PER_UNIT,
      cy - (wy - pose.y) * PX_PER_UNIT,
    ];

    // background
    ctx.fillStyle = "rgba(232,230,223,0.02)";
    ctx.fillRect(0, 0, cssW, cssH);

    // If the pose isn't finite yet (loading) or has diverged, leave the arena
    // blank rather than feeding NaN into the canvas APIs.
    if (!Number.isFinite(pose.x) || !Number.isFinite(pose.y) || !Number.isFinite(pose.yaw)) return;

    if (src && sensing && Number.isFinite(src.x) && Number.isFinite(src.y)) {
      const [ssx, ssy] = toScreen(src.x, src.y);
      const lambdaPx = sensing.odor_lambda * PX_PER_UNIT;

      // odor field tint
      const grad = ctx.createRadialGradient(ssx, ssy, 0, ssx, ssy, lambdaPx);
      grad.addColorStop(0, "rgba(232,155,61,0.30)");
      grad.addColorStop(0.4, "rgba(232,155,61,0.10)");
      grad.addColorStop(1, "rgba(232,155,61,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cssW, cssH);

      // iso-concentration rings: C = exp(-d/λ) → d = -λ ln C
      ctx.strokeStyle = "rgba(232,155,61,0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      for (const lvl of ISO_LEVELS) {
        const r = -sensing.odor_lambda * Math.log(lvl) * PX_PER_UNIT;
        ctx.beginPath();
        ctx.arc(ssx, ssy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // line from fly to source (the gradient it's climbing)
      ctx.strokeStyle = "rgba(232,230,223,0.18)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ssx, ssy);
      ctx.stroke();

      // source marker
      ctx.fillStyle = AMBER;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(ssx, ssy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // position the keyboard/drag handle over the source
      const handle = handleRef.current;
      if (handle) {
        handle.style.left = `${ssx}px`;
        handle.style.top = `${ssy}px`;
      }
    }

    // ── the fly: a small oriented triangle at the centre, + the two antennae ──
    if (sensing) {
      const { left, right } = antennaPositions(
        pose.x,
        pose.y,
        pose.yaw,
        sensing.antenna_forward,
        sensing.antenna_lateral,
      );
      const { cL, cR } = sensRef.current;
      const ants: [number, number, number, boolean][] = [
        [left[0], left[1], cL, cL >= cR],
        [right[0], right[1], cR, cR > cL],
      ];
      // antenna stems + dots
      for (const [wx, wy, c, lead] of ants) {
        const [ax, ay] = toScreen(wx, wy);
        ctx.strokeStyle = lead ? GREEN : SUB;
        ctx.lineWidth = lead ? 1.8 : 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        ctx.fillStyle = `rgba(232,155,61,${0.3 + 0.55 * c})`;
        ctx.strokeStyle = lead ? GREEN : SUB;
        ctx.lineWidth = lead ? 2 : 1.2;
        ctx.beginPath();
        ctx.arc(ax, ay, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // body triangle pointing along yaw
      const fwd = { x: Math.cos(pose.yaw), y: -Math.sin(pose.yaw) }; // screen frame
      const lft = { x: Math.sin(pose.yaw), y: Math.cos(pose.yaw) };
      const nose = [cx + fwd.x * 11, cy + fwd.y * 11];
      const bl = [cx - fwd.x * 6 + lft.x * 6, cy - fwd.y * 6 + lft.y * 6];
      const br = [cx - fwd.x * 6 - lft.x * 6, cy - fwd.y * 6 - lft.y * 6];
      ctx.fillStyle = "rgba(232,230,223,0.18)";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(nose[0], nose[1]);
      ctx.lineTo(bl[0], bl[1]);
      ctx.lineTo(br[0], br[1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }, []);

  // Redraw on every metrics tick from the stage (~10 Hz) — cheap 2D.
  const onStep = useCallback(
    (_m: FlyStageMetrics) => {
      setReadout(sensRef.current);
      draw();
    },
    [draw],
  );

  // Keep the arena sized to its box.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    draw();
    return () => ro.disconnect();
  }, [draw]);

  // ── source dragging (pointer) ───────────────────────────────────────────────
  const setSourceFromClient = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const pose = poseRef.current;
    sourceRef.current = {
      x: pose.x + (px - rect.width / 2) / PX_PER_UNIT,
      y: pose.y - (py - rect.height / 2) / PX_PER_UNIT,
    };
    draw();
  }, [draw]);

  const onWindowMove = useCallback(
    (e: PointerEvent) => {
      if (dragging.current) setSourceFromClient(e.clientX, e.clientY);
    },
    [setSourceFromClient],
  );
  const endDrag = useCallback(() => {
    dragging.current = false;
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onWindowMove]);
  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      window.addEventListener("pointermove", onWindowMove);
      window.addEventListener("pointerup", endDrag);
    },
    [onWindowMove, endDrag],
  );

  // Clicking anywhere in the arena drops the source there too.
  const onArenaPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target === handleRef.current) return; // handle has its own drag
      setSourceFromClient(e.clientX, e.clientY);
      dragging.current = true;
      window.addEventListener("pointermove", onWindowMove);
      window.addEventListener("pointerup", endDrag);
    },
    [setSourceFromClient, onWindowMove, endDrag],
  );

  // Keyboard: nudge the source in world space (world axes, north up).
  const onHandleKey = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 4 : 1.5;
      const src = sourceRef.current ?? defaultSource(poseRef.current);
      const map: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      };
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        sourceRef.current = { x: src.x + d[0], y: src.y + d[1] };
        draw();
      }
    },
    [defaultSource, draw],
  );

  const onReset = useCallback(() => {
    // Bump the stage reset — controlStep 0 re-seeds the rule + the source.
    setResetSignal((r) => r + 1);
  }, []);

  const fmt = (v: number) => v.toFixed(3);
  const lead = readout ? (readout.cL >= readout.cR ? "left" : "right") : "—";
  const handleAria = readout
    ? `Odor source. Left antenna cL ${fmt(readout.cL)}, right antenna cR ${fmt(readout.cR)}, difference ${fmt(readout.cL - readout.cR)} — stronger on the ${lead}. Distance to the fly ${readout.dist.toFixed(1)} units. Drag, or use the arrow keys, to move the source; the fly turns toward it.`
    : "Odor source. Drag, or use the arrow keys, to move it; the fly turns toward the stronger-smelling side.";

  return (
    <div className="cg-chemo-live">
      <div className="cg-perturb-live-head">
        <span className="cg-pg-badge" style={{ color: GREEN }}>
          live · place the source
        </span>
        <p className="cg-sense-stage-note">
          The trained forager walking the real fly, live — and{" "}
          <strong>smelling the source you place</strong>. Each control step it reads
          its thorax position + heading from the sim, samples the odor field at its
          two antennae, and steers up the gradient. Drag the{" "}
          <strong style={{ color: AMBER }}>source</strong> and watch the turn fall
          out of the <code>cL − cR</code> difference — no turn is hard-coded.
        </p>
      </div>

      <div className="cg-chemo-stages">
        <div className="cg-chemo-stage3d">
          <FlyStage
            controller={controller}
            onStep={onStep}
            height={ARENA_H}
            resetSignal={resetSignal}
            fallbackClipSrc="/cellular-gaits/data-ch/approach_left.mp4"
          />
        </div>

        <div className="cg-chemo-arena-wrap">
          <div
            className="cg-chemo-arena"
            style={{ position: "relative", height: ARENA_H }}
          >
            <canvas
              ref={canvasRef}
              className="cg-chemo-canvas"
              style={{ width: "100%", height: ARENA_H, display: "block", touchAction: "none" }}
              onPointerDown={onArenaPointerDown}
              role="img"
              aria-label="Top-down arena: the fly at centre, its two antennae, and the draggable odor source. The arena follows the fly."
            />
            <button
              ref={handleRef}
              type="button"
              className="cg-chemo-source-handle"
              onPointerDown={startDrag}
              onKeyDown={onHandleKey}
              aria-label={handleAria}
            />
          </div>
          <p className="cg-chemo-arena-cap">
            top-down · fly-centred (north up). drag anywhere to place the source.
          </p>
        </div>
      </div>

      <div className="cg-chemo-controls" role="group" aria-label="Live demo controls">
        <button type="button" className="cg-pg-btn" onClick={onReset} disabled={!ready}>
          reset
        </button>
        <div className="cg-flystage-readout cg-chemo-readout">
          <span>
            cL <strong style={{ color: readout && readout.cL >= readout.cR ? GREEN : undefined }}>
              {readout ? fmt(readout.cL) : "—"}
            </strong>
          </span>
          <span>
            cR <strong style={{ color: readout && readout.cR > readout.cL ? GREEN : undefined }}>
              {readout ? fmt(readout.cR) : "—"}
            </strong>
          </span>
          <span>
            Δ = cL−cR <strong>{readout ? (readout.cL - readout.cR >= 0 ? "+" : "") + fmt(readout.cL - readout.cR) : "—"}</strong>
          </span>
          <span>
            dist <strong>{readout ? readout.dist.toFixed(1) : "—"}</strong>
          </span>
        </div>
      </div>
      <p className="cg-chemo-live-readout" aria-live="polite">
        {readout
          ? `Left antenna ${fmt(readout.cL)}, right antenna ${fmt(readout.cR)}: odor is stronger on the ${lead}, so the fly biases that way.`
          : "Loading the trained controller…"}
      </p>

      <p className="cg-pg-cap">
        live MuJoCo · the loop reads thorax pose from the sim and the odor field
        from the source you place, every step
        {!ready && " · loading controller…"}. The lateral antenna baseline (2.0
        units) is deliberately wider than a real fly&apos;s — it stands in for the
        temporal &ldquo;casting&rdquo; a fly uses to amplify a weak gradient.
      </p>
    </div>
  );
}

export default ChemotaxisDemo;
