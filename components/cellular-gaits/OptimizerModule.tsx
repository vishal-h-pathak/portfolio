import evolution from "@/public/cellular-gaits/data/evolution.json";
import { ToyCmaEs } from "@/components/cellular-gaits/ToyCmaEs";

/**
 * Optimizer tab interactive module. Two pieces:
 *
 *   1. <ToyCmaEs/> — a live, in-browser toy: the real CMA-ES algorithm on a 2-D
 *      Rosenbrock valley, to build intuition for the mechanism. Clearly a toy.
 *   2. <EvolutionCurve/> — the REAL fly run, rendered statically from the
 *      precomputed `public/cellular-gaits/data/evolution.json`. No live fitness
 *      recompute (that needs real MuJoCo rollouts). The original→resumed phase
 *      split — the machine-restart that warm-started from the gen-35 checkpoint
 *      and beat a prematurely-converged ~62 mm up to 86.6 mm — is annotated.
 *
 * This file is a server component; only the toy ships JS.
 */

type Point = {
  step: number;
  gen: number;
  best: number;
  mean: number;
  std: number;
  phase: "original" | "resumed";
};

const curve = evolution.curve as Point[];
const meta = evolution.meta;

// ── chart geometry ──────────────────────────────────────────────────────────
const VW = 760;
const VH = 380;
const ML = 52;
const MR = 18;
const MT = 26;
const MB = 44;
const PW = VW - ML - MR;
const PH = VH - MT - MB;

const STEP_MAX = meta.phases.resumed.step_end; // 52
const Y_MIN = -40;
const Y_MAX = 92;
// boundary between original (…37) and resumed (38…)
const SPLIT = (meta.phases.original.step_end + meta.phases.resumed.step_start) / 2; // 37.5

const sx = (step: number) => ML + (step / STEP_MAX) * PW;
const sy = (val: number) => MT + (1 - (val - Y_MIN) / (Y_MAX - Y_MIN)) * PH;

const line = (key: keyof Point) =>
  curve.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.step).toFixed(1)} ${sy(p[key] as number).toFixed(1)}`).join(" ");

// ±σ band: upper forward, lower back
const band = (() => {
  const up = curve.map((p) => `${sx(p.step).toFixed(1)} ${sy(p.mean + p.std).toFixed(1)}`);
  const lo = curve
    .slice()
    .reverse()
    .map((p) => `${sx(p.step).toFixed(1)} ${sy(p.mean - p.std).toFixed(1)}`);
  return `M${up.join(" L")} L${lo.join(" L")} Z`;
})();

const Y_TICKS = [-40, 0, 40, 80];
const X_TICKS = [0, 10, 20, 30, 40, 50];

// key annotated points
const overallBest = curve.find((p) => p.best === meta.best_fit_overall)!; // step 40
const stallPoint = curve.find((p) => p.step === meta.phases.original.step_end)!; // step 37
const GREEN = "#6FE39A";
const AMBER = "#E89B3D";
const SUB = "#8C8B83";

function EvolutionCurve() {
  return (
    <div className="cg-opt-curve">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        role="img"
        aria-labelledby="evo-title evo-desc"
        style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
      >
        <title id="evo-title">Real CMA-ES evolution curve over 53 generations</title>
        <desc id="evo-desc">
          Best, mean, and ±one-standard-deviation fitness of the population across
          the real fly optimization. The first run (steps 0 to 37) climbs from
          zero and stalls around 62 millimetres. A machine restart warm-started
          from the generation-35 checkpoint (steps 38 onward, shaded) and reached
          a new overall best of 86.6 millimetres at step 40, showing the first run
          had prematurely converged. These are precomputed MuJoCo numbers, not a
          live run.
        </desc>

        {/* resumed-phase background */}
        <rect
          x={sx(SPLIT)}
          y={MT}
          width={sx(STEP_MAX) - sx(SPLIT)}
          height={PH}
          fill="rgba(232,155,61,0.055)"
        />

        {/* gridlines + y ticks */}
        {Y_TICKS.map((t) => (
          <g key={`y${t}`}>
            <line x1={ML} y1={sy(t)} x2={ML + PW} y2={sy(t)} stroke="rgba(232,230,223,0.07)" strokeWidth={1} />
            <text x={ML - 8} y={sy(t) + 3.5} textAnchor="end" fontSize={10.5} fill={SUB}>
              {t}
            </text>
          </g>
        ))}
        {/* zero emphasis */}
        <line x1={ML} y1={sy(0)} x2={ML + PW} y2={sy(0)} stroke="rgba(232,230,223,0.16)" strokeWidth={1} />

        {/* x ticks */}
        {X_TICKS.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={MT + PH + 18} textAnchor="middle" fontSize={10.5} fill={SUB}>
            {t}
          </text>
        ))}
        <text x={ML + PW / 2} y={VH - 6} textAnchor="middle" fontSize={10.5} fill={SUB}>
          generation step
        </text>
        <text
          x={14}
          y={MT + PH / 2}
          textAnchor="middle"
          fontSize={10.5}
          fill={SUB}
          transform={`rotate(-90 14 ${MT + PH / 2})`}
        >
          fitness · mm forward
        </text>

        {/* ±σ band + mean + best */}
        <path d={band} fill="rgba(140,139,131,0.13)" stroke="none" />
        <path d={line("mean")} fill="none" stroke={SUB} strokeWidth={1.4} />
        <path d={line("best")} fill="none" stroke={GREEN} strokeWidth={1.8} />

        {/* phase split */}
        <line
          x1={sx(SPLIT)}
          y1={MT - 2}
          x2={sx(SPLIT)}
          y2={MT + PH}
          stroke="rgba(232,155,61,0.55)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text x={sx(SPLIT) - 8} y={MT + 8} textAnchor="end" fontSize={10} fill={SUB} letterSpacing="0.06em">
          ORIGINAL
        </text>
        <text x={sx(SPLIT) + 8} y={MT + 8} textAnchor="start" fontSize={10} fill={AMBER} letterSpacing="0.06em">
          RESUMED
        </text>
        {/* Warm-start note parked in the open upper-left strip (the best curve is
            still climbing low here); the ← points back to the gen-35 checkpoint,
            which sits in the original phase before the split. */}
        <text x={sx(SPLIT) - 8} y={MT + 24} textAnchor="end" fontSize={9.5} fill={SUB}>
          warm-start ← gen-35 checkpoint
        </text>

        {/* stall annotation — label lifted well clear of the stalled plateau */}
        <circle cx={sx(stallPoint.step)} cy={sy(stallPoint.best)} r={3} fill="none" stroke={SUB} strokeWidth={1.2} />
        <text x={sx(stallPoint.step) - 6} y={sy(stallPoint.best) - 22} textAnchor="end" fontSize={9.5} fill={SUB}>
          first run stalls ≈ 62
        </text>

        {/* overall best annotation — leader drops from the peak dot into the open
            gap between the best plateau and the mean curve, where the label is
            clear of both lines. */}
        <circle cx={sx(overallBest.step)} cy={sy(overallBest.best)} r={3.5} fill={GREEN} />
        <line
          x1={sx(overallBest.step)}
          y1={sy(overallBest.best) + 5}
          x2={sx(overallBest.step)}
          y2={sy(58)}
          stroke="rgba(111,227,154,0.4)"
          strokeWidth={1}
        />
        <text x={sx(overallBest.step) + 7} y={sy(58) + 4} textAnchor="start" fontSize={10} fill={GREEN}>
          86.6 mm — new best overall
        </text>

        {/* legend */}
        <g fontSize={10.5}>
          <line x1={ML + 4} y1={MT + 6} x2={ML + 26} y2={MT + 6} stroke={GREEN} strokeWidth={1.8} />
          <text x={ML + 31} y={MT + 9.5} fill={SUB}>best</text>
          <line x1={ML + 74} y1={MT + 6} x2={ML + 96} y2={MT + 6} stroke={SUB} strokeWidth={1.4} />
          <text x={ML + 101} y={MT + 9.5} fill={SUB}>mean</text>
          <rect x={ML + 150} y={MT} width={22} height={11} fill="rgba(140,139,131,0.22)" />
          <text x={ML + 177} y={MT + 9.5} fill={SUB}>±σ</text>
        </g>
      </svg>

      <p className="cg-opt-cap">
        Real MuJoCo run · 660 params · pop 32 · σ₀ 0.3. The x-axis is{" "}
        <em>step</em>; the resumed phase re-uses generation numbers (it forked
        from the gen-35 checkpoint), so step keeps them in order. Fitness ={" "}
        forward distance − 0.05·n<sub>below</sub>. Precomputed — no live rollout.
      </p>

      <p className="cg-opt-flynote">
        What this is, on the fly: each step is one generation of 32 candidate
        controllers, each scored by a full MuJoCo rollout. The best curve climbing
        0 → 86.6 mm <em>is</em> the walk getting better — gen-0 champions twitch and
        topple, late ones walk the clean ~29 mm/s gait. The recorded gaits on the{" "}
        <a className="cg-inline-link" href="/projects/cellular-gaits/controller">
          Controller tab
        </a>{" "}
        show that final walk. What&apos;s missing is side-by-side clips of an early
        vs. mid vs. late generation — <strong>a compute follow-up</strong>
        (re-render the gen-0 / gen-20 / gen-50 champions from their checkpoints),
        flagged here rather than faked.
      </p>
    </div>
  );
}

export function OptimizerModule() {
  return (
    <div className="cg-opt">
      <div className="cg-opt-block">
        <p className="cg-opt-h">
          Toy CMA-ES <em className="cg-opt-live">· live · illustrative</em>
        </p>
        <p className="cg-opt-sub">
          A 2-D stand-in for the 660-D fly search, so you can actually watch the
          mechanism the fly run uses. The fly&apos;s landscape can&apos;t run in a
          browser; this toy one can.
        </p>
        <ToyCmaEs />
      </div>

      <div className="cg-opt-block">
        <p className="cg-opt-h">
          The real run <em>· precomputed · 50 generations</em>
        </p>
        <EvolutionCurve />
      </div>
    </div>
  );
}
