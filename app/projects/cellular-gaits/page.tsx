import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import { CAPlayer } from "@/components/cellular-gaits/CAPlayer";
import { CriticalityPlayground } from "@/components/cellular-gaits/CriticalityPlayground";
import { Math } from "@/components/cellular-gaits/Math";
import { BuildPlanDAG } from "@/components/cellular-gaits/BuildPlanDAG";

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

        <section className="cg-section">
          <p className="cg-section-eyebrow">§ CRITICALITY · PLAYGROUND</p>
          <p className="cg-section-lead">
            The real evolved controller, running live in your browser. The{" "}
            <em>gain</em> knob scales how hard each cell drives its tanh — the
            one dial that moves the whole system between order and chaos. Watch
            two numbers: the <em>state-change rate</em> (how violently the grid
            churns) barely moves as you turn the knob, but the{" "}
            <em>Lyapunov exponent λ</em> (whether a tiny nudge grows or fades)
            flips from negative to positive as you cross the edge of chaos. The
            controller&apos;s own setting — <em>native, gain 1.0</em> — sits just
            on the ordered side: a strong, repeatable rhythm, not chaos. Push the
            gain past ~1.3 and the sensitivity map ignites.
          </p>
          <CriticalityPlayground />
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

          <h2 className="cg-h2">Order, chaos, and the edge between.</h2>
          <p>
            That result raised a sharper question, and it is the one the
            playground above lets you poke at. A system with a repeating
            internal rule can sit in one of two regimes. In the{" "}
            <em>ordered</em> regime, a tiny disturbance dies out: nudge it and
            the nudge fades, so the system always returns to the same behavior.
            Think of a still pond — drop a pebble and the ripples vanish almost
            at once. In the <em>chaotic</em> regime the opposite happens: the
            smallest disturbance is amplified until two near-identical starts
            end up completely different. Think of a stormy sea, where no two
            launches of the same boat ever trace the same path.
          </p>
          <p>
            Our controller, left to run on its own, settles into a{" "}
            <em>limit cycle</em> — a rhythm it repeats forever, like a heartbeat.
            A limit cycle is firmly on the ordered side: it is busy and
            repeating, but a small kick still fades and the rhythm recovers.
            That is exactly what you want for walking. A gait has to be a
            dependable, repeatable pattern (chaos would mean a different,
            unrepeatable stagger every step) — but it also has to be{" "}
            <em>responsive</em>, able to register a stumble and adjust. The most
            interesting place to be is the boundary itself, the{" "}
            <em>edge of chaos</em>: ripples here neither die instantly nor get
            scrambled, but persist just long enough to interact. The hypothesis
            going in was that good gaits live near that edge, but just inside the
            ordered side.
          </p>
          <p>
            To test it we added one dial, the <em>gain</em> — a single number
            that scales how hard every cell drives its internal nonlinearity.
            Turn it up and the whole grid is pushed from order toward chaos.
            Then we measured two things at each gain. The first is the{" "}
            <em>state-change rate</em>: how much the 256 numbers in the grid move
            from one tick to the next — a measure of how <em>busy</em> the grid
            looks. The second is the <em>Lyapunov exponent</em> (λ): we run a
            twin copy of the system started a hair away from the original, and
            measure whether that hair-thin gap grows or shrinks over time. λ
            below zero means gaps shrink (ordered); λ above zero means they grow
            (chaos); λ at zero is the edge.
          </p>
          <p>
            The finding is the punchline of the playground. As you sweep the
            gain from its native 1.0 upward, the state-change rate barely
            budges — it stays pinned near its maximum the whole way, because the
            controller is a saturated rhythm where nearly every cell slams
            between its extremes each tick. So &ldquo;how busy the grid
            looks&rdquo; tells you nothing about which regime you are in. Only λ
            moves: it is clearly negative at the native gain (a stable limit
            cycle, about −0.25), climbs through zero at a gain of roughly 1.3 —
            the edge of chaos — and goes positive beyond that, into genuine
            chaos. The evolved controller, at its own native setting, sits just
            on the ordered side of that edge. Evolution found the place the
            hypothesis predicted, without ever being told to look there.
          </p>
          <p>
            One honest caveat: everything above is measured on the
            controller&apos;s <em>intrinsic</em> dynamics, with the grid running
            open-loop and disconnected from the fly&apos;s body. We have{" "}
            <em>not</em> yet re-run the gain sweep through the MuJoCo physics, so
            we cannot yet say how walking quality changes as the controller is
            pushed toward the edge. Whether the fastest, most robust gaits really
            do cluster just inside the edge is the open question — and the first
            experiment of the next campaign is designed to answer it.
          </p>

          <h2 className="cg-h2">What&apos;s next.</h2>
          <p>
            Two threads. First, close the sensory loop: right now the grid never
            feels the legs it drives — it walks blind — so the next step feeds
            body state back into the cells. Second, run the gain sweep through
            physics to settle the criticality question above, then bring in
            MAP-Elites to discover an archive of behaviorally diverse gaits — not
            just the one fastest controller, but a gallery of distinct strategies
            the evolutionary process can find. Code lives on GitHub.
          </p>
        </section>

        <section className="cg-section">
          <p className="cg-section-eyebrow">§ THE MATH</p>
          <p className="cg-section-lead">
            Everything we hand-set or evolved, written out. Each rule is one
            equation and one plain-language line saying what it means. Nothing
            here is a magic number — every constant comes straight from the
            source.
          </p>

          <div className="cg-mathblock">
            <p className="cg-math-h3">1 · The update rule (evolved)</p>
            <p>
              For every cell <code>p</code> and its 3×3 Moore neighborhood
              (zero-padded at the grid border), the same tiny two-layer network
              runs everywhere. <code>g</code> is the gain — the playground&apos;s
              knob, normally 1.
            </p>
            <div className="cg-math-eq">
              <Math tex="a_o(p) = b^{1}_o + \sum_{i=1}^{4} \sum_{\Delta \in 3\times 3} W^{1}_{o,i,\Delta}\, s_i(p+\Delta)" />
            </div>
            <div className="cg-math-eq">
              <Math tex="h_o(p) = \tanh\!\big(g \cdot a_o(p)\big)" />
            </div>
            <div className="cg-math-eq">
              <Math tex="s'_c(p) = \operatorname{clip}\!\Big(b^{2}_c + \sum_{o=1}^{16} W^{2}_{c,o}\, h_o(p),\; -1,\; 1\Big)" />
            </div>
            <p className="cg-math-gloss">
              In words: gather a cell and its eight neighbors (
              <code>conv1</code>: 4 → 16 channels, 3×3, pad 1), squash through{" "}
              <code>tanh</code>, then mix back down to the new cell state (
              <code>conv2</code>: 16 → 4, 1×1) and clamp to{" "}
              <Math tex="[-1, 1]" display={false} />. The whole rule is{" "}
              <Math tex="16\cdot 4\cdot 9 + 16 + 4\cdot 16 + 4 = 660" display={false} />{" "}
              numbers — the vector CMA-ES evolves.
            </p>
          </div>

          <div className="cg-mathblock">
            <p className="cg-math-h3">2 · Motor mapping (hand-set)</p>
            <div className="cg-math-eq">
              <Math tex="u = \operatorname{vec}\big(s_0[0{:}7,\, 0{:}6]\big) \in [-1,1]^{42}, \qquad q^{*} = \operatorname{clip}(u, -1, 1)\cdot 3.14\ \text{rad}" />
            </div>
            <p className="cg-math-gloss">
              Channel 0 of the top-left 7×6 sub-grid, read row by row, gives 42
              numbers. Each becomes a joint target for one of FlyGym&apos;s 42
              position actuators (<code>kp = 50</code>). Control runs at{" "}
              <strong>250 Hz</strong> (<code>dt = 0.004 s</code>), with{" "}
              <strong>40</strong> physics steps at 10 kHz per control step and one
              CA tick per control step — so a 3-second rollout is{" "}
              <strong>750</strong> steps.
            </p>
          </div>

          <div className="cg-mathblock">
            <p className="cg-math-h3">3 · Fitness (hand-set objective)</p>
            <div className="cg-math-eq">
              <Math tex="F = \big(x^{\text{end}}_{\text{thorax}} - x^{\text{start}}_{\text{thorax}}\big) - 0.05\, N_{\text{below}}, \qquad z_{\text{thr}} = 0.5\, z_{\text{thorax}}" />
            </div>
            <p className="cg-math-gloss">
              Reward forward distance walked; subtract a small penalty for every
              control step the thorax sags below half its standing height (
              <Math tex="N_{\text{below}}" display={false} /> = number of such
              steps). Distance is measured after a short warm-up so it reflects
              control, not the initial settle.
            </p>
          </div>

          <div className="cg-mathblock">
            <p className="cg-math-h3">4 · Evolution (CMA-ES)</p>
            <div className="cg-math-eq">
              <Math tex="\theta^{*} = \arg\max_{\theta \in \mathbb{R}^{660}} F(\theta) \;\;\equiv\;\; \arg\min_{\theta}\, \big(-F(\theta)\big)" />
            </div>
            <p className="cg-math-gloss">
              Because the score comes from a contact-rich physics simulator it
              is not differentiable, so we cannot take gradients. CMA-ES only
              needs to <em>score</em> candidates: population <strong>32</strong>,
              initial step size{" "}
              <Math tex="\sigma_0 = 0.3" display={false} />, <strong>50</strong>{" "}
              generations. Best v1 reached{" "}
              <Math tex="F \approx 86.6\ \text{mm}" display={false} />.
            </p>
          </div>

          <div className="cg-mathblock">
            <p className="cg-math-h3">5 · The criticality instruments (this analysis)</p>
            <p>
              These were added to probe the controller — they are not part of
              evolving or running it. <code>g</code> is the gain from rule 1.
            </p>
            <div className="cg-math-eq">
              <Math tex="r(t) = \sqrt{\tfrac{1}{N} \sum_{k=1}^{N} \big(s_{t+1,k} - s_{t,k}\big)^2}, \qquad N = 256" />
            </div>
            <p className="cg-math-gloss">
              State-change rate: how far the whole grid moves in one tick (root
              mean square per cell). This is the number that stays pinned across
              the sweep.
            </p>
            <div className="cg-math-eq">
              <Math tex="\tilde{s}_0 = s_0 + \varepsilon\, e, \quad d_t = \lVert \tilde{s}_t - s_t \rVert, \quad \lambda \approx \tfrac{1}{T}\sum_{t} \ln\!\tfrac{d_t}{\varepsilon}" />
            </div>
            <div className="cg-math-eq">
              <Math tex="\tilde{s}_t \leftarrow s_t + \tfrac{\varepsilon}{d_t}\big(\tilde{s}_t - s_t\big), \qquad \varepsilon = 10^{-3}" />
            </div>
            <p className="cg-math-gloss">
              Poor-man&apos;s Lyapunov exponent: start a twin a hair{" "}
              <Math tex="\varepsilon" display={false} /> away, watch the gap{" "}
              <Math tex="d_t" display={false} /> each tick, average the log
              growth — then rescale the twin back to length{" "}
              <Math tex="\varepsilon" display={false} /> every tick so the gap
              stays in the linear regime (and discard the first ~12 ticks).{" "}
              <Math tex="\lambda < 0" display={false} /> ordered,{" "}
              <Math tex="\lambda \approx 0" display={false} /> edge,{" "}
              <Math tex="\lambda > 0" display={false} /> chaotic.
            </p>
          </div>
        </section>

        <section className="cg-section">
          <p className="cg-section-eyebrow">§ ROADMAP · BUILD PLAN</p>
          <p className="cg-section-lead">
            Where this page is going. The current site is a first pass; the
            redesign turns it into a tabbed technical reference where each
            modeled choice — the body, the controller, sensing, the motor
            mapping, the objective, the optimizer — is its own interactive
            module, backed by the real fly physics compiled to WebAssembly. The
            graph below is the build plan: columns are time, boxes stacked in a
            column run in parallel. It is a living document, kept in sync with
            the project as it evolves.
          </p>
          <div className="cg-dag">
            <BuildPlanDAG />
          </div>
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
