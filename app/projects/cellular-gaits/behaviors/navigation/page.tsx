import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { FeelerField } from "@/components/cellular-gaits/FeelerField";
import { CG_BASE } from "@/components/cellular-gaits/tabs";

export const metadata: Metadata = {
  title: "Navigation — Cellular Gaits",
  description:
    "The synthesis behavior: seek a goal AND avoid obstacles. The fly homes on a reused odor beacon and detours around walls it senses with two bilateral feelers — the detour direction emerges from the feeler L−R asymmetry, arbitrated against the homing drive. The most robot-demo-compelling behavior, and the most honest about its abstraction: unlike escape, it has no clean real-circuit seam.",
};

const PARTS = [
  { key: "sense", label: "What it senses" },
  { key: "reward", label: "The reward" },
  { key: "expectation", label: "The result" },
  { key: "connectome", label: "Connectome link" },
];

export default function NavigationTabPage() {
  return (
    <ConceptScaffold
      name="Navigation"
      lead="This is the synthesis behavior: seek a goal and avoid obstacles at the same time. The fly homes on a goal beacon — the chemotaxis odor cue, reused — and detours around a wall it senses with two bilateral feelers. The detour direction isn't hard-coded; it falls out of the feeler left−right asymmetry, arbitrated against the homing drive. It's the most robot-demo-compelling of the four — and the most honest: unlike escape, navigation has no clean real-circuit seam."
      explainerParts={PARTS}
      module={
        <div className="cg-feeler">
          {/* 1 — the key standalone visual: the seek-vs-avoid arbitration */}
          <div>
            <p className="cg-sense-h">Two drives, arbitrated into a detour</p>
            <p className="cg-sense-p">
              A top-down view of the fly with the goal beacon ahead and a wall in
              the path. Two things are bilateral here: <strong>where the goal
              is</strong> (the odor <code>L − R</code> antenna difference, reused
              from chemotaxis) and <strong>where the wall is</strong> (two{" "}
              <code>L</code> vs <code>R</code> feeler fans reading obstacle
              proximity). Each yields a drive — a <strong>seek</strong> vector
              toward the goal and an <strong>avoid</strong> vector away from the
              wall — and the controller must <strong>arbitrate</strong> the two
              when they disagree. The resolved <strong>detour</strong> heading is
              just their sum. Hover, tap, or focus any element to read its role.
            </p>
            <FeelerField />
            <p className="cg-sense-cap">
              The geometry is analytic — the feeler readings are real ray casts
              against the wall and the vectors are their true sums, not artwork.
              The detour <em>direction</em> is emergent: nothing in the diagram
              hard-codes which way to dodge — it falls out of{" "}
              <code>proxL − proxR</code>, the same bilateral-asymmetry motif as
              chemotaxis (turn <em>toward</em> odor) and escape (bolt{" "}
              <em>away</em> from a loom).
            </p>
          </div>

          {/* 2 — the honest call: no live demo here, and why (a flagged compute follow-up) */}
          <div>
            <p className="cg-sense-h">No live demo here — on purpose</p>
            <div className="cg-sense-test">
              <p className="cg-sense-p">
                The arbitration above is <strong>analytic and real</strong> — true
                ray casts against the wall, true vector sums — but it&apos;s a{" "}
                <em>frozen</em> schematic, not a trained fly walking. A live
                place-the-goal / drag-the-obstacles demo, the kind{" "}
                <a className="cg-inline-link" href={`${CG_BASE}/behaviors/perturbation`}>
                  perturbation
                </a>{" "}
                and{" "}
                <a className="cg-inline-link" href={`${CG_BASE}/behaviors/chemotaxis`}>
                  chemotaxis
                </a>{" "}
                ship, would need something that doesn&apos;t exist yet: a
                navigation controller actually <strong>trained with the feeler
                inputs</strong> and exported alongside recorded rollouts and
                top-down trajectories — a new <code>data-n</code> compute bundle,
                the same shape as the <code>data-c2</code> and{" "}
                <code>data-ch</code> bundles those live demos replay.
              </p>
              <p className="cg-sense-p" style={{ marginBottom: 0 }}>
                Rather than ship a stub or fake a controller, navigation stays
                what it honestly is: the <strong>exploratory, least
                connectome-aligned</strong> behavior of the four. Unlike{" "}
                <a className="cg-inline-link" href={`${CG_BASE}/behaviors/escape`}>
                  escape
                </a>
                , which drops onto a real LC4 / LPLC2 → Giant-Fiber circuit, the
                feelers are a robotics abstraction with no neuron behind them. It
                earns its place as the seek-plus-avoid <em>synthesis</em>, shown
                analytically — and the live trained demo is a{" "}
                <strong>flagged compute follow-up</strong>, not a promise rendered
                as a placeholder.
              </p>
            </div>
          </div>
        </div>
      }
      explainer={{
        sense: (
          <p>
            <strong>A goal bearing and two obstacle feelers.</strong> The goal is
            the <strong>chemotaxis odor gradient, reused</strong> — bilateral, so
            the left−right antenna difference says which way it lies, exactly as
            in{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/behaviors/chemotaxis`}>
              chemotaxis
            </a>
            . The new sense is a pair of <strong>short-range feelers</strong>:
            obstacle proximity over the <strong>left</strong> forward field vs
            the <strong>right</strong>, written into the grid each control step
            the way every other sense is wired in the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/sensing`}>
              Sensing
            </a>{" "}
            tab. So both questions — &ldquo;where&apos;s the goal&rdquo; and
            &ldquo;where&apos;s the wall&rdquo; — arrive as the same kind of
            left−right comparison.
          </p>
        ),
        reward: (
          <p>
            <strong>Reach the goal, don&apos;t hit anything.</strong> Fitness
            rewards reaching the goal beacon and <em>penalizes collisions</em>{" "}
            (and rewards reaching it quickly). No term says <em>which way</em> to
            go around a wall — the detour has to be discovered from the feeler
            asymmetry. As with the other behaviors, this is a task-specific
            objective: don&apos;t read its fitness scalar against walking,
            chemotaxis, or escape.
          </p>
        ),
        expectation: (
          <p>
            <strong>The detour direction emerges from the feeler L−R
            asymmetry,</strong>{" "}
            arbitrated against the homing drive. It&apos;s warm-started from the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/behaviors/chemotaxis`}>
              chemotaxis forager
            </a>
            , so with the feelers off it <em>is</em> the pure forager — it walks
            straight at the goal and into the wall. The avoidance is the{" "}
            <strong>added skill</strong>: when a wall reads nearer on one side,
            the controller turns the other way and detours around it, then
            re-homes — with nothing hard-coding &ldquo;dodge away from the closer
            side.&rdquo; The two drives are genuinely competing (seek pulls toward
            the goal, avoid pushes off the wall), and the behavior is the learned{" "}
            <em>arbitration</em> between them. The visual above is that
            arbitration, frozen in one frame; a live place-the-goal demo would
            need a trained navigation controller we haven&apos;t run — it&apos;s
            a <strong>flagged compute follow-up</strong>, deliberately not faked
            here.
          </p>
        ),
        connectome: (
          <p>
            <strong>The honest one: there is no clean real-circuit seam here.</strong>{" "}
            This is the opposite of{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/behaviors/escape`}>
              escape
            </a>
            , which maps onto a real, mapped circuit (LC4 / LPLC2 → the Giant
            Fiber / DNp01) — the place a FlyWire sub-circuit literally drops in.
            Navigation has no such bridge. Real flies avoid obstacles with{" "}
            <strong>vision and optic flow</strong>, not short-range rangefinders;
            our two feelers are a <strong>robotics abstraction</strong>, a
            hand-built front-end with no neuron behind it. That makes navigation
            the <strong>most robot-demo-compelling</strong> behavior and the{" "}
            <strong>least connectome-aligned</strong> — a capability / synthesis
            demo, not a connectome bridge. Keeping that distinction visible is the
            point: the site stays calibrated about what&apos;s grounded in real
            biology (escape&apos;s seam) and what&apos;s a useful demo
            (these feelers). The real-biology direction to chase later is
            vision-based avoidance, not a feeler circuit — a different and harder{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
              Embodied
            </a>{" "}
            rung.
          </p>
        ),
      }}
    />
  );
}
