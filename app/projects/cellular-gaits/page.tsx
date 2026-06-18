import type { Metadata } from "next";
import { CAPlayer } from "@/components/cellular-gaits/CAPlayer";

export const metadata: Metadata = {
  title: "Cellular Gaits — Vishal Pathak",
  description:
    "Connectome → dynamics → behavior: a fruit fly body as a testbed for whether local structure produces locomotion.",
};

export default function CellularGaitsFramePage() {
  return (
    <>
      <section className="cg-hero">
        <p className="cg-eyebrow">B-05 · CELLULAR GAITS</p>
        <h1 className="cg-title">Cellular Gaits</h1>
        <p className="cg-pitch">
          A decentralized controller drives a simulated <em>Drosophila</em>.
          The question underneath: how much of behavior is fixed by structure?
        </p>
        <div className="cg-hero-video">
          <video
            src="/cellular-gaits/best.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label="Best evolved fly walking — 3-second rollout, looping"
          />
        </div>
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
          sensing, the motor mapping, the objective, the optimizer — and asks
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
    </>
  );
}
