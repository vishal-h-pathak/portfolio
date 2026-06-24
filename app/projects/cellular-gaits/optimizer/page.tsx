import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { OptimizerModule } from "@/components/cellular-gaits/OptimizerModule";
import { ObjectiveChart } from "@/components/cellular-gaits/ObjectiveChart";
import { Math } from "@/components/cellular-gaits/Math";

export const metadata: Metadata = {
  title: "Search & Objective — Cellular Gaits",
  description:
    "What fitness rewarded and how that rule was found: the objective the controller was selected against, then the CMA-ES search that climbed it.",
};

/** The merged module. Lead with *what fitness rewarded* — the F formula plus the
 *  real gain sweep (ObjectiveChart) — then *how that rule was found*: the toy +
 *  real CMA-ES run (OptimizerModule). The objective gloss ends "selected against
 *  the search below," which is now literally the optimizer beneath it. The single
 *  MAP-Elites frontier the two pages used to duplicate now lives once, in the
 *  explainer. */
function SearchObjectiveModule() {
  return (
    <div className="cg-obj-module">
      <div className="cg-obj-framing">
        <p className="cg-obj-framing-h">What we tried, and how it went</p>
        <p>
          <strong>It worked.</strong> Starting from random weights, CMA-ES tuned the
          660-parameter neural cellular automaton from a twitching stagger into a
          clean forward walk — <strong>86.6 mm in 3 seconds, about 29 mm/s</strong>.
          No gradients, no hand-coded gait: score a candidate by how far the fly
          walks, keep what works, repeat. The two panels below <em>are</em> that
          result — first the objective the search was scored against, then the
          search itself climbing it.
        </p>
        <p className="cg-obj-framing-note">
          What this <em>isn&apos;t</em>: this is the gait-controller search, and it
          succeeded. It&apos;s a separate experiment from the navigation
          reinforcement-learning attempt — that one tried to learn goal-directed
          steering and did <em>not</em> generalize. Don&apos;t read the two together;
          the locomotion search on this page is the one that produced a working walk.
        </p>
      </div>

      <div className="cg-mathblock">
        <p className="cg-math-h3">What fitness rewarded</p>
        <div className="cg-math-eq">
          <Math tex="F = \big(x^{\text{end}}_{\text{thorax}} - x^{\text{start}}_{\text{thorax}}\big) - 0.05\, N_{\text{below}}, \qquad z_{\text{thr}} = 0.5\, z_{\text{thorax}}" />
        </div>
        <p className="cg-math-gloss">
          Reward forward distance walked; subtract <code>0.05</code> for every
          control step the thorax sags below half its standing height (
          <Math tex="N_{\text{below}}" display={false} /> = number of such steps,
          where <Math tex="z < z_{\text{thr}}" display={false} />). Distance is
          measured after a short warm-up so it scores control, not the initial
          settle. This is what the search below was selected against.
        </p>
      </div>

      <ObjectiveChart />

      <OptimizerModule />
    </div>
  );
}

export default function SearchObjectiveTabPage() {
  return (
    <ConceptScaffold
      name="Search & Objective"
      lead="What counts as a good walk, and how the rule was found: the fitness the search maximized — the single-peaked curve it actually rewarded — and the gradient-free evolution that climbed it."
      module={<SearchObjectiveModule />}
      explainer={{
        chose: (
          <p>
            Two choices, one tab. <strong>The objective:</strong> forward thorax
            distance, minus a small stability penalty (<code>0.05</code> per
            control step the thorax sags below half its standing height) — the
            simplest scalar that turns &ldquo;walk forward&rdquo; into a number an
            optimizer can climb. <strong>The search:</strong> <strong>CMA-ES</strong>{" "}
            (gradient-free evolution strategy) over the ~660-parameter update rule —
            population <strong>32</strong>, <code>σ₀ = 0.3</code>,{" "}
            <strong>50</strong> generations. It adapts a full covariance over the
            search space, so it discovers <em>which</em> directions matter without
            ever seeing a gradient — best reached <code>F ≈ 86.6 mm</code> at native
            gain <code>1.0</code>.
          </p>
        ),
        why: (
          <p>
            The objective is the simplest signal that produces walking at all:
            distance rewards locomotion, the penalty discourages collapsing or
            dragging. It&rsquo;s a hand-set objective, not a law — a choice that
            happened to select a working gait, the single-peaked curve the{" "}
            <a className="cg-inline-link" href="/projects/cellular-gaits/controller">
              Controller
            </a>{" "}
            tab reads as the edge-of-chaos result. And the search <em>has</em> to be
            gradient-free: the score comes from a contact-rich MuJoCo rollout —
            collisions, friction, stiff contacts — so <code>F(θ)</code> is{" "}
            <strong>not differentiable</strong> and backprop is off the table.
            CMA-ES only needs to <em>score</em> candidates, never differentiate
            them. The price is sample cost: every candidate is a full 3-second
            physics rollout, which is why the run is precomputed, not live.
          </p>
        ),
        alternatives: (
          <p>
            Other scalars define &ldquo;good&rdquo; just as well — energy
            efficiency (distance per unit actuation), gait symmetry, speed-matching
            a target velocity, robustness to pushes, uprightness — and each would
            have selected a different controller. So would other searches:{" "}
            <strong>reinforcement learning</strong> (the route the whole-body fly
            papers take, a learned policy from reward),{" "}
            <strong>differentiable physics</strong> (MuJoCo MJX / Brax make the sim
            differentiable so you <em>can</em> backprop through contacts), or{" "}
            <strong>MAP-Elites</strong> for an archive instead of a single optimum.
            Comparing objectives needs fresh MuJoCo rollouts, so this tab visualizes
            the real one and <em>names</em> the rest; it doesn&rsquo;t re-optimize.
          </p>
        ),
        frontier: (
          <p>
            A single scalar optimized to a single winner is a strong assumption.
            Real behavior trades off many goals at once, and an animal carries a
            repertoire, not a maximum — so the frontier is multi-objective /
            quality-diversity search (<strong>MAP-Elites</strong>): keep an{" "}
            <em>archive</em> of gaits that are each best at something — fast, stable,
            low-energy, tripod vs. wave — rather than one champion of one number.
            That&rsquo;s Stage 3 of the campaign.
          </p>
        ),
      }}
    />
  );
}
