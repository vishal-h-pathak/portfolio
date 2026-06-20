import type { Metadata } from "next";
import { CG_BASE } from "@/components/cellular-gaits/tabs";
import { ClosedLoopDiagram } from "@/components/cellular-gaits/ClosedLoopDiagram";

export const metadata: Metadata = {
  title: "Behaviors — Cellular Gaits",
  description:
    "Goal-directed behavior needs a closed sensory loop. The behaviors that closing the proprioceptive loop unlocks — perturbation first, then chemotaxis, escape, navigation.",
};

/**
 * Behaviors hub. The shared premise (a closed sensory loop) up top, the
 * open→closed loop visual, then one card per behavior from the research
 * roadmap. Perturbation is the first one being built (C2-A trains it, C2-C wires
 * the live demo into /behaviors/perturbation); the rest are queued.
 */

type Behavior = {
  label: string;
  href?: string;
  status: "live" | "building" | "queued";
  sense: string;
  reward: string;
  why: string;
};

const BEHAVIORS: Behavior[] = [
  {
    label: "Perturbation / robustness",
    href: `${CG_BASE}/behaviors/perturbation`,
    status: "live",
    sense: "proprioception — joint angles + foot contacts",
    reward: "hold heading after a shove (course correction)",
    why: "the cleanest proof that feedback matters — a stark open-vs-closed A/B, and the cheapest to run.",
  },
  {
    label: "Chemotaxis / foraging",
    href: `${CG_BASE}/behaviors/chemotaxis`,
    status: "live",
    sense: "bilateral odor / taste gradient (L − R antenna)",
    reward: "reduce distance to / reach the source",
    why: "the most ‘alive’ story — emergent steering out of a sensor asymmetry; mirrors Eon's foraging.",
  },
  {
    label: "Escape response",
    href: `${CG_BASE}/behaviors/escape`,
    status: "building",
    sense: "looming detector — angular size + expansion, bilateral",
    reward: "react fast + flee in the correct direction",
    why: "maps onto a real, mapped circuit (LC4 / LPLC2 → the Giant Fiber) — the bridge to a real connectome.",
  },
  {
    label: "Obstacle navigation",
    status: "queued",
    sense: "short-range distance ‘feelers’ + goal bearing",
    reward: "reach the goal, penalize collisions",
    why: "fuses seek + avoid — the most robot-demo-compelling of the four.",
  },
];

export default function BehaviorsHubPage() {
  return (
    <>
      <section className="cg-section">
        <p className="cg-section-eyebrow">§ BEHAVIORS</p>
        <p className="cg-section-lead">
          Walking is solved — but it is solved <em>open-loop</em>, the same rhythm
          played every step regardless of the body. The next leap is{" "}
          <strong>goal-directed, sensorimotor</strong> behavior: the controller
          has to turn <em>what it senses</em> into <em>what it does</em>. That
          requires <strong>closing the sensory loop</strong> — the shared
          prerequisite for every behavior below.
        </p>
        <p className="cg-frame-p">
          A closed loop writes body state — joint angles, foot contacts — back
          into the grid each control step, so the rule can react to what is
          actually happening instead of replaying a fixed motor program. This is
          the dashed proprioceptive arc from the{" "}
          <a className="cg-inline-link" href={`${CG_BASE}/sensing`}>
            Sensing
          </a>{" "}
          tab and the{" "}
          <a className="cg-inline-link" href={`${CG_BASE}/appendix`}>
            system diagram
          </a>
          , finally going solid.
        </p>
      </section>

      <section className="cg-section">
        <p className="cg-section-eyebrow">§ OPEN LOOP → CLOSED LOOP</p>
        <p className="cg-section-lead">
          The same forward path, before and after. Hover, tap, or focus any block
          to read what it does; the difference between the two is the one arc on
          the right.
        </p>
        <ClosedLoopDiagram />
      </section>

      <section className="cg-section">
        <p className="cg-section-eyebrow">§ THE BEHAVIORS</p>
        <p className="cg-section-lead">
          Four behaviors, each a closed-loop demo: a new sense, a reward, and the
          fly learning to use one to earn the other. They are sequenced cheapest-
          and-most-diagnostic first.{" "}
          <strong>Perturbation</strong> and <strong>chemotaxis</strong> are live,{" "}
          <strong>escape</strong> is building (its connectome-bridge visual is up);
          navigation is queued.
        </p>
        <ul className="cg-beh-list">
          {BEHAVIORS.map((b) => {
            const inner = (
              <>
                <span className="cg-beh-head">
                  <span className="cg-beh-label">{b.label}</span>
                  <span className="cg-beh-status" data-status={b.status}>
                    {b.status === "live" ? "live" : b.status === "building" ? "live soon" : "queued"}
                  </span>
                </span>
                <span className="cg-beh-row">
                  <span className="cg-beh-k">sense</span>
                  <span className="cg-beh-v">{b.sense}</span>
                </span>
                <span className="cg-beh-row">
                  <span className="cg-beh-k">reward</span>
                  <span className="cg-beh-v">{b.reward}</span>
                </span>
                <span className="cg-beh-why">{b.why}</span>
              </>
            );
            return (
              <li key={b.label}>
                {b.href ? (
                  <a className="cg-beh-card" data-link="1" href={b.href}>
                    {inner}
                  </a>
                ) : (
                  <div className="cg-beh-card" aria-disabled="true">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="cg-section-appendix">
          The science ledger behind this sequence — every behavior, the escape
          circuit, the compute envelope — is the project&apos;s research roadmap;
          the math and build-plan DAG are in the{" "}
          <a className="cg-inline-link" href={`${CG_BASE}/appendix`}>
            appendix
          </a>
          .
        </p>
      </section>
    </>
  );
}
