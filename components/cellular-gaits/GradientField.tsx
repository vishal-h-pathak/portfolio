"use client";

/**
 * <GradientField> — the standalone, house-style chemotaxis visual (Behaviors /
 * chemotaxis, CH-B). The "how the choice maps to the fly" piece: a top-down odor
 * field with a source, the fly sampling concentration at its two antennae
 * (`cL` vs `cR`), and the explicit readout of how the asymmetry
 * `Δ = cL − cR` becomes a turn direction.
 *
 * No data dependency — the field is an analytic Gaussian bump, so this renders
 * the same with or without a trained controller (CH-C drops the live trained
 * FlyStage + recorded approach clips into the page's placeholder slot). Pure
 * SVG + React state, NO three.js / WASM on this content route.
 *
 * Interactive: drag the source anywhere in the field, or grab the fly's nose to
 * rotate its heading, and watch `cL`, `cR`, the difference, and the implied turn
 * flip. Keyboard-accessible (both handles are focusable; arrow keys move the
 * source / rotate the fly), with an aria-live readout of the sensed asymmetry.
 *
 * Reuses the SystemDiagram / HeadingError house style: themed SVG, `var(--mono)`,
 * the site green/amber palette, hover/tap/focus affordances.
 */

import { useCallback, useRef, useState } from "react";

const GREEN = "#6FE39A";
const AMBER = "#E89B3D";
const SUB = "#8C8B83";
const INK = "#E8E6DF";
const RULE = "rgba(232,230,223,0.18)";

const W = 460;
const H = 360;

// Fly is fixed at this point; the source and heading are what you move.
const FX = 230;
const FY = 232;

// Antenna geometry: how far forward the antennae reach and how far apart.
const REACH = 48;
const SPREAD = 30;

// Gaussian odor field: c(p) = exp(-d² / 2σ²), peak 1 at the source.
const SIGMA = 120;

// Contour levels drawn as rings (and the heatmap stop opacities follow them).
const LEVELS = [0.75, 0.5, 0.25, 0.1];

// "Straight ahead" deadband on the normalized L−R difference.
const EPS = 0.004;

type Pt = { x: number; y: number };

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function concentration(p: Pt, source: Pt): number {
  const dx = p.x - source.x;
  const dy = p.y - source.y;
  const d2 = dx * dx + dy * dy;
  return Math.exp(-d2 / (2 * SIGMA * SIGMA));
}

/** Radius (px) at which the Gaussian field equals `level`. */
function levelRadius(level: number): number {
  return SIGMA * Math.sqrt(-2 * Math.log(level));
}

export function GradientField() {
  // heading φ in radians; φ=0 points straight up (screen −y).
  const [source, setSource] = useState<Pt>({ x: 150, y: 78 });
  const [heading, setHeading] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  // Which handle a pointer-drag is currently driving.
  const drag = useRef<null | "source" | "heading">(null);

  // Screen → SVG user-space coordinates (the SVG scales to fill its box).
  const toSvg = useCallback((clientX: number, clientY: number): Pt => {
    const svg = svgRef.current;
    if (!svg) return { x: FX, y: FY };
    const r = svg.getBoundingClientRect();
    return {
      x: clamp(((clientX - r.left) / r.width) * W, 0, W),
      y: clamp(((clientY - r.top) / r.height) * H, 0, H),
    };
  }, []);

  const headingFromPoint = useCallback((p: Pt) => {
    // Angle of (p − fly) measured from straight-up, clockwise positive.
    return Math.atan2(p.x - FX, -(p.y - FY));
  }, []);

  const onPointerMove = useCallback(
    (clientX: number, clientY: number) => {
      const p = toSvg(clientX, clientY);
      if (drag.current === "source") setSource(p);
      else if (drag.current === "heading") setHeading(headingFromPoint(p));
    },
    [toSvg, headingFromPoint],
  );

  const endDrag = useCallback(() => {
    drag.current = null;
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", endDrag);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onWindowMove = useCallback(
    (e: PointerEvent) => onPointerMove(e.clientX, e.clientY),
    [onPointerMove],
  );

  const startDrag = useCallback(
    (which: "source" | "heading", e: React.PointerEvent) => {
      e.preventDefault();
      drag.current = which;
      if (which === "source") onPointerMove(e.clientX, e.clientY);
      window.addEventListener("pointermove", onWindowMove);
      window.addEventListener("pointerup", endDrag);
    },
    [onPointerMove, onWindowMove, endDrag],
  );

  // ── derived geometry ──────────────────────────────────────────────────
  const fwd: Pt = { x: Math.sin(heading), y: -Math.cos(heading) }; // forward
  const right: Pt = { x: Math.cos(heading), y: Math.sin(heading) }; // fly's right
  const base: Pt = { x: FX + fwd.x * REACH, y: FY + fwd.y * REACH };
  const leftAnt: Pt = { x: base.x - right.x * SPREAD, y: base.y - right.y * SPREAD };
  const rightAnt: Pt = { x: base.x + right.x * SPREAD, y: base.y + right.y * SPREAD };

  const cL = concentration(leftAnt, source);
  const cR = concentration(rightAnt, source);
  const diff = cL - cR; // > 0 → stronger on the left → steer left
  const turn = diff > EPS ? "left" : diff < -EPS ? "right" : "straight";

  const headingDeg = Math.round((heading * 180) / Math.PI);
  const fmt = (v: number) => v.toFixed(3);

  const readout =
    turn === "straight"
      ? `Both antennae read nearly the same (cL ${fmt(cL)}, cR ${fmt(cR)}, difference ${fmt(diff)}). The fly goes straight — it is already pointed up-gradient.`
      : `Left antenna ${fmt(cL)}, right antenna ${fmt(cR)}, difference cL−cR = ${fmt(diff)}. Odor is stronger on the ${turn === "left" ? "left" : "right"}, so the fly turns ${turn}.`;

  // Turn-indicator arc at the fly, bending toward the stronger side; its sweep
  // scales with |diff| so a big asymmetry reads as a hard turn.
  const turnMag = clamp(Math.abs(diff) * 6, 0, 1);

  // ── keyboard ──────────────────────────────────────────────────────────
  const moveSource = (dx: number, dy: number) =>
    setSource((s) => ({ x: clamp(s.x + dx, 0, W), y: clamp(s.y + dy, 0, H) }));
  const rotate = (d: number) => setHeading((h) => h + d);

  const onSourceKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 24 : 8;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = map[e.key];
    if (d) {
      e.preventDefault();
      moveSource(d[0], d[1]);
    }
  };
  const onHeadingKey = (e: React.KeyboardEvent) => {
    const step = (e.shiftKey ? 18 : 6) * (Math.PI / 180);
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      rotate(-step);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      rotate(step);
    }
  };

  // Concentration bars (left / right) under the field.
  const barW = (c: number) => `${Math.round(c * 100)}%`;

  // Turn arc path: a short arc centred at the fly, swinging toward the
  // stronger antenna. Drawn only when not going straight.
  const arcR = 40;
  const arcDir = turn === "left" ? -1 : 1; // screen-x sign of the swing
  const arcEnd: Pt = {
    x: FX + arcDir * arcR * (0.35 + 0.65 * turnMag),
    y: FY - arcR * 0.55,
  };

  return (
    <figure className="cg-grad-fig">
      <div className="cg-grad-stage">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-labelledby="cg-grad-title cg-grad-desc"
          className="cg-grad-svg"
          style={{ touchAction: "none" }}
        >
          <title id="cg-grad-title">
            Top-down odor field with the fly sampling concentration at two antennae
          </title>
          <desc id="cg-grad-desc">
            An odor source sits in a smooth concentration field. The fly samples
            the field at a left and a right antenna; the difference between the two
            readings sets its turn direction. {readout}
          </desc>

          <defs>
            <radialGradient
              id="cg-grad-odor"
              gradientUnits="userSpaceOnUse"
              cx={source.x}
              cy={source.y}
              r={levelRadius(0.06)}
            >
              <stop offset="0" stopColor={AMBER} stopOpacity={0.5} />
              <stop offset="0.18" stopColor={AMBER} stopOpacity={0.3} />
              <stop offset="0.42" stopColor={AMBER} stopOpacity={0.14} />
              <stop offset="0.7" stopColor={AMBER} stopOpacity={0.05} />
              <stop offset="1" stopColor={AMBER} stopOpacity={0} />
            </radialGradient>
            <clipPath id="cg-grad-clip">
              <rect x={0} y={0} width={W} height={H} rx={8} />
            </clipPath>
            <marker
              id="cg-grad-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10z" fill={GREEN} />
            </marker>
          </defs>

          <g clipPath="url(#cg-grad-clip)">
            {/* field backdrop + heatmap */}
            <rect x={0} y={0} width={W} height={H} fill="rgba(232,230,223,0.02)" />
            <rect x={0} y={0} width={W} height={H} fill="url(#cg-grad-odor)" />

            {/* contour rings at fixed concentration levels */}
            {LEVELS.map((lvl) => (
              <circle
                key={lvl}
                cx={source.x}
                cy={source.y}
                r={levelRadius(lvl)}
                fill="none"
                stroke={AMBER}
                strokeOpacity={0.22}
                strokeWidth={1}
                strokeDasharray="3 5"
              />
            ))}

            {/* the gradient direction the fly is trying to climb (source ← fly) */}
            <line
              x1={FX}
              y1={FY}
              x2={source.x}
              y2={source.y}
              stroke={RULE}
              strokeWidth={1}
              strokeDasharray="2 6"
            />
          </g>

          {/* frame */}
          <rect
            x={0.5}
            y={0.5}
            width={W - 1}
            height={H - 1}
            rx={8}
            fill="none"
            stroke={RULE}
            strokeWidth={1}
          />

          {/* ── antennae + sampled points ── */}
          {[
            { p: leftAnt, c: cL, label: "cL", lead: cL >= cR },
            { p: rightAnt, c: cR, label: "cR", lead: cR > cL },
          ].map((a) => (
            <g key={a.label}>
              <line
                x1={FX}
                y1={FY}
                x2={a.p.x}
                y2={a.p.y}
                stroke={a.lead ? GREEN : SUB}
                strokeWidth={a.lead ? 1.8 : 1.2}
                opacity={a.lead ? 1 : 0.7}
              />
              <circle
                cx={a.p.x}
                cy={a.p.y}
                r={6}
                fill={AMBER}
                fillOpacity={0.25 + 0.55 * a.c}
                stroke={a.lead ? GREEN : SUB}
                strokeWidth={a.lead ? 2 : 1.2}
              />
              <text
                x={a.p.x}
                y={a.p.y - 11}
                fill={a.lead ? GREEN : SUB}
                fontSize={10.5}
                textAnchor="middle"
              >
                {a.label}
              </text>
            </g>
          ))}

          {/* ── the fly body (a simple oriented marker) ── */}
          <g
            role="slider"
            tabIndex={0}
            aria-label={`Fly heading, ${headingDeg} degrees clockwise from straight up. Use left and right arrow keys to rotate; the antennae resample as it turns.`}
            aria-valuenow={headingDeg}
            aria-valuemin={-180}
            aria-valuemax={180}
            style={{ cursor: "grab", outline: "none" }}
            onPointerDown={(e) => startDrag("heading", e)}
            onKeyDown={onHeadingKey}
          >
            <line
              x1={FX}
              y1={FY}
              x2={base.x}
              y2={base.y}
              stroke={INK}
              strokeWidth={1.4}
              opacity={0.6}
            />
            <ellipse
              cx={FX}
              cy={FY}
              rx={9}
              ry={13}
              fill="rgba(232,230,223,0.12)"
              stroke={INK}
              strokeWidth={1.4}
              transform={`rotate(${headingDeg} ${FX} ${FY})`}
            />
            {/* nose dot = the drag/rotate handle */}
            <circle cx={base.x} cy={base.y} r={4} fill={INK} />
          </g>

          {/* ── implied turn arc ── */}
          {turn !== "straight" && (
            <path
              d={`M ${FX} ${FY - 6} Q ${(FX + arcEnd.x) / 2 + arcDir * 8} ${FY - arcR * 0.9} ${arcEnd.x} ${arcEnd.y}`}
              fill="none"
              stroke={GREEN}
              strokeWidth={2}
              markerEnd="url(#cg-grad-arrow)"
              opacity={0.5 + 0.5 * turnMag}
            />
          )}

          {/* ── the source (draggable handle) ── */}
          <g
            role="slider"
            tabIndex={0}
            aria-label={`Odor source at x ${Math.round(source.x)}, y ${Math.round(source.y)}. Drag it, or use the arrow keys to move it, and watch the left/right antenna difference change.`}
            aria-valuetext={readout}
            style={{ cursor: "grab", outline: "none" }}
            onPointerDown={(e) => startDrag("source", e)}
            onKeyDown={onSourceKey}
          >
            <circle cx={source.x} cy={source.y} r={14} fill="transparent" />
            <circle
              cx={source.x}
              cy={source.y}
              r={6}
              fill={AMBER}
              stroke={INK}
              strokeWidth={1.4}
            />
            <circle
              cx={source.x}
              cy={source.y}
              r={11}
              fill="none"
              stroke={AMBER}
              strokeWidth={1}
              opacity={0.7}
            />
            <text
              x={source.x + 16}
              y={source.y + 4}
              fill={AMBER}
              fontSize={10.5}
              letterSpacing="0.04em"
            >
              SOURCE
            </text>
          </g>
        </svg>

        {/* ── the L−R → turn readout ── */}
        <div className="cg-grad-readout">
          <p className="cg-grad-readout-eyebrow">cL − cR → turn</p>
          <div className="cg-grad-bars" aria-hidden="true">
            <div className="cg-grad-bar-row">
              <span className="cg-grad-bar-k" data-lead={cL >= cR ? "1" : undefined}>
                cL
              </span>
              <span className="cg-grad-bar-track">
                <span className="cg-grad-bar-fill" style={{ width: barW(cL) }} />
              </span>
              <span className="cg-grad-bar-v">{fmt(cL)}</span>
            </div>
            <div className="cg-grad-bar-row">
              <span className="cg-grad-bar-k" data-lead={cR > cL ? "1" : undefined}>
                cR
              </span>
              <span className="cg-grad-bar-track">
                <span className="cg-grad-bar-fill" style={{ width: barW(cR) }} />
              </span>
              <span className="cg-grad-bar-v">{fmt(cR)}</span>
            </div>
          </div>
          <p className="cg-grad-turn">
            <span className="cg-grad-turn-k">Δ = cL − cR</span>
            <span className="cg-grad-turn-v">{diff >= 0 ? "+" : ""}{fmt(diff)}</span>
            <span className="cg-grad-turn-arrow" data-turn={turn}>
              {turn === "left" ? "↰ turn left" : turn === "right" ? "turn right ↱" : "↑ go straight"}
            </span>
          </p>
          <p className="cg-grad-live" aria-live="polite">
            {readout}
          </p>
        </div>
      </div>

      <figcaption className="cg-grad-cap">
        Drag the <strong style={{ color: AMBER }}>source</strong> anywhere in the
        field, or grab the fly&apos;s nose to turn it. The fly never measures
        &ldquo;where the food is&rdquo; — it only compares two numbers,{" "}
        <code>cL</code> and <code>cR</code>. The steering you see is{" "}
        <strong>emergent</strong>: whenever one antenna reads stronger, turning
        toward it is enough to climb the gradient. No turn is hard-coded.
      </figcaption>
    </figure>
  );
}

export default GradientField;
