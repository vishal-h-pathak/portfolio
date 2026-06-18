"use client";

/**
 * Minimal real use of the MuJoCo-WASM substrate (prompt B, step 3): the evolved
 * NCA walking the real fly, live, with a distance / FPS readout. E1 builds the
 * full Body tab on top of this — this just proves the substrate end to end.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import type { FlyStageMetrics } from "@/components/cellular-gaits/FlyStage";

// ssr:false + dynamic import → three.js + the ~9 MB WASM load client-side only,
// and only when this component mounts.
const FlyStage = dynamic(
  () => import("@/components/cellular-gaits/FlyStage").then((m) => m.FlyStage),
  { ssr: false },
);

export function BodyFlyDemo() {
  const [m, setM] = useState<FlyStageMetrics | null>(null);

  return (
    <div>
      <FlyStage onStep={setM} height={400} />
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
      </div>
    </div>
  );
}
