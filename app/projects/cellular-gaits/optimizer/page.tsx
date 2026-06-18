import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";

export const metadata: Metadata = {
  title: "Optimizer — Cellular Gaits",
  description: "How the controller's rule was found: evolution, not backprop.",
};

export default function OptimizerTabPage() {
  return (
    <ConceptScaffold
      name="Optimizer"
      lead="Evolution, not backprop: searching a 660-parameter rule against physics."
      explainer={{
        chose: (
          <p>
            <strong>CMA-ES</strong> over the ~660-parameter update rule:
            population <strong>32</strong>, <code>σ₀ = 0.3</code>,{" "}
            <strong>50</strong> generations; best reached{" "}
            <code>F ≈ 86.6 mm</code>. The score comes from a contact-rich
            simulator and is not differentiable, so gradient descent is off the
            table — CMA-ES only needs to <em>score</em> candidates.
          </p>
        ),
      }}
    />
  );
}
