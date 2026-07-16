import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { EscapeCircuit } from "@/components/cellular-gaits/EscapeCircuit";
import { EscapeDemo, type EscapeConfig } from "@/components/cellular-gaits/EscapeDemo";
import {
  EscapeTrajectories,
  type EscapeEpisode,
} from "@/components/cellular-gaits/EscapeTrajectories";
import { CG_BASE } from "@/components/cellular-gaits/tabs";

export const metadata: Metadata = {
  title: "Escape — Cellular Gaits",
  description:
    "The connectome-aligned behavior: a looming threat read bilaterally, fled fast in the right direction. It maps onto the real Drosophila escape circuit (LC4 / LPLC2 → the Giant Fiber / DNp01) — and that circuit is now wired in, run as a spiking connectome in the embodied loop.",
};

const PARTS = [
  { key: "sense", label: "What it senses" },
  { key: "reward", label: "The reward" },
  { key: "expectation", label: "The result" },
  { key: "connectome", label: "Connectome link" },
];

type Metrics = {
  config: EscapeConfig;
  trained: {
    per_azimuth: {
      azimuth_deg: number;
      escaped: boolean;
      min_dist: number;
      reaction_latency_s: number | null;
      total_away_turn: number;
    }[];
    aggregate: {
      escape_success_rate: number;
      mean_min_dist: number;
      mean_reaction_latency_s: number;
    };
  };
  held_out: {
    aggregate: { escape_success_rate: number; mean_min_dist: number };
  };
};

type Trajectories = { episodes: EscapeEpisode[] };

// ── the embodied-loop (data-eb, schema-v2) traces — read here to mark, on a
// legible top-down, WHERE the threat came from and WHEN the fly pivoted. These
// are the connectome embodied-loop runs (the Embodied tab), shown on the escape
// page because "where was the threat / when did it pivot" is the escape question.
type EbCondition = {
  key: string;
  label: string;
  azimuth_deg: number | null;
  trace: string;
  clip: string;
  gf_peak_hz: number;
  outcome: string;
};
type EbThreatTrack = {
  onset_step: number;
  entry_xy: [number, number];
  aim_xy: [number, number];
  path_xy: ([number, number] | null)[];
  azimuth_deg: number;
  speed: number;
  radius: number;
  hit_radius: number;
};
export type EbTrace = {
  condition: string;
  threat_onset_step: number;
  control_dt_s: number;
  summary: {
    gf_peak_hz: number;
    displacement: number;
    pivot_step: number | null;
    pivot_t_s: number | null;
    pivot_threshold_deg?: number;
    threat_min_dist: number | null;
  };
  body: { t_s: number[]; thorax_xy: [number, number][]; yaw_deg: number[] };
  threat_track: EbThreatTrack | null;
};

/** Read the real X-A escape metrics + recorded trajectories, plus the embodied
 * loop's schema-v2 traces (for the threat-entry / pivot top-down). Server-side. */
async function readData(): Promise<{
  metrics: Metrics;
  trajectories: Trajectories;
  eb: { conditions: EbCondition[]; traces: Record<string, EbTrace> };
}> {
  const base = join(process.cwd(), "public/cellular-gaits/data-x");
  const ebBase = join(process.cwd(), "public/cellular-gaits/data-eb");
  const [m, t, man] = await Promise.all([
    readFile(join(base, "escape_metrics.json"), "utf8"),
    readFile(join(base, "trajectories.json"), "utf8"),
    readFile(join(ebBase, "manifest.json"), "utf8"),
  ]);
  const conditions = (JSON.parse(man) as { conditions: EbCondition[] }).conditions;
  const traceArr = await Promise.all(
    conditions.map((c) =>
      readFile(join(ebBase, c.trace), "utf8").then(
        (s) => JSON.parse(s.replace(/-?Infinity/g, "null").replace(/\bNaN\b/g, "null")) as EbTrace,
      ),
    ),
  );
  const traces: Record<string, EbTrace> = {};
  conditions.forEach((c, i) => (traces[c.key] = traceArr[i]));
  return {
    metrics: JSON.parse(m.replace(/-?Infinity/g, "null").replace(/\bNaN\b/g, "null")) as Metrics,
    trajectories: JSON.parse(t) as Trajectories,
    eb: { conditions, traces },
  };
}

const ms = (s: number | null) => (s == null ? "—" : `${Math.round(s * 1000)} ms`);
const turn = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(2);

// ── the embodied-loop top-down map: threat entry + pivot instant ──────────────
const EB_GREEN = "var(--green)";
const EB_THREAT = "var(--signal-onset)";
const EB_INK = "var(--ink)";
const EB_SUB = "var(--ink-dim)";
const EB_FAINT = "var(--ink-faint)";
const EB_RULE = "rgba(232,230,223,0.18)";
const MP_W = 248;
const MP_H = 214;
const MP_M = 24;

/** One condition's top-down panel: the fly's path (dim before onset, bright
 * after), the threat's incoming course from where it ENTERED, and a ring at the
 * PIVOT step — the instant |turn vs baseline| first crosses the threshold. All
 * coordinates and the pivot/onset steps come straight from the schema-v2 trace. */
function EbPanel({ cond, trace }: { cond: EbCondition; trace: EbTrace }) {
  const xy = trace.body.thorax_xy;
  const tt = trace.threat_track;
  const threatPts = tt
    ? tt.path_xy.filter((p): p is [number, number] => p != null)
    : [];
  const onset = trace.threat_onset_step;
  const pivot = trace.summary.pivot_step;
  const hasThreat = tt != null && onset >= 0;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const consider = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  for (const [x, y] of xy) consider(x, y);
  for (const [x, y] of threatPts) consider(x, y);
  if (tt) {
    consider(tt.entry_xy[0], tt.entry_xy[1]);
    consider(tt.aim_xy[0], tt.aim_xy[1]);
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((MP_W - 2 * MP_M) / spanX, (MP_H - 2 * MP_M) / spanY);
  const offX = (MP_W - spanX * scale) / 2;
  const offY = (MP_H - spanY * scale) / 2;
  const sx = (x: number) => offX + (x - minX) * scale;
  const sy = (y: number) => MP_H - (offY + (y - minY) * scale); // world +y up

  const poly = (pts: [number, number][]) =>
    pts.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");

  const onsetIdx = hasThreat ? Math.min(onset, xy.length - 1) : -1;
  const preFly = hasThreat ? poly(xy.slice(0, onsetIdx + 1)) : "";
  const postFly = hasThreat ? poly(xy.slice(onsetIdx)) : poly(xy);
  const start = xy[0];
  const end = xy[xy.length - 1];
  const onsetPt = hasThreat ? xy[onsetIdx] : null;
  const pivotPt = pivot != null && pivot < xy.length ? xy[pivot] : null;
  // pivot latency = how long after the threat launched the decisive turn happened.
  const pivotAfterOnsetMs =
    pivot != null && hasThreat ? (pivot - onset) * trace.control_dt_s * 1000 : null;

  const aria = hasThreat
    ? `${cond.label}: a threat enters from azimuth ${Math.round(tt!.azimuth_deg)} degrees and the fly bolts away; it pivots ${
        pivotAfterOnsetMs != null ? `${pivotAfterOnsetMs.toFixed(0)} milliseconds after onset` : "—"
      }. Giant Fiber peak ${cond.gf_peak_hz} hertz.`
    : `${cond.label}: no threat, the Giant Fiber stays silent, and the fly just walks — no pivot.`;

  return (
    <svg viewBox={`0 0 ${MP_W} ${MP_H}`} className="cg-eb-map-svg" role="img" aria-label={aria}>
      <rect x={0.5} y={0.5} width={MP_W - 1} height={MP_H - 1} rx={7} fill="rgba(232,230,223,0.02)" stroke={EB_RULE} strokeWidth={1} />

      {/* the threat's incoming course, from where it ENTERED to its lead aim */}
      {hasThreat && (
        <>
          {threatPts.length > 1 && (
            <polyline
              points={poly(threatPts)}
              fill="none"
              stroke={EB_THREAT}
              strokeOpacity={0.8}
              strokeWidth={1.6}
              strokeLinejoin="round"
              strokeLinecap="round"
              markerEnd="url(#cg-eb-map-arrow)"
            />
          )}
          {/* aim point (×) */}
          {(() => {
            const [ax, ay] = [sx(tt!.aim_xy[0]), sy(tt!.aim_xy[1])];
            return (
              <path
                d={`M${(ax - 4).toFixed(1)} ${(ay - 4).toFixed(1)}L${(ax + 4).toFixed(1)} ${(ay + 4).toFixed(1)}M${(ax + 4).toFixed(1)} ${(ay - 4).toFixed(1)}L${(ax - 4).toFixed(1)} ${(ay + 4).toFixed(1)}`}
                stroke={EB_THREAT}
                strokeOpacity={0.6}
                strokeWidth={1.2}
              />
            );
          })()}
          {/* where the threat ENTERED (edge-aware label: never under the title row,
              never clipped at the panel sides) */}
          {(() => {
            const [ex, ey] = [sx(tt!.entry_xy[0]), sy(tt!.entry_xy[1])];
            const ly = ey < 28 ? ey + 14 : ey - 7;
            const anchor = ex < 42 ? "start" : ex > MP_W - 42 ? "end" : "middle";
            const lx = anchor === "start" ? ex - 5 : anchor === "end" ? ex + 5 : ex;
            return (
              <>
                <circle cx={ex} cy={ey} r={4} fill="rgba(242,104,60,0.55)" stroke={EB_THREAT} strokeWidth={1.2} />
                <text x={lx} y={ly} textAnchor={anchor} fill={EB_THREAT} fontSize={8.5}>
                  threat enters
                </text>
              </>
            );
          })()}
        </>
      )}

      {/* the fly's path: dim before onset, bright after (green if it bolted) */}
      {preFly && <polyline points={preFly} fill="none" stroke={EB_SUB} strokeOpacity={0.6} strokeWidth={1.4} strokeLinejoin="round" />}
      {postFly && (
        <polyline
          points={postFly}
          fill="none"
          stroke={hasThreat ? EB_GREEN : EB_INK}
          strokeOpacity={0.9}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      )}

      {/* spawn · onset · pivot · end markers */}
      {start && <circle cx={sx(start[0])} cy={sy(start[1])} r={3} fill="none" stroke={EB_INK} strokeWidth={1.1} opacity={0.6} />}
      {onsetPt && <circle cx={sx(onsetPt[0])} cy={sy(onsetPt[1])} r={3.2} fill={EB_THREAT} opacity={0.85} />}
      {pivotPt && (() => {
        const px = sx(pivotPt[0]);
        const py = sy(pivotPt[1]);
        // label below the ring, unless that runs into the readout row at the foot
        const ly = py > MP_H - 26 ? py - 11 : py + 18;
        const anchor = px < 28 ? "start" : px > MP_W - 28 ? "end" : "middle";
        return (
          <>
            <circle cx={px} cy={py} r={6.5} fill="none" stroke={EB_GREEN} strokeWidth={1.6} />
            <circle cx={px} cy={py} r={2} fill={EB_GREEN} />
            <text x={px} y={ly} textAnchor={anchor} fill={EB_GREEN} fontSize={8.5}>
              pivot
            </text>
          </>
        );
      })()}
      {end && <circle cx={sx(end[0])} cy={sy(end[1])} r={3} fill={hasThreat ? EB_GREEN : EB_INK} />}

      {/* label + readouts */}
      <text x={10} y={16} fill={EB_INK} fontSize={11} fontWeight={500}>
        {cond.label.replace(/\s*\(.*\)$/, "")}
      </text>
      <text x={MP_W - 10} y={16} fill={cond.gf_peak_hz > 0 ? EB_GREEN : EB_SUB} fontSize={10} textAnchor="end">
        GF {cond.gf_peak_hz} Hz
      </text>
      <text x={10} y={MP_H - 10} fill={EB_SUB} fontSize={9}>
        {hasThreat
          ? pivotAfterOnsetMs != null
            ? `pivot +${pivotAfterOnsetMs.toFixed(0)} ms after onset`
            : "no pivot crossed"
          : "no threat · no pivot"}
      </text>
    </svg>
  );
}

/** The three embodied-loop runs, top-down: threat entry + pivot instant marked. */
function EmbodiedLoopMap({
  conditions,
  traces,
}: {
  conditions: EbCondition[];
  traces: Record<string, EbTrace>;
}) {
  return (
    <figure className="cg-eb-map">
      <svg width={0} height={0} aria-hidden="true" style={{ position: "absolute" }}>
        <defs>
          <marker id="cg-eb-map-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={EB_THREAT} />
          </marker>
        </defs>
      </svg>
      <div className="cg-eb-map-grid">
        {conditions.map((c) => {
          const tr = traces[c.key];
          return tr ? <EbPanel key={c.key} cond={c} trace={tr} /> : null;
        })}
      </div>
      <figcaption className="cg-traj-cap">
        The three embodied-loop runs (the{" "}
        <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
          Embodied
        </a>{" "}
        tab&apos;s connectome loop), drawn world-fixed so two questions are
        answerable at a glance: <strong style={{ color: EB_THREAT }}>where the threat
        entered</strong> (the orange dot, then its incoming course to the ✕ lead
        point) and <strong style={{ color: EB_GREEN }}>when the fly pivoted</strong>{" "}
        (the green ring — the first step after onset where its turn vs the no-threat
        baseline crosses 10°). The baseline has no threat and never pivots — it just
        walks. The dim grey segment is the pre-onset walk; the bright segment is the
        bolt.
      </figcaption>
    </figure>
  );
}

export default async function EscapeTabPage() {
  const { metrics, trajectories, eb } = await readData();
  const { config, trained, held_out } = metrics;

  const byAz = (deg: number) => trained.per_azimuth.find((a) => Math.round(a.azimuth_deg) === deg);
  const front = byAz(0);
  const left = byAz(90);
  const right = byAz(270);
  const escapedCount = trained.per_azimuth.filter((a) => a.escaped).length;
  const total = trained.per_azimuth.length;
  const trainedRate = Math.round(trained.aggregate.escape_success_rate * total);
  const heldRate = Math.round(held_out.aggregate.escape_success_rate * 3);

  return (
    <ConceptScaffold
      name="Escape"
      lead="This is the bridge to the endgame — and the endgame is now built. A looming object is read bilaterally — angular size and expansion rate, left eye vs right — and the fly flees fast in the correct direction. The direction isn't hard-coded; it falls out of the left−right looming asymmetry. And unlike the other behaviors, escape maps onto a real, mapped circuit — which now runs in the loop: the real FlyWire LC4/LPLC2 → Giant Fiber wiring, a spiking connectome driving the body (the Embodied tab)."
      explainerParts={PARTS}
      module={
        <div className="cg-escape">
          {/* 1 — the key standalone visual: the connectome-bridge diagram */}
          <div>
            <p className="cg-sense-h">The real circuit — now in the loop</p>
            <p className="cg-sense-p">
              Escape is the behavior with the cleanest known wiring diagram,
              which is exactly why it&apos;s the natural bridge to the connectome
              endgame. The amber backbone is the <strong>real</strong> circuit:
              a looming object read by two visual projection neuron types —{" "}
              <strong>LC4</strong> (angular velocity) and <strong>LPLC2</strong>{" "}
              (angular size) — converging on the <strong>Giant Fiber / DNp01</strong>,
              which sums size and velocity and whose single-spike timing sets a
              short vs long takeoff. The green rail is <strong>our hand-built
              stand-in</strong> mapped onto it: two bilateral loom channels stand
              in for LC4 + LPLC2, the learned controller for the descending
              readout. That stand-in is now only half the story — the real{" "}
              <code>LC4/LPLC2 → DNp01</code> wiring has since been run as a
              spiking connectome in a closed loop, routing a looming cue to an
              embodied escape (the{" "}
              <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
                Embodied
              </a>{" "}
              tab). Hover, tap, or focus any part to read its role.
            </p>
            <EscapeCircuit />
            <p className="cg-sense-cap">
              Cites Ache et al. 2019 (<em>Current Biology</em> — Giant Fiber
              size/velocity encoding) and von Reyn et al. 2017 (single-spike
              timing → short/long takeoff). The dashed band is the seam where the
              real FlyWire <code>LC4/LPLC2 → DNp01</code> wiring is now wired in —
              run as a spiking connectome alongside the hand-built front-end.
            </p>
          </div>

          {/* 2 — the live launch-the-threat demo (X-C) */}
          <div>
            <p className="cg-sense-h">Launch the threat</p>
            <p className="cg-sense-p">
              The live, in-browser escape: a MuJoCo fly running the{" "}
              <strong>trained</strong> controller, and a looming threat you launch
              at it from any azimuth. Each control step the loop reads the fly&apos;s
              pose from the sim, evaluates the analytic looming front-end against the
              live pose, and feeds the two eye magnitudes in — the fly bolts, and the{" "}
              <em>direction</em> falls out of the <code>loom_L − loom_R</code>{" "}
              asymmetry, never a hard-coded rule.
            </p>
            <EscapeDemo config={config} />
          </div>

          {/* 3 — the guaranteed headline: recorded flee clips both ways */}
          <div>
            <p className="cg-sense-h">Same controller, opposite threats → opposite bolts</p>
            <p className="cg-sense-p">
              Two recorded rollouts of the trained fly: a threat from the{" "}
              <strong>left</strong> and from the <strong>right</strong>. Same
              controller, opposite turns — and the direction is{" "}
              <strong>emergent</strong>, the response to a left-vs-right looming
              difference, never a hard-coded rule. Left threat (90°) →{" "}
              <strong>bolts right</strong> (away-turn {left ? turn(left.total_away_turn) : "—"},{" "}
              {left ? ms(left.reaction_latency_s) : "—"}); right threat (270°) →{" "}
              <strong>bolts left</strong> (
              {right ? turn(right.total_away_turn) : "—"},{" "}
              {right ? ms(right.reaction_latency_s) : "—"}); head-on (0°) escapes by{" "}
              displacement ({front ? front.min_dist.toFixed(1) : "—"} units).
            </p>
            <div
              className="cg-perturb-clips"
              role="group"
              aria-label="Recorded escape flees with a threat from the left and from the right"
            >
              <figure className="cg-perturb-clip">
                <video
                  src="/cellular-gaits/data-x/flee_left.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Recorded rollout: a threat looms from the left, the fly bolts right"
                />
                <figcaption>
                  <span className="cg-gaitclip-k" style={{ color: "var(--green)" }}>
                    threat left · 90°
                  </span>
                  <span className="cg-gaitclip-sub">looms left → bolts right</span>
                </figcaption>
              </figure>
              <figure className="cg-perturb-clip">
                <video
                  src="/cellular-gaits/data-x/flee_right.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Recorded rollout: a threat looms from the right, the fly bolts left"
                />
                <figcaption>
                  <span className="cg-gaitclip-k" style={{ color: "var(--green)" }}>
                    threat right · 270°
                  </span>
                  <span className="cg-gaitclip-sub">looms right → bolts left</span>
                </figcaption>
              </figure>
              {/*
                PLACEHOLDER — real-Drosophila looming-takeoff reference panel (rec #16).
                The review's ideal here is a real-fly escape clip beside the two sim
                rollouts, so the sim reads against the animal. Intentionally NOT built:
                we do not fabricate or scrape a reference clip (licensing + link-safety).
                Vishal supplies a licensed asset, then uncomment this third panel:

                <figure className="cg-perturb-clip">
                  <video
                    src="/cellular-gaits/data-x/real_fly_loom.mp4"
                    autoPlay loop muted playsInline
                    aria-label="Reference: a real Drosophila escape takeoff to a looming stimulus"
                  />
                  <figcaption>
                    <span className="cg-gaitclip-k">real fly · reference</span>
                    <span className="cg-gaitclip-sub">looming takeoff (licensed clip)</span>
                  </figcaption>
                </figure>
              */}
            </div>
            <p className="cg-sense-cap">
              Shared circuit across both panels:{" "}
              <strong>LC4 / LPLC2 → Giant Fiber (DNp01)</strong> — the same
              measured wiring drives both bolts; only the left−right looming
              asymmetry differs. A real-<em>Drosophila</em> reference clip belongs
              beside these two; that panel is a deliberate gap (a licensed asset,
              not a scraped one) — see the placeholder above.
            </p>
          </div>

          {/* 4 — the top-down trajectory map (real recorded paths) */}
          <div>
            <p className="cg-sense-h">Every escape, top-down — and it generalizes</p>
            <p className="cg-sense-p">
              The recorded rollouts as a map: each panel a fly bolting away from a
              threat streaking in toward its target-leading aim point. It survives on{" "}
              <strong>
                {escapedCount} of {total}
              </strong>{" "}
              trained azimuths (mean closest {trained.aggregate.mean_min_dist.toFixed(1)}{" "}
              units, mean reaction {ms(trained.aggregate.mean_reaction_latency_s)}) — and on
              the <strong>held-out</strong> diagonals {"{45°, 135°, 315°}"} it survives{" "}
              <strong>{heldRate}/3</strong> too. Survival generalizes beyond the panel it
              was selected on.
            </p>
            <EscapeTrajectories
              episodes={trajectories.episodes}
              trainedAzimuths={config.azimuths_deg}
            />
          </div>

          {/* 5 — the connectome loop, made legible: threat entry + pivot instant */}
          <div>
            <p className="cg-sense-h">Where the threat came from, when the fly pivoted</p>
            <p className="cg-sense-p">
              The hard thing to read in any escape clip is{" "}
              <em>where the threat entered</em> and <em>the instant the fly committed
              to its turn</em> — the tracking camera hides both. So here are the three{" "}
              <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
                embodied-loop
              </a>{" "}
              runs drawn <strong>world-fixed, top-down</strong>, with those two moments
              marked from the recorded trace: the{" "}
              <strong style={{ color: "var(--signal-onset)" }}>orange dot</strong>{" "}
              is where the looming object entered, and the{" "}
              <strong style={{ color: "var(--green)" }}>green ring</strong> is the{" "}
              <strong>pivot</strong> — the first step after onset where the fly&apos;s
              turn (vs the no-threat baseline) crosses 10°. Left threat pivots away to
              the right, right threat to the left, and the baseline never pivots: no
              threat, Giant Fiber silent, it just walks.
            </p>
            <EmbodiedLoopMap conditions={eb.conditions} traces={eb.traces} />
            <p className="cg-sense-h" style={{ marginTop: 18 }}>
              The same three runs, top-down camera
            </p>
            <p className="cg-sense-p">
              And the recorded clips from the <strong>top-down angle</strong> — a
              second, world-fixed camera (R2-WP2) bolted to the arena instead of the
              fly, so the bolt reads as real travel across the ground rather than
              jitter around a re-centred fly.
            </p>
            <div
              className="cg-perturb-clips cg-eb-topdown-clips"
              role="group"
              aria-label="The three embodied-loop runs, recorded from a world-fixed top-down camera"
            >
              {eb.conditions.map((c) => {
                const topdown = c.clip.replace(/\.mp4$/, "_topdown.mp4");
                const firing = c.gf_peak_hz > 0;
                return (
                  <figure className="cg-perturb-clip" key={c.key}>
                    <video
                      src={`/cellular-gaits/data-eb/${topdown}`}
                      autoPlay
                      loop
                      muted
                      playsInline
                      aria-label={`Top-down camera: ${c.label} — ${c.outcome}.`}
                    />
                    <figcaption>
                      <span
                        className="cg-gaitclip-k"
                        style={{ color: firing ? "var(--green)" : "var(--ink-faint)" }}
                      >
                        {c.label.replace(/\s*\(.*\)$/, "")}
                      </span>
                      <span className="cg-gaitclip-sub">{c.outcome}</span>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
            <p className="cg-sense-cap">
              These are the connectome embodied-loop runs (real FlyWire LC4/LPLC2 →
              DNp01 driving the body), not the hand-built escape controller above — shown
              here because &ldquo;where was the threat, when did it pivot&rdquo; is the
              escape question. The threat entry, course, pivot step, and both camera
              angles all come straight from the schema-v2 export; nothing is
              re-simulated in the browser.
            </p>
          </div>

          {/* 6 — honesty caveats, surfaced not buried */}
          <div className="cg-escape-caveats">
            <p className="cg-sense-h">Honest about what this is</p>
            <ul className="cg-escape-caveat-list">
              <li>
                <strong>The looming front-end here is hand-built.</strong> On
                this page the threat geometry → loom signal is an analytic
                stand-in for the real LC4/LPLC2 → DNp01 (Giant Fiber) circuit, and
                only the <em>response</em> is learned. The connectome swap itself
                is no longer the endgame — the real FlyWire wiring now runs as a
                spiking brain in the embodied loop (the{" "}
                <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
                  Embodied
                </a>{" "}
                tab); the two bilateral loom channels were the clean seam it
                dropped into.
              </li>
              <li>
                <strong>loom_input_gain = {config.loom_input_gain.toFixed(0)}.</strong>{" "}
                The [0,1] loom cue is amplified before conv1 — the bang-bang warm-start
                gait can&apos;t be moved by an unamplified cue (the escape analog of
                chemotaxis&apos;s deliberately strong antenna baseline). It is
                A/B-preserving: amplifying a zero loom is still zero, so with no threat
                the fly reproduces the closed-loop walking dynamics exactly.
              </li>
              <li>
                <strong>180° (behind) is omitted.</strong> A full U-turn won&apos;t
                fit the ~{(config.rollout_seconds ?? 1.2).toFixed(1)} s episode; the panel is{" "}
                {"{front, left, right}"} plus the held-out diagonals.
              </li>
              <li>
                <strong>The escape fitness scalar isn&apos;t comparable across
                behaviors.</strong> Its reward shaping is task-specific — don&apos;t
                read it against walking or chemotaxis.
              </li>
            </ul>
          </div>
        </div>
      }
      explainer={{
        sense: (
          <p>
            <strong>Bilateral looming.</strong> Two new sensor channels per eye —
            the object&apos;s <strong>angular size</strong> and its{" "}
            <strong>expansion rate</strong> — sampled for the{" "}
            <strong>left</strong> and <strong>right</strong> visual field and
            written into the grid each control step, the same way proprioception
            and the odor gradient are wired in the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/sensing`}>
              Sensing
            </a>{" "}
            tab. Size is an <em>LPLC2-like</em> channel (≈ Gaussian, peaking near
            collision); expansion is an <em>LC4-like</em> velocity channel
            (≈ linear). As with chemotaxis, the signal that carries{" "}
            <em>direction</em> is the left−right difference.
          </p>
        ),
        reward: (
          <p>
            <strong>React fast, flee the right way.</strong> Fitness rewards a
            quick, large escape <em>away</em> from the looming object — both the
            latency (how fast the takeoff fires once the object is close) and the
            correctness of the direction. No term tells it <em>which way</em> to
            go; that has to be discovered from the asymmetry. (This is a
            different objective from the other behaviors — don&apos;t read its
            fitness scalar against theirs.)
          </p>
        ),
        expectation: (
          <p>
            <strong>The direction of escape emerges from the L/R looming
            asymmetry.</strong>{" "}
            A threat looming from the left grows faster on the left eye; the same
            controller turns and flees <strong>right</strong> (away-turn{" "}
            {left ? turn(left.total_away_turn) : "—"}, {left ? ms(left.reaction_latency_s) : "—"}),
            and the mirror case flips — a right threat → flee{" "}
            <strong>left</strong> ({right ? turn(right.total_away_turn) : "—"},{" "}
            {right ? ms(right.reaction_latency_s) : "—"}) — with nothing in the
            controller saying &ldquo;flee away from the bigger side.&rdquo; It
            survives <strong>{trainedRate}/{total}</strong> trained azimuths and the{" "}
            <strong>{heldRate}/3</strong> held-out diagonals, exactly as steering
            emerged in{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/behaviors/chemotaxis`}>
              chemotaxis
            </a>
            . The live demo and the recorded map below are this result, in your
            browser.
          </p>
        ),
        connectome: (
          <p>
            This is the behavior that <strong>maps onto a real, mapped
            circuit</strong>. A looming object is detected by two lobula
            columnar projection neuron types — <strong>LC4</strong> (angular
            velocity) and <strong>LPLC2</strong> (angular size) — that converge
            on the <strong>Giant Fiber</strong> descending neuron
            (<strong>DNp01</strong>): ~55 LC4 + ~108 LPLC2 <em>neurons</em> per
            hemisphere onto its lateral dendrite — through hundreds of synapses
            (LC4 ~374–431, LPLC2 ~458–622 per side in FlyWire v783) — summing size +
            velocity, the timing of a single spike setting a short vs long takeoff
            (Ache et al. 2019; von Reyn et al. 2017). That circuit is now in the loop: the <em>actual</em>{" "}
            FlyWire <code>LC4/LPLC2 → DNp01</code> wiring has been run as a
            spiking connectome that routes a looming cue to an embodied escape —
            a concrete sub-circuit far smaller than the whole brain, the most
            tractable &ldquo;a real connectome drives the body&rdquo; demo,
            walked out on the{" "}
            <a className="cg-inline-link" href={`${CG_BASE}/embodied`}>
              Embodied
            </a>{" "}
            tab. The honest line: this shows the connectome routing the cue, not
            a calibrated escape threshold — in isolation the Giant Fiber
            saturates. The diagram above marks the seam where it wired in.
          </p>
        ),
      }}
    />
  );
}
