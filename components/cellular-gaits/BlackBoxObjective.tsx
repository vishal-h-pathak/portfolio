/**
 * <BlackBoxObjective> — why this had to be search, not gradient descent.
 *
 * The core decision of the page, drawn as a pipeline tied to the fly: a
 * candidate controller (660 numbers) goes into a 3-second contact-rich MuJoCo
 * rollout, and one scalar comes out — how far the fly walked. The forward pass
 * works (solid green). The backward pass does not: no derivative escapes the
 * collisions and stiff contacts, so ∂F/∂θ doesn't exist to descend (amber,
 * dashed, struck through). That's the whole argument for a gradient-free search
 * — it only ever needs to *score* a controller, never differentiate it.
 *
 * Server component — pure SVG, no client JS, labels always visible.
 */

const GREEN = "var(--green)";
const AMBER = "var(--amber)";
const RED = "var(--red)";
const SUB = "var(--ink-dim)";
const INK = "var(--ink)";
const RULE = "rgba(232,230,223,0.18)";

const W = 760;
const H = 300;

// top-down stylized fly inside the physics box (centred at cx,cy)
function Fly({ cx, cy }: { cx: number; cy: number }) {
  const legs: [number, number, number, number][] = [
    [-7, -4, -22, -16],
    [-8, 0, -24, 0],
    [-7, 4, -22, 16],
    [7, -4, 22, -16],
    [8, 0, 24, 0],
    [7, 4, 22, 16],
  ];
  return (
    <g transform={`translate(${cx} ${cy})`} stroke={INK} fill={INK}>
      {legs.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1.2} opacity={0.85} />
      ))}
      {/* contact sparks at a few foot tips */}
      {[
        [-24, 0],
        [22, -16],
        [22, 16],
      ].map(([x, y], i) => (
        <circle key={`s${i}`} cx={x} cy={y} r={1.8} fill={AMBER} stroke="none" />
      ))}
      <ellipse cx={0} cy={9} rx={6} ry={11} opacity={0.9} stroke="none" />
      <ellipse cx={0} cy={-3} rx={6.5} ry={7} stroke="none" />
      <circle cx={0} cy={-13} r={4} stroke="none" />
    </g>
  );
}

export function BlackBoxObjective() {
  // pipeline y-centre
  const cy = 104;
  // node frames
  const A = { x: 26, y: 64, w: 150, h: 80 }; // θ
  const B = { x: 268, y: 44, w: 224, h: 120 }; // black box
  const C = { x: 588, y: 64, w: 146, h: 80 }; // F

  return (
    <figure className="cg-opt-blackbox">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="cg-bb-title cg-bb-desc"
        style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
      >
        <title id="cg-bb-title">Why the objective can only be searched, not differentiated</title>
        <desc id="cg-bb-desc">
          A candidate controller of 660 numbers feeds into a three-second
          contact-rich MuJoCo rollout, which outputs one number: how far the fly
          walked. The forward path works. The backward path — a gradient of that
          number with respect to the 660 parameters — does not exist, because the
          collisions and stiff contacts are not differentiable. So the search can
          only score candidates, which is exactly what a gradient-free method like
          CMA-ES needs.
        </desc>

        <defs>
          <marker id="cg-bb-fwd" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" fill={GREEN} />
          </marker>
          <marker id="cg-bb-back" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" fill={AMBER} />
          </marker>
        </defs>

        {/* ── forward pass (works) ── */}
        {/* θ node */}
        <rect x={A.x} y={A.y} width={A.w} height={A.h} rx={4} fill="rgba(232,230,223,0.02)" stroke={RULE} />
        <text x={A.x + A.w / 2} y={A.y + 30} textAnchor="middle" fontSize={20} fill={INK}>
          θ
        </text>
        <text x={A.x + A.w / 2} y={A.y + 49} textAnchor="middle" fontSize={10} fill={SUB}>
          660 numbers
        </text>
        <text x={A.x + A.w / 2} y={A.y + 63} textAnchor="middle" fontSize={9.5} fill={SUB}>
          one candidate rule
        </text>

        {/* arrow θ → box */}
        <line x1={A.x + A.w} y1={cy} x2={B.x - 6} y2={cy} stroke={GREEN} strokeWidth={2} markerEnd="url(#cg-bb-fwd)" />
        <text x={(A.x + A.w + B.x) / 2} y={cy - 8} textAnchor="middle" fontSize={9} fill={SUB}>
          try it
        </text>

        {/* black box */}
        <rect x={B.x} y={B.y} width={B.w} height={B.h} rx={4} fill="var(--bg)" stroke={RULE} />
        <text x={B.x + B.w / 2} y={B.y + 18} textAnchor="middle" fontSize={11} fill={INK} letterSpacing="0.04em">
          3-second MuJoCo rollout
        </text>
        <Fly cx={B.x + B.w / 2} cy={B.y + 70} />
        <text x={B.x + B.w / 2} y={B.y + B.h - 10} textAnchor="middle" fontSize={9} fill={SUB}>
          contact-rich physics · collisions · friction
        </text>

        {/* arrow box → F */}
        <line x1={B.x + B.w} y1={cy} x2={C.x - 6} y2={cy} stroke={GREEN} strokeWidth={2} markerEnd="url(#cg-bb-fwd)" />
        <text x={(B.x + B.w + C.x) / 2} y={cy - 8} textAnchor="middle" fontSize={9} fill={SUB}>
          measure
        </text>

        {/* F node */}
        <rect x={C.x} y={C.y} width={C.w} height={C.h} rx={4} fill="rgba(111,227,154,0.05)" stroke="rgba(111,227,154,0.35)" />
        <text x={C.x + C.w / 2} y={C.y + 34} textAnchor="middle" fontSize={18} fill={GREEN}>
          F = 86.6
        </text>
        <text x={C.x + C.w / 2} y={C.y + 52} textAnchor="middle" fontSize={10} fill={SUB}>
          one number · mm walked
        </text>

        {/* ── backward pass (doesn't exist) ── */}
        <path
          d={`M${C.x + C.w / 2} ${C.y + C.h + 4} C ${C.x} ${230}, ${A.x + A.w} ${230}, ${A.x + A.w / 2} ${A.y + A.h + 4}`}
          fill="none"
          stroke={AMBER}
          strokeWidth={1.6}
          strokeDasharray="5 5"
          markerEnd="url(#cg-bb-back)"
          opacity={0.85}
        />
        {/* struck-through gradient label centred on the dashed arc */}
        <g transform={`translate(${W / 2} 236)`}>
          <text textAnchor="middle" fontSize={12} fill={AMBER}>
            ∂F / ∂θ
          </text>
          <line x1={-26} y1={-3.5} x2={26} y2={-3.5} stroke={RED} strokeWidth={1.4} />
        </g>
        <text x={W / 2} y={262} textAnchor="middle" fontSize={10} fill={SUB}>
          no gradient comes back — contacts aren&apos;t differentiable
        </text>
        <text x={W / 2} y={284} textAnchor="middle" fontSize={9.5} fill={SUB}>
          so you can&apos;t descend it; you can only score &amp; rank what you try
        </text>
      </svg>

      <figcaption className="cg-opt-cap">
        The fitness comes out of a physics rollout, so <strong>F(θ)</strong> has
        no usable derivative — backprop is off the table. That&apos;s the case for{" "}
        <strong>CMA-ES</strong>: a gradient-free search only needs to <em>score</em>{" "}
        candidates, never differentiate them. The price is sample cost — every
        candidate is a full 3-second rollout — which is why the run below was
        precomputed, not live.
      </figcaption>
    </figure>
  );
}

export default BlackBoxObjective;
