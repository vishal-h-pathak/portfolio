import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { ObjectiveChart } from "@/components/cellular-gaits/ObjectiveChart";
import { Math } from "@/components/cellular-gaits/Math";

export const metadata: Metadata = {
  title: "Objective — Cellular Gaits",
  description: "The fitness function the controller was selected against.",
};

/** The interactive module: the real objective curve, its formula, and the
 *  penalty toggle. The formula is server-rendered KaTeX (kept off the client
 *  bundle); the chart below it is the lone client island. */
function ObjectiveModule() {
  return (
    <div className="cg-obj-module">
      <div className="cg-mathblock">
        <p className="cg-math-h3">The objective</p>
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
    </div>
  );
}

export default function ObjectiveTabPage() {
  return (
    <ConceptScaffold
      name="Objective"
      lead="What counts as a good walk: the fitness the optimizer maximized — and the single-peaked curve it actually rewarded."
      module={<ObjectiveModule />}
      explainer={{
        chose: (
          <p>
            Forward thorax distance, minus a small stability penalty (
            <code>0.05</code> per control step the thorax sags below half its
            standing height). The simplest scalar that turns &ldquo;walk
            forward&rdquo; into a number an optimizer can climb.
          </p>
        ),
        why: (
          <p>
            It&rsquo;s the simplest signal that produces walking at all: distance
            rewards locomotion, the penalty discourages collapsing or dragging.
            It&rsquo;s a hand-set objective, not a law — a choice that happened to
            select a working gait, peaking at native gain <code>1.0</code> (
            <code>86.6&nbsp;mm</code>). That single-peaked curve is the same one
            the{" "}
            <a className="cg-inline-link" href="/projects/cellular-gaits/controller">
              Controller
            </a>{" "}
            tab reads as the edge-of-chaos result.
          </p>
        ),
        alternatives: (
          <p>
            Plenty of other scalars define &ldquo;good&rdquo;: energy efficiency
            (distance per unit actuation), gait symmetry, speed-matching a target
            velocity, robustness to pushes, or uprightness. Each would have
            selected a different controller. Comparing them needs fresh MuJoCo
            rollouts — so this tab visualizes the real objective and <em>names</em>{" "}
            the alternatives; it doesn&rsquo;t re-optimize.
          </p>
        ),
        frontier: (
          <p>
            A single scalar is a strong assumption. Real behavior trades off many
            goals at once — so the frontier is multi-objective /
            quality-diversity search: keep an <em>archive</em> of gaits that are
            each best at something (Stage 3), rather than one winner of one
            number. Closer to how an animal carries a repertoire, not a maximum.
          </p>
        ),
      }}
    />
  );
}
