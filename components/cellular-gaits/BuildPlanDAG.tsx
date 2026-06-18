/**
 * Cellular Gaits — redesign build plan, as a dependency graph.
 *
 * LIVING DOC. This diagram is the canonical, on-site view of the redesign build
 * plan. Keep it in sync with docs/cellular-gaits/build-plan.md (the prose +
 * status ledger). When the plan changes — tabs added/removed, dependencies
 * rewired, waves resequenced — edit the NODES / EDGES arrays below AND the
 * markdown ledger in the same change.
 *
 * Columns = time (left → right). Boxes stacked in a column run in parallel.
 * Color encodes which repo a prompt targets:
 *   amber = cellular-gaits (Python)   green = portfolio (web)   gray = core
 */

type Kind = "py" | "web" | "core";

type Node = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: Kind;
  title: string[];
  sub: string;
};

const PALETTE: Record<Kind, { fill: string; stroke: string; title: string }> = {
  py: { fill: "rgba(232,155,61,0.12)", stroke: "#E89B3D", title: "#E89B3D" },
  web: { fill: "rgba(111,227,154,0.10)", stroke: "#6FE39A", title: "#6FE39A" },
  core: { fill: "rgba(232,230,223,0.05)", stroke: "rgba(232,230,223,0.30)", title: "#E8E6DF" },
};

const SUB = "#8C8B83";
const EDGE = "#8C8B83";

const NODES: Node[] = [
  { id: "A", x: 30, y: 50, w: 200, h: 64, kind: "py", title: ["A · Export fly MJCF"], sub: "cellular-gaits · quick" },
  { id: "C", x: 30, y: 132, w: 200, h: 64, kind: "web", title: ["C · Route shell + appendix"], sub: "portfolio · independent" },
  { id: "D", x: 30, y: 214, w: 200, h: 72, kind: "py", title: ["D · Precompute rollouts"], sub: "cellular-gaits · long-running" },
  { id: "B", x: 270, y: 120, w: 180, h: 92, kind: "web", title: ["B · MuJoCo-WASM", "substrate"], sub: "portfolio · linchpin" },
  { id: "E1", x: 512, y: 80, w: 236, h: 44, kind: "web", title: ["E1 · Body"], sub: "live WASM fly" },
  { id: "E2", x: 512, y: 130, w: 236, h: 44, kind: "web", title: ["E2 · Controller"], sub: "criticality + rule swap" },
  { id: "E3", x: 512, y: 180, w: 236, h: 44, kind: "web", title: ["E3 · Sensing"], sub: "open/closed · needs D" },
  { id: "E4", x: 512, y: 230, w: 236, h: 44, kind: "web", title: ["E4 · Motor mapping"], sub: "cells → joints" },
  { id: "E5", x: 512, y: 280, w: 236, h: 44, kind: "web", title: ["E5 · Objective"], sub: "reweight fitness · needs D" },
  { id: "E6", x: 512, y: 330, w: 236, h: 44, kind: "web", title: ["E6 · Optimizer"], sub: "toy search + real curve" },
  { id: "E7", x: 512, y: 380, w: 236, h: 44, kind: "web", title: ["E7 · Embodied connectome"], sub: "the Eon direction" },
  { id: "F", x: 812, y: 206, w: 138, h: 88, kind: "core", title: ["F · Integrate", "+ verify"], sub: "build green" },
];

const EDGES: [number, number, number, number][] = [
  [230, 82, 270, 150],
  [450, 166, 498, 180],
  [230, 164, 498, 210],
  [230, 250, 498, 255],
  [762, 250, 812, 250],
];

function Box({ n }: { n: Node }) {
  const c = PALETTE[n.kind];
  const lineH = 17;
  const subH = 15;
  const totalH = n.title.length * lineH + subH;
  const startY = n.y + (n.h - totalH) / 2 + 13;
  return (
    <g>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={6} fill={c.fill} stroke={c.stroke} strokeWidth={1} />
      {n.title.map((line, i) => (
        <text key={i} x={n.x + 13} y={startY + i * lineH} fill={c.title} fontSize={12.5}>
          {line}
        </text>
      ))}
      <text x={n.x + 13} y={startY + n.title.length * lineH + 11} fill={SUB} fontSize={10.5}>
        {n.sub}
      </text>
    </g>
  );
}

export function BuildPlanDAG() {
  return (
    <svg
      viewBox="0 0 960 540"
      role="img"
      aria-labelledby="bpdt bpdd"
      style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
    >
      <title id="bpdt">Cellular Gaits redesign build plan</title>
      <desc id="bpdd">
        Four build waves. Wave 1 runs prompts A (export fly MJCF), C (route shell and appendix) and
        D (precompute rollouts) in parallel. Wave 2 is prompt B, the MuJoCo-WASM substrate, which
        depends on A. Wave 3 is seven content tabs built in parallel, depending on B, C and D. Wave 4
        is the final integration and verification prompt F.
      </desc>

      <defs>
        <marker id="bpd-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={EDGE} />
        </marker>
      </defs>

      <text x={130} y={26} textAnchor="middle" fill="#8C8B83" fontSize={11}>wave 1 · parallel</text>
      <text x={360} y={26} textAnchor="middle" fill="#8C8B83" fontSize={11}>wave 2</text>
      <text x={630} y={26} textAnchor="middle" fill="#8C8B83" fontSize={11}>wave 3 · parallel</text>
      <text x={881} y={26} textAnchor="middle" fill="#8C8B83" fontSize={11}>wave 4</text>

      <rect x={498} y={44} width={264} height={416} rx={8} fill="rgba(232,230,223,0.04)" stroke="rgba(232,230,223,0.18)" strokeWidth={1} />
      <text x={510} y={66} fill="#8C8B83" fontSize={11}>wave 3 · content tabs</text>

      {EDGES.map((e, i) => (
        <line key={i} x1={e[0]} y1={e[1]} x2={e[2]} y2={e[3]} stroke={EDGE} strokeWidth={1.5} markerEnd="url(#bpd-ah)" />
      ))}

      {NODES.map((n) => (
        <Box key={n.id} n={n} />
      ))}

      <text x={355} y={230} textAnchor="middle" fill="#8C8B83" fontSize={10}>spike + validate perf first</text>

      <g fontSize={11}>
        <rect x={30} y={500} width={13} height={13} rx={3} fill="rgba(232,155,61,0.12)" stroke="#E89B3D" />
        <text x={49} y={511} fill="#8C8B83">cellular-gaits (Python)</text>
        <rect x={220} y={500} width={13} height={13} rx={3} fill="rgba(111,227,154,0.10)" stroke="#6FE39A" />
        <text x={239} y={511} fill="#8C8B83">portfolio (web)</text>
        <rect x={380} y={500} width={13} height={13} rx={3} fill="rgba(232,230,223,0.05)" stroke="rgba(232,230,223,0.30)" />
        <text x={399} y={511} fill="#8C8B83">core / integration</text>
      </g>
    </svg>
  );
}
