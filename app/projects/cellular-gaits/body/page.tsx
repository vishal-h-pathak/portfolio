import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { BodyFlyDemo } from "@/components/cellular-gaits/BodyFlyDemo";

export const metadata: Metadata = {
  title: "Body — Cellular Gaits",
  description: "The simulated Drosophila body the controller has to move.",
};

export default function BodyTabPage() {
  return (
    <ConceptScaffold
      name="Body"
      lead="The thing being controlled: a real FlyGym Drosophila in MuJoCo physics, running live in your browser — the evolved NCA walking it."
      module={<BodyFlyDemo />}
      explainer={{
        chose: (
          <p>
            <strong>NeuroMechFly / FlyGym in MuJoCo</strong> — the only
            biologically-grounded part of the whole system (real morphology,
            masses, contacts, from an X-ray microCT scan). A{" "}
            <em>Drosophila</em> with <strong>42</strong> leg position actuators
            (<code>kp = 50</code>) across six legs — 7 DoF each — ~87 joints,
            contact-rich. Control runs at <strong>250 Hz</strong>{" "}
            (<code>dt = 0.004 s</code>) with 40 physics substeps at 10 kHz per
            control step; units are mm.
          </p>
        ),
        why: (
          <p>
            The body is the <em>testbed</em>: the fixed substrate every
            controller is judged in. Nothing about it changes between
            experiments — swap the controller, the sensing, the objective, the
            optimizer, and this same plant is what has to actually walk. Make it
            real and the comparisons mean something.
          </p>
        ),
        alternatives: (
          <p>
            Vaxenburg et al.&rsquo;s whole-body RL fly (a learned policy, not an
            explicit plant to reuse); generic hexapod models (cheaper, but not a
            real animal&rsquo;s morphology); kinematic replay (joint angles
            played back with no controller in the loop — looks alive, controls
            nothing).
          </p>
        ),
        frontier: (
          <p>
            The full sensorimotor body — vision, olfaction, leg adhesion,
            muscle-level actuation — i.e.{" "}
            <strong>NeuroMechFly v2</strong>&rsquo;s broader feature set. Today
            this plant is position-actuated and walks blind; the frontier closes
            the perceptual and muscular loops around the same morphology.
          </p>
        ),
      }}
    />
  );
}
