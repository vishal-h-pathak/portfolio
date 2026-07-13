import type { Metadata } from "next";
import { CAPlayer } from "@/components/cellular-gaits/CAPlayer";
import { CG_BASE } from "@/components/cellular-gaits/tabs";
import { bySlug } from "@/content/projects";

const CG_NUM = bySlug("cellular-gaits")!.num;

/** The concept tabs, each as the one question it isolates. Reading order = nav order. */
const TAB_INDEX: { href: string; label: string; q: string }[] = [
  {
    href: `${CG_BASE}/body`,
    label: "Body",
    q: "the plant we drive — a FlyGym Drosophila, 42 leg actuators across ~87 joints, walking live.",
  },
  {
    href: `${CG_BASE}/controller`,
    label: "Controller",
    q: "a neural cellular automaton parked just inside the edge of chaos — and the gain→gait sweep that shows why.",
  },
  {
    href: `${CG_BASE}/sensing`,
    label: "Sensing & Loop",
    q: "open-loop by default (the rule never reads the body) vs. the closed proprioceptive loop that now recovers from a shove.",
  },
  {
    href: `${CG_BASE}/mapping`,
    label: "Mapping",
    q: "how 42 grid cells wire to 42 joint targets — a convenience, not biology.",
  },
  {
    href: `${CG_BASE}/optimizer`,
    label: "Search & Objective",
    q: "what fitness rewarded — forward distance, with a stability penalty that never fired — and the CMA-ES search that tuned 660 parameters from a stagger to a gait.",
  },
  {
    href: `${CG_BASE}/behaviors`,
    label: "Behaviors",
    q: "closed-loop sensorimotor behaviors — escape (the connectome bridge), perturbation, chemotaxis.",
  },
  {
    href: `${CG_BASE}/embodied`,
    label: "Embodied",
    q: "the real connectome in the loop: a looming threat → the Giant Fiber → an escape bolt.",
  },
  {
    href: `${CG_BASE}/appendix`,
    label: "Appendix",
    q: "the math — update rule, motor mapping, fitness, CMA-ES, and the criticality instruments.",
  },
];

export const metadata: Metadata = {
  title: "Cellular Gaits — Vishal Pathak",
  description:
    "Connectome → dynamics → behavior: a real FlyWire brain, run as a spiking network, drives a fly body from a looming threat to a Giant-Fiber spike to an escape — with an evolved cellular automaton as the null-model baseline.",
};

export default function CellularGaitsFramePage() {
  return (
    <>
      <section className="cg-hero">
        <p className="cg-eyebrow">{CG_NUM} · CELLULAR GAITS</p>
        <h1 className="cg-title">Cellular Gaits</h1>
        <p className="cg-pitch">
          A real fly connectome, run as a spiking brain, drives a real fly
          body — a looming threat becomes a Giant-Fiber spike becomes an escape
          bolt, closed through the physics. The evolved cellular automaton that
          walks that same body is the null-model rung this climbs from: the
          question throughout is whether structure, embodied, is enough to
          produce behavior.
        </p>
      </section>

      <section className="cg-section">
        <p className="cg-section-eyebrow">§ THE FRAME</p>
        <p className="cg-section-lead">
          Three layers sit between wiring and behavior:{" "}
          <strong>connectome → dynamics → behavior</strong>. A connectome is a
          static graph; what an animal does is the dynamics that graph runs and
          the body those dynamics move. The gap between them is the whole
          problem.
        </p>
        <p className="cg-frame-p">
          <strong>Structure under-determines behavior.</strong> The same
          circuit can sit in an ordered regime or a chaotic one; the same motor
          map can produce a clean gait or a stagger. Knowing every synapse does
          not hand you the walk — you still have to specify the dynamics, the
          sensing, the mapping from neural state to torque, the objective being
          met, and the process that tuned it.
        </p>
        <p className="cg-frame-p">
          <strong>The body is the testbed.</strong> Here that body is a real
          FlyGym <em>Drosophila</em> — 42 leg actuators, contact-rich physics —
          and the controller is a neural cellular automaton: a single local
          rule run on a grid, the canonical toy model of emergence-from-local-rules.
          Each tab isolates one modeling choice — the body, the controller, its
          sensing, the motor mapping, and the search and its objective — and asks
          what was chosen, why, what the alternatives were, and where the
          biological version sits. The math is in the{" "}
          <a className="cg-inline-link" href="/projects/cellular-gaits/appendix">
            appendix
          </a>
          .
        </p>
      </section>

      <section className="cg-section">
        <p className="cg-section-eyebrow">§ ORIENTATION</p>
        <p className="cg-section-lead">
          The best evolved rollout, with the cellular-automaton state alongside
          it. Scrub the video; the four-channel grid on the right tracks the
          simulation tick by tick. The amber outlines mark the 42 cells wired to
          leg actuators. This is the object every other tab takes apart.
        </p>
        <CAPlayer
          videoSrc="/cellular-gaits/best.mp4"
          jsonSrc="/cellular-gaits/ca_states_best.json"
        />
      </section>

      <section className="cg-section">
        <p className="cg-section-eyebrow">§ THE TABS</p>
        <p className="cg-section-lead">
          One modeling choice per tab. Each asks what was chosen, why, what the
          alternatives were, and where the biological version sits — then shows
          it running. All the math lives in the{" "}
          <a className="cg-inline-link" href={`${CG_BASE}/appendix`}>
            appendix
          </a>
          .
        </p>
        <ol className="cg-tab-index">
          {TAB_INDEX.map((t) => (
            <li key={t.href}>
              <a className="cg-tab-index-link" href={t.href}>
                <span className="cg-tab-index-label">{t.label}</span>
                <span className="cg-tab-index-q">{t.q}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
