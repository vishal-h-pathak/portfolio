"use client";

/**
 * Sensing tab (E3) interactive module.
 *
 * The headline is the *current* controller walking the real fly, live — the
 * default evolved NCA, which is open-loop. The same rhythm plays every step
 * regardless of what the legs actually do; the grid never reads joint angles or
 * foot contacts back. We make that legible three ways:
 *   1. the live FlyStage (open-loop — the default evolved NCA *is* open-loop),
 *   2. a single diagram of the loop as built now (SignalPathDiagram) — the
 *      proprioceptive return arc solid and live, the connectome brain a branch
 *      to Embodied (no redundant open-vs-closed before/after),
 *   3. the direct open-vs-closed result — the closed loop is built and trained,
 *      with the live A/B on the Perturbation tab (no promissory "someday" test).
 *
 * Honesty constraints: this tab shows the open-loop walker (walking is solved
 * open-loop) and points at the real, live closed-loop recovery demo on the
 * Perturbation tab; no faked numbers on this page.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type {
  FlyStageCtx,
  FlyStageMetrics,
} from "@/components/cellular-gaits/FlyStage";
import { SignalPathDiagram } from "@/components/cellular-gaits/SignalPathDiagram";
import { SensorOverlay } from "@/components/cellular-gaits/SensorOverlay";

// ssr:false + dynamic import → three.js + the WASM fly load client-side only,
// and only when this module mounts. Recorded native-gain rollout is the honest
// fallback (it's the same open-loop controller) for devices without live WASM.
const FlyStage = dynamic(
  () => import("@/components/cellular-gaits/FlyStage").then((m) => m.FlyStage),
  { ssr: false },
);

type NcaHandle = { motors: () => Float32Array; reset: (seed?: number) => void };
type SensorSnapshot = { contacts: Uint8Array; angles: Float32Array };

export function SensingModule() {
  const [m, setM] = useState<FlyStageMetrics | null>(null);
  const [sensor, setSensor] = useState<SensorSnapshot | null>(null);
  // The open-loop walker is a fixed motor program; with no feedback it eventually
  // tumbles the real body into untrained territory and the physics diverges to
  // NaN — which blanks the 3D and latches the readout. Self-heal with one reset
  // (the same guard the Chemotaxis/Escape live demos use), so the headline stage
  // never gets stuck blank.
  const [resetSignal, setResetSignal] = useState(0);
  const diverged = useRef(false);

  // The open-loop NCA driving the fly. We supply it ourselves (rather than
  // letting FlyStage build the default) so the same control-step callback can
  // *read the body's proprioception back out of the sim* — exactly the channels
  // a closed loop would use, which this open-loop rule then ignores.
  const ncaRef = useRef<NcaHandle | null>(null);
  const zero = useRef(new Float32Array(42));
  const prevStep = useRef(-1);
  // Persistent buffers; the sim hands back reused arrays, so we copy into these
  // each step and snapshot them onto React state on a throttle (not at 250 Hz).
  const sense = useRef({
    contacts: new Uint8Array(6),
    angles: new Float32Array(42),
    live: false,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { loadController, makeNcaController } = await import("@/lib/nca");
      const w = await loadController();
      if (!alive) return;
      ncaRef.current = makeNcaController(w);
    })().catch((e) => console.error("[SensingModule] controller load failed", e));
    return () => {
      alive = false;
    };
  }, []);

  // Flush the latest sampled proprioception to state ~11×/s for the overlay.
  useEffect(() => {
    const id = setInterval(() => {
      if (!sense.current.live) return;
      setSensor({
        contacts: sense.current.contacts.slice(),
        angles: sense.current.angles.slice(),
      });
    }, 90);
    return () => clearInterval(id);
  }, []);

  const controller = useCallback((ctx: FlyStageCtx): Float32Array => {
    // Guard the physics: if the body has gone non-finite, stop driving it and ask
    // the stage for one clean re-pose (self-heal), so the stage recovers instead
    // of rendering NaN forever.
    const [tx, ty, tz] = ctx.sim.thoraxXyz();
    if (!Number.isFinite(tx) || !Number.isFinite(ty) || !Number.isFinite(tz)) {
      if (!diverged.current) {
        diverged.current = true;
        setResetSignal((r) => r + 1);
      }
      return zero.current;
    }

    if (ctx.controlStep === 0 && prevStep.current !== 0) {
      ncaRef.current?.reset();
      diverged.current = false;
    }
    prevStep.current = ctx.controlStep;
    const u = ncaRef.current ? ncaRef.current.motors() : zero.current;
    // Sample the body state the controller does NOT consume (open loop).
    const fc = ctx.sim.footContacts();
    const al = ctx.sim.actuatorLengths();
    sense.current.contacts.set(fc);
    const an = sense.current.angles;
    for (let i = 0; i < 42; i++) an[i] = al[i] ?? 0;
    sense.current.live = true;
    return u;
  }, []);

  return (
    <div className="cg-sense">
      <div className="cg-sense-stage">
        <div className="cg-sense-stage-head">
          <span className="cg-pg-badge" style={{ color: "var(--green)" }}>
            live · open loop
          </span>
          <p className="cg-sense-stage-note">
            The evolved controller walking the real fly, live. It runs{" "}
            <strong>blind</strong>: the grid emits the same rhythm every control
            step, never reading the legs it just moved — the proprioception
            overlay shows exactly the body state it throws away.
          </p>
        </div>

        <div className="cg-sense-stage-live">
          <FlyStage
            controller={controller}
            onStep={setM}
            height={380}
            resetSignal={resetSignal}
            fallbackClipSrc="/cellular-gaits/data/clip_gain_native.mp4"
          />
          {sensor && (
            <SensorOverlay contacts={sensor.contacts} angles={sensor.angles} />
          )}
        </div>

        <div className="cg-flystage-readout">
          <span>
            distance <strong>{m ? m.distance.toFixed(2) : "—"}</strong> mm
          </span>
          <span>
            sim&nbsp;t <strong>{m ? m.time.toFixed(2) : "—"}</strong> s
          </span>
          <span>
            render <strong>{m ? Math.round(m.fps) : "—"}</strong> fps
          </span>
          <span className="cg-sense-readout-gap">
            sensory feedback <strong>none</strong>
          </span>
        </div>
      </div>

      <div className="cg-sense-explain">
        <p className="cg-sense-h">The loop, closed</p>
        <p className="cg-sense-p">
          The forward path is real and wired (green): the{" "}
          <code>8×8×4</code> grid ticks once per control step, channel&nbsp;0 of
          the top-left sub-grid becomes <code>42</code> joint targets, and the
          MuJoCo fly steps at 250&nbsp;Hz. The return arc — <code>42</code> joint
          angles and <code>6</code> foot contacts written back into the cells — is
          the one thing a closed loop adds, and it is now{" "}
          <strong>solid: wired, trained, and live across the behaviors</strong>.
          (The default walker above still runs it open — that is the null model —
          but the closed controller is built, and its A/B is one tab over.) The
          same controller slot also takes the top rung, the real connectome brain;
          that loop is the{" "}
          <a
            className="cg-inline-link"
            href="/projects/cellular-gaits/embodied"
          >
            Embodied
          </a>{" "}
          page.
        </p>
        <SignalPathDiagram />
      </div>

      <div className="cg-sense-test">
        <p className="cg-sense-h">Open vs closed, settled</p>
        <p className="cg-sense-p">
          The two loops walk identically on flat ground and diverge exactly when
          something goes wrong. Shove the fly mid-stride — a lateral impulse, or
          yank a foot — and the open-loop walker above has{" "}
          <em>no error signal to correct against</em>: it plays a fixed motor
          program, so when the world pushes back, nothing in the grid knows. A
          controller that feels the disturbance in its proprioceptive input can
          adjust.
        </p>
        <p className="cg-sense-p">
          That closed loop is <strong>built and trained</strong>, and the A/B is
          live: on the{" "}
          <a
            className="cg-inline-link"
            href="/projects/cellular-gaits/behaviors/perturbation"
          >
            Perturbation
          </a>{" "}
          tab a controller that feels its body halves its post-shove heading
          error (56.6°→26.5°) against this open-loop one. This tab shows the body
          state the open loop throws away; that one shows what feeling it back
          buys.
        </p>
      </div>
    </div>
  );
}

export default SensingModule;
