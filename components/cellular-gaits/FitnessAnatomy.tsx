/**
 * <FitnessAnatomy> — what "good" was defined as, decomposed.
 *
 * The objective is one hand-set scalar: F = forward distance − 0.05·N_below.
 * This card pulls it apart into its two terms and ties each to a fly behavior,
 * with the champion's actual contribution beside it — so "good" is a number you
 * can read, not a vibe. It is honest about the part that didn't matter: the sag
 * penalty never fired (N_below = 0 across the whole run), so in practice F was
 * just distance walked.
 *
 * Server component — no client JS. Sits under the rendered F formula on the page.
 */

const GREEN = "#6FE39A";
const AMBER = "#E89B3D";

type Term = {
  sign: "+" | "−";
  tex: string;
  name: string;
  behavior: string;
  value: string;
  color: string;
  tag?: string;
};

const TERMS: Term[] = [
  {
    sign: "+",
    tex: "x^{end}_{thorax} − x^{start}_{thorax}",
    name: "Reward — forward distance",
    behavior: "“walk forward”: how far the thorax travels in the 3-second rollout (after a warm-up, so it scores control, not the initial settle).",
    value: "+86.6 mm",
    color: GREEN,
    tag: "this drove the whole search",
  },
  {
    sign: "−",
    tex: "0.05 · N_below",
    name: "Penalty — sag guardrail",
    behavior: "“don't collapse”: subtract 0.05 for every control step the thorax drops below half its standing height (a proxy for toppling or dragging).",
    value: "−0.00 mm",
    color: AMBER,
    tag: "never fired — N_below = 0 everywhere",
  },
];

export function FitnessAnatomy() {
  return (
    <div className="cg-opt-anatomy" role="table" aria-label="The objective, decomposed into its two terms">
      <p className="cg-opt-anatomy-h">the objective — one hand-set number, term by term</p>

      {TERMS.map((t) => (
        <div className="cg-opt-anatomy-row" role="row" key={t.name}>
          <span className="cg-opt-anatomy-sign" style={{ color: t.color }} aria-hidden="true">
            {t.sign}
          </span>
          <div className="cg-opt-anatomy-main">
            <div className="cg-opt-anatomy-name" style={{ color: t.color }}>
              {t.name}
            </div>
            <div className="cg-opt-anatomy-behavior">{t.behavior}</div>
          </div>
          <div className="cg-opt-anatomy-val">
            <div className="cg-opt-anatomy-num" style={{ color: t.color }}>
              {t.value}
            </div>
            <div className="cg-opt-anatomy-tag">{t.tag}</div>
          </div>
        </div>
      ))}

      <p className="cg-opt-anatomy-foot">
        At the champion: <strong>F = 86.6 − 0.00 = 86.6 mm</strong>. Because the
        penalty stayed silent, the search was really just maximizing distance
        walked. It&apos;s a <em>choice</em>, not a law — distance alone happened
        to select a working gait; energy, symmetry, or speed-matching would each
        have picked a different one.
      </p>
    </div>
  );
}

export default FitnessAnatomy;
