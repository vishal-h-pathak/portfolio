"use client";

/**
 * Cellular Gaits — how the behaviors build on the closed loop (Behaviors hub).
 *
 * R3 consolidation: the Behaviors hub used to repeat the open-vs-closed loop
 * diagram already shown on Sensing (two near-identical panels, one extra arc,
 * vertical-ish labels). That redundancy is gone — the loop-as-built-now diagram
 * lives once, on Sensing (SignalPathDiagram). Here we show the thing the hub
 * actually needs: a small block diagram of how the implemented behaviors break
 * down and connect.
 *
 *   closed proprioceptive loop  ──▶  Perturbation   (the loop itself, under a shove)
 *        (the shared base)       ──▶  Chemotaxis     (+ a bilateral odor gradient)
 *                                ──▶  Escape  ──▶  connectome brain (Embodied)
 *                                ──▶  Navigation     (building — feelers + a goal)
 *
 * Each behavior = the same closed loop plus one new sense and a reward; Escape is
 * the bridge that maps onto a real, mapped circuit and plugs into the connectome.
 * Pure SVG, horizontal labels only — NO three.js / WASM on this content route.
 */

const GREEN = "#6FE39A";
const SUB = "#8C8B83";
const DIM = "#B9B7AE";

const W = 520;
const H = 290;

// Shared base block (the closed loop) on the left.
const BASE = { x: 14, y: 104, w: 132, h: 80 };
const BASE_MID = { x: BASE.x + BASE.w, y: BASE.y + BASE.h / 2 };

// Behavior blocks down the right.
const BBX = 196;
const BBW = 178;
const BBH = 56;

type Beh = {
  id: string;
  y: number;
  title: string;
  sense: string;
  reward: string;
  status: "live" | "building";
};

const BEHAVIORS: Beh[] = [
  { id: "perturb", y: 6, title: "Perturbation", sense: "the loop, under a shove", reward: "→ hold heading", status: "live" },
  { id: "chemo", y: 74, title: "Chemotaxis", sense: "+ bilateral odor gradient", reward: "→ reach the source", status: "live" },
  { id: "escape", y: 142, title: "Escape", sense: "+ looming detector", reward: "→ flee, correct way", status: "live" },
  { id: "nav", y: 210, title: "Navigation", sense: "+ feelers + goal bearing", reward: "→ seek + avoid", status: "building" },
];

// Connectome chip the Escape row bridges to.
const CHIP = { x: 392, y: 142, w: 120, h: 56 };

function midY(b: Beh) {
  return b.y + BBH / 2;
}

export function BehaviorMap() {
  return (
    <figure className="cg-loop-fig" style={{ maxWidth: 620, margin: "0 auto" }}>
      <div className="sysdiagram cg-loop-panel">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby="behmap-title behmap-desc"
          style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
        >
          <title id="behmap-title">How the behaviors build on the closed loop</title>
          <desc id="behmap-desc">
            A shared base block — the closed proprioceptive loop — branches to four
            behaviors. Perturbation is that loop under a shove; Chemotaxis adds a
            bilateral odor gradient; Escape adds a looming detector and bridges to
            the real connectome brain detailed on the Embodied page; Navigation,
            still building, adds short-range feelers and a goal bearing. Each
            behavior is the same closed loop plus one new sense and a reward.
          </desc>

          <defs>
            <marker id="behmap-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={GREEN} />
            </marker>
            <marker id="behmap-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={DIM} />
            </marker>
          </defs>

          {/* connectors: base → each behavior */}
          {BEHAVIORS.map((b) => {
            const live = b.status === "live";
            return (
              <line
                key={`c-${b.id}`}
                x1={BASE_MID.x}
                y1={BASE_MID.y}
                x2={BBX}
                y2={midY(b)}
                stroke={live ? GREEN : DIM}
                strokeWidth={1.3}
                strokeDasharray={live ? undefined : "5 4"}
                markerEnd={`url(#behmap-${live ? "green" : "dim"})`}
                opacity={live ? 0.85 : 0.7}
              />
            );
          })}

          {/* escape → connectome bridge */}
          <line
            x1={BBX + BBW}
            y1={midY(BEHAVIORS[2])}
            x2={CHIP.x}
            y2={CHIP.y + CHIP.h / 2}
            stroke={GREEN}
            strokeWidth={1.3}
            markerEnd="url(#behmap-green)"
            opacity={0.85}
          />

          {/* base block — the closed loop */}
          <rect
            x={BASE.x}
            y={BASE.y}
            width={BASE.w}
            height={BASE.h}
            rx={6}
            fill="rgba(111,227,154,0.10)"
            stroke={GREEN}
            strokeWidth={1.2}
          />
          <text x={BASE.x + 14} y={BASE.y + 30} fill={GREEN} fontSize={13} fontWeight={500}>closed loop</text>
          <text x={BASE.x + 14} y={BASE.y + 49} fill={SUB} fontSize={9.5}>proprioception</text>
          <text x={BASE.x + 14} y={BASE.y + 64} fill={SUB} fontSize={9.5}>live · Sensing</text>

          {/* behavior blocks */}
          {BEHAVIORS.map((b) => {
            const live = b.status === "live";
            const stroke = live ? GREEN : DIM;
            return (
              <g key={b.id}>
                <rect
                  x={BBX}
                  y={b.y}
                  width={BBW}
                  height={BBH}
                  rx={6}
                  fill={live ? "rgba(111,227,154,0.10)" : "rgba(232,230,223,0.05)"}
                  stroke={stroke}
                  strokeWidth={1}
                  strokeDasharray={live ? undefined : "5 4"}
                />
                <text x={BBX + 14} y={b.y + 20} fill={live ? GREEN : DIM} fontSize={12.5} fontWeight={500}>
                  {b.title}
                </text>
                <text x={BBX + 14} y={b.y + 35} fill={SUB} fontSize={9.5}>{b.sense}</text>
                <text x={BBX + 14} y={b.y + 49} fill={live ? GREEN : DIM} fontSize={9.5} opacity={0.9}>
                  {b.reward}
                </text>
                {/* status pill, right-aligned in the block header */}
                <text
                  x={BBX + BBW - 12}
                  y={b.y + 20}
                  fill={live ? GREEN : DIM}
                  fontSize={8.5}
                  textAnchor="end"
                  opacity={0.85}
                >
                  {live ? "live" : "building"}
                </text>
              </g>
            );
          })}

          {/* connectome chip — the bridge Escape opens */}
          <rect
            x={CHIP.x}
            y={CHIP.y}
            width={CHIP.w}
            height={CHIP.h}
            rx={6}
            fill="rgba(111,227,154,0.05)"
            stroke={GREEN}
            strokeWidth={1}
            strokeOpacity={0.6}
          />
          <text x={CHIP.x + 12} y={CHIP.y + 23} fill={GREEN} fontSize={10.5} fontWeight={500}>connectome</text>
          <text x={CHIP.x + 12} y={CHIP.y + 37} fill={GREEN} fontSize={10.5} fontWeight={500}>brain</text>
          <text x={CHIP.x + 12} y={CHIP.y + 50} fill={SUB} fontSize={9}>Embodied →</text>
        </svg>
      </div>
      <figcaption className="cg-loop-cap">
        <span className="cg-loop-tag" data-kind="closed">built on the closed loop</span>
        every behavior is the same closed loop plus one new sense and a reward —{" "}
        <strong>Escape</strong> is the bridge that maps onto a real circuit and
        plugs into the connectome brain (the{" "}
        <a className="cg-inline-link" href="/projects/cellular-gaits/embodied">Embodied</a> page)
      </figcaption>
    </figure>
  );
}

export default BehaviorMap;
