import type { CurvePoint } from "@/app/lib/vane-export";
import { pct } from "./format";

/**
 * Two lines, both as cumulative return since Day 0: VANE and SPY total return.
 * Pure SVG, server-rendered; all color comes from classes in vane.css (tokens).
 */
const W = 760;
const H = 280;
const PAD = { l: 52, r: 16, t: 14, b: 28 };

export function EquityChart({ curve }: { curve: CurvePoint[] }) {
  const vane = curve.map((p) => p.vane_index - 1);
  const spy = curve.map((p) => p.spy_tr_index - 1);
  const all = [...vane, ...spy, 0];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (hi - lo < 0.002) {
    hi += 0.001;
    lo -= 0.001;
  }
  const pad = (hi - lo) * 0.08;
  lo -= pad;
  hi += pad;
  const n = curve.length;
  const x = (i: number) => PAD.l + (n === 1 ? (W - PAD.l - PAD.r) / 2 : (i / (n - 1)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const path = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [lo + pad, 0, hi - pad].filter((t, i, a) => a.indexOf(t) === i);
  const last = n - 1;

  return (
    <figure className="vane-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Cumulative return since Day 0, VANE ${pct(vane[last])} against SPY total return ${pct(spy[last])}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? "vane-axis0" : "vane-grid"} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className="vane-tick" x={PAD.l - 8} y={y(t) + 4} textAnchor="end">{pct(t, 1)}</text>
          </g>
        ))}
        <text className="vane-tick" x={PAD.l} y={H - 8}>{curve[0].session}</text>
        <text className="vane-tick" x={W - PAD.r} y={H - 8} textAnchor="end">{curve[last].session}</text>
        {n > 1 ? (
          <>
            <path className="vane-line-spy" d={path(spy)} fill="none" />
            <path className="vane-line-vane" d={path(vane)} fill="none" />
          </>
        ) : null}
        <circle className="vane-dot-spy" cx={x(last)} cy={y(spy[last])} r={4} />
        <circle className="vane-dot-vane" cx={x(last)} cy={y(vane[last])} r={4} />
      </svg>
      <figcaption className="vane-legend">
        <span className="vane-key vane-key-vane">VANE {pct(vane[last])}</span>
        <span className="vane-key vane-key-spy">SPY total return {pct(spy[last])}</span>
        {n === 1 ? <span className="vane-key">Day 0 only — the curve draws itself from here</span> : null}
      </figcaption>
    </figure>
  );
}
