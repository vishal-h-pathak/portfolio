import evolution from "@/public/cellular-gaits/data/evolution.json";

/**
 * <EvolutionClimb> — the honest centerpiece of the Search & Objective page.
 *
 * Rebuilt from the precomputed `evolution.json` (best / mean / ±σ over 53
 * generation steps of the real fly run). This is NOT a live re-optimization:
 * every point is a generation of 32 candidate controllers, each already scored
 * by a full 3-second MuJoCo rollout. We render those numbers; we don't recompute
 * them.
 *
 * The whole point of the page is "it worked," so the climb is the lead visual
 * and the numbers are tied to *what the fly looked like* at three milestones
 * (numbered ①②③ on the best curve, keyed in the open upper-left). Those three
 * milestones are the same gen-0 / mid / late champions the footage slots below
 * are reserved for — the curve and the (pending) clips read off one spine.
 *
 * The original→resumed warm-start is annotated honestly: the first run stalled
 * around 62 mm; a machine restart warm-started from the gen-35 checkpoint and
 * reached 86.6 mm, which means the first run had converged prematurely.
 *
 * Server component — pure SVG, no client JS, every label always visible.
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

const GREEN = "#6FE39A";
const AMBER = "#E89B3D";
const SUB = "#8C8B83";
const INK = "#E8E6DF";

// ── geometry ────────────────────────────────────────────────────────────────
const VW = 840;
const VH = 440;
const ML = 54;
const MR = 22;
const MT = 30;
const MB = 54;
const PW = VW - ML - MR;
const PH = VH - MT - MB;

const STEP_MAX = meta.phases.resumed.step_end; // 52
const Y_MIN = -40;
const Y_MAX = 95;
const SPLIT =
  (meta.phases.original.step_end + meta.phases.resumed.step_start) / 2; // 37.5

const sx = (step: number) => ML + (step / STEP_MAX) * PW;
const sy = (v: number) => MT + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * PH;

const path = (key: "best" | "mean") =>
  curve
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${sx(p.step).toFixed(1)} ${sy(p[key]).toFixed(1)}`,
    )
    .join(" ");

const band = (() => {
  const up = curve.map(
    (p) => `${sx(p.step).toFixed(1)} ${sy(p.mean + p.std).toFixed(1)}`,
  );
  const lo = curve
    .slice()
    .reverse()
    .map((p) => `${sx(p.step).toFixed(1)} ${sy(p.mean - p.std).toFixed(1)}`);
  return `M${up.join(" L")} L${lo.join(" L")} Z`;
})();

const Y_TICKS = [-40, 0, 40, 80];
const X_TICKS = [0, 10, 20, 30, 40, 50];

// ── milestones (numbered ①②③ on the best curve) ─────────────────────────────
const genZero = curve[0]; // step 0, best ≈ 0.19
const stall = curve.find((p) => p.step === 34)!; // best_in_phase original = 62.14
const peak = curve.find((p) => p.best === meta.best_fit_overall)!; // step 40, 86.6

const MILES = [
  { n: "1", p: genZero, role: "start", gait: "twitches, can't hold a stance" },
  { n: "2", p: stall, role: "first-run best", gait: "lurches forward, then stalls" },
  { n: "3", p: peak, role: "overall best", gait: "clean walk · ~29 mm/s" },
];

// key box sits in the empty upper-left interior (the best curve doesn't climb
// into this region until the far right of the run).
const KEY_X = 72;
const KEY_Y = 46;

export function EvolutionClimb() {
  return (
    <figure className="cg-opt-climb">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        role="img"
        aria-labelledby="cg-climb-title cg-climb-desc"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          fontFamily: "var(--mono)",
        }}
      >
        <title id="cg-climb-title">
          The fly run climbing from a stagger to a walk over 50 generations
        </title>
        <desc id="cg-climb-desc">
          Best, mean, and ±one-standard-deviation fitness across the real CMA-ES
          run. The best controller climbs from about zero millimetres at
          generation zero — a twitching stagger — to 86.6 millimetres, a clean
          forward walk. The first run stalled near 62 millimetres; a machine
          restart warm-started from the generation-35 checkpoint and broke past
          it to 86.6, showing the first run had converged prematurely. These are
          precomputed MuJoCo numbers, not a live run.
        </desc>

        {/* resumed-phase background tint */}
        <rect
          x={sx(SPLIT)}
          y={MT}
          width={sx(STEP_MAX) - sx(SPLIT)}
          height={PH}
          fill="rgba(232,155,61,0.05)"
        />

        {/* y gridlines + ticks */}
        {Y_TICKS.map((t) => (
          <g key={`y${t}`}>
            <line
              x1={ML}
              y1={sy(t)}
              x2={ML + PW}
              y2={sy(t)}
              stroke="rgba(232,230,223,0.07)"
              strokeWidth={1}
            />
            <text x={ML - 9} y={sy(t) + 3.5} textAnchor="end" fontSize={10.5} fill={SUB}>
              {t}
            </text>
          </g>
        ))}
        {/* zero emphasis */}
        <line
          x1={ML}
          y1={sy(0)}
          x2={ML + PW}
          y2={sy(0)}
          stroke="rgba(232,230,223,0.16)"
          strokeWidth={1}
        />

        {/* x ticks */}
        {X_TICKS.map((t) => (
          <text
            key={`x${t}`}
            x={sx(t)}
            y={MT + PH + 18}
            textAnchor="middle"
            fontSize={10.5}
            fill={SUB}
          >
            {t}
          </text>
        ))}
        <text
          x={ML + PW / 2}
          y={VH - 8}
          textAnchor="middle"
          fontSize={10.5}
          fill={SUB}
          letterSpacing="0.04em"
        >
          generation step
        </text>
        <text
          x={15}
          y={MT + PH / 2}
          textAnchor="middle"
          fontSize={10.5}
          fill={SUB}
          transform={`rotate(-90 15 ${MT + PH / 2})`}
        >
          fitness · mm walked forward
        </text>

        {/* ±σ band, mean, best */}
        <path d={band} fill="rgba(140,139,131,0.12)" stroke="none" />
        <path d={path("mean")} fill="none" stroke={SUB} strokeWidth={1.4} />
        <path
          d={path("best")}
          fill="none"
          stroke={GREEN}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* phase split */}
        <line
          x1={sx(SPLIT)}
          y1={MT}
          x2={sx(SPLIT)}
          y2={MT + PH}
          stroke="rgba(232,155,61,0.5)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        {/* phase labels parked along the bottom of the plot, flanking the split
            (the open band of low-fitness space neither curve reaches) */}
        <text
          x={sx(SPLIT) - 7}
          y={MT + PH - 22}
          textAnchor="end"
          fontSize={9.5}
          fill={SUB}
          letterSpacing="0.08em"
        >
          ORIGINAL RUN
        </text>
        <text
          x={sx(SPLIT) + 7}
          y={MT + PH - 22}
          textAnchor="start"
          fontSize={9.5}
          fill={AMBER}
          letterSpacing="0.08em"
        >
          RESUMED
        </text>
        <text x={sx(SPLIT) + 7} y={MT + PH - 9} textAnchor="start" fontSize={8.5} fill={SUB}>
          warm-started from the gen-35 checkpoint
        </text>

        {/* milestone markers on the best curve */}
        {MILES.map((m) => (
          <g key={m.n}>
            <circle
              cx={sx(m.p.step)}
              cy={sy(m.p.best)}
              r={9}
              fill="var(--bg-raised)"
              stroke={GREEN}
              strokeWidth={1.5}
            />
            <text
              x={sx(m.p.step)}
              y={sy(m.p.best) + 3.6}
              textAnchor="middle"
              fontSize={11}
              fill={GREEN}
              fontWeight={600}
            >
              {m.n}
            </text>
          </g>
        ))}

        {/* numbered milestone key — empty upper-left interior */}
        <g>
          {MILES.map((m, i) => {
            const y = KEY_Y + 26 + i * 30;
            return (
              <g key={m.n}>
                <circle cx={KEY_X + 6} cy={y - 3.5} r={8} fill="none" stroke={GREEN} strokeWidth={1.3} />
                <text x={KEY_X + 6} y={y} textAnchor="middle" fontSize={10} fill={GREEN} fontWeight={600}>
                  {m.n}
                </text>
                <text x={KEY_X + 22} y={y - 6} fontSize={11.5} fill={INK}>
                  {m.role} · {m.p.best.toFixed(1)} mm
                </text>
                <text x={KEY_X + 22} y={y + 7} fontSize={10.5} fill={SUB}>
                  {m.gait}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <figcaption className="cg-opt-cap">
        <span className="cg-opt-climb-lg">
          <span>
            <span style={{ color: GREEN }}>━━</span> best controller
          </span>
          <span>
            <span style={{ color: SUB }}>━━</span> population mean
          </span>
          <span>
            <span style={{ color: "rgba(140,139,131,0.55)" }}>▬▬</span> ±σ band
          </span>
        </span>
        Real MuJoCo run · 660 params · population 32 · σ₀ 0.3 · ~50 generations.
        The best curve climbing <strong>0 → 86.6 mm</strong> <em>is</em> the walk
        getting better — that single line is the whole result. Fitness ={" "}
        forward distance − 0.05·N<sub>below</sub>; the x-axis is{" "}
        <em>step</em> because the resumed phase forked from the gen-35 checkpoint
        and re-used its generation numbers. Precomputed — no live rollout.
      </figcaption>
    </figure>
  );
}

export default EvolutionClimb;
