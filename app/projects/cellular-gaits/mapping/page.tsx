import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { MotorMap } from "@/components/cellular-gaits/MotorMap";

export const metadata: Metadata = {
  title: "Motor mapping — Cellular Gaits",
  description: "How cellular-automaton state becomes joint targets.",
};

export default function MappingTabPage() {
  return (
    <ConceptScaffold
      name="Motor mapping"
      lead="From grid state to torque: which number moves which leg. Trace a cell to the joint it drives — or pin one and override it on the live fly."
      module={<MotorMap />}
      explainer={{
        chose: (
          <p>
            Channel 0 of the top-left <strong>7×6</strong> sub-grid, read row by
            row, gives <strong>42</strong> numbers; entry <code>i</code> becomes
            the target for actuator <code>i</code> (manifest order), rescaled{" "}
            <code>clip(u,−1,1)·3.14 rad</code>. One CA tick per control step.
            (Full equation in the appendix.)
          </p>
        ),
        why: (
          <p>
            A wiring convenience, nothing more. There is{" "}
            <strong>nothing biological</strong> about this particular cell-to-leg
            assignment — a fixed sub-grid read in a fixed order was simply the
            cheapest way to turn a grid into 42 joint commands. The decorrelation
            you can see between grid position and which leg moves is the tell.
          </p>
        ),
        alternatives: (
          <p>
            A small <em>learned readout layer</em> (let evolution place the
            motor taps); a different sub-grid, shape, or topology; or a{" "}
            <em>population code</em> where many cells vote on each joint instead
            of one cell per actuator.
          </p>
        ),
        frontier: (
          <p>
            In a real animal this is the{" "}
            <strong>descending-neuron readout</strong>: command neurons
            projecting from the brain onto lower-level controllers. That
            interface — the hard part Eon names — is now built: in the embodied
            loop the Giant Fiber&apos;s (<strong>DNp01</strong>) firing rate
            becomes the escape drive. It is still a hand-tuned, single-neuron
            stand-in for the whole descending hierarchy, but it is the realized
            version, not a someday. See the{" "}
            <a className="cg-inline-link" href="/projects/cellular-gaits/embodied">
              Embodied
            </a>{" "}
            tab.
          </p>
        ),
      }}
    />
  );
}
