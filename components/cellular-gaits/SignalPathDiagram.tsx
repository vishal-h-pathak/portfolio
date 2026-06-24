"use client";

/**
 * Cellular Gaits — open-loop vs closed-loop signal path (Sensing tab, E3).
 *
 * Two small block diagrams side by side, in the SystemDiagram house style:
 *   - LEFT  (today):   grid → motor map → fly body, solid green, NO return path.
 *   - RIGHT (Stage 2): the same forward path PLUS a dashed proprioceptive arc
 *     (joint angles + foot contacts) written back into the grid — drawn as
 *     planned / not-wired, exactly the dashed motif SystemDiagram uses for the
 *     sensing block. The honesty point is visual: today there is no arrow back.
 *
 * Pure SVG, no JS state — keep three.js / WASM out of this route. Colour
 * semantics match SystemDiagram: green = wired runtime, dashed gray = planned.
 */

const GREEN = "#6FE39A";
const GRAY = "rgba(232,230,223,0.45)";
const SUB = "#8C8B83";

// One panel coordinate system; the <svg> scales to fill its grid cell. W leaves
// a right-hand column so the proprioceptive-arc label reads horizontally.
const W = 300;
const H = 300;

type Box = { y: number; title: string; sub: string };
const BOXES: Box[] = [
  { y: 20, title: "NCA grid", sub: "8×8×4 · 660 θ" },
  { y: 122, title: "Motor map", sub: "cells → 42 joints" },
  { y: 224, title: "Fly body", sub: "MuJoCo · 250 Hz" },
];
const BX = 30;
const BW = 150;
const BH = 56;
const CX = BX + BW / 2; // arrow column

function Panel({ closed, idp }: { closed: boolean; idp: string }) {
  const titleId = `${idp}-title`;
  const descId = `${idp}-desc`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
    >
      <title id={titleId}>{closed ? "Closed-loop signal path (Stage 2)" : "Open-loop signal path (today)"}</title>
      <desc id={descId}>
        {closed
          ? "The NCA grid drives the motor map, which drives the MuJoCo fly body — and a dashed, not-yet-wired proprioceptive arc carries joint angles and foot contacts from the body back into the grid. This closes the loop and is planned for Stage 2."
          : "The NCA grid drives the motor map, which drives the MuJoCo fly body. There is no return path: the grid never receives body state, so it walks blind."}
      </desc>

      <defs>
        <marker id={`${idp}-green`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={GREEN} />
        </marker>
        <marker id={`${idp}-gray`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={GRAY} />
        </marker>
      </defs>

      {/* Forward arrows (green, solid) */}
      <line x1={CX} y1={BOXES[0].y + BH} x2={CX} y2={BOXES[1].y} stroke={GREEN} strokeWidth={1.5} markerEnd={`url(#${idp}-green)`} />
      <line x1={CX} y1={BOXES[1].y + BH} x2={CX} y2={BOXES[2].y} stroke={GREEN} strokeWidth={1.5} markerEnd={`url(#${idp}-green)`} />

      {/* Feedback arc (dashed gray, planned) — closed loop only */}
      {closed && (
        <>
          <path
            d={`M${BX + BW} ${BOXES[2].y + BH / 2} C 206 ${BOXES[2].y + 6}, 206 ${BOXES[0].y + BH - 6}, ${BX + BW} ${BOXES[0].y + BH / 2}`}
            fill="none"
            stroke={GRAY}
            strokeWidth={1.4}
            strokeDasharray="5 4"
            markerEnd={`url(#${idp}-gray)`}
          />
          {/* Horizontal label in the right column (was rotated vertical). The
              "planned · not wired · Stage 2" status is carried by the figcaption
              and the dashed stroke. */}
          <text x={214} y={H / 2 - 6} fill={SUB} fontSize={9.5}>joint angles</text>
          <text x={214} y={H / 2 + 7} fill={SUB} fontSize={9.5}>+ foot contacts</text>
        </>
      )}

      {/* Blocks */}
      {BOXES.map((b) => (
        <g key={b.title}>
          <rect
            x={BX}
            y={b.y}
            width={BW}
            height={BH}
            rx={6}
            fill="rgba(111,227,154,0.10)"
            stroke={GREEN}
            strokeWidth={1}
          />
          <text x={BX + 14} y={b.y + 26} fill={GREEN} fontSize={13.5} fontWeight={500}>
            {b.title}
          </text>
          <text x={BX + 14} y={b.y + 43} fill={SUB} fontSize={10.5}>
            {b.sub}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function SignalPathDiagram() {
  return (
    <div className="cg-sense-paths">
      <figure className="cg-sense-path">
        <figcaption className="cg-sense-path-cap">
          <span className="cg-sense-path-tag" data-kind="now">open loop · today</span>
          no return path — the grid drives the legs but never feels them
        </figcaption>
        <Panel closed={false} idp="sp-open" />
      </figure>
      <figure className="cg-sense-path">
        <figcaption className="cg-sense-path-cap">
          <span className="cg-sense-path-tag" data-kind="next">closed loop · Stage 2</span>
          body state written back into the cells — the dashed arc isn’t wired yet
        </figcaption>
        <Panel closed idp="sp-closed" />
      </figure>
    </div>
  );
}

export default SignalPathDiagram;
