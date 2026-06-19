import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { SensingModule } from "@/components/cellular-gaits/SensingModule";

export const metadata: Metadata = {
  title: "Sensing — Cellular Gaits",
  description: "What the controller feels about the body it drives.",
};

export default function SensingTabPage() {
  return (
    <ConceptScaffold
      name="Sensing"
      lead="Open loop vs closed loop: does the grid feel the legs it moves?"
      module={<SensingModule />}
      explainer={{
        chose: (
          <p>
            <strong>Open-loop.</strong> The controller runs blind. The grid never
            receives body state — it emits the same rhythm every control step
            regardless of what the legs actually do. No proprioception, no
            reflexes, no error correction.
          </p>
        ),
        why: (
          <p>
            Simplest possible first cut. Stripping out feedback isolates one
            question: can a single local rule, shared across an <code>8×8×4</code>{" "}
            grid (660 params), generate a coordinated gait <em>at all</em>? It can
            — CMA-ES found one worth <code>86.6&nbsp;mm</code> at native gain.
            Sensing is the next thing to add, not the thing to start with.
          </p>
        ),
        alternatives: (
          <p>
            Feed proprioception in as extra input channels (joint angles, foot
            contacts appended to each cell’s state), or carve out{" "}
            <em>dedicated sensor cells</em> in the grid whose state is body-driven
            rather than rule-driven. Or wire fast local <em>reflex loops</em> —
            contact triggers a stereotyped correction without going through the
            whole controller.
          </p>
        ),
        frontier: (
          <p>
            Real flies are saturated with mechanosensors — campaniform sensilla
            (cuticular strain), hair plates (joint position), chordotonal organs
            (stretch and vibration) — feeding continuous body state into the VNC.
            Closing the loop is <strong>Stage 2</strong> and the path to
            robustness: the open-loop gait survives flat ground, but only a
            controller that feels can recover from a shove. It&apos;s the second
            rung on the{" "}
            <a className="cg-inline-link" href="/projects/cellular-gaits/embodied">
              Embodied
            </a>{" "}
            ladder, between the null model and the real connectome.
          </p>
        ),
      }}
    />
  );
}
