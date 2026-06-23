import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { EscapeCircuit } from "@/components/cellular-gaits/EscapeCircuit";
import { EscapeDemo, type EscapeConfig } from "@/components/cellular-gaits/EscapeDemo";
import {
  EscapeTrajectories,
  type EscapeEpisode,
} from "@/components/cellular-gaits/EscapeTrajectories";
import { CG_BASE } from "@/components/cellular-gaits/tabs";

export const metadata: Metadata = {
  title: "Escape — Cellular Gaits",
  description:
    "The connectome-aligned behavior: a looming threat read bilaterally, fled fast in the right direction. It maps onto the real Drosophila escape circuit (LC4 / LPLC2 → the Giant Fiber / DNp01) — and that circuit is now wired in, run as a spiking connectome in the embodied loop.",
};

const PARTS = [
  { key: "sense", label: "What it senses" },
  { key: "reward", label: "The reward" },
  { key: "expectation", label: "The result" },
  { key: "connectome", label: "Connectome link" },
];

type Metrics = {
  config: EscapeConfig;
  trained: {
    per_azimuth: {
      azimuth_deg: number;
      escaped: boolean;
      min_dist: number;
      reaction_latency_s: number | null;
      total_away_turn: number;
    }[];
    aggregate: {
      escape_success_rate: number;
      mean_min_dist: number;
      mean_reaction_latency_s: number;
    };
  };
  held_out: {
    aggregate: { escape_success_rate: number; mean_min_dist: number };
  };
};

type Trajectories = { episodes: EscapeEpisode[] };

/** Read the real X-A escape metrics + recorded trajectories (server-side). */
async function readData(): Promise<{ metrics: Metrics; trajectories: Trajectories }> {
  const base = join(process.cwd(), "public/cellular-gaits/data-x");
  const [m, t] = await Promise.all([
    readFile(join(base, "escape_metrics.json"), "utf8"),
    readFile(join(base, "trajectories.json"), "utf8"),
  ]);
  return {
    metrics: JSON.parse(m.replace(/-?Infinity/g, "null").replace(/\bNaN\b/g, "null")) as Metrics,
    trajectories: JSON.parse(t) as Trajectories,
  };
}

const ms = (s: number | null) => (s == null ? "—" : `${Math.round(s * 1000)} ms`);
const turn = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(2);

export default async function EscapeTabPage() {
  const { metrics, trajectories } = await readData();
  const { config, trained, held_out } = metrics;

  const byAz = (deg: number) => trained.per_azimuth.find((a) => Math.round(a.azimuth_deg) === deg);
  const front = byAz(0);
  const left = byAz(90);
  const right = byAz(270);
  const escapedCount = trained.per_azimuth.filter((a) => a.escaped).length;
  const total = trained.per_azimuth.length;
  const trainedRate = Math.round(trained.aggregate.escape_success_rate * total);
  const heldRate = Math.round(held_out.aggregate.escape_success_rate * 3);

  return (
    <ConceptScaffold
      name="Escape"
      lead="This is the bridge to the endgame — and the endgame is now built. A looming object is read bilaterally — angular size and expansion rate, left eye vs right — and the fly flees fast in the correct direction. The direction isn't hard-coded; it falls out of the left−right looming asymmetry. And unlike the other behaviors, escape maps onto a real, mapped circuit — which now runs in the loop: the real FlyWire LC4/LPLC2 → Giant Fiber wiring, a spiking connectome driving the body (the Embodied tab)."
      explainerParts={PARTS}
      module={
        <div className="cg-escape">
          {/* 1 — the key standalone visual: the connectome-bridge diagram */}
          <div>
            <p className="cg-sense-h">The real circuit — now in the loop</p>
            <p className="cg-sense-p">
              Escape is the behavior with the cleanest known wiring diagram,
              which is exactly why it&apos;s the natural bridge to the connectome
              endgame. The amber backbone is the <strong>real</strong> circuit:
              a looming object read by two visual projection neuron types —{" "}
              <strong>LC4</strong> (angular velocity) and <strong>LPLC2</strong>{" "}
              (angular size) — converging on the <strong>Giant Fiber / DNp01</strong>,
              which sums size and velocity and whose single-spike timing sets a
              short vs long takeoff. The green rail is <strong>our hand-built
              stand-in</strong> mapped onto it: two bilateral loom channels stand
              in for LC4 + LPLC2, the learned controller for the descending
              readout. That stand-in is now only half the story — the real{" "}
              <code>LC4/LPLC2 → DNp01</code> wiring has since been run as a
              spiking connectome in a closed loop, routing a looming cue to an
              embodied escape (the{" "}
              <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
                Embodied
              </a>{" "}
              tab). Hover, tap, or focus any part to read its role.
            </p>
            <EscapeCircuit />
            <p className="cg-sense-cap">
              Cites Ache et al. 2019 (<em>Current Biology</em> — Giant Fiber
              size/velocity encoding) and von Reyn et al. 2017 (single-spike
              timing → short/long takeoff). The dashed band is the seam where the
              real FlyWire <code>LC4/LPLC2 → DNp01</code> wiring is now wired in —
              run as a spiking connectome alongside the hand-built front-end.
            </p>
          </div>

          {/* 2 — the live launch-the-threat demo (X-C) */}
          <div>
            <p className="cg-sense-h">Launch the threat</p>
            <p className="cg-sense-p">
              The live, in-browser escape: a MuJoCo fly running the{" "}
              <strong>trained</strong> controller, and a looming threat you launch
              at it from any azimuth. Each control step the loop reads the fly&apos;s
              pose from the sim, evaluates the analytic looming front-end against the
              live pose, and feeds the two eye magnitudes in — the fly bolts, and the{" "}
              <em>direction</em> falls out of the <code>loom_L − loom_R</code>{" "}
              asymmetry, never a hard-coded rule.
            </p>
            <EscapeDemo config={config} />
          </div>

          {/* 3 — the guaranteed headline: recorded flee clips both ways */}
          <div>
            <p className="cg-sense-h">Same controller, opposite threats → opposite bolts</p>
            <p className="cg-sense-p">
              Two recorded rollouts of the trained fly: a threat from the{" "}
              <strong>left</strong> and from the <strong>right</strong>. Same
              controller, opposite turns — and the direction is{" "}
              <strong>emergent</strong>, the response to a left-vs-right looming
              difference, never a hard-coded rule. Left threat (90°) →{" "}
              <strong>bolts right</strong> (away-turn {left ? turn(left.total_away_turn) : "—"},{" "}
              {left ? ms(left.reaction_latency_s) : "—"}); right threat (270°) →{" "}
              <strong>bolts left</strong> (
              {right ? turn(right.total_away_turn) : "—"},{" "}
              {right ? ms(right.reaction_latency_s) : "—"}); head-on (0°) escapes by{" "}
              displacement ({front ? front.min_dist.toFixed(1) : "—"} units).
            </p>
            <div
              className="cg-perturb-clips"
              role="group"
              aria-label="Recorded escape flees with a threat from the left and from the right"
            >
              <figure className="cg-perturb-clip">
                <video
                  src="/cellular-gaits/data-x/flee_left.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Recorded rollout: a threat looms from the left, the fly bolts right"
                />
                <figcaption>
                  <span className="cg-gaitclip-k" style={{ color: "var(--green)" }}>
                    threat left · 90°
                  </span>
                  <span className="cg-gaitclip-sub">looms left → bolts right</span>
                </figcaption>
              </figure>
              <figure className="cg-perturb-clip">
                <video
                  src="/cellular-gaits/data-x/flee_right.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Recorded rollout: a threat looms from the right, the fly bolts left"
                />
                <figcaption>
                  <span className="cg-gaitclip-k" style={{ color: "var(--green)" }}>
                    threat right · 270°
                  </span>
                  <span className="cg-gaitclip-sub">looms right → bolts left</span>
                </figcaption>
              </figure>
            </div>
          </div>

          {/* 4 — the top-down trajectory map (real recorded paths) */}
          <div>
            <p className="cg-sense-h">Every escape, top-down — and it generalizes</p>
            <p className="cg-sense-p">
              The recorded rollouts as a map: each panel a fly bolting away from a
              threat streaking in toward its target-leading aim point. It survives on{" "}
              <strong>
                {escapedCount} of {total}
              </strong>{" "}
              trained azimuths (mean closest {trained.aggregate.mean_min_dist.toFixed(1)}{" "}
              units, mean reaction {ms(trained.aggregate.mean_reaction_latency_s)}) — and on
              the <strong>held-out</strong> diagonals {"{45°, 135°, 315°}"} it survives{" "}
              <strong>{heldRate}/3</strong> too. Survival generalizes beyond the panel it
              was selected on.
            </p>
            <EscapeTrajectories
              episodes={trajectories.episodes}
              trainedAzimuths={config.azimuths_deg}
            />
          </div>

          {/* 5 — honesty caveats, surfaced not buried */}
          <div className="cg-escape-caveats">
            <p className="cg-sense-h">Honest about what this is</p>
            <ul className="cg-escape-caveat-list">
              <li>
                <strong>The looming front-end here is hand-built.</strong> On
                this page the threat geometry → loom signal is an analytic
                stand-in for the real LC4/LPLC2 → DNp01 (Giant Fiber) circuit, and
                only the <em>response</em> is learned. The connectome swap itself
                is no longer the endgame — the real FlyWire wiring now runs as a
                spiking brain in the embodied loop (the{" "}
                <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
                  Embodied
                </a>{" "}
                tab); the two bilateral loom channels were the clean seam it
                dropped into.
              </li>
              <li>
                <strong>loom_input_gain = {config.loom_input_gain.toFixed(0)}.</strong>{" "}
                The [0,1] loom cue is amplified before conv1 — the bang-bang warm-start
                gait can&apos;t be moved by an unamplified cue (the escape analog of
                chemotaxis&apos;s deliberately strong antenna baseline). It is
                A/B-preserving: amplifying a zero loom is still zero, so with no threat
                the fly reproduces the closed-loop walking dynamics exactly.
              </li>
              <li>
                <strong>180° (behind) is omitted.</strong> A full U-turn won&apos;t
                fit the ~{(config.rollout_seconds ?? 1.2).toFixed(1)} s episode; the panel is{" "}
                {"{front, left, right}"} plus the held-out diagonals.
              </li>
              <li>
                <strong>The escape fitness scalar isn&apos;t comparable across
                behaviors.</strong> Its reward shaping is task-specific — don&apos;t
                read it against walking or chemotaxis.
              </li>
            </ul>
          </div>
        </div>
      }
      explainer={{
        sense: (
          <p>
            <strong>Bilateral looming.</strong> Two new sensor channels per eye —
            the object&apos;s <strong>angular size</strong> and its{" "}
            <strong>expansion rate</strong> — sampled for the{" "}
            <strong>left</strong> and <strong>right</strong> visual field and
            written into the grid each control step, the same way proprioception
            and the odor gradient are wired in the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/sensing`}>
              Sensing
            </a>{" "}
            tab. Size is an <em>LPLC2-like</em> channel (≈ Gaussian, peaking near
            collision); expansion is an <em>LC4-like</em> velocity channel
            (≈ linear). As with chemotaxis, the signal that carries{" "}
            <em>direction</em> is the left−right difference.
          </p>
        ),
        reward: (
          <p>
            <strong>React fast, flee the right way.</strong> Fitness rewards a
            quick, large escape <em>away</em> from the looming object — both the
            latency (how fast the takeoff fires once the object is close) and the
            correctness of the direction. No term tells it <em>which way</em> to
            go; that has to be discovered from the asymmetry. (This is a
            different objective from the other behaviors — don&apos;t read its
            fitness scalar against theirs.)
          </p>
        ),
        expectation: (
          <p>
            <strong>The direction of escape emerges from the L/R looming
            asymmetry.</strong>{" "}
            A threat looming from the left grows faster on the left eye; the same
            controller turns and flees <strong>right</strong> (away-turn{" "}
            {left ? turn(left.total_away_turn) : "—"}, {left ? ms(left.reaction_latency_s) : "—"}),
            and the mirror case flips — a right threat → flee{" "}
            <strong>left</strong> ({right ? turn(right.total_away_turn) : "—"},{" "}
            {right ? ms(right.reaction_latency_s) : "—"}) — with nothing in the
            controller saying &ldquo;flee away from the bigger side.&rdquo; It
            survives <strong>{trainedRate}/{total}</strong> trained azimuths and the{" "}
            <strong>{heldRate}/3</strong> held-out diagonals, exactly as steering
            emerged in{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/behaviors/chemotaxis`}>
              chemotaxis
            </a>
            . The live demo and the recorded map below are this result, in your
            browser.
          </p>
        ),
        connectome: (
          <p>
            This is the behavior that <strong>maps onto a real, mapped
            circuit</strong>. A looming object is detected by two lobula
            columnar projection neuron types — <strong>LC4</strong> (angular
            velocity) and <strong>LPLC2</strong> (angular size) — that converge
            on the <strong>Giant Fiber</strong> descending neuron
            (<strong>DNp01</strong>): ~55 LC4 + ~108 LPLC2 synapses onto its
            lateral dendrite, summing size + velocity, the timing of a single
            spike setting a short vs long takeoff (Ache et al. 2019; von Reyn et
            al. 2017). That circuit is now in the loop: the <em>actual</em>{" "}
            FlyWire <code>LC4/LPLC2 → DNp01</code> wiring has been run as a
            spiking connectome that routes a looming cue to an embodied escape —
            a concrete sub-circuit far smaller than the whole brain, the most
            tractable &ldquo;a real connectome drives the body&rdquo; demo,
            walked out on the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
              Embodied
            </a>{" "}
            tab. The honest line: this shows the connectome routing the cue, not
            a calibrated escape threshold — in isolation the Giant Fiber
            saturates. The diagram above marks the seam where it wired in.
          </p>
        ),
      }}
    />
  );
}
