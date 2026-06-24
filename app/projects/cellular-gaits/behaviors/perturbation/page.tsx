import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { SensorChannels } from "@/components/cellular-gaits/SensorChannels";
import { HeadingError } from "@/components/cellular-gaits/HeadingError";
import { PerturbationDemo } from "@/components/cellular-gaits/PerturbationDemo";
import { CG_BASE } from "@/components/cellular-gaits/tabs";

export const metadata: Metadata = {
  title: "Perturbation — Cellular Gaits",
  description:
    "The first closed-loop behavior: shove the fly mid-stride and watch the controller that feels its own body steer back on course where the open-loop one walks off crooked.",
};

const PARTS = [
  { key: "sense", label: "What it senses" },
  { key: "reward", label: "The reward" },
  { key: "expectation", label: "The result" },
  { key: "connectome", label: "Connectome link" },
];

type SeedMetrics = {
  heading_error_deg: number;
  post_shove_dx: number;
  forward_dx: number;
  /** present on the aggregate open_loop / closed_loop blocks (0–1). */
  stayed_upright_rate?: number;
};
type Robustness = {
  config: { pert_magnitude: number };
  open_loop: SeedMetrics;
  closed_loop: SeedMetrics;
  per_seed: { seed: number; open: SeedMetrics; closed: SeedMetrics }[];
};

/**
 * Read the real C2-A robustness metrics. The exported JSON contains bare
 * `Infinity` (a non-recovered seed's recovery_time) which JSON.parse rejects, so
 * we sanitize it to null before parsing — none of the fields we read use it.
 */
async function readMetrics(): Promise<Robustness> {
  const path = join(process.cwd(), "public/cellular-gaits/data-c2/robustness_metrics.json");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw.replace(/-?Infinity/g, "null").replace(/\bNaN\b/g, "null")) as Robustness;
}

const HEADLINE_SEED = 202;

export default async function PerturbationTabPage() {
  const metrics = await readMetrics();
  const openDeg = metrics.open_loop.heading_error_deg;
  const closedDeg = metrics.closed_loop.heading_error_deg;
  const headline = metrics.per_seed.find((s) => s.seed === HEADLINE_SEED);
  const seedOpenDeg = headline?.open.heading_error_deg ?? 97;
  const seedClosedDeg = headline?.closed.heading_error_deg ?? 19;
  const openPostDx = metrics.open_loop.post_shove_dx;
  const closedPostDx = metrics.closed_loop.post_shove_dx;
  const openUpright = metrics.open_loop.stayed_upright_rate ?? 1;
  const closedUpright = metrics.closed_loop.stayed_upright_rate ?? 1;
  const mag = metrics.config.pert_magnitude;

  return (
    <ConceptScaffold
      name="Perturbation"
      lead="Robustness, the first closed-loop behavior: shove the fly mid-stride and watch a controller that feels its own body steer back on course where an open-loop one walks off crooked."
      explainerParts={PARTS}
      module={
        <div className="cg-perturb">
          {/* 1 — the guaranteed headline: same shove, both controllers (recorded) */}
          <div>
            <p className="cg-sense-h">Same shove, both controllers</p>
            <p className="cg-sense-p">
              One calibrated lateral shove (magnitude {mag.toFixed(0)}), fired
              mid-stride at the identical moment on both controllers. The
              open-loop v1 fly takes the hit and keeps walking its fixed rhythm —
              now pointed the wrong way. The closed-loop fly feels the
              disturbance in its own joint angles and foot contacts and steers
              back toward its original heading.
            </p>
            <div className="cg-perturb-clips" role="group" aria-label="Recorded open-loop and closed-loop rollouts under the same shove">
              <figure className="cg-perturb-clip">
                <video
                  src="/cellular-gaits/data-c2/perturbation_openloop.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Recorded open-loop rollout: the fly is shoved and walks off course"
                />
                <figcaption>
                  <span className="cg-gaitclip-k" style={{ color: "var(--amber)" }}>
                    open loop · v1
                  </span>
                  <span className="cg-gaitclip-sub">shoved → walks off course</span>
                </figcaption>
              </figure>
              <figure className="cg-perturb-clip">
                <video
                  src="/cellular-gaits/data-c2/perturbation_closedloop.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Recorded closed-loop rollout: the fly is shoved and steers back on course"
                />
                <figcaption>
                  <span className="cg-gaitclip-k" style={{ color: "var(--green)" }}>
                    closed loop
                  </span>
                  <span className="cg-gaitclip-sub">shoved → steers back</span>
                </figcaption>
              </figure>
            </div>
          </div>

          {/* 2 — the standalone result visual + the explicit objective scorecard */}
          <div>
            <p className="cg-sense-h">How well does it hold course?</p>
            <p className="cg-sense-p">
              There&apos;s no destination here. <strong>On course</strong> just
              means the heading the fly was already walking before it got
              shoved — the task is <strong>heading retention</strong> (keep
              going the same way), not reaching a place. So &ldquo;how well is it
              doing&rdquo; is the gap between where it ends up pointed and that
              original line. The scorecard below makes that explicit: it grades
              both controllers on the three things the reward actually rewards —{" "}
              <strong>hold your heading</strong>,{" "}
              <strong>stay upright</strong>, and keep making forward progress.
            </p>
            <HeadingError
              openDeg={openDeg}
              closedDeg={closedDeg}
              seedOpenDeg={seedOpenDeg}
              seedClosedDeg={seedClosedDeg}
              seed={HEADLINE_SEED}
              openUpright={openUpright}
              closedUpright={closedUpright}
              openPostDx={openPostDx}
              closedPostDx={closedPostDx}
            />
          </div>

          {/* 3 — the live, in-browser closed loop you can shove */}
          <div>
            <p className="cg-sense-h">Shove it yourself</p>
            <p className="cg-sense-p">
              The real closed loop, in your browser: one live MuJoCo fly, a
              toggle between the two controllers, and a shove button. The
              closed-loop controller reads <strong>42 joint angles + 6 foot
              contacts</strong> back out of the live sim every control step — no
              recording. Toggle to v1 and shove again to feel the difference.
            </p>
            <PerturbationDemo />
          </div>

          {/* 4 — what proprioception actually feeds in (and where it comes from) */}
          <div className="cg-perturb-vis">
            <p className="cg-sense-h">What proprioception feeds in</p>
            <p className="cg-sense-p">
              The new sense this behavior adds, exactly as the trained controller
              uses it: <strong>42 joint angles</strong> on the motor block and{" "}
              <strong>6 foot contacts</strong> on the bottom row, two extra input
              channels written fresh from the body each step. Both come straight
              out of the physics engine, not from a sensor model bolted on top:
            </p>
            <p className="cg-sense-p">
              The <strong>joint angles</strong> are MuJoCo&apos;s{" "}
              <code>actuator_length</code> — the current length of each of the 42
              leg actuators, which <em>is</em> the joint angle the motor spans —
              read out of the live sim each control step (
              <code>sim.actuatorLengths()</code>) and normalized{" "}
              <code>θ/3.14</code> so it lands in roughly <code>[−1, 1]</code>.
              The <strong>foot contacts</strong> are a boolean per leg from the
              sim&apos;s contact detection (<code>sim.footContacts()</code>):{" "}
              <code>1</code> when that leg&apos;s tarsus is touching the ground,{" "}
              <code>0</code> when it&apos;s in swing. So a shove changes the
              numbers the controller sees the instant it lands a leg wrong or
              twists a joint — that&apos;s the signal it steers on.
            </p>
            <SensorChannels />
          </div>
        </div>
      }
      explainer={{
        sense: (
          <p>
            <strong>Proprioception.</strong> The 42 actuated joint angles
            (normalized <code>θ/3.14</code>) laid topographically onto the motor
            block, plus 6 per-leg foot contacts on the bottom row — two extra{" "}
            <code>conv1</code> input channels written back into the{" "}
            <code>8×8</code> grid each control step. With them zeroed the rule is
            a plain open-loop NCA; closing the loop is this behavior&apos;s whole
            addition. See how it routes in the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/sensing`}>
              Sensing
            </a>{" "}
            tab.
          </p>
        ),
        reward: (
          <p>
            <strong>Hold heading through a shove.</strong> A lateral impulse hits
            mid-stride; fitness rewards keeping the thorax up and the heading
            steady through the disturbance and back to a stable gait, averaged
            over many shoves — not raw forward distance. (The closed-loop fitness
            scalar isn&apos;t comparable to v1&apos;s — it&apos;s a different
            objective; the fair comparison is the open-vs-closed table below.)
          </p>
        ),
        expectation: (
          <p>
            <strong>Course correction.</strong> After a magnitude-{mag.toFixed(0)}{" "}
            shove the open loop ends a mean <strong>{openDeg.toFixed(1)}°</strong>{" "}
            off heading; the closed loop holds to{" "}
            <strong>{closedDeg.toFixed(1)}°</strong> — roughly half the error —
            while making <em>more</em> forward progress ({closedPostDx.toFixed(1)}{" "}
            vs {openPostDx.toFixed(1)} mm post-shove). On the headline single
            shove, open ends {seedOpenDeg.toFixed(0)}° off, closed holds{" "}
            {seedClosedDeg.toFixed(0)}°.{" "}
            <strong>
              At this magnitude neither fly falls (both 100% upright)
            </strong>{" "}
            — so this is disturbance rejection / staying on course, not catching
            a fall. Fall-recovery would need a harsher regime or uneven ground
            (future work).
          </p>
        ),
        connectome: (
          <p>
            Real flies are <strong>saturated with proprioceptors</strong> —
            campaniform sensilla (cuticular strain), hair plates (joint
            position), chordotonal organs (stretch and vibration) — streaming
            continuous body state into the VNC. Robust walking leans on exactly
            this feedback. It&apos;s the closed-loop rung on the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
              Embodied
            </a>{" "}
            ladder, between the null model and the real connectome.
          </p>
        ),
      }}
    />
  );
}
