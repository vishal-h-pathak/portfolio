/**
 * <SelectionRound> — the "under the hood" aside: how CMA-ES actually moves,
 * given only scores. This is the demoted, static replacement for the old broken
 * 2-D toy. It's a single frozen round, fly-anchored: each dot is one candidate
 * controller, scored by how far that fly walked; the best few (green) pull the
 * search center toward them and the sampling cloud reshapes for the next round.
 *
 * Static SVG, server component — nothing to freeze, no client JS, every label
 * visible. The mechanism it draws is the same one that produced the climb; this
 * is just one of its ~50 rounds, slowed to a picture.
 */

const GREEN = "#6FE39A";
const AMBER = "#E89B3D";
const SUB = "#8C8B83";
const INK = "#E8E6DF";
const RULE = "rgba(232,230,223,0.16)";

const W = 460;
const H = 340;

// old search center, and where this round's winners push it
const OLD = { x: 168, y: 212 };
const NEW = { x: 232, y: 150 };

// candidate dots — winners cluster up-and-right (the better-walking region)
const WINNERS: [number, number][] = [
  [214, 150],
  [240, 174],
  [198, 132],
  [256, 162],
  [224, 188],
];
const REST: [number, number][] = [
  [120, 252],
  [150, 236],
  [112, 202],
  [142, 182],
  [178, 256],
  [132, 162],
  [206, 252],
  [96, 228],
  [164, 292],
  [250, 240],
  [118, 282],
  [188, 210],
];

export function SelectionRound() {
  return (
    <figure className="cg-opt-round">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="cg-sr-title cg-sr-desc"
        style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
      >
        <title id="cg-sr-title">One round of CMA-ES selection</title>
        <desc id="cg-sr-desc">
          A scatter of candidate controllers sampled from the current search
          distribution, shown as an ellipse. Each dot is one controller scored by
          how far its fly walked. The best handful, in green, cluster toward the
          better-walking region; the search center moves from the old mean toward
          them, and the sampling ellipse contracts and reshapes for the next
          round. No gradient is used — only the scores and their ranking.
        </desc>

        <defs>
          <marker id="cg-sr-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" fill={GREEN} />
          </marker>
        </defs>

        {/* frame */}
        <rect x={1} y={1} width={W - 2} height={H - 2} rx={4} fill="rgba(232,230,223,0.012)" stroke={RULE} />

        {/* "better walks" direction hint (no gradient — just where high scores sit) */}
        <text x={W - 16} y={28} textAnchor="end" fontSize={9.5} fill={SUB}>
          better-walking controllers ↗
        </text>

        {/* current sampling distribution */}
        <g transform={`rotate(-38 ${OLD.x} ${OLD.y})`}>
          <ellipse cx={OLD.x} cy={OLD.y} rx={78} ry={44} fill="rgba(232,155,61,0.05)" stroke={AMBER} strokeWidth={1.3} opacity={0.7} />
        </g>
        {/* next round's distribution — contracted toward the winners */}
        <g transform={`rotate(-38 ${NEW.x} ${NEW.y})`}>
          <ellipse cx={NEW.x} cy={NEW.y} rx={50} ry={30} fill="none" stroke={GREEN} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.8} />
        </g>

        {/* candidate dots */}
        {REST.map(([x, y], i) => (
          <circle key={`r${i}`} cx={x} cy={y} r={2.6} fill="rgba(232,230,223,0.42)" />
        ))}
        {WINNERS.map(([x, y], i) => (
          <circle key={`w${i}`} cx={x} cy={y} r={3.6} fill={GREEN} />
        ))}

        {/* old mean (amber +) → new mean (green +) */}
        <line x1={OLD.x} y1={OLD.y} x2={NEW.x} y2={NEW.y} stroke={GREEN} strokeWidth={1.6} markerEnd="url(#cg-sr-arrow)" opacity={0.9} />
        <Plus x={OLD.x} y={OLD.y} color={AMBER} />
        <Plus x={NEW.x} y={NEW.y} color={GREEN} />

        {/* annotations on two example dots */}
        <text x={266} y={166} fontSize={9} fill={GREEN}>
          walked far ✓
        </text>
        <text x={164} y={308} textAnchor="middle" fontSize={9} fill={SUB}>
          fell over
        </text>
        <text x={OLD.x - 10} y={OLD.y + 4} textAnchor="end" fontSize={9} fill={SUB}>
          this round&apos;s center
        </text>
        <text x={NEW.x + 12} y={NEW.y - 8} fontSize={9} fill={GREEN}>
          next center
        </text>

        {/* axis caption */}
        <text x={16} y={H - 14} fontSize={9.5} fill={SUB} letterSpacing="0.03em">
          controller parameter space · 660-D, drawn as 2-D
        </text>
      </svg>

      <figcaption className="cg-opt-round-cap">
        <span className="cg-opt-round-h">one round, repeated ~50×</span>
        <ol>
          <li>
            <strong>Sample</strong> ~32 candidate controllers from the current
            guess — the ellipse.
          </li>
          <li>
            <strong>Score</strong> each by how far its fly walked (one full
            rollout per candidate).
          </li>
          <li>
            <strong>Keep the best</strong> handful (green) and recenter the search
            on them; the ellipse contracts and reshapes toward what worked.
          </li>
          <li>
            <strong>Repeat.</strong> Fifty rounds of this <em>is</em> the climb
            above — score and rank, never a gradient.
          </li>
        </ol>
      </figcaption>
    </figure>
  );
}

function Plus({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g stroke={color} strokeWidth={1.6}>
      <line x1={x - 5} y1={y} x2={x + 5} y2={y} />
      <line x1={x} y1={y - 5} x2={x} y2={y + 5} />
    </g>
  );
}

export default SelectionRound;
