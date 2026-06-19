"use client";

/**
 * Sensing tab (E3) interactive module.
 *
 * The headline is the *current* controller walking the real fly, live — and the
 * teaching point is what's missing: it's open-loop. The same NCA rhythm plays
 * every step regardless of what the legs actually do; the grid never reads joint
 * angles or foot contacts back. We make that legible three ways:
 *   1. the live FlyStage (open-loop — the default evolved NCA *is* open-loop),
 *   2. a side-by-side open- vs closed-loop signal path (SignalPathDiagram),
 *   3. an honest framing of the perturbation-recovery test we can't yet run.
 *
 * Honesty constraints (PROMPT_cg_E3_sensing.md): live WASM physics only; closed
 * loop is Stage 2, so NO live perturbation-recovery demo and NO faked numbers.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import type { FlyStageMetrics } from "@/components/cellular-gaits/FlyStage";
import { SignalPathDiagram } from "@/components/cellular-gaits/SignalPathDiagram";

// ssr:false + dynamic import → three.js + the WASM fly load client-side only,
// and only when this module mounts. Recorded native-gain rollout is the honest
// fallback (it's the same open-loop controller) for devices without live WASM.
const FlyStage = dynamic(
  () => import("@/components/cellular-gaits/FlyStage").then((m) => m.FlyStage),
  { ssr: false },
);

export function SensingModule() {
  const [m, setM] = useState<FlyStageMetrics | null>(null);

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
            step, never reading the legs it just moved.
          </p>
        </div>

        <FlyStage
          onStep={setM}
          height={380}
          fallbackClipSrc="/cellular-gaits/data/clip_gain_native.mp4"
        />

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
        <p className="cg-sense-h">Signal path · open vs closed</p>
        <p className="cg-sense-p">
          The forward path is real and wired (green): the{" "}
          <code>8×8×4</code> grid ticks once per control step, channel&nbsp;0 of
          the top-left sub-grid becomes <code>42</code> joint targets, and the
          MuJoCo fly steps at 250&nbsp;Hz. The return arc — joint angles and foot
          contacts written back into the cells — is the one thing a closed loop
          adds, and it is <strong>not wired yet</strong>.
        </p>
        <SignalPathDiagram />
      </div>

      <div className="cg-sense-test">
        <p className="cg-sense-h">The experiment that tells them apart</p>
        <p className="cg-sense-p">
          The clean way to distinguish open from closed loop is a{" "}
          <strong>perturbation-recovery test</strong>: shove the fly mid-stride
          (a lateral impulse, or yank a foot) and measure whether it returns to a
          stable gait. An open-loop controller plays a fixed motor program, so it
          has <em>no error signal to correct against</em> — when the world pushes
          back, nothing in the grid knows. A closed loop sees the disturbance in
          its proprioceptive input and can adjust. Same behaviour on flat ground;
          they diverge exactly when something goes wrong.
        </p>
        <p className="cg-sense-disclaimer">
          The fly above is still the <strong>open-loop v1 walker</strong> — that
          is the honest thing to show on this tab, since walking is solved
          open-loop. But the closed loop now <strong>exists</strong>: it has been
          wired and trained, and the live recovery demo is real. Shove it
          yourself on the{" "}
          <a
            className="cg-inline-link"
            href="/projects/cellular-gaits/behaviors/perturbation"
          >
            Perturbation
          </a>{" "}
          tab, where a controller that feels its body halves its post-shove
          heading error (56.6°→26.5°) versus this open-loop one. The
          perturbation-recovery test is no longer hypothetical.
        </p>
      </div>
    </div>
  );
}

export default SensingModule;
