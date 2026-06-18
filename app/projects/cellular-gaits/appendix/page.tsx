import type { Metadata } from "next";
import { Math } from "@/components/cellular-gaits/Math";
import { BuildPlanDAG } from "@/components/cellular-gaits/BuildPlanDAG";
import { SystemDiagram } from "@/components/cellular-gaits/SystemDiagram";

export const metadata: Metadata = {
  title: "Appendix — Cellular Gaits",
  description:
    "The math: update rule, motor mapping, fitness, CMA-ES, and the criticality instruments — plus the living build plan.",
};

export default function AppendixTabPage() {
  return (
    <>
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
        <p className="cg-section-eyebrow">§ SYSTEM DESIGN</p>
        <p className="cg-section-lead">
          The whole system at a glance — two coupled loops. The{" "}
          <strong>runtime control loop</strong> (green, every 250 Hz step) runs
          the NCA controller through the motor mapping into the MuJoCo fly body;
          the dashed arc is proprioceptive feedback that is{" "}
          <strong>not yet wired</strong> — the controller walks open-loop today
          and closes the loop in Stage 2. The <strong>training loop</strong>{" "}
          (amber, every 3-second rollout) scores the body with the fitness
          function, hands it to CMA-ES, and feeds the evolved parameters θ back
          into the controller. Hover, tap, or focus any block to see the real
          model behind it.
        </p>
        <SystemDiagram />
      </section>

      <section className="cg-section">
        <p className="cg-section-eyebrow">§ ROADMAP · BUILD PLAN</p>
        <p className="cg-section-lead">
          Where this page is going. The current site is being turned into this
          tabbed technical reference, where each modeled choice — the body, the
          controller, sensing, the motor mapping, the objective, the optimizer —
          is its own interactive module, backed by the real fly physics compiled
          to WebAssembly. The graph below is the build plan: columns are time,
          boxes stacked in a column run in parallel. It is a living document,
          kept in sync with the project as it evolves.
        </p>
        <div className="cg-dag">
          <BuildPlanDAG />
        </div>
      </section>
    </>
  );
}
