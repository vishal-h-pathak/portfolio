"use client";

/**
 * <EmbodiedConditions> — the result, three conditions side by side
 * (The Embodied Fly, §5). Driven by `manifest.conditions[]`; the heavy per-run
 * traces are **client-fetched** from `/cellular-gaits/data-eb/` (mirroring how
 * the other behavior demos pull `data-x`), so they don't bloat the document.
 *
 * Each panel renders, all straight from the bundle (nothing hardcoded):
 *   · the recorded escape/walk clip (the mp4)
 *   · the Giant-Fiber mean trace — brain.dnp01_mean vs brain.t_s (baseline flat
 *     at 0 on the same 75-window grid), shared y-axis across panels
 *   · a top-down body replay from body.thorax_xy + body.yaw_deg
 *   · the escape signature — summary.turn_vs_baseline_deg at the four horizons
 *
 * brain (75 windows) and body (301 steps) are on different time bases — each is
 * plotted against its OWN t_s, never joined by index.
 */

import { useEffect, useMemo, useState } from "react";

const GREEN = "#6FE39A";
const THREAT = "#F2683C";
const INK = "#E8E6DF";
const SUB = "#8C8B83";
const FAINT = "#7E7A6D";
const RULE = "rgba(232,230,223,0.16)";

const BASE = "/cellular-gaits/data-eb";

export type ConditionMeta = {
  key: string;
  label: string;
  azimuth_deg: number | null;
  trace: string;
  clip: string;
  gf_peak_hz: number;
  outcome: string;
};

type TurnHorizons = Record<"60ms" | "100ms" | "160ms" | "200ms", number | null>;

type Trace = {
  condition: string;
  threat_onset_step: number;
  control_dt_s: number;
  summary: {
    gf_peak_hz: number;
    drive_peak: number;
    displacement: number;
    heading_change_deg: number | null;
    turn_vs_baseline_deg: TurnHorizons;
    threat_min_dist: number | null;
    threat_hit: boolean | null;
  };
  brain: { t_s: number[]; dnp01_mean: number[] };
  body: { t_s: number[]; thorax_xy: [number, number][]; yaw_deg: number[] };
};

const HORIZONS: (keyof TurnHorizons)[] = ["60ms", "100ms", "160ms", "200ms"];

function fmtDeg(v: number | null): string {
  if (v == null) return "—";
  return (v >= 0 ? "+" : "") + v.toFixed(0) + "°";
}

// ── the shared GF-trace sparkline (one panel) ──
function GfTrace({
  trace,
  gfMax,
  tMax,
}: {
  trace: Trace;
  gfMax: number;
  tMax: number;
}) {
  const W = 240;
  const Hh = 96;
  const L = 30;
  const R = 8;
  const T = 10;
  const B = 22;
  const iw = W - L - R;
  const ih = Hh - T - B;
  const xs = (t: number) => L + (t / tMax) * iw;
  const ys = (hz: number) => T + ((gfMax - hz) / gfMax) * ih;

  const pts = trace.brain.t_s
    .map((t, i) => `${xs(t).toFixed(1)},${ys(trace.brain.dnp01_mean[i] ?? 0).toFixed(1)}`)
    .join(" ");
  const onsetT =
    trace.threat_onset_step >= 0 ? trace.threat_onset_step * trace.control_dt_s : null;
  const peak = trace.summary.gf_peak_hz;

  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} className="cg-eb-gf-svg" role="img"
      aria-label={`Giant Fiber mean rate over time for ${trace.condition}: peaks at ${peak} hertz${onsetT != null ? `, after the threat onset at ${onsetT.toFixed(2)} seconds` : " (flat at zero — the Giant Fiber stays silent)"}.`}
    >
      {/* frame + zero line */}
      <line x1={L} y1={ys(0)} x2={L + iw} y2={ys(0)} stroke={RULE} strokeWidth={1} />
      {/* y ticks: 0 and gfMax */}
      <text x={L - 5} y={ys(0) + 3} textAnchor="end" fill={SUB} fontSize={8}>0</text>
      <text x={L - 5} y={ys(gfMax) + 3} textAnchor="end" fill={SUB} fontSize={8}>{Math.round(gfMax)}</text>
      {/* onset marker */}
      {onsetT != null && (
        <>
          <line x1={xs(onsetT)} y1={T} x2={xs(onsetT)} y2={T + ih} stroke="rgba(242,104,60,0.45)" strokeWidth={1} strokeDasharray="2 3" />
          <text x={xs(onsetT) + 3} y={T + 8} fill={THREAT} fontSize={7.5}>onset</text>
        </>
      )}
      {/* the GF trace */}
      <polyline points={pts} fill="none" stroke={peak > 0 ? GREEN : SUB} strokeWidth={1.6} strokeLinejoin="round" />
      {/* peak callout */}
      {peak > 0 && (
        <text x={L + iw} y={ys(peak) - 3} textAnchor="end" fill={GREEN} fontSize={9} fontWeight={500}>
          {peak} Hz peak
        </text>
      )}
      <text x={L + iw} y={Hh - 6} textAnchor="end" fill={FAINT} fontSize={8}>t (s) →</text>
      <text x={L} y={Hh - 6} fill={FAINT} fontSize={8}>GF mean · Hz</text>
    </svg>
  );
}

// ── the top-down body replay (thorax path) ──
function BodyPath({ trace }: { trace: Trace }) {
  const W = 240;
  const Hh = 120;
  const M = 14;
  const xy = trace.body.thorax_xy;

  const { sx, sy } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of xy) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const scale = Math.min((W - 2 * M) / spanX, (Hh - 2 * M) / spanY);
    const offX = (W - spanX * scale) / 2;
    const offY = (Hh - spanY * scale) / 2;
    return {
      sx: (x: number) => offX + (x - minX) * scale,
      sy: (y: number) => Hh - (offY + (y - minY) * scale), // world +y up
    };
  }, [xy]);

  const onset = trace.threat_onset_step;
  const poly = (from: number, to: number) =>
    xy
      .slice(from, to)
      .map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`)
      .join(" ");

  const hasOnset = onset >= 0 && onset < xy.length;
  const pre = hasOnset ? poly(0, onset + 1) : "";
  const post = hasOnset ? poly(onset, xy.length) : poly(0, xy.length);
  const start = xy[0];
  const end = xy[xy.length - 1];
  const onsetPt = hasOnset ? xy[onset] : null;

  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} className="cg-eb-body-svg" role="img"
      aria-label={`Top-down body path for ${trace.condition}: net displacement ${trace.summary.displacement.toFixed(1)} body units.`}
    >
      <rect x={0.5} y={0.5} width={W - 1} height={Hh - 1} rx={6} fill="rgba(232,230,223,0.015)" stroke={RULE} strokeWidth={1} />
      {/* pre-onset walk (dim), post-onset bolt (bright) */}
      {pre && <polyline points={pre} fill="none" stroke={SUB} strokeOpacity={0.6} strokeWidth={1.3} strokeLinejoin="round" />}
      {post && <polyline points={post} fill="none" stroke={hasOnset ? GREEN : INK} strokeOpacity={0.9} strokeWidth={1.7} strokeLinejoin="round" />}
      {start && <circle cx={sx(start[0])} cy={sy(start[1])} r={3} fill="none" stroke={INK} strokeWidth={1.1} opacity={0.6} />}
      {onsetPt && <circle cx={sx(onsetPt[0])} cy={sy(onsetPt[1])} r={3.2} fill={THREAT} opacity={0.85} />}
      {end && <circle cx={sx(end[0])} cy={sy(end[1])} r={3} fill={hasOnset ? GREEN : INK} />}
      <text x={8} y={Hh - 7} fill={FAINT} fontSize={8}>
        top-down · {hasOnset ? "○ start · ● onset · ▸ end" : "○ start · ▸ end"}
      </text>
    </svg>
  );
}

export function EmbodiedConditions({ conditions }: { conditions: ConditionMeta[] }) {
  const [traces, setTraces] = useState<Record<string, Trace> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      conditions.map((c) =>
        fetch(`${BASE}/${c.trace}`).then((r) => {
          if (!r.ok) throw new Error(`${c.trace}: ${r.status}`);
          return r.json() as Promise<Trace>;
        }),
      ),
    )
      .then((arr) => {
        if (cancelled) return;
        const map: Record<string, Trace> = {};
        conditions.forEach((c, i) => (map[c.key] = arr[i]));
        setTraces(map);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [conditions]);

  // shared axes for the GF traces (so the 133/100/0 difference reads across panels)
  const { gfMax, tMax } = useMemo(() => {
    if (!traces) return { gfMax: 140, tMax: 1.2 };
    let g = 0;
    let t = 0;
    for (const c of conditions) {
      const tr = traces[c.key];
      if (!tr) continue;
      g = Math.max(g, tr.summary.gf_peak_hz, ...tr.brain.dnp01_mean);
      t = Math.max(t, ...tr.brain.t_s);
    }
    return { gfMax: g > 0 ? g * 1.08 : 140, tMax: t || 1.2 };
  }, [traces, conditions]);

  return (
    <div className="cg-eb-conditions">
      <div className="cg-eb-cond-grid">
        {conditions.map((c) => {
          const tr = traces?.[c.key];
          const isBaseline = c.azimuth_deg == null;
          return (
            <figure key={c.key} className="cg-eb-cond" data-baseline={isBaseline ? "1" : undefined}>
              <figcaption className="cg-eb-cond-head">
                <span className="cg-eb-cond-label">{c.label}</span>
                <span className="cg-eb-cond-gf" style={{ color: c.gf_peak_hz > 0 ? GREEN : SUB }}>
                  GF {c.gf_peak_hz} Hz
                </span>
              </figcaption>

              <video
                className="cg-eb-cond-clip"
                src={`${BASE}/${c.clip}`}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label={`Recorded clip: ${c.label} — ${c.outcome}.`}
              />
              <p className="cg-eb-cond-outcome">{c.outcome}</p>

              {error && <p className="cg-eb-cond-err">trace failed to load.</p>}
              {!error && !tr && <p className="cg-eb-cond-loading">loading trace…</p>}

              {tr && (
                <>
                  <GfTrace trace={tr} gfMax={gfMax} tMax={tMax} />
                  <BodyPath trace={tr} />

                  <div className="cg-eb-sig" aria-label={`Escape signature for ${c.label}: turn versus baseline at four horizons.`}>
                    <p className="cg-eb-sig-h">turn vs baseline</p>
                    {isBaseline ? (
                      <p className="cg-eb-sig-baseline">the reference — the fly just walks (no turn to measure)</p>
                    ) : (
                      <div className="cg-eb-sig-row">
                        {HORIZONS.map((h) => {
                          const v = tr.summary.turn_vs_baseline_deg[h];
                          return (
                            <span key={h} className="cg-eb-sig-cell">
                              <span className="cg-eb-sig-t">{h}</span>
                              <span className="cg-eb-sig-v" style={{ color: v != null && v < 0 ? "#E89B3D" : GREEN }}>
                                {fmtDeg(v)}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </figure>
          );
        })}
      </div>

      <p className="cg-eb-cond-cap">
        Three runs sharing the seed and warm-up, so they diverge only at looming
        onset (the orange mark). The Giant-Fiber trace is the brain causal link:{" "}
        <strong>no loom → GF silent → the fly merely walks</strong>; a loom routes
        through the real connectome to an escape. The escape signature is the turn{" "}
        <em>relative to the no-threat baseline</em> (the walking gait itself drifts,
        so net heading is meaningless) — left threat turns negative (bolts right),
        right threat positive (turns left). Brain (75 windows) and body (301 steps)
        are plotted on their own <code>t_s</code>, never joined by index.
      </p>
    </div>
  );
}

export default EmbodiedConditions;
