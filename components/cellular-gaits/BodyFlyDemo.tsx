"use client";

/**
 * <BodyFlyDemo> — the Body tab's interactive module (E1).
 *
 * The headline is the real evolved NCA walking the real fly, live, in
 * MuJoCo-WASM via <FlyStage> (B's substrate): play/pause/reset come from the
 * stage itself; this wrapper adds the camera-tracking toggle, a forward-distance
 * / sim-time / FPS readout (from `onStep`), and a recorded-rollout fallback for
 * weak devices. Below the live plant sits <PlantSchematic>, the static labeled
 * morphology (42 actuators = 7 DoF × 6 legs, microCT-derived).
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import type { FlyStageMetrics } from "@/components/cellular-gaits/FlyStage";
import { PlantSchematic } from "@/components/cellular-gaits/PlantSchematic";

// ssr:false + dynamic import → three.js + the ~9 MB WASM load client-side only,
// and only when this component mounts.
const FlyStage = dynamic(
  () => import("@/components/cellular-gaits/FlyStage").then((m) => m.FlyStage),
  { ssr: false },
);

export function BodyFlyDemo() {
  const [m, setM] = useState<FlyStageMetrics | null>(null);
  const [tracking, setTracking] = useState(true);

  return (
    <div>
      <FlyStage
        onStep={setM}
        height={400}
        cameraTracking={tracking}
        fallbackClipSrc="/cellular-gaits/data/clip_gain_native.mp4"
      />

      <div className="cg-flystage-controls">
        <button
          className="cg-pg-btn"
          data-active={tracking ? "1" : "0"}
          aria-pressed={tracking}
          onClick={() => setTracking((t) => !t)}
        >
          camera tracking: {tracking ? "on" : "off"}
        </button>
      </div>

      <div className="cg-flystage-readout" aria-live="polite">
        <span>
          forward distance <strong>{m ? m.distance.toFixed(2) : "—"}</strong> mm
        </span>
        <span>
          sim&nbsp;t <strong>{m ? m.time.toFixed(2) : "—"}</strong> s
        </span>
        <span>
          render <strong>{m ? Math.round(m.fps) : "—"}</strong> fps
        </span>
      </div>

      <p className="cg-plant-note">
        Live MuJoCo-WASM — short rollout of the real evolved controller, not a
        recording. The schematic below is the static plant it drives.
      </p>

      <PlantSchematic />
    </div>
  );
}
