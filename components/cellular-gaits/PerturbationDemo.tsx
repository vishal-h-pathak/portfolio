"use client";

/**
 * <PerturbationDemo> — the live, in-browser closed loop (Behaviors / perturbation, C2-C).
 *
 * One live MuJoCo FlyStage you can shove mid-stride, with a toggle between the
 * two controllers running on the *same* body:
 *   • open loop (v1, controller_best.json) — a fixed motor program; a shove
 *     knocks it off heading and it walks crooked, with no error signal to
 *     correct against;
 *   • closed loop (closed_loop_controller.json) — reads its own joint angles +
 *     foot contacts back into the grid every control step (lib/nca.ts), feels
 *     the disturbance, and steers back toward its original heading.
 *
 * The proprioception is read *live* from the sim each control step
 * (`sim.actuatorLengths()` → ch4, `sim.footContacts()` → ch5) — this is the real
 * closed loop, not a recording. The recorded side-by-side clips (above) cover
 * the simultaneous comparison; keeping one live stage protects the frame budget.
 * `fallbackClipSrc` shows the recorded closed-loop rollout where WASM can't run.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  loadController,
  loadClosedLoop,
  makeNcaController,
  makeClosedLoopController,
  type Controller,
  type ClosedLoopController,
} from "@/lib/nca";
import type { FlyStageCtx, FlyStageMetrics } from "@/components/cellular-gaits/FlyStage";

const FlyStage = dynamic(
  () => import("@/components/cellular-gaits/FlyStage").then((m) => m.FlyStage),
  { ssr: false },
);

type Mode = "closed" | "open";

/** A live controller bound to the sim: ticks once per control step. */
type LiveController = {
  tick: (ctx: FlyStageCtx) => Float32Array;
  reset: (seed?: number) => void;
};

export function PerturbationDemo() {
  const [mode, setMode] = useState<Mode>("closed");
  const [shoveSignal, setShoveSignal] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const [ready, setReady] = useState(false);
  const [m, setM] = useState<FlyStageMetrics | null>(null);

  const weightsRef = useRef<{ open?: Controller; closed?: ClosedLoopController }>({});
  const activeRef = useRef<LiveController | null>(null);
  const modeRef = useRef<Mode>("closed");
  const zero = useRef(new Float32Array(42));

  const buildActive = useCallback((next: Mode): LiveController | null => {
    const w = weightsRef.current;
    if (next === "open" && w.open) {
      const nca = makeNcaController(w.open);
      return { tick: () => nca.motors(), reset: (s) => nca.reset(s) };
    }
    if (next === "closed" && w.closed) {
      const cl = makeClosedLoopController(w.closed);
      return {
        tick: (ctx) => cl.motors(ctx.sim.actuatorLengths(), ctx.sim.footContacts()),
        reset: (s) => cl.reset(s),
      };
    }
    return null;
  }, []);

  // Load both controllers once (tiny JSON; the WASM engine loads in parallel
  // inside FlyStage). The closed loop also pulls v1's motor_cells.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [open, closed] = await Promise.all([loadController(), loadClosedLoop()]);
      if (!alive) return;
      weightsRef.current = { open, closed };
      activeRef.current = buildActive(modeRef.current);
      setReady(true);
    })().catch((e) => console.error("[PerturbationDemo] controller load failed", e));
    return () => {
      alive = false;
    };
  }, [buildActive]);

  // Stable controller handed to FlyStage: self-reseeds whenever the stage
  // restarts (controlStep === 0), so both the reset button and a toggle restart
  // cleanly without remounting the WASM engine.
  const prevStep = useRef(-1);
  const controller = useCallback((ctx: FlyStageCtx): Float32Array => {
    if (ctx.controlStep === 0 && prevStep.current !== 0) activeRef.current?.reset();
    prevStep.current = ctx.controlStep;
    const a = activeRef.current;
    return a ? a.tick(ctx) : zero.current;
  }, []);

  const selectMode = useCallback(
    (next: Mode) => {
      if (next === modeRef.current) return;
      modeRef.current = next;
      activeRef.current = buildActive(next);
      setMode(next);
      setResetSignal((r) => r + 1); // re-pose the body for a clean A/B
    },
    [buildActive],
  );

  const closed = mode === "closed";

  return (
    <div className="cg-perturb-live">
      <div className="cg-perturb-live-head">
        <span
          className="cg-pg-badge"
          style={{ color: closed ? "var(--green)" : "var(--amber)" }}
        >
          live · {closed ? "closed loop" : "open loop"}
        </span>
        <p className="cg-sense-stage-note">
          {closed ? (
            <>
              The trained controller walking the real fly, live — and{" "}
              <strong>reading its own body back</strong> every control step (42
              joint angles + 6 foot contacts). Shove it and watch it steer back
              toward its heading.
            </>
          ) : (
            <>
              The v1 controller — a <strong>fixed motor program</strong> with no
              feedback. Shove it and it has nothing to correct against: it walks
              off course and stays there.
            </>
          )}
        </p>
      </div>

      <div className="cg-perturb-controls" role="group" aria-label="Live demo controls">
        <div
          className="cg-chan-toggle"
          role="radiogroup"
          aria-label="Which controller drives the fly"
        >
          <button
            type="button"
            role="radio"
            aria-checked={closed}
            data-active={closed ? "1" : undefined}
            onClick={() => selectMode("closed")}
          >
            closed loop
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!closed}
            data-active={!closed ? "1" : undefined}
            onClick={() => selectMode("open")}
          >
            open loop (v1)
          </button>
        </div>
        <button
          type="button"
          className="cg-pg-btn cg-shove-btn"
          onClick={() => setShoveSignal((s) => s + 1)}
          aria-label="Shove the fly with a lateral impulse"
        >
          ⟶ shove
        </button>
      </div>

      <FlyStage
        controller={controller}
        onStep={setM}
        height={380}
        shoveSignal={shoveSignal}
        resetSignal={resetSignal}
        fallbackClipSrc="/cellular-gaits/data-c2/perturbation_closedloop.mp4"
      />

      <div className="cg-flystage-readout">
        <span>
          heading err{" "}
          <strong>{m ? Math.abs(m.headingDeg).toFixed(0) : "—"}</strong>°
        </span>
        <span>
          distance <strong>{m ? m.distance.toFixed(1) : "—"}</strong> mm
        </span>
        <span>
          render <strong>{m ? Math.round(m.fps) : "—"}</strong> fps
        </span>
        <span className="cg-sense-readout-gap" style={{ color: closed ? "var(--green)" : undefined }}>
          sensory feedback <strong>{closed ? "48 ch · live" : "none"}</strong>
        </span>
      </div>

      <p className="cg-pg-cap">
        live MuJoCo · the closed loop reads proprioception from the sim each step
        {!ready && " · loading controllers…"} — the side-by-side recorded clips
        above show both under the identical shove.
      </p>
    </div>
  );
}

export default PerturbationDemo;
