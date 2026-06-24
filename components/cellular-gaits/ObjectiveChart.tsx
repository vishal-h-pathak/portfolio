"use client";

import { useEffect, useId, useMemo, useState } from "react";

/**
 * Objective viz — the real fitness, not a live re-optimization.
 *
 * Plots D's precomputed gain sweep (public/cellular-gaits/data/gain_sweep.json):
 * forward distance vs the controller gain knob, single-peaked at native gain 1.0
 * (86.6 mm) and collapsing on both sides. This is the curve the *chosen* objective
 * rewarded — we visualize it, we do not recompute fitness for a new objective
 * (that needs MuJoCo rollouts you can't run in-browser).
 *
 * The stability penalty term −0.05·N_below is real but, in this sweep, never fired:
 * N_below = 0 at every sampled gain, so fitness = distance throughout. The penalty
 * toggle exposes that honestly rather than inventing penalty values.
 */

type Row = {
  gain: number;
  fitness: number;
  distance_mm: number;
  n_below: number;
  lambda: number;
  change_rate: number;
};

type Sweep = {
  meta: {
    best_fit_native?: number;
    native_gain?: number;
    fitness_formula?: string;
    distance_units?: string;
    n_steps?: number;
  };
  sweep: Row[];
};

const PENALTY_PER_STEP = 0.05;

// SVG plot geometry (viewBox units; scales to container width).
const VW = 720;
const VH = 380;
const M = { top: 28, right: 18, bottom: 64, left: 52 };
const PLOT_W = VW - M.left - M.right;
const PLOT_H = VH - M.top - M.bottom;

const RED = "#E36F6F";

function fmt(v: number, d = 1) {
  return (v >= 0 ? "" : "−") + Math.abs(v).toFixed(d);
}

export function ObjectiveChart({
  src = "/cellular-gaits/data/gain_sweep.json",
}: {
  src?: string;
}) {
  const [data, setData] = useState<Sweep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPenalty, setShowPenalty] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
        return r.json();
      })
      .then((d: Sweep) => {
        if (cancelled) return;
        setData(d);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [src]);

  const rows = data?.sweep ?? [];
  const nativeGain = data?.meta?.native_gain ?? 1.0;
  const anyPenalty = rows.some((r) => r.n_below > 0);

  const geom = useMemo(() => {
    if (!rows.length) return null;
    const vals = rows.flatMap((r) => [r.distance_mm, r.fitness]);
    const rawMax = Math.max(...vals, 0);
    const rawMin = Math.min(...vals, 0);
    // pad the range a little so bars/labels have headroom
    const yMax = Math.ceil((rawMax + 6) / 10) * 10;
    const yMin = Math.floor((rawMin - 4) / 10) * 10;
    const span = yMax - yMin || 1;
    const yOf = (v: number) => M.top + PLOT_H * (1 - (v - yMin) / span);
    const band = PLOT_W / rows.length;
    const barW = Math.min(46, band * 0.62);
    const xOf = (i: number) => M.left + band * (i + 0.5);
    // gridline ticks every 25 within range
    const ticks: number[] = [];
    for (let t = Math.ceil(yMin / 25) * 25; t <= yMax; t += 25) ticks.push(t);
    return { yMax, yMin, yOf, band, barW, xOf, ticks, zeroY: yOf(0) };
  }, [rows]);

  if (error) {
    return (
      <div className="cg-player-err">
        could not load sweep: <span>{error}</span>
      </div>
    );
  }
  if (!data || !geom) {
    return <div className="cg-obj-loading">loading objective sweep…</div>;
  }

  const selRow = sel != null ? rows[sel] : null;
  const valueOf = (r: Row) => (showPenalty ? r.fitness : r.distance_mm);

  return (
    <div className="cg-obj">
      <div className="cg-obj-head">
        <div className="cg-obj-title">
          {showPenalty ? "fitness F" : "distance"} vs gain
          <span className="cg-obj-sub">
            · real MuJoCo sweep · {data.meta?.distance_units ?? "mm"}
          </span>
        </div>
        <div className="cg-obj-toggles" role="group" aria-label="Objective terms">
          <button
            type="button"
            className="cg-obj-toggle"
            data-on={showPenalty ? "1" : undefined}
            aria-pressed={showPenalty}
            onClick={() => setShowPenalty((v) => !v)}
          >
            <span className="cg-obj-toggle-box" aria-hidden="true">
              {showPenalty ? "▰" : "▱"}
            </span>
            stability penalty −0.05·N<sub>below</sub>
          </button>
        </div>
      </div>

      <svg
        className="cg-obj-svg"
        viewBox={`0 0 ${VW} ${VH}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        style={{ fontFamily: "var(--mono)" }}
      >
        <title id={titleId}>Forward distance versus controller gain</title>
        <desc id={descId}>
          Bar chart of forward thorax distance for nine controller gains from 0.25
          to 4.0. Distance is single-peaked at the native gain {nativeGain} (
          {data.meta?.best_fit_native?.toFixed(1) ?? "86.6"} millimetres) and
          collapses to near zero or negative on both sides. The stability penalty
          term was zero at every gain in this sweep, so fitness equals distance.
        </desc>

        {/* y gridlines + labels */}
        {geom.ticks.map((t) => (
          <g key={t}>
            <line
              x1={M.left}
              x2={VW - M.right}
              y1={geom.yOf(t)}
              y2={geom.yOf(t)}
              stroke="rgba(232,230,223,0.08)"
              strokeWidth={1}
            />
            <text
              x={M.left - 8}
              y={geom.yOf(t) + 3.5}
              textAnchor="end"
              fontSize={10.5}
              fill="var(--ink-faint)"
            >
              {t}
            </text>
          </g>
        ))}

        {/* zero baseline */}
        <line
          x1={M.left}
          x2={VW - M.right}
          y1={geom.zeroY}
          y2={geom.zeroY}
          stroke="rgba(232,230,223,0.28)"
          strokeWidth={1}
        />

        {rows.map((r, i) => {
          const isNative = Math.abs(r.gain - nativeGain) < 1e-6;
          const v = valueOf(r);
          const y0 = geom.zeroY;
          const y1 = geom.yOf(v);
          const top = Math.min(y0, y1);
          const h = Math.max(1.5, Math.abs(y1 - y0));
          const x = geom.xOf(i) - geom.barW / 2;
          const active = sel === i;
          const fill = v < 0 ? RED : isNative ? "var(--amber)" : "var(--green)";
          const penalty = PENALTY_PER_STEP * r.n_below;
          return (
            <g
              key={r.gain}
              role="button"
              tabIndex={0}
              aria-label={`Gain ${r.gain}${isNative ? " (native)" : ""}: distance ${r.distance_mm.toFixed(1)} mm, N_below ${r.n_below}, penalty ${penalty.toFixed(2)} mm, fitness ${r.fitness.toFixed(1)} mm.`}
              style={{ cursor: "pointer", outline: "none" }}
              onMouseEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onMouseLeave={() => setSel((s) => (s === i ? null : s))}
              onBlur={() => setSel((s) => (s === i ? null : s))}
            >
              {/* invisible full-height hit target for easy hover/focus */}
              <rect
                x={geom.xOf(i) - geom.band / 2}
                y={M.top}
                width={geom.band}
                height={PLOT_H}
                fill="transparent"
              />
              <rect
                x={x}
                y={top}
                width={geom.barW}
                height={h}
                rx={2}
                fill={fill}
                opacity={active ? 1 : isNative ? 0.92 : 0.66}
              />
              {/* penalty cap: real term, height = penalty contribution (0 here) */}
              {showPenalty && penalty > 0 && (
                <rect
                  x={x}
                  y={geom.yOf(r.distance_mm)}
                  width={geom.barW}
                  height={Math.abs(geom.yOf(r.fitness) - geom.yOf(r.distance_mm))}
                  fill={RED}
                  opacity={0.8}
                />
              )}
              {active && (
                <rect
                  x={x - 3}
                  y={top - 3}
                  width={geom.barW + 6}
                  height={h + 6}
                  rx={4}
                  fill="none"
                  stroke={fill}
                  strokeWidth={1}
                  opacity={0.5}
                />
              )}
              {isNative && (
                <text
                  x={geom.xOf(i)}
                  y={geom.yOf(v) - 9}
                  textAnchor="middle"
                  fontSize={10.5}
                  fill="var(--amber)"
                >
                  ✦ native
                </text>
              )}
              {/* x label */}
              <text
                x={geom.xOf(i)}
                y={VH - M.bottom + 18}
                textAnchor="middle"
                fontSize={11}
                fill={isNative ? "var(--amber)" : "var(--ink-dim)"}
              >
                {r.gain}
              </text>
            </g>
          );
        })}

        {/* axis captions */}
        <text
          x={M.left}
          y={VH - 10}
          fontSize={10.5}
          fill="var(--ink-faint)"
          letterSpacing="0.08em"
        >
          GAIN ·g (detuning, weights frozen)
        </text>
        <text
          x={VW - M.right}
          y={VH - 10}
          textAnchor="end"
          fontSize={10.5}
          fill="var(--ink-faint)"
        >
          {showPenalty ? "F = distance − 0.05·N_below" : "distance (mm)"}
        </text>
      </svg>

      {/* readout + honesty note */}
      <div className="cg-obj-readout" aria-live="polite">
        {selRow ? (
          <dl className="cg-obj-stats">
            <div>
              <dt>gain</dt>
              <dd>
                {selRow.gain}
                {Math.abs(selRow.gain - nativeGain) < 1e-6 ? " · native" : ""}
              </dd>
            </div>
            <div>
              <dt>distance</dt>
              <dd>{fmt(selRow.distance_mm)} mm</dd>
            </div>
            <div>
              <dt>
                N<sub>below</sub>
              </dt>
              <dd>{selRow.n_below}</dd>
            </div>
            <div>
              <dt>penalty</dt>
              <dd className={selRow.n_below > 0 ? "cg-obj-pen" : undefined}>
                {fmt(-PENALTY_PER_STEP * selRow.n_below, 2)} mm
              </dd>
            </div>
            <div>
              <dt>fitness F</dt>
              <dd className="cg-obj-fit">{fmt(selRow.fitness)} mm</dd>
            </div>
          </dl>
        ) : (
          <p className="cg-obj-hint">
            Hover or tab through the bars to read each gain&rsquo;s distance,
            penalty contribution, and fitness.
          </p>
        )}
      </div>

      <p className="cg-obj-note">
        {anyPenalty ? (
          <>
            The penalty term fired where the thorax sagged — toggle it to see the
            red contribution subtracted from distance.
          </>
        ) : (
          <>
            <strong>The penalty never fired.</strong> N<sub>below</sub> = 0 at
            every sampled gain, so fitness = distance here — the half-height
            guardrail had nothing to subtract. The toggle is wired to the real
            term; it just stayed silent on this sweep.
          </>
        )}{" "}
        These are <strong>precomputed</strong> rollouts (CMA-ES weights frozen,
        gain detuned) — the page visualizes the chosen objective; it does not
        re-optimize for a new one.
      </p>
    </div>
  );
}
