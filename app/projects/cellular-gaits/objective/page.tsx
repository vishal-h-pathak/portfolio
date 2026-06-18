import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";

export const metadata: Metadata = {
  title: "Objective — Cellular Gaits",
  description: "The fitness function the controller was selected against.",
};

export default function ObjectiveTabPage() {
  return (
    <ConceptScaffold
      name="Objective"
      lead="What counts as a good walk: the fitness the optimizer maximized."
      explainer={{
        chose: (
          <p>
            Reward forward thorax distance, minus a small penalty (
            <code>0.05</code> per step) for every control step the thorax sags
            below half its standing height. Distance is measured after a short
            warm-up so it reflects control, not the initial settle. (Equation in
            the{" "}
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
