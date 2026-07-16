/**
 * <ChemoTrajectories> — the server-rendered, house-style top-down trajectory
 * visual for the chemotaxis headline (Behaviors / chemotaxis, CH-C).
 *
 * It reads the recorded `trajectories.json` (the real CH-A rollouts) and draws,
 * for each *trained* azimuth, the fly's path curving from the spawn toward the
 * odor source — the source marked, the reach radius shown as a dashed ring, and
 * the closest-approach distance annotated. No data is synthesised and nothing is
 * hard-coded: every coordinate, the source positions, and the reach radius come
 * straight from the export. Pure SVG, no client JS — this renders on the server
 * so the headline is guaranteed even where WASM can't run.
 *
 * Reuses the SystemDiagram / GradientField house palette (site green/amber,
 * `var(--mono)`), so it sits next to the recorded approach clips as one piece.
 */

const GREEN = "var(--green)";
const AMBER = "var(--amber)";
const INK = "var(--ink)";
const SUB = "var(--ink-dim)";
const RULE = "rgba(232,230,223,0.18)";

const VW = 440;
const VH = 380;
const MARGIN = 30;

export type ChemoEpisode = {
  azimuth_deg: number;
  source_xy: [number, number];
  reach_radius: number;
  reached: boolean;
  min_dist: number;
  tortuosity: number;
  path_xy: [number, number][];
};

/** Human label for the three trained azimuths. */
const AZ_LABEL: Record<number, string> = {
  0: "ahead · 0°",
  90: "left · 90°",
  270: "right · 270°",
};

function azLabel(deg: number): string {
  return AZ_LABEL[Math.round(deg)] ?? `${Math.round(deg)}°`;
}

export function ChemoTrajectories({
  episodes,
  lambda,
}: {
  /** The trained-azimuth episodes to draw (already filtered upstream). */
  episodes: ChemoEpisode[];
  /** Odor decay length λ — only used for the faint field tint. */
  lambda: number;
}) {
  // ── shared world → screen transform (uniform scale, so the reach rings stay
  // circular). Fit every path point + every source + its reach ring. ──────────
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const ep of episodes) {
    const pts: [number, number][] = [...ep.path_xy, ep.source_xy];
    for (const [x, y] of pts) {
      const r = ep.reach_radius;
      if (x - r < minX) minX = x - r;
      if (x + r > maxX) maxX = x + r;
      if (y - r < minY) minY = y - r;
      if (y + r > maxY) maxY = y + r;
    }
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((VW - 2 * MARGIN) / spanX, (VH - 2 * MARGIN) / spanY);
  // Centre the fitted content in the viewBox.
  const offX = (VW - spanX * scale) / 2;
  const offY = (VH - spanY * scale) / 2;
  // World y is "up"; screen y grows downward, so flip.
  const sx = (x: number) => offX + (x - minX) * scale;
  const sy = (y: number) => VH - (offY + (y - minY) * scale);

  // Downsample the 251-point paths for a light DOM (~every 3rd point).
  const polyPoints = (path: [number, number][]) => {
    const out: string[] = [];
    for (let i = 0; i < path.length; i += 3) out.push(`${sx(path[i][0]).toFixed(1)},${sy(path[i][1]).toFixed(1)}`);
    const last = path[path.length - 1];
    out.push(`${sx(last[0]).toFixed(1)},${sy(last[1]).toFixed(1)}`);
    return out.join(" ");
  };

  const reached = episodes.filter((e) => e.reached).length;
  const desc = `Top-down view of ${episodes.length} recorded rollouts. From a single spawn the fly walks toward an odor source placed ${azLabel(0)}, ${azLabel(90)}, and ${azLabel(270)}; it reaches the source (enters the dashed reach ring) on ${reached} of ${episodes.length}. The turn toward each source is emergent — it falls out of the left-minus-right antenna difference, with no hard-coded turn.`;

  return (
    <figure className="cg-traj-fig">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="cg-traj-svg"
        role="group"
        aria-labelledby="cg-traj-title cg-traj-desc"
      >
        <title id="cg-traj-title">
          Recorded chemotaxis trajectories: the fly&apos;s path curving to the
          source for each trained azimuth
        </title>
        <desc id="cg-traj-desc">{desc}</desc>

        <defs>
          {episodes.map((ep, i) => (
            <radialGradient
              key={`g${i}`}
              id={`cg-traj-odor-${i}`}
              gradientUnits="userSpaceOnUse"
              cx={sx(ep.source_xy[0])}
              cy={sy(ep.source_xy[1])}
              r={lambda * scale}
            >
              <stop offset="0" stopColor={AMBER} stopOpacity={0.22} />
              <stop offset="0.4" stopColor={AMBER} stopOpacity={0.08} />
              <stop offset="1" stopColor={AMBER} stopOpacity={0} />
            </radialGradient>
          ))}
          <marker
            id="cg-traj-arrow"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6.5"
            markerHeight="6.5"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" fill={GREEN} />
          </marker>
          <clipPath id="cg-traj-clip">
            <rect x={0} y={0} width={VW} height={VH} rx={8} />
          </clipPath>
        </defs>

        <g clipPath="url(#cg-traj-clip)">
          <rect x={0} y={0} width={VW} height={VH} fill="rgba(232,230,223,0.02)" />
          {/* soft odor-field tint around each source */}
          {episodes.map((_, i) => (
            <rect key={`t${i}`} x={0} y={0} width={VW} height={VH} fill={`url(#cg-traj-odor-${i})`} />
          ))}

          {/* paths + sources */}
          {episodes.map((ep, i) => {
            const ssx = sx(ep.source_xy[0]);
            const ssy = sy(ep.source_xy[1]);
            return (
              <g key={`ep${i}`}>
                {/* reach radius ring */}
                <circle
                  cx={ssx}
                  cy={ssy}
                  r={ep.reach_radius * scale}
                  fill="none"
                  stroke={AMBER}
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
                {/* the walked path, curving to the source */}
                <polyline
                  points={polyPoints(ep.path_xy)}
                  fill="none"
                  stroke={GREEN}
                  strokeOpacity={0.85}
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  markerEnd="url(#cg-traj-arrow)"
                />
                {/* source marker */}
                <circle cx={ssx} cy={ssy} r={4.5} fill={AMBER} stroke={INK} strokeWidth={1.2} />
                {/* per-source label + closest approach */}
                <text x={ssx} y={ssy - ep.reach_radius * scale - 7} fill={AMBER} fontSize={11} textAnchor="middle">
                  {azLabel(ep.azimuth_deg)}
                </text>
                <text
                  x={ssx}
                  y={ssy - ep.reach_radius * scale - 7 + 13}
                  fill={SUB}
                  fontSize={9.5}
                  textAnchor="middle"
                >
                  min {ep.min_dist.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* the shared spawn point (all paths start here) */}
          {episodes[0] && (
            <g>
              <circle
                cx={sx(episodes[0].path_xy[0][0])}
                cy={sy(episodes[0].path_xy[0][1])}
                r={4}
                fill="none"
                stroke={INK}
                strokeWidth={1.4}
              />
              <text
                x={sx(episodes[0].path_xy[0][0]) + 8}
                y={sy(episodes[0].path_xy[0][1]) + 11}
                fill={INK}
                fontSize={9.5}
                opacity={0.7}
              >
                spawn
              </text>
            </g>
          )}
        </g>

        {/* frame */}
        <rect x={0.5} y={0.5} width={VW - 1} height={VH - 1} rx={8} fill="none" stroke={RULE} strokeWidth={1} />
      </svg>

      <figcaption className="cg-traj-cap">
        Three recorded rollouts from one spawn: the source placed{" "}
        <strong style={{ color: AMBER }}>ahead</strong>, to the{" "}
        <strong style={{ color: AMBER }}>left</strong>, and to the{" "}
        <strong style={{ color: AMBER }}>right</strong>. The fly reaches it (enters
        the dashed reach ring) on all three — and the turn toward each source is{" "}
        <strong>emergent</strong>, falling out of the <code>cL − cR</code> antenna
        difference rather than any hard-coded rule.
      </figcaption>
    </figure>
  );
}

export default ChemoTrajectories;
