import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";

export const metadata: Metadata = {
  title: "Motor mapping — Cellular Gaits",
  description: "How cellular-automaton state becomes joint targets.",
};

export default function MappingTabPage() {
  return (
    <ConceptScaffold
      name="Motor mapping"
      lead="From grid state to torque: which cells drive which actuators."
      explainer={{
        chose: (
          <p>
            Channel 0 of the top-left <strong>7×6</strong> sub-grid, read row by
            row, gives 42 numbers; each is clipped to{" "}
            <code>[-1, 1] · 3.14 rad</code> and used as a joint target for one of
            the 42 actuators. One CA tick per control step. (Full equation in the{" "}
            <a className="cg-inline-link" href="/projects/cellular-gaits/appendix">
              appendix
            </a>
            .)
          </p>
        ),
      }}
    />
  );
}
