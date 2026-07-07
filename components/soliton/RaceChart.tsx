import type { SolitonBundle } from "@/app/lib/soliton-export";
import {
  benchmarkPctSeries,
  fmtDate,
  fmtPct,
  pctSeries,
  SPY_STYLE,
  trackRole,
  trackStyle,
  type TrackStyle,
} from "./derive";
import type { CurvePoint } from "@/app/lib/soliton-export";

/**
 * The race chart — every capital-bearing track's equity as % return since
 * its inception, plus SPY buy-and-hold from the bundle's benchmark closes.
 * Server-rendered static SVG: no client JS, prints like a lab figure.
 *
 * Protagonists (the Fable accounts) draw in the site accents; reference
 * tracks draw in dashed inks. Day-zero bundles (single-point curves) render
 * as start markers with an annotation instead of pretending at a line.
 */

const W = 760;
const H = 320;
const PAD = { top: 18, right: 64, bottom: 30, left: 46 };

type Series = {
  key: string;
  label: string;
  points: CurvePoint[];
  style: TrackStyle;
  emphasis: boolean;
};

function buildSeries(bundle: SolitonBundle): Series[] {
  const tracks: Series[] = bundle.tracks
    .filter((t) => !t.signals_only)
    .map((t) => ({
      key: t.id,
      label: t.id,
      points: pctSeries(t.equity_curve, t.virtual_capital),
      style: trackStyle(t),
      emphasis: trackRole(t) === "protagonist",
    }));
  const spy: Series = {
    key: "SPY",
    label: "SPY",
    points: benchmarkPctSeries(bundle.benchmark.closes),
    style: SPY_STYLE,
    emphasis: false,
  };
  return [...tracks, spy].filter((s) => s.points.length > 0);
}

export function RaceChart({ bundle }: { bundle: SolitonBundle }) {
  const series = buildSeries(bundle);
  if (series.length === 0) return null;

  // Shared x domain: union of all dates, sorted. ISO strings sort correctly.
  const dates = Array.from(
    new Set(series.flatMap((s) => s.points.map(([d]) => d))),
  ).sort();
  const xIndex = new Map(dates.map((d, i) => [d, i]));
  const singlePoint = dates.length < 2;

  const x = (date: string) => {
    if (singlePoint) return PAD.left + (W - PAD.left - PAD.right) * 0.06;
    const i = xIndex.get(date) ?? 0;
    return (
      PAD.left + ((W - PAD.left - PAD.right) * i) / (dates.length - 1)
    );
  };

  const values = series.flatMap((s) => s.points.map(([, v]) => v));
  let lo = Math.min(0, ...values);
  let hi = Math.max(0, ...values);
  if (hi - lo < 2) {
    // Day zero / flat: give the axis an honest ±1% window.
    lo = Math.min(lo, -1);
    hi = Math.max(hi, 1);
  }
  const span = hi - lo;
  lo -= span * 0.08;
  hi += span * 0.08;
  const y = (v: number) =>
    PAD.top + ((hi - v) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  // Horizontal gridlines at ~5 nice steps.
  const step = niceStep((hi - lo) / 4);
  const gridStart = Math.ceil(lo / step) * step;
  const grid: number[] = [];
  for (let v = gridStart; v <= hi; v += step) grid.push(Number(v.toFixed(6)));

  // X ticks: at most 6, evenly spaced through the date range.
  const tickEvery = Math.max(1, Math.ceil(dates.length / 6));
  const xTicks = dates.filter(
    (_, i) => i % tickEvery === 0 || i === dates.length - 1,
  );

  // End labels, nudged apart when tracks finish close together: sort by
  // screen y (top first) and push each label down to keep a minimum gap.
  const MIN_GAP = 13;
  const ends = series
    .map((s) => {
      const last = s.points[s.points.length - 1];
      return { key: s.key, label: s.label, v: last[1], date: last[0], s };
    })
    .sort((a, b) => y(a.v) - y(b.v));
  let prev = -Infinity;
  const endYs = ends.map((e) => {
    const placed = Math.max(y(e.v), prev + MIN_GAP);
    prev = placed;
    return placed;
  });

  return (
    <figure className="sol-race" aria-label="Equity race chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Percent return since inception for ${series
          .map((s) => s.label)
          .join(", ")}`}
      >
        {/* gridlines + y labels */}
        {grid.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke={v === 0 ? "var(--rule)" : "var(--rule-soft)"}
              strokeWidth={v === 0 ? 1.2 : 1}
            />
            <text
              x={PAD.left - 8}
              y={y(v) + 3}
              textAnchor="end"
              className="sol-race-tick"
            >
              {fmtPct(v, step < 1 ? 1 : 0)}
            </text>
          </g>
        ))}

        {/* x ticks */}
        {xTicks.map((d) => (
          <text
            key={d}
            x={x(d)}
            y={H - PAD.bottom + 18}
            textAnchor="middle"
            className="sol-race-tick"
          >
            {fmtDate(d)}
          </text>
        ))}

        {/* series */}
        {series.map((s) => {
          const pts = s.points;
          const path = pts
            .map(([d, v], i) => `${i === 0 ? "M" : "L"}${x(d)},${y(v)}`)
            .join(" ");
          return (
            <g key={s.key}>
              {pts.length > 1 && (
                <path
                  d={path}
                  fill="none"
                  stroke={s.style.color}
                  strokeWidth={s.emphasis ? 2.2 : 1.4}
                  strokeDasharray={s.style.dash}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {/* start/latest marker — the only mark on day zero */}
              <circle
                cx={x(pts[pts.length - 1][0])}
                cy={y(pts[pts.length - 1][1])}
                r={s.emphasis ? 3.4 : 2.4}
                fill={s.style.color}
              />
            </g>
          );
        })}

        {/* end labels */}
        {ends.map((e, i) => (
          <text
            key={e.key}
            x={x(e.date) + 8}
            y={endYs[i] + 3}
            className={
              "sol-race-endlabel" + (e.s.emphasis ? " sol-race-endlabel-hi" : "")
            }
            style={{ fill: e.s.style.color }}
          >
            {e.label} {fmtPct(e.v)}
          </text>
        ))}

        {singlePoint && (
          <text
            x={PAD.left + (W - PAD.left - PAD.right) * 0.06 + 14}
            y={PAD.top + 12}
            className="sol-race-note"
          >
            day zero — every account starts at its marker; the race draws
            itself from here
          </text>
        )}
      </svg>
    </figure>
  );
}

function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))));
  const norm = raw / mag;
  const nice = norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1;
  return nice * mag;
}
