import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { EscapeCircuit } from "@/components/cellular-gaits/EscapeCircuit";
import { CG_BASE } from "@/components/cellular-gaits/tabs";

export const metadata: Metadata = {
  title: "Escape — Cellular Gaits",
  description:
    "The connectome-aligned behavior: a looming threat read bilaterally, fled fast in the right direction. It maps onto the real Drosophila escape circuit (LC4 / LPLC2 → the Giant Fiber / DNp01) — the seam where a real FlyWire sub-circuit later drops in.",
};

const PARTS = [
  { key: "sense", label: "What it senses" },
  { key: "reward", label: "The reward" },
  { key: "expectation", label: "The result" },
  { key: "connectome", label: "Connectome link" },
];

export default function EscapeTabPage() {
  return (
    <ConceptScaffold
      name="Escape"
      lead="This is the on-ramp to the endgame. A looming object is read bilaterally — angular size and expansion rate, left eye vs right — and the fly flees fast in the correct direction. The direction isn't hard-coded; it falls out of the left−right looming asymmetry. And unlike the other behaviors, escape maps onto a real, mapped circuit — the seam where a FlyWire sub-circuit later drops in."
      explainerParts={PARTS}
      module={
        <div className="cg-escape">
          {/* 1 — the key standalone visual: the connectome-bridge diagram */}
          <div>
            <p className="cg-sense-h">The real circuit — and where ours plugs in</p>
            <p className="cg-sense-p">
              Escape is the behavior with the cleanest known wiring diagram,
              which is exactly why it&apos;s the natural bridge to the connectome
              endgame. The amber backbone is the <strong>real</strong> circuit:
              a looming object read by two visual projection neuron types —{" "}
              <strong>LC4</strong> (angular velocity) and <strong>LPLC2</strong>{" "}
              (angular size) — converging on the <strong>Giant Fiber / DNp01</strong>,
              which sums size and velocity and whose single-spike timing sets a
              short vs long takeoff. The green rail is <strong>our hand-built
              stand-in</strong> mapped onto it: two bilateral loom channels stand
              in for LC4 + LPLC2, the learned controller for the descending
              readout. Hover, tap, or focus any part to read its role.
            </p>
            <EscapeCircuit />
            <p className="cg-sense-cap">
              Cites Ache et al. 2019 (<em>Current Biology</em> — Giant Fiber
              size/velocity encoding) and von Reyn et al. 2017 (single-spike
              timing → short/long takeoff). The dashed band is the seam: where
              the real FlyWire <code>LC4/LPLC2 → DNp01</code> wiring later
              replaces the hand-built front-end.
            </p>
          </div>

          {/* 2 — placeholder for the live demo (X-C wires this in) */}
          <div>
            <p className="cg-sense-h">Launch the threat (coming soon)</p>
            <p className="cg-sense-p">
              The live, in-browser escape: a MuJoCo fly running the trained
              controller, a threat you launch at it, recorded flee clips, and a
              top-down trajectory map showing the escape direction emerging from
              the L/R looming asymmetry.
            </p>
            <div className="cg-tab-module-stub">
              {/* TODO: X-C wires the live launch-the-threat escape FlyStage + recorded flee clips + top-down trajectory viz here. */}
              <span className="cg-tab-todo">{`// TODO: X-C — live launch-the-threat escape FlyStage + flee clips + trajectory viz`}</span>
            </div>
          </div>
        </div>
      }
      explainer={{
        sense: (
          <p>
            <strong>Bilateral looming.</strong> Two new sensor channels per eye —
            the object&apos;s <strong>angular size</strong> and its{" "}
            <strong>expansion rate</strong> — sampled for the{" "}
            <strong>left</strong> and <strong>right</strong> visual field and
            written into the grid each control step, the same way proprioception
            and the odor gradient are wired in the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/sensing`}>
              Sensing
            </a>{" "}
            tab. Size is an <em>LPLC2-like</em> channel (≈ Gaussian, peaking near
            collision); expansion is an <em>LC4-like</em> velocity channel
            (≈ linear). As with chemotaxis, the signal that carries{" "}
            <em>direction</em> is the left−right difference.
          </p>
        ),
        reward: (
          <p>
            <strong>React fast, flee the right way.</strong> Fitness rewards a
            quick, large escape <em>away</em> from the looming object — both the
            latency (how fast the takeoff fires once the object is close) and the
            correctness of the direction. No term tells it <em>which way</em> to
            go; that has to be discovered from the asymmetry. (This is a
            different objective from the other behaviors — don&apos;t read its
            fitness scalar against theirs.)
          </p>
        ),
        expectation: (
          <p>
            <strong>The direction of escape emerges from the L/R looming
            asymmetry.</strong>{" "}
            A threat looming from the left grows faster on the left eye; the
            controller should turn and flee right, and the mirror case should
            flip — with nothing in the controller saying &ldquo;flee away from
            the bigger side.&rdquo; That reflex should fall out of the
            left−right channels under selection, exactly as steering did in{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/behaviors/chemotaxis`}>
              chemotaxis
            </a>
            . This tab is the <strong>scaffold</strong>: the circuit visual and
            framing land now; the trained controller and the live demo are the
            next step (X-A trains it, X-C wires the demo in).
          </p>
        ),
        connectome: (
          <p>
            This is the behavior that <strong>maps onto a real, mapped
            circuit</strong>. A looming object is detected by two lobula
            columnar projection neuron types — <strong>LC4</strong> (angular
            velocity) and <strong>LPLC2</strong> (angular size) — that converge
            on the <strong>Giant Fiber</strong> descending neuron
            (<strong>DNp01</strong>): ~55 LC4 + ~108 LPLC2 synapses onto its
            lateral dendrite, summing size + velocity, the timing of a single
            spike setting a short vs long takeoff (Ache et al. 2019; von Reyn et
            al. 2017). The endgame is to replace our hand-built front-end with
            the <em>actual</em> FlyWire <code>LC4/LPLC2 → DNp01</code> wiring — a
            concrete sub-circuit far smaller than the whole VNC, and the most
            tractable rung on the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
              Embodied
            </a>{" "}
            ladder toward an Eon-style connectome-driven body. The diagram above
            marks exactly where it drops in.
          </p>
        ),
      }}
    />
  );
}
