import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { BlackBoxObjective } from "@/components/cellular-gaits/BlackBoxObjective";
import { FitnessAnatomy } from "@/components/cellular-gaits/FitnessAnatomy";
import { EvolutionClimb } from "@/components/cellular-gaits/EvolutionClimb";
import { GaitGenerations } from "@/components/cellular-gaits/GaitGenerations";
import { SelectionRound } from "@/components/cellular-gaits/SelectionRound";
import { Math } from "@/components/cellular-gaits/Math";

export const metadata: Metadata = {
  title: "Search & Objective — Cellular Gaits",
  description:
    "How a 660-parameter controller was tuned from a stagger into a walk: why it had to be a gradient-free search, the one hand-set number that defined a good walk, and the real CMA-ES run that climbed it to 86.6 mm.",
};

/**
 * Search & Objective — rebuilt. The page answers one question end to end: how do
 * you get a fly to walk when you can't write the gait and can't differentiate
 * the physics? The arc:
 *
 *   It worked  →  A: why search (the objective is a black box)
 *              →  B: what "good" was (the one hand-set number)
 *              →  C: the climb (the honest centerpiece — it worked)
 *              →  D: watch it improve (footage slot — compute follow-up)
 *              →  under the hood: how CMA-ES moves with only scores
 *
 * Every visual ties a decision to a fly behavior: the black box holds a walking
 * fly, F is how far it walked, the climb's numbers are the gait getting better,
 * the slots are the gait you'd watch improve. The gain-sweep bar chart that used
 * to live here was the Controller's edge-of-chaos story (gain detuning of frozen
 * weights, not the search) and is dropped — it lives once, on the Controller tab.
 */
function SearchObjectiveModule() {
  return (
    <div className="cg-opt">
      <div className="cg-opt-framing">
        <p className="cg-opt-framing-h">What we tried, and how it went</p>
        <p>
          <strong>It worked.</strong> Starting from random weights, a gradient-free
          search tuned the 660-parameter neural cellular automaton from a twitching
          stagger into a clean forward walk — <strong>86.6 mm in 3 seconds, about
          29 mm/s</strong>. No gradients, no hand-coded gait: score a candidate
          controller by how far the fly walks, keep what works, repeat.
        </p>
        <p className="cg-opt-framing-note">
          What this <em>isn&apos;t</em>: this is the gait-controller search, and it
          succeeded. It&apos;s a separate experiment from the navigation
          reinforcement-learning attempt — that one tried to learn goal-directed
          steering and did <em>not</em> generalize. The locomotion search on this
          page is the one that produced a working walk.
        </p>
      </div>

      {/* A — why search, not gradients */}
      <section className="cg-opt-sec">
        <p className="cg-opt-sec-eyebrow">§ A · WHY SEARCH, NOT GRADIENTS</p>
        <p className="cg-opt-sec-lead">
          You can&apos;t write the gait by hand, and you can&apos;t train it by
          backprop either. The fitness comes out of a contact-rich physics rollout —
          so the only thing you can do is <em>try</em> a controller and{" "}
          <em>measure</em> how far the fly walked.
        </p>
        <BlackBoxObjective />
      </section>

      {/* B — what counts as a good walk */}
      <section className="cg-opt-sec">
        <p className="cg-opt-sec-eyebrow">§ B · WHAT COUNTS AS A GOOD WALK</p>
        <p className="cg-opt-sec-lead">
          &ldquo;Good&rdquo; has to become a single number the search can climb.
          Here it&apos;s the simplest one that turns &ldquo;walk forward&rdquo; into
          a score: distance, minus a small guardrail against collapsing.
        </p>
        <div className="cg-mathblock">
          <div className="cg-math-eq">
            <Math tex="F = \big(x^{\text{end}}_{\text{thorax}} - x^{\text{start}}_{\text{thorax}}\big) - 0.05\, N_{\text{below}}, \qquad z_{\text{thr}} = 0.5\, z_{\text{thorax}}" />
          </div>
          <p className="cg-math-gloss">
            Reward forward distance walked; subtract <code>0.05</code> for every
            control step the thorax sags below half its standing height (
            <Math tex="N_{\text{below}}" display={false} /> = number of such steps,
            where <Math tex="z < z_{\text{thr}}" display={false} />). Distance is
            measured after a short warm-up, so it scores control, not the initial
            settle.
          </p>
        </div>
        <FitnessAnatomy />
      </section>

      {/* C — the climb (centerpiece) */}
      <section className="cg-opt-sec">
        <p className="cg-opt-sec-eyebrow">§ C · THE CLIMB — IT WORKED</p>
        <p className="cg-opt-sec-lead">
          Fifty generations of that search, scored by real MuJoCo rollouts. The
          best controller climbs from a stagger at <strong>F ≈ 0</strong> to a
          clean walk at <strong>86.6 mm</strong> — and that single climbing line{" "}
          <em>is</em> the gait getting better.
        </p>
        <EvolutionClimb />
      </section>

      {/* D — watch it improve (footage slot) */}
      <section className="cg-opt-sec">
        <p className="cg-opt-sec-eyebrow">§ D · WATCH IT IMPROVE</p>
        <p className="cg-opt-sec-lead">
          The same three milestones — ① ② ③ from the climb — as side-by-side
          clips, so you could watch the gait go from stagger to walk. This footage
          has to be re-rendered from the checkpoints; the slots stand honest and
          empty until it is.
        </p>
        <GaitGenerations />
      </section>

      {/* under the hood — demoted aside */}
      <details className="cg-opt-aside">
        <summary>
          <span className="cg-opt-aside-tag">under the hood</span> how a
          gradient-free search moves with only scores
        </summary>
        <div className="cg-opt-aside-body">
          <p className="cg-opt-sec-lead">
            The search is <strong>CMA-ES</strong> (population <strong>32</strong>,{" "}
            <code>σ₀ = 0.3</code>). Given only scores, it samples a cloud of
            candidate controllers, keeps the best, and reshapes itself toward what
            worked — discovering <em>which</em> directions matter without ever
            seeing a gradient. One round, frozen to a picture:
          </p>
          <SelectionRound />
        </div>
      </details>
    </div>
  );
}

export default function SearchObjectiveTabPage() {
  return (
    <ConceptScaffold
      name="Search & Objective"
      lead={
        <>
          How do you get a fly to walk when you can&apos;t write the gait and
          can&apos;t differentiate the physics? Define one number for &ldquo;good&rdquo;
          — forward distance — and let a gradient-free search climb it. It tuned 660
          parameters from a stagger to a <strong>86.6 mm</strong> walk.
        </>
      }
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
            ever seeing a gradient — best reached <code>F ≈ 86.6 mm</code>.
          </p>
        ),
        why: (
          <p>
            The objective is the simplest signal that produces walking at all:
            distance rewards locomotion, the penalty discourages collapsing or
            dragging (though in this run it never fired). And the search{" "}
            <em>has</em> to be gradient-free: the score comes from a contact-rich
            MuJoCo rollout — collisions, friction, stiff contacts — so{" "}
            <code>F(θ)</code> is <strong>not differentiable</strong> and backprop is
            off the table. CMA-ES only needs to <em>score</em> candidates, never
            differentiate them. The price is sample cost: every candidate is a full
            3-second physics rollout, which is why the run is precomputed, not live.
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
