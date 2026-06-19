/**
 * <HeadingError> — the standalone, house-style heading-error visual for the
 * perturbation result (Behaviors / perturbation, C2-C). Server-rendered SVG, no
 * client JS: two trajectory rays diverging from the shove point — the open loop
 * ends `openDeg` off its original heading, the closed loop only `closedDeg` —
 * with the headline single shove (seed 202) as the callout.
 *
 * Numbers are read from data-c2/robustness_metrics.json by the page and passed
 * in; nothing here is hardcoded. The win shown is *course correction*: at this
 * shove magnitude neither controller falls, so this is about staying on course,
 * not catching a fall.
 */

const GREEN = "#6FE39A";
const AMBER = "#E89B3D";
const SUB = "#8C8B83";
const INK = "#E8E6DF";
const RULE = "rgba(232,230,223,0.18)";

const W = 600;
const H = 300;

// Shove origin + reference geometry.
const OX = 118;
const OY = 150;
const L = 250;

type Ray = { deg: number; color: string };

function ray(deg: number, len = L): { x: number; y: number } {
  const r = (deg * Math.PI) / 180;
  // Forward = +x (right); positive deg veers downward (screen +y) for open,
  // we mirror closed upward so the two paths are visually separated.
  return { x: OX + len * Math.cos(r), y: OY + len * Math.sin(r) };
}

export function HeadingError({
  openDeg,
  closedDeg,
  seedOpenDeg,
  seedClosedDeg,
  seed,
}: {
  openDeg: number;
  closedDeg: number;
  seedOpenDeg: number;
  seedClosedDeg: number;
  seed: number;
}) {
  // Open veers down (+), closed veers up (−) so the rays don't overlap.
  const openEnd = ray(openDeg);
  const closedEnd = ray(-closedDeg);
  const refEnd = { x: OX + L, y: OY };

  // Wedge arcs (small radius) annotating each deviation angle.
  const arcR = 64;
  const openArc = ray(openDeg, arcR);
  const closedArc = ray(-closedDeg, arcR);
  const refArc = { x: OX + arcR, y: OY };

  const rays: { end: { x: number; y: number }; color: string; label: string; deg: number }[] = [
    { end: openEnd, color: AMBER, label: "open loop", deg: openDeg },
    { end: closedEnd, color: GREEN, label: "closed loop", deg: closedDeg },
  ];

  return (
    <figure className="cg-heading-fig">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="cg-he-title cg-he-desc"
        style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
      >
        <title id="cg-he-title">Post-shove heading error, open loop vs closed loop</title>
        <desc id="cg-he-desc">
          From the same lateral shove, the open-loop fly ends {openDeg.toFixed(1)}{" "}
          degrees off its original heading and walks crooked, while the
          closed-loop fly steers back to {closedDeg.toFixed(1)} degrees — roughly
          half the error — averaged over 18 perturbation seeds. On the headline
          single shove (seed {seed}) the open loop ends {seedOpenDeg.toFixed(0)}{" "}
          degrees off while the closed loop holds to {seedClosedDeg.toFixed(0)}.
          At this magnitude neither fly falls; the win is course correction, not
          catching a fall.
        </desc>

        <defs>
          <marker id="cg-he-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={AMBER} />
          </marker>
          <marker id="cg-he-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={GREEN} />
          </marker>
        </defs>

        {/* on-course reference */}
        <line
          x1={OX}
          y1={OY}
          x2={refEnd.x}
          y2={refEnd.y}
          stroke={RULE}
          strokeWidth={1.4}
          strokeDasharray="5 5"
        />
        <text x={refEnd.x + 6} y={OY + 4} fill={SUB} fontSize={10.5}>
          on course
        </text>

        {/* the shove: a lateral impulse at the origin */}
        <line x1={OX} y1={OY} x2={OX} y2={OY - 46} stroke={INK} strokeWidth={1.6} markerEnd="url(#cg-he-green)" opacity={0} />
        <g>
          <line x1={OX - 2} y1={OY + 40} x2={OX - 2} y2={OY + 6} stroke={INK} strokeWidth={1.8} markerEnd="url(#cg-he-green)" />
          <text x={OX - 8} y={OY + 56} fill={INK} fontSize={10.5} textAnchor="middle">
            shove
          </text>
        </g>

        {/* deviation wedges (thin arcs from the reference to each ray) */}
        <path
          d={`M${refArc.x} ${refArc.y} A ${arcR} ${arcR} 0 0 1 ${openArc.x} ${openArc.y}`}
          fill="none"
          stroke={AMBER}
          strokeWidth={1}
          opacity={0.5}
        />
        <path
          d={`M${refArc.x} ${refArc.y} A ${arcR} ${arcR} 0 0 0 ${closedArc.x} ${closedArc.y}`}
          fill="none"
          stroke={GREEN}
          strokeWidth={1}
          opacity={0.5}
        />

        {/* the two trajectory rays */}
        {rays.map((r) => (
          <g key={r.label}>
            <line
              x1={OX}
              y1={OY}
              x2={r.end.x}
              y2={r.end.y}
              stroke={r.color}
              strokeWidth={2}
              markerEnd={`url(#cg-he-${r.color === GREEN ? "green" : "amber"})`}
            />
            <text
              x={r.end.x + 8}
              y={r.end.y + (r.color === GREEN ? -2 : 14)}
              fill={r.color}
              fontSize={12}
              fontWeight={500}
            >
              {r.label} · {r.deg.toFixed(1)}°
            </text>
          </g>
        ))}

        {/* origin dot */}
        <circle cx={OX} cy={OY} r={3.5} fill={INK} />

        {/* headline single-shove callout */}
        <g>
          <text x={W - 14} y={30} fill={SUB} fontSize={10.5} textAnchor="end" letterSpacing="0.04em">
            HEADLINE SINGLE SHOVE · seed {seed}
          </text>
          <text x={W - 14} y={50} fill={INK} fontSize={13} textAnchor="end">
            <tspan fill={AMBER}>{seedOpenDeg.toFixed(0)}° off</tspan>
            <tspan fill={SUB}>{"  →  "}</tspan>
            <tspan fill={GREEN}>{seedClosedDeg.toFixed(0)}° held</tspan>
          </text>
        </g>
      </svg>

      <figcaption className="cg-heading-cap">
        Mean post-shove heading error across 18 seeds: closing the loop roughly{" "}
        <strong>halves</strong> it ({openDeg.toFixed(1)}° → {closedDeg.toFixed(1)}°).
        Both flies stay upright at this magnitude — the win is{" "}
        <strong>course correction, not catching a fall</strong>.
      </figcaption>
    </figure>
  );
}

export default HeadingError;
