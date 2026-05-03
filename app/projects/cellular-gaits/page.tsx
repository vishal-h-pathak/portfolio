import type { Metadata } from "next";
import { CAPlayer } from "@/components/cellular-gaits/CAPlayer";

export const metadata: Metadata = {
  title: "Cellular Gaits — Vishal Pathak",
  description:
    "Evolved neural cellular automata as decentralized motor controllers for a simulated fruit fly.",
};

const GITHUB_URL = "https://github.com/vishal-h-pathak/cellular-gaits";

export default function CellularGaitsPage() {
  return (
    <>
      <header className="cg-topbar">
        <a href="/" className="cg-back" aria-label="Back to home">
          ← BACK
        </a>
        <span className="cg-topbar-brand">
          <span className="cg-topbar-brand-name">VISHAL PATHAK</span>
          <span className="cg-topbar-sep" aria-hidden="true">·</span>
          <span>BENCH · CG-01</span>
        </span>
      </header>

      <main className="cg-page">
        <section className="cg-hero">
          <p className="cg-eyebrow">B-05 · CELLULAR GAITS</p>
          <h1 className="cg-title">Cellular Gaits</h1>
          <p className="cg-pitch">
            Evolved neural cellular automata as decentralized motor controllers
            for a simulated fruit fly.
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
          <p className="cg-section-eyebrow">§ INTERACTIVE</p>
          <p className="cg-section-lead">
            The same rollout, with the cellular automaton state alongside it.
            Scrub the video; the four-channel state on the right tracks the
            simulation tick by tick. The amber outlines mark the 42 cells
            wired to leg actuators.
          </p>
          <CAPlayer
            videoSrc="/cellular-gaits/best.mp4"
            jsonSrc="/cellular-gaits/ca_states_best.json"
          />
        </section>

        <section className="cg-section cg-writeup">
          <p className="cg-section-eyebrow">§ WRITEUP</p>

          <h2 className="cg-h2">The idea.</h2>
          <p>
            Real insects do not have a centralized brain commanding each leg.
            Locomotion emerges from distributed neural circuits with mostly
            local interactions. This project asks whether a cellular
            automaton — the canonical toy model of local-rule-based
            emergence — can actually walk a fruit fly.
          </p>

          <h2 className="cg-h2">The setup.</h2>
          <p>
            A neural cellular automaton: 8×8 grid, 4-channel cell state, a
            single shared 2-layer MLP update rule (~660 parameters total).
            Forty-two cells — seven degrees of freedom across each of six
            legs — are tagged as motor cells; their first channel, rescaled
            to each joint&apos;s range, drives one of the 42 actuators on a
            Flygym-simulated <em>Drosophila</em>. One CA tick per control
            step.
          </p>

          <h2 className="cg-h2">Evolution, not backprop.</h2>
          <p>
            The fitness signal — forward distance walked in MuJoCo — is
            non-differentiable, so the CA&apos;s update rule is optimized
            with CMA-ES rather than gradient descent. Population 32, 50
            generations, 3-second rollouts, all on a MacBook Air&apos;s CPU.
          </p>

          <h2 className="cg-h2">The result.</h2>
          <p>
            The best individual walks at roughly 29 mm/s — within the range
            observed for real <em>Drosophila</em> on flat substrate — and
            stays upright for the full 3-second rollout. The video shows it;
            the visualization shows the CA state pulsing as it does.
          </p>

          <h2 className="cg-h2">The unplanned experiment.</h2>
          <p>
            A machine restart partway through forced an approximate resume
            from generation 35 with a smaller sigma. Counterintuitively, the
            resumed run outperformed the original trajectory by roughly
            forty percent (best fitness 62 → 87), which suggests the initial
            CMA-ES had prematurely converged. Real research is messy;
            sometimes the noise is the signal.
          </p>

          <h2 className="cg-h2">What&apos;s next.</h2>
          <p>
            v2 introduces MAP-Elites to discover an archive of behaviorally
            diverse gaits — not just the one fastest controller, but a
            gallery of distinct strategies the evolutionary process can
            find. Code lives on GitHub.
          </p>
        </section>

        <footer className="cg-footer">
          <span className="cg-footer-meta">
            CG-01 · BUILD: SOLO · CLAUDE · CPU · 3 EVENINGS
          </span>
          <span className="cg-footer-links">
            <a
              href={GITHUB_URL}
              target={GITHUB_URL.startsWith("http") ? "_blank" : undefined}
              rel={
                GITHUB_URL.startsWith("http") ? "noopener noreferrer" : undefined
              }
            >
              github
            </a>
            <span className="cg-topbar-sep" aria-hidden="true">·</span>
            <a href="/#bench">back to projects</a>
          </span>
        </footer>
      </main>
    </>
  );
}
