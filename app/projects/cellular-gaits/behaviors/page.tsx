import type { Metadata } from "next";
import { CG_BASE } from "@/components/cellular-gaits/tabs";
import { BehaviorMap } from "@/components/cellular-gaits/ClosedLoopDiagram";

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
  status: "live" | "building" | "exploratory" | "queued";
  sense: string;
  reward: string;
  why: string;
};

const BEHAVIORS: Behavior[] = [
  {
    label: "Escape response",
    href: `${CG_BASE}/behaviors/escape`,
    status: "live",
    sense: "looming detector — angular size + expansion, bilateral",
    reward: "react fast + flee in the correct direction",
    why: "the connectome bridge — maps onto a real, mapped circuit (LC4 / LPLC2 → the Giant Fiber), and that circuit is now wired into the embodied loop → Embodied.",
  },
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
    label: "Obstacle navigation",
    href: `${CG_BASE}/behaviors/navigation`,
    status: "exploratory",
    sense: "short-range distance ‘feelers’ + goal bearing",
    reward: "reach the goal, penalize collisions",
    why: "fuses seek + avoid — the most robot-demo-compelling of the four, and the one honest about having no clean real-circuit seam.",
  },
];

export default function BehaviorsHubPage() {
  return (
    <>
      <section className="cg-section">
        <p className="cg-section-eyebrow">§ BEHAVIORS</p>
        <p className="cg-section-lead">
          Walking is solved — but it is solved <em>open-loop</em>, the same rhythm
          played every step regardless of the body.{" "}
          <strong>Goal-directed, sensorimotor</strong> behavior needs more: the
          controller has to turn <em>what it senses</em> into <em>what it does</em>.
          That means <strong>closing the sensory loop</strong> — the shared
          prerequisite, now done, for every behavior below.
        </p>
        <p className="cg-frame-p">
          A closed loop writes body state — joint angles, foot contacts — back
          into the grid each control step, so the rule can react to what is
          actually happening instead of replaying a fixed motor program. That is
          the closed proprioceptive loop established on the{" "}
          <a className="cg-inline-link" href={`${CG_BASE}/sensing`}>
            Sensing
          </a>{" "}
          tab and in the{" "}
          <a className="cg-inline-link" href={`${CG_BASE}/appendix`}>
            system diagram
          </a>
          — now solid and live. Each behavior below builds on it.
        </p>
      </section>

      <section className="cg-section">
        <p className="cg-section-eyebrow">§ HOW THEY CONNECT</p>
        <p className="cg-section-lead">
          Not four separate projects — one closed loop with four payoffs. Each
          behavior is that same loop plus <em>one new sense</em> and a reward.{" "}
          <strong>Escape</strong> is the bridge: it maps onto a real, mapped
          circuit and plugs into the connectome brain on the{" "}
          <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
            Embodied
          </a>{" "}
          page.
        </p>
        <BehaviorMap />
      </section>

      <section className="cg-section">
        <p className="cg-section-eyebrow">§ THE BEHAVIORS</p>
        <p className="cg-section-lead">
          Four behaviors, each a closed-loop demo: a new sense, a reward, and the
          fly learning to use one to earn the other. <strong>Escape</strong>{" "}
          leads — it&apos;s the one that maps onto a real, mapped circuit, and
          that circuit is now wired into the embodied loop (the{" "}
          <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
            Embodied
          </a>{" "}
          tab). <strong>Perturbation</strong> and{" "}
          <strong>chemotaxis</strong> are the other live ones; navigation — the
          seek-plus-avoid synthesis, and the one behavior without a clean
          real-circuit seam — is exploratory.
        </p>
        <ul className="cg-beh-list">
          {BEHAVIORS.map((b) => {
            const inner = (
              <>
                <span className="cg-beh-head">
                  <span className="cg-beh-label">{b.label}</span>
                  <span className="cg-beh-status" data-status={b.status}>
                    {b.status === "live"
                      ? "live"
                      : b.status === "building"
                        ? "live soon"
                        : b.status === "exploratory"
                          ? "exploratory"
                          : "queued"}
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
          the math is in the{" "}
          <a className="cg-inline-link" href={`${CG_BASE}/appendix`}>
            appendix
          </a>
          .
        </p>
      </section>
    </>
  );
}
