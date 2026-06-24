import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { GradientField } from "@/components/cellular-gaits/GradientField";
import {
  ChemoTrajectories,
  type ChemoEpisode,
} from "@/components/cellular-gaits/ChemoTrajectories";
import { ChemotaxisDemo } from "@/components/cellular-gaits/ChemotaxisDemo";
import { CG_BASE } from "@/components/cellular-gaits/tabs";

export const metadata: Metadata = {
  title: "Chemotaxis — Cellular Gaits",
  description:
    "The most 'alive' closed-loop behavior: the fly climbs an odor gradient by comparing what its two antennae smell. Steering emerges from the left−right asymmetry — no turn is hard-coded.",
};

const PARTS = [
  { key: "sense", label: "What it senses" },
  { key: "reward", label: "The reward" },
  { key: "expectation", label: "The result" },
  { key: "connectome", label: "Connectome link" },
];

type Metrics = {
  config: {
    source_distance: number;
    odor_lambda: number;
    reach_radius: number;
    antenna_lateral: number;
    azimuths_deg: number[];
  };
  trained: {
    per_azimuth: { azimuth_deg: number; reached: boolean; min_dist: number }[];
    aggregate: { success_rate: number; mean_min_dist: number };
  };
};

type Trajectories = {
  odor_field: { formula: string; lambda: number };
  episodes: ChemoEpisode[];
};

/** Read the real CH-A chemotaxis metrics + recorded trajectories (server-side). */
async function readData(): Promise<{ metrics: Metrics; trajectories: Trajectories }> {
  const base = join(process.cwd(), "public/cellular-gaits/data-ch");
  const [m, t] = await Promise.all([
    readFile(join(base, "chemotaxis_metrics.json"), "utf8"),
    readFile(join(base, "trajectories.json"), "utf8"),
  ]);
  return {
    metrics: JSON.parse(m.replace(/-?Infinity/g, "null").replace(/\bNaN\b/g, "null")) as Metrics,
    trajectories: JSON.parse(t) as Trajectories,
  };
}

export default async function ChemotaxisTabPage() {
  const { metrics, trajectories } = await readData();
  const { config, trained } = metrics;

  // The trained azimuths (0 / 90 / 270) — the headline result.
  const trainedSet = new Set(config.azimuths_deg.map((d) => Math.round(d)));
  const trainedEpisodes = trajectories.episodes.filter((e) => trainedSet.has(Math.round(e.azimuth_deg)));

  const byAz = (deg: number) =>
    trained.per_azimuth.find((a) => Math.round(a.azimuth_deg) === deg);
  const ahead = byAz(0);
  const left = byAz(90);
  const right = byAz(270);
  const reachedCount = trained.per_azimuth.filter((a) => a.reached).length;
  const total = trained.per_azimuth.length;

  return (
    <ConceptScaffold
      name="Chemotaxis"
      lead="Spend the closed loop on something alive: the fly forages up an odor gradient. It never measures where the source is — it only compares what its left and right antennae smell, and the steering falls out of that one asymmetry."
      explainerParts={PARTS}
      module={
        <div className="cg-chemo">
          {/* 1 — the headline: the live forager, antennae lighting up as it closes in */}
          <div>
            <p className="cg-sense-h">Smell it out — live, in your browser</p>
            <p className="cg-sense-p">
              The real closed loop: one live MuJoCo fly running the trained
              controller, and a top-down arena where you{" "}
              <strong>drag the food source</strong>. Each control step it reads
              the fly&apos;s pose from the sim, evaluates the odor field{" "}
              <code>C(p) = exp(−‖p − src‖ / λ)</code> at each antenna, and feeds
              the two readings in. Watch the two{" "}
              <strong>antennae light up</strong> — brighter the more odor each
              one catches — and the fly bias toward the stronger side and walk in
              to the source. Move the source anywhere and it re-aims. The turn
              isn&apos;t scripted; it falls out of the <code>cL − cR</code>{" "}
              difference. (The <em>why</em> is unpacked just below.)
            </p>
            <ChemotaxisDemo />
          </div>

          {/* 2 — the mechanism: cL − cR → turn, in a clean static field you can scrub */}
          <div>
            <p className="cg-sense-h">Why it turns: the cL − cR difference</p>
            <p className="cg-sense-p">
              The same idea, frozen so you can see the mechanism. A top-down odor
              field with the source at the centre of the bump; the fly samples
              concentration at two antennae,{" "}
              <strong>
                <code>cL</code>
              </strong>{" "}
              on the left and{" "}
              <strong>
                <code>cR</code>
              </strong>{" "}
              on the right, and the only thing that drives a turn is the
              difference <code>cL − cR</code>. Drag the source across the field,
              or grab the fly&apos;s nose to turn it, and watch the two readings
              and the implied turn flip.
            </p>
            <GradientField />
          </div>

          {/* 3 — the guaranteed headline result: recorded approaches both ways */}
          <div>
            <p className="cg-sense-h">It reaches the source — turning both ways</p>
            <p className="cg-sense-p">
              Two recorded rollouts of the trained fly: the source to its{" "}
              <strong>left</strong> and to its <strong>right</strong>. Same
              controller, opposite turns — and the turn is{" "}
              <strong>emergent</strong>, the controller&apos;s response to a
              left-vs-right antenna difference, never a hard-coded rule. Across the
              three trained directions — ahead ({ahead ? ahead.min_dist.toFixed(2) : "—"}),
              left ({left ? left.min_dist.toFixed(2) : "—"}), right (
              {right ? right.min_dist.toFixed(2) : "—"}) — it reaches the source on{" "}
              <strong>
                all {reachedCount} of {total}
              </strong>{" "}
              (closest-approach distance, world units).
            </p>
            <div
              className="cg-perturb-clips"
              role="group"
              aria-label="Recorded chemotaxis approaches with the source to the left and to the right"
            >
              <figure className="cg-perturb-clip">
                <video
                  src="/cellular-gaits/data-ch/approach_left.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Recorded rollout: source on the left, the fly turns left and walks to it"
                />
                <figcaption>
                  <span className="cg-gaitclip-k" style={{ color: "var(--green)" }}>
                    source left · 90°
                  </span>
                  <span className="cg-gaitclip-sub">turns left → reaches it</span>
                </figcaption>
              </figure>
              <figure className="cg-perturb-clip">
                <video
                  src="/cellular-gaits/data-ch/approach_right.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Recorded rollout: source on the right, the fly turns right and walks to it"
                />
                <figcaption>
                  <span className="cg-gaitclip-k" style={{ color: "var(--green)" }}>
                    source right · 270°
                  </span>
                  <span className="cg-gaitclip-sub">turns right → reaches it</span>
                </figcaption>
              </figure>
            </div>
          </div>

          {/* 4 — the top-down trajectory visual (real recorded paths) */}
          <div>
            <p className="cg-sense-h">Every path, top-down</p>
            <p className="cg-sense-p">
              The same three rollouts as a map: from one spawn, the fly&apos;s path
              curving to the source whether it&apos;s placed ahead, left, or right.
              The source is marked, the dashed ring is the{" "}
              {config.reach_radius.toFixed(0)}-unit reach radius, and the closest
              approach is annotated.
            </p>
            <ChemoTrajectories episodes={trainedEpisodes} lambda={trajectories.odor_field.lambda} />
          </div>
        </div>
      }
      explainer={{
        sense: (
          <p>
            <strong>A bilateral odor gradient.</strong> Two new sensor channels —
            the odor concentration at the <strong>left</strong> and{" "}
            <strong>right</strong> antenna — written back into the grid each
            control step, exactly the way proprioception is wired in the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/sensing`}>
              Sensing
            </a>{" "}
            tab (the controller grows to <code>8→16</code>: 4 state + 2
            proprioception + 2 chemo). Absolute concentration barely matters; the
            signal that carries direction is the <em>difference</em> between the
            two. This is <em>tropotaxis</em> — steering by a simultaneous left−right
            comparison across a paired sensor.
          </p>
        ),
        reward: (
          <p>
            <strong>Get closer to the source.</strong> Fitness rewards{" "}
            <em>closest approach</em> to the source over an episode (a documented
            deviation from a literal end-distance reward: the warm-started walker
            overshoots, so closest-approach is what cleanly scores how well it{" "}
            <em>steered</em>; arriving-and-stopping is future work). No term tells
            it <em>which way</em> to turn; that has to be discovered. (Don&apos;t
            read the fitness scalar against the other behaviors — it&apos;s a
            different objective.)
          </p>
        ),
        expectation: (
          <p>
            <strong>It reaches the source on all three trained directions,</strong>{" "}
            and steering is emergent. Warm-started from the closed-loop walker (so
            it still walks and stays robust), the 1236-param controller reaches the
            source placed ahead (0°, closest {ahead ? ahead.min_dist.toFixed(2) : "—"}),
            left (90°, {left ? left.min_dist.toFixed(2) : "—"}), and right (270°,{" "}
            {right ? right.min_dist.toFixed(2) : "—"}) — {reachedCount}/{total}.
            Nothing in the controller says &ldquo;turn toward the stronger
            antenna&rdquo;; that reflex falls out of <code>cL − cR</code> under
            selection. Two honest caveats: the antenna lateral baseline (
            {config.antenna_lateral.toFixed(1)} units) is{" "}
            <strong>deliberately wider than biological</strong> — it stands in for
            the temporal &ldquo;casting&rdquo; a real fly uses to amplify a weak
            instantaneous gradient — and only the symmetric{" "}
            <strong>ahead / left / right</strong> cases were trained:{" "}
            <strong>180° (behind)</strong> is out of scope (a ~180° U-turn inside
            the 3 s rollout) and stayed unreached.
          </p>
        ),
        connectome: (
          <p>
            Real insects navigate odor gradients with exactly this bilateral
            comparison — paired antennae in flies, the two antennal lobes,
            spatial sampling in walking <em>Drosophila</em>; larvae and ants do
            the analogous left−right trick by casting their heads. It is also the
            shape of Eon&apos;s embodied <strong>foraging</strong> demo, where a
            connectome-driven body chases a resource. It&apos;s a closed-loop rung
            on the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
              Embodied
            </a>{" "}
            ladder: a hand-built sensor front-end now, a real olfactory sub-circuit
            from the connectome later.
          </p>
        ),
      }}
    />
  );
}
