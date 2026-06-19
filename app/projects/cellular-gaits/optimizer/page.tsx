import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { OptimizerModule } from "@/components/cellular-gaits/OptimizerModule";

export const metadata: Metadata = {
  title: "Optimizer — Cellular Gaits",
  description: "How the controller's rule was found: evolution, not backprop.",
};

export default function OptimizerTabPage() {
  return (
    <ConceptScaffold
      name="Optimizer"
      lead="Evolution, not backprop: searching a 660-parameter rule against physics."
      module={<OptimizerModule />}
      explainer={{
        chose: (
          <p>
            <strong>CMA-ES</strong> (gradient-free evolution strategy) over the
            ~660-parameter update rule: population <strong>32</strong>,{" "}
            <code>σ₀ = 0.3</code>, <strong>50</strong> generations. It adapts a
            full covariance over the search space, so it discovers <em>which</em>{" "}
            directions matter without ever seeing a gradient — best reached{" "}
            <code>F ≈ 86.6 mm</code>.
          </p>
        ),
        why: (
          <p>
            The score comes from a contact-rich MuJoCo rollout — collisions,
            friction, stiff contacts — so <code>F(θ)</code> is{" "}
            <strong>not differentiable</strong> and backprop is off the table.
            CMA-ES only needs to <em>score</em> candidates, never differentiate
            them. The price is sample cost: every candidate is a full 3-second
            physics rollout, which is why the run is precomputed, not live.
          </p>
        ),
        alternatives: (
          <p>
            <strong>Reinforcement learning</strong> — the route the whole-body
            fly papers take (a learned policy from reward).{" "}
            <strong>Differentiable physics</strong> — MuJoCo MJX / Brax make the
            sim differentiable so you <em>can</em> backprop through contacts.{" "}
            <strong>MAP-Elites</strong> — trade a single optimum for an archive of
            diverse high-performers.
          </p>
        ),
        frontier: (
          <p>
            Quality-diversity archives (<strong>MAP-Elites</strong>) that evolve a{" "}
            <em>gallery</em> of gaits — fast, stable, low-energy, tripod vs. wave —
            instead of one winner, illuminating the behavior space the way a real
            animal&apos;s repertoire does. That&apos;s Stage 3 of the campaign.
          </p>
        ),
      }}
    />
  );
}
