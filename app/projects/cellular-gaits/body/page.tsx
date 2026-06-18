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
            A FlyGym <em>Drosophila</em> with <strong>42</strong> leg position
            actuators (<code>kp = 50</code>) across six legs, ~87 joints,
            contact-rich. Control runs at <strong>250 Hz</strong>{" "}
            (<code>dt = 0.004 s</code>) with 40 physics steps at 10 kHz per
            control step.
          </p>
        ),
      }}
    />
  );
}
