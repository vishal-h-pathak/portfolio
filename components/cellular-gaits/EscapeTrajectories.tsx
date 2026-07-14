/**
 * <EscapeTrajectories> — the server-rendered, house-style top-down trajectory
 * map for the escape headline (Behaviors / escape, X-C).
 *
 * Small multiples: one panel per recorded episode (the real X-A rollouts from
 * `trajectories.json`). Each panel draws the fly's path bolting away (green), the
 * looming threat's incoming course (orange, nulls before onset skipped), the
 * target-leading aim point with its hit-radius ring, the onset marker, and the
 * episode's escaped / closest-approach / away-turn annotations. The **trained**
 * panel {0, 90, 270} is separated from the **held-out** panel {45, 135, 315} —
 * the generalization (survival beyond the trained azimuths) is the whole point.
 * Nothing is synthesised and nothing hard-coded: every coordinate, the aim
 * points, the hit radius, and the metrics come straight from the export. Pure
 * SVG, no client JS — this renders on the server so the headline is guaranteed
 * even where WASM can't run.
 *
 * Reuses the SystemDiagram / GradientField house palette (site green/amber, an
 * escape orange, `var(--mono)`), so it sits next to the recorded flee clips as
 * one piece.
 */

const GREEN = "var(--green)";
const THREAT = "var(--signal-onset)";
const INK = "var(--ink)";
const SUB = "var(--ink-dim)";
const RULE = "rgba(232,230,223,0.18)";

const PW = 232;
const PH = 208;
const MARGIN = 20;

export type EscapeEpisode = {
  azimuth_deg: number;
  onset_step: number;
  aim_xy: [number, number];
  hit_radius: number;
  escaped: boolean;
  min_dist: number;
  reaction_latency_s: number | null;
  total_away_turn: number;
  fly_xy: [number, number][];
  threat_xy: ([number, number] | null)[];
};

const AZ_LABEL: Record<number, string> = {
  0: "front · 0°",
  90: "left · 90°",
  270: "right · 270°",
  45: "diag · 45°",
  135: "diag · 135°",
  315: "diag · 315°",
};

function azLabel(deg: number): string {
  return AZ_LABEL[Math.round(deg)] ?? `${Math.round(deg)}°`;
}

function fmtTurn(v: number): string {
  const r = v.toFixed(2);
  return (v >= 0 ? "+" : "") + r;
}

/** One small-multiple panel for a single recorded episode. */
function EpisodePanel({ ep }: { ep: EscapeEpisode }) {
  const threatPts = ep.threat_xy.filter((p): p is [number, number] => p != null);

  // Fit: every fly point + every (non-null) threat point + the aim ring.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const consider = (x: number, y: number, pad = 0) => {
    if (x - pad < minX) minX = x - pad;
    if (x + pad > maxX) maxX = x + pad;
    if (y - pad < minY) minY = y - pad;
    if (y + pad > maxY) maxY = y + pad;
  };
  for (const [x, y] of ep.fly_xy) consider(x, y);
  for (const [x, y] of threatPts) consider(x, y);
  consider(ep.aim_xy[0], ep.aim_xy[1], ep.hit_radius);

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((PW - 2 * MARGIN) / spanX, (PH - 2 * MARGIN) / spanY);
  const offX = (PW - spanX * scale) / 2;
  const offY = (PH - spanY * scale) / 2;
  const sx = (x: number) => offX + (x - minX) * scale;
  const sy = (y: number) => PH - (offY + (y - minY) * scale); // world +y up

  const poly = (pts: [number, number][], stride: number) => {
    const out: string[] = [];
    for (let i = 0; i < pts.length; i += stride) out.push(`${sx(pts[i][0]).toFixed(1)},${sy(pts[i][1]).toFixed(1)}`);
    const last = pts[pts.length - 1];
    if (last) out.push(`${sx(last[0]).toFixed(1)},${sy(last[1]).toFixed(1)}`);
    return out.join(" ");
  };

  const onset = ep.fly_xy[Math.min(ep.onset_step, ep.fly_xy.length - 1)];
  const spawn = ep.fly_xy[0];
  const [aimSx, aimSy] = [sx(ep.aim_xy[0]), sy(ep.aim_xy[1])];
  const latency = ep.reaction_latency_s == null ? "—" : `${(ep.reaction_latency_s * 1000).toFixed(0)} ms`;

  const aria = `Azimuth ${azLabel(ep.azimuth_deg)}: the fly bolts away from a threat looming from ${azLabel(ep.azimuth_deg)}. ${ep.escaped ? "Escaped" : "Hit"}; closest approach ${ep.min_dist.toFixed(1)} units; away-turn ${fmtTurn(ep.total_away_turn)} rad; reaction ${latency}.`;

  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} className="cg-escape-traj-svg" role="img" aria-label={aria}>
      <rect x={0.5} y={0.5} width={PW - 1} height={PH - 1} rx={7} fill="rgba(232,230,223,0.02)" stroke={RULE} strokeWidth={1} />

      {/* hit-radius ring around the target-leading aim point */}
      <circle cx={aimSx} cy={aimSy} r={ep.hit_radius * scale} fill="none" stroke={THREAT} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 4" />
      {/* aim point (×) */}
      <path
        d={`M${(aimSx - 4).toFixed(1)} ${(aimSy - 4).toFixed(1)}L${(aimSx + 4).toFixed(1)} ${(aimSy + 4).toFixed(1)}M${(aimSx + 4).toFixed(1)} ${(aimSy - 4).toFixed(1)}L${(aimSx - 4).toFixed(1)} ${(aimSy + 4).toFixed(1)}`}
        stroke={THREAT}
        strokeOpacity={0.7}
        strokeWidth={1.2}
      />

      {/* the threat's incoming course */}
      {threatPts.length > 1 && (
        <polyline
          points={poly(threatPts, 2)}
          fill="none"
          stroke={THREAT}
          strokeOpacity={0.8}
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
          markerEnd="url(#cg-esc-arrow-threat)"
        />
      )}

      {/* the fly's path, bolting away */}
      <polyline
        points={poly(ep.fly_xy, 3)}
        fill="none"
        stroke={GREEN}
        strokeOpacity={0.9}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        markerEnd="url(#cg-esc-arrow-fly)"
      />

      {/* spawn + onset markers */}
      {spawn && <circle cx={sx(spawn[0])} cy={sy(spawn[1])} r={3} fill="none" stroke={INK} strokeWidth={1.2} opacity={0.6} />}
      {onset && <circle cx={sx(onset[0])} cy={sy(onset[1])} r={3.4} fill={INK} stroke={INK} strokeWidth={1} opacity={0.85} />}

      {/* label + metrics */}
      <text x={10} y={16} fill={INK} fontSize={11} fontWeight={500}>
        {azLabel(ep.azimuth_deg)}
      </text>
      <text x={PW - 10} y={16} fill={ep.escaped ? GREEN : THREAT} fontSize={10.5} textAnchor="end">
        {ep.escaped ? "escaped" : "hit"}
      </text>
      <text x={10} y={PH - 22} fill={SUB} fontSize={9.5}>
        closest {ep.min_dist.toFixed(1)}
      </text>
      <text x={10} y={PH - 10} fill={SUB} fontSize={9.5}>
        away-turn {fmtTurn(ep.total_away_turn)} · {latency}
      </text>
    </svg>
  );
}

export function EscapeTrajectories({
  episodes,
  trainedAzimuths,
}: {
  episodes: EscapeEpisode[];
  /** The trained-panel azimuths (rounded) — the rest render as held-out. */
  trainedAzimuths: number[];
}) {
  const trained = new Set(trainedAzimuths.map((d) => Math.round(d)));
  const order = (a: EscapeEpisode) => {
    const m: Record<number, number> = { 0: 0, 90: 1, 270: 2, 45: 0, 135: 1, 315: 2 };
    return m[Math.round(a.azimuth_deg)] ?? 9;
  };
  const trainedEps = episodes.filter((e) => trained.has(Math.round(e.azimuth_deg))).sort((a, b) => order(a) - order(b));
  const heldEps = episodes.filter((e) => !trained.has(Math.round(e.azimuth_deg))).sort((a, b) => order(a) - order(b));

  const escapedAll = episodes.filter((e) => e.escaped).length;

  return (
    <figure className="cg-escape-traj">
      {/* shared arrow markers */}
      <svg width={0} height={0} aria-hidden="true" style={{ position: "absolute" }}>
        <defs>
          <marker id="cg-esc-arrow-fly" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={GREEN} />
          </marker>
          <marker id="cg-esc-arrow-threat" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={THREAT} />
          </marker>
        </defs>
      </svg>

      <div className="cg-escape-traj-group">
        <p className="cg-escape-traj-grouph">
          <span className="cg-escape-traj-tag" data-kind="trained">
            trained
          </span>{" "}
          front · left · right — the panel X-A was selected on
        </p>
        <div className="cg-escape-traj-grid">
          {trainedEps.map((ep) => (
            <EpisodePanel key={`t-${ep.azimuth_deg}`} ep={ep} />
          ))}
        </div>
      </div>

      <div className="cg-escape-traj-group">
        <p className="cg-escape-traj-grouph">
          <span className="cg-escape-traj-tag" data-kind="held">
            held-out
          </span>{" "}
          diagonals never trained on — survival generalizes
        </p>
        <div className="cg-escape-traj-grid">
          {heldEps.map((ep) => (
            <EpisodePanel key={`h-${ep.azimuth_deg}`} ep={ep} />
          ))}
        </div>
      </div>

      <figcaption className="cg-traj-cap">
        Each panel is one recorded rollout: the <strong style={{ color: GREEN }}>fly</strong>{" "}
        bolting away from a <strong style={{ color: THREAT }}>threat</strong> looming
        in toward its target-leading aim point (the ✕, ringed by the hit radius). The
        fly survives all <strong>{escapedAll} of {episodes.length}</strong> — the{" "}
        <strong>trained</strong> front/left/right panel and the{" "}
        <strong>held-out</strong> diagonals alike — and the escape{" "}
        <em>direction</em> is emergent, falling out of the{" "}
        <code>loom_L − loom_R</code> asymmetry rather than any hard-coded rule.
      </figcaption>
    </figure>
  );
}

export default EscapeTrajectories;
