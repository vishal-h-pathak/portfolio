/**
 * GainSweepChart — the *answered* criticality result.
 *
 * The CriticalityPlayground only *poses* the edge-of-chaos question in-browser
 * (λ flips sign as you turn the gain). This chart is the answer measured in
 * the real engine: a precomputed MuJoCo gain→gait sweep, dual-axis, walking
 * distance (mm, left/green) and the Lyapunov exponent λ (right/amber) against
 * the gain knob. Distance is single-peaked at the native gain (1.0) and
 * collapses both sides; λ crosses zero between gain 1.3 and 1.5, and that
 * chaos-onset coincides with the gait collapse.
 *
 * Honesty (see PROMPT_cg_E_conventions): this is *precomputed* data — no live
 * CMA-ES, no in-browser fitness recompute (those need real MuJoCo rollouts).
 * It's a *detuning* sweep: the 660 weights are frozen and only the gain is
 * swept, so the robust claim is the chaos-onset ⇄ collapse coincidence, not
 * "edge gaits are best in general" (that would need re-evolving per gain).
 *
 * Pure/static: the JSON is imported and baked in, so the figure server-renders
 * with no fetch, no loading state, and reads with JS disabled.
 */

import gainSweep from "@/public/cellular-gaits/data/gain_sweep.json";

type Row = {
  gain: number;
  fitness: number;
  distance_mm: number;
  n_below: number;
  lambda: number;
  change_rate: number;
};

const SWEEP = gainSweep.sweep as Row[];
const NATIVE = gainSweep.meta.native_gain; // 1.0
const PEAK = gainSweep.meta.best_fit_native; // 86.61898…

// Palette — matches the site tokens / CriticalityPlayground regime colors.
const GREEN = "var(--green)"; // distance
const AMBER = "var(--amber)"; // λ
const RED = "var(--red)"; // chaos / collapse
const INK = "var(--ink)";
const DIM = "var(--ink-dim)";
const FAINT = "var(--ink-faint)";
const RULE = "rgba(232,230,223,0.13)";

// SVG coordinate system; the <svg> fills the container at this aspect ratio.
const W = 660;
const H = 404;
const L = 56;
const R = 58;
const TOP = 30;
const BOT = 52;
const IW = W - L - R;
const IH = H - TOP - BOT;

// Axis domains.
const GMIN = 0;
const GMAX = 4.25;
const DMIN = -20;
const DMAX = 90;
const LMIN = -1.0;
const LMAX = 0.3;

const xs = (g: number) => L + ((g - GMIN) / (GMAX - GMIN)) * IW;
const yD = (d: number) => TOP + ((DMAX - d) / (DMAX - DMIN)) * IH;
const yL = (l: number) => TOP + ((LMAX - l) / (LMAX - LMIN)) * IH;

const distPts = SWEEP.map((r) => `${xs(r.gain).toFixed(1)},${yD(r.distance_mm).toFixed(1)}`).join(" ");
const lamPts = SWEEP.map((r) => `${xs(r.gain).toFixed(1)},${yL(r.lambda).toFixed(1)}`).join(" ");

const X_TICKS = [0, 1, 2, 3, 4];
const D_TICKS = [0, 30, 60, 90];
const L_TICKS = [-0.8, -0.4, 0.0];

// The λ=0 crossing bracket (from the sweep: last negative at g=1.3, first
// positive at g=1.5).
const CROSS_LO = 1.3;
const CROSS_HI = 1.5;

export function GainSweepChart() {
  return (
    <figure className="cg-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="gschart-title gschart-desc"
        style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
      >
        <title id="gschart-title">
          Walking distance and Lyapunov exponent versus the gain knob
        </title>
        <desc id="gschart-desc">
          A precomputed real-MuJoCo detuning sweep over nine gains with the 660
          evolved weights frozen. Walking distance (left axis, green) is
          single-peaked at the native gain 1.0 at 86.6 millimetres and collapses
          on both sides. The Lyapunov exponent lambda (right axis, amber) rises
          with gain and crosses zero — the onset of chaos — between gain 1.3 and
          1.5, exactly where the gait collapses. The evolved controller sits at
          gain 1.0 with lambda about minus 0.26, just inside the ordered side of
          the edge of chaos.
        </desc>

        {/* chaos-onset band: where λ crosses 0 and the gait collapses */}
        <rect
          x={xs(CROSS_LO)}
          y={TOP}
          width={xs(CROSS_HI) - xs(CROSS_LO)}
          height={IH}
          fill="rgba(227,111,111,0.11)"
        />
        <line x1={xs(CROSS_LO)} y1={TOP} x2={xs(CROSS_LO)} y2={TOP + IH} stroke="rgba(227,111,111,0.4)" strokeWidth={1} strokeDasharray="3 3" />
        <line x1={xs(CROSS_HI)} y1={TOP} x2={xs(CROSS_HI)} y2={TOP + IH} stroke="rgba(227,111,111,0.4)" strokeWidth={1} strokeDasharray="3 3" />

        {/* x gridlines + ticks (gain) */}
        {X_TICKS.map((g) => (
          <g key={`x${g}`}>
            <line x1={xs(g)} y1={TOP} x2={xs(g)} y2={TOP + IH} stroke={RULE} strokeWidth={1} />
            <text x={xs(g)} y={TOP + IH + 20} fill={DIM} fontSize={12.5} textAnchor="middle">
              {g.toFixed(1)}
            </text>
          </g>
        ))}
        <text x={L + IW / 2} y={H - 8} fill={FAINT} fontSize={12} textAnchor="middle" letterSpacing="0.12em">
          GAIN g · criticality knob
        </text>

        {/* left axis ticks (distance) */}
        {D_TICKS.map((d) => (
          <g key={`d${d}`}>
            <line x1={L - 5} y1={yD(d)} x2={L} y2={yD(d)} stroke={DIM} strokeWidth={1} />
            <text x={L - 9} y={yD(d) + 4} fill={GREEN} fontSize={12} textAnchor="end" opacity={0.85}>
              {d}
            </text>
          </g>
        ))}
        <text
          x={16}
          y={TOP + IH / 2}
          fill={GREEN}
          fontSize={12}
          textAnchor="middle"
          letterSpacing="0.08em"
          transform={`rotate(-90 16 ${TOP + IH / 2})`}
        >
          DISTANCE WALKED · mm
        </text>

        {/* right axis ticks (λ) */}
        {L_TICKS.map((l) => (
          <g key={`l${l}`}>
            <line x1={L + IW} y1={yL(l)} x2={L + IW + 5} y2={yL(l)} stroke={DIM} strokeWidth={1} />
            <text x={L + IW + 9} y={yL(l) + 4} fill={AMBER} fontSize={12} textAnchor="start" opacity={0.85}>
              {l.toFixed(1)}
            </text>
          </g>
        ))}
        <text
          x={W - 14}
          y={TOP + IH / 2}
          fill={AMBER}
          fontSize={12}
          textAnchor="middle"
          letterSpacing="0.08em"
          transform={`rotate(90 ${W - 14} ${TOP + IH / 2})`}
        >
          λ · LYAPUNOV · nats/tick
        </text>

        {/* λ = 0 reference (the chaos threshold) */}
        <line x1={L} y1={yL(0)} x2={L + IW} y2={yL(0)} stroke={AMBER} strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />
        {/* Stacked at the far left, where both data series sit well below the
            λ=0 line — a single line would run its tail into the green peak-rise. */}
        <text x={L + 6} y={yL(0) - 20} fill={AMBER} fontSize={10.5} opacity={0.85}>
          chaos onset
        </text>
        <text x={L + 6} y={yL(0) - 5} fill={AMBER} fontSize={10.5} opacity={0.85}>
          λ = 0
        </text>

        {/* native gain marker */}
        <line x1={xs(NATIVE)} y1={TOP} x2={xs(NATIVE)} y2={TOP + IH} stroke="rgba(232,230,223,0.35)" strokeWidth={1} strokeDasharray="4 3" />
        <text x={xs(NATIVE) - 7} y={TOP + 24} fill={INK} fontSize={10.5} opacity={0.85} textAnchor="end">
          native g=1.0
        </text>

        {/* λ series (amber) */}
        <polyline points={lamPts} fill="none" stroke={AMBER} strokeWidth={1.6} strokeLinejoin="round" />
        {SWEEP.map((r) => (
          <circle key={`lc${r.gain}`} cx={xs(r.gain)} cy={yL(r.lambda)} r={3} fill="var(--bg)" stroke={AMBER} strokeWidth={1.5} />
        ))}

        {/* distance series (green) */}
        <polyline points={distPts} fill="none" stroke={GREEN} strokeWidth={2} strokeLinejoin="round" />
        {SWEEP.map((r) => (
          <circle key={`dc${r.gain}`} cx={xs(r.gain)} cy={yD(r.distance_mm)} r={3} fill="var(--bg)" stroke={GREEN} strokeWidth={1.5} />
        ))}

        {/* peak callout — set to the left of the peak dot so it can't reach the
            chaos-band dashed lines that start one gain-step to the right. */}
        <circle cx={xs(NATIVE)} cy={yD(PEAK)} r={5} fill={GREEN} />
        <text x={xs(NATIVE) - 9} y={yD(PEAK) - 2} fill={GREEN} fontSize={12.5} fontWeight={500} textAnchor="end">
          {PEAK.toFixed(1)} mm · peak
        </text>

        {/* collapse + crossing callout — parked in the open band between the
            gain=2 and gain=3 gridlines (green has collapsed to the floor, λ has
            flattened up top), so it clears every gridline and both data lines. */}
        <text x={xs(2) + 12} y={TOP + IH / 2 + 12} fill={RED} fontSize={11.5}>
          gait collapses
        </text>
        <text x={xs(2) + 12} y={TOP + IH / 2 + 27} fill={RED} fontSize={10.5} opacity={0.85}>
          as λ crosses 0
        </text>

        {/* legend */}
        <g fontSize={11.5}>
          <line x1={L} y1={16} x2={L + 22} y2={16} stroke={GREEN} strokeWidth={2} />
          <text x={L + 28} y={20} fill={DIM}>distance (mm)</text>
          <line x1={L + 150} y1={16} x2={L + 172} y2={16} stroke={AMBER} strokeWidth={1.6} />
          <text x={L + 178} y={20} fill={DIM}>λ (right axis)</text>
        </g>
      </svg>

      <figcaption className="cg-chart-cap">
        Real MuJoCo gain→gait sweep (run {gainSweep.meta.run_id}, {gainSweep.meta.checkpoint},{" "}
        {gainSweep.meta.n_steps} steps). Distance peaks at the{" "}
        <strong>native gain 1.0 ({PEAK.toFixed(1)} mm)</strong> and collapses on
        both sides; <strong>λ crosses 0 between gain {CROSS_LO} and {CROSS_HI}</strong>,
        and that chaos onset coincides with the gait collapse. The evolved
        controller parks at λ≈−0.26 — just inside the ordered edge. This is a{" "}
        <em>detuning</em> sweep (the 660 weights are frozen, only the gain
        moves), so the robust finding is the chaos-onset ⇄ collapse coincidence —
        not that edge gaits are best in general (that needs re-evolving per gain).
        Precomputed, not live: real fitness needs full MuJoCo rollouts.
      </figcaption>
    </figure>
  );
}
