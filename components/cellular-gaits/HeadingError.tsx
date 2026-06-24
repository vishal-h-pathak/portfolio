/**
 * <HeadingError> — the standalone, house-style perturbation result visual
 * (Behaviors / perturbation, C2-C). Server-rendered SVG + an objective
 * scorecard, no client JS. Two trajectory rays diverge from the shove point —
 * the open loop ends `openDeg` off its original heading, the closed loop only
 * `closedDeg` — with the headline single shove (seed 202) as the callout; below
 * it, an explicit "the objective" scorecard makes *how well each controller is
 * doing* legible: it scores both flies on the actual reward terms — hold your
 * heading, stay upright, keep moving — so success vs failure isn't left to be
 * inferred from a pair of diverging lines.
 *
 * "On course" here = the heading the fly held *before* the shove. There is no
 * goal location; the task is heading retention (keep walking the same way),
 * not reaching a place.
 *
 * Numbers are read from data-c2/robustness_metrics.json by the page and passed
 * in; nothing here is hardcoded. The win shown is *course correction*: at this
 * shove magnitude neither controller falls, so this is about staying on course,
 * not catching a fall.
 */

import type { CSSProperties } from "react";

const GREEN = "#6FE39A";
const AMBER = "#E89B3D";
const SUB = "#8C8B83";
const INK = "#E8E6DF";
const RULE = "rgba(232,230,223,0.18)";

const W = 600;
// Tall enough that the open-loop ray (veers down by up to ~57°) and its label
// stay inside the box at the real data, with the headline callout parked in the
// lower-right where neither ray reaches.
const H = 360;

// Shove origin + reference geometry.
const OX = 118;
const OY = 130;
const L = 216;

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
  openUpright,
  closedUpright,
  openPostDx,
  closedPostDx,
}: {
  openDeg: number;
  closedDeg: number;
  seedOpenDeg: number;
  seedClosedDeg: number;
  seed: number;
  /** Fraction of seeds the open / closed loop stayed upright (0–1). */
  openUpright: number;
  closedUpright: number;
  /** Forward distance covered *after* the shove, mm (open / closed). */
  openPostDx: number;
  closedPostDx: number;
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
        <text x={refEnd.x + 6} y={OY + 1} fill={SUB} fontSize={10.5}>
          on course
        </text>
        <text x={refEnd.x + 6} y={OY + 13} fill={SUB} fontSize={8.5} opacity={0.8}>
          = heading before the shove
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

        {/* headline single-shove callout — lower-right, clear of both rays */}
        <g>
          <text x={W - 14} y={H - 30} fill={SUB} fontSize={10.5} textAnchor="end" letterSpacing="0.04em">
            HEADLINE SINGLE SHOVE · seed {seed}
          </text>
          <text x={W - 14} y={H - 10} fill={INK} fontSize={13} textAnchor="end">
            <tspan fill={AMBER}>{seedOpenDeg.toFixed(0)}° off</tspan>
            <tspan fill={SUB}>{"  →  "}</tspan>
            <tspan fill={GREEN}>{seedClosedDeg.toFixed(0)}° held</tspan>
          </text>
        </g>
      </svg>

      <ObjectiveScorecard
        openDeg={openDeg}
        closedDeg={closedDeg}
        openUpright={openUpright}
        closedUpright={closedUpright}
        openPostDx={openPostDx}
        closedPostDx={closedPostDx}
      />

      <figcaption className="cg-heading-cap">
        Mean post-shove heading error across 18 seeds: closing the loop roughly{" "}
        <strong>halves</strong> it ({openDeg.toFixed(1)}° → {closedDeg.toFixed(1)}°).
        Both flies stay upright at this magnitude — the win is{" "}
        <strong>course correction, not catching a fall</strong>.
      </figcaption>
    </figure>
  );
}

/**
 * The objective scorecard: scores both controllers on the three terms the
 * perturbation reward actually cares about, so "how well is it doing" is
 * explicit instead of inferred from two diverging lines. Pure inline styles
 * (house tokens) — no client JS, no shared CSS.
 */
function ObjectiveScorecard({
  openDeg,
  closedDeg,
  openUpright,
  closedUpright,
  openPostDx,
  closedPostDx,
}: {
  openDeg: number;
  closedDeg: number;
  openUpright: number;
  closedUpright: number;
  openPostDx: number;
  closedPostDx: number;
}) {
  const headingRatio = closedDeg > 0 ? openDeg / closedDeg : 0;

  type Row = {
    name: string;
    goal: string;
    open: string;
    closed: string;
    /** which side wins ("closed" highlights green; "both" is a neutral pass). */
    winner: "closed" | "both";
    verdict: string;
  };

  const rows: Row[] = [
    {
      name: "Hold your heading",
      goal: "end pointed the way you started — small angle off",
      open: `${openDeg.toFixed(1)}° off`,
      closed: `${closedDeg.toFixed(1)}° off`,
      winner: "closed",
      verdict: `closed holds ~${headingRatio.toFixed(1)}× tighter`,
    },
    {
      name: "Stay upright",
      goal: "don't fall — thorax stays up through the hit",
      open: `${Math.round(openUpright * 100)}% upright`,
      closed: `${Math.round(closedUpright * 100)}% upright`,
      winner: "both",
      verdict: "both clear it — no fall at this shove",
    },
    {
      name: "Keep moving forward",
      goal: "still cover ground after the shove (mm)",
      open: `${openPostDx.toFixed(1)} mm`,
      closed: `${closedPostDx.toFixed(1)} mm`,
      winner: "closed",
      verdict: "closed travels further",
    },
  ];

  const card: CSSProperties = {
    marginTop: 16,
    border: `1px solid ${RULE}`,
    borderLeft: `2px solid ${GREEN}`,
    borderRadius: 4,
    background: "rgba(232,230,223,0.02)",
    padding: "14px 16px 16px",
    fontFamily: "var(--mono)",
  };

  return (
    <div style={card} role="table" aria-label="The perturbation objective, scored open loop vs closed loop">
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: SUB,
        }}
      >
        the objective — scored on the actual reward, not the picture
      </p>

      {rows.map((r, i) => (
        <div
          key={r.name}
          role="row"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: "4px 14px",
            padding: "10px 0",
            borderTop: i === 0 ? "none" : `1px solid ${RULE}`,
          }}
        >
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ color: INK, fontSize: 12.5, fontWeight: 500 }}>{r.name}</div>
            <div style={{ color: SUB, fontSize: 10.5, marginTop: 2, lineHeight: 1.4 }}>
              goal: {r.goal}
            </div>
          </div>

          <div
            style={{
              flex: "1 1 200px",
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              fontSize: 12.5,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ color: AMBER }}>
              open <strong style={{ fontWeight: 500 }}>{r.open}</strong>
            </span>
            <span style={{ color: SUB }}>→</span>
            <span style={{ color: GREEN }}>
              closed <strong style={{ fontWeight: 500 }}>{r.closed}</strong>
            </span>
          </div>

          <div
            style={{
              flex: "1 1 100%",
              fontSize: 11,
              color: r.winner === "closed" ? GREEN : SUB,
            }}
          >
            {r.winner === "closed" ? "✓ " : "= "}
            {r.verdict}
          </div>
        </div>
      ))}
    </div>
  );
}

export default HeadingError;
