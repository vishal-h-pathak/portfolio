"use client";

/**
 * <PlantSchematic> — labeled schematic of the plant the controller has to move:
 * the FlyGym / NeuroMechFly Drosophila, built from an X-ray microCT scan.
 *
 * Two coupled, data-driven views in one responsive SVG (house style — same
 * visual language as SystemDiagram: var(--mono), site palette,
 * rounded rects, hover/tap/focus to reveal):
 *   (top)    a top-down selector of the six legs;
 *   (bottom) the 7-DoF kinematic chain of the selected leg — the coxa
 *            (yaw·pitch·roll) → trochanter–femur (pitch·roll) → tibia → tarsus
 *            chain — with the slice of the 42-vector u it drives.
 *
 * 42 position actuators = 7 DoF × 6 legs. Each leg owns 7 *consecutive* control
 * channels (verified against model/manifest.json actuator order), so selecting a
 * leg highlights exactly which u[i..j] the live controller writes for it. No
 * physics here — this is the static morphology; the live plant is <FlyStage>.
 */

import { useState } from "react";

const W = 780;
const H = 500;

const GREEN = "var(--green)";
const SUB = "var(--ink-dim)";
const INK = "var(--ink)";

type Leg = {
  id: string;
  label: string;
  /** Coxa attachment on the thorax, then knee + tarsus tip (SVG coords). */
  base: [number, number];
  mid: [number, number];
  tip: [number, number];
  /** Index of this leg's first actuator in the 42-vector u. */
  off: number;
};

// Top view, fly facing +x (up). Left legs on the left, in manifest order:
// LF, LM, LH, RF, RM, RH → control channels 0,7,14,21,28,35.
const LEGS: Leg[] = [
  { id: "LF", label: "L front", base: [352, 120], mid: [266, 104], tip: [212, 126], off: 0 },
  { id: "LM", label: "L mid", base: [352, 162], mid: [250, 166], tip: [202, 184], off: 7 },
  { id: "LH", label: "L hind", base: [352, 204], mid: [262, 230], tip: [212, 258], off: 14 },
  { id: "RF", label: "R front", base: [428, 120], mid: [514, 104], tip: [568, 126], off: 21 },
  { id: "RM", label: "R mid", base: [428, 162], mid: [530, 166], tip: [578, 184], off: 28 },
  { id: "RH", label: "R hind", base: [428, 204], mid: [518, 230], tip: [568, 258], off: 35 },
];

// The shared 7-DoF chain (same for every leg). seg = the limb link it belongs to.
const DOF: { seg: string; joint: string; axis: string }[] = [
  { seg: "coxa", joint: "coxa", axis: "yaw" },
  { seg: "coxa", joint: "coxa", axis: "pitch" },
  { seg: "coxa", joint: "coxa", axis: "roll" },
  { seg: "tr.femur", joint: "femur", axis: "pitch" },
  { seg: "tr.femur", joint: "femur", axis: "roll" },
  { seg: "tibia", joint: "tibia", axis: "pitch" },
  { seg: "tarsus", joint: "tarsus", axis: "pitch" },
];

// Contiguous limb-link groups for the brackets over the chain.
const LINKS: { seg: string; from: number; to: number }[] = [
  { seg: "coxa", from: 0, to: 2 },
  { seg: "tr.femur", from: 3, to: 4 },
  { seg: "tibia", from: 5, to: 5 },
  { seg: "tarsus", from: 6, to: 6 },
];

const CHAIN_X0 = 132;
const CHAIN_X1 = 648;
const CHAIN_Y = 408;
const nodeX = (i: number) => CHAIN_X0 + ((CHAIN_X1 - CHAIN_X0) * i) / (DOF.length - 1);

function LegShape({
  leg,
  active,
  onSelect,
}: {
  leg: Leg;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const stroke = active ? GREEN : "rgba(232,230,223,0.32)";
  const dot = active ? GREEN : SUB;
  const pts = [leg.base, leg.mid, leg.tip];
  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`${leg.label} leg — 7 degrees of freedom, control channels u[${leg.off}] to u[${leg.off + 6}]. Activate to inspect its kinematic chain.`}
      style={{ cursor: "pointer", outline: "none" }}
      onMouseEnter={() => onSelect(leg.id)}
      onFocus={() => onSelect(leg.id)}
      onClick={() => onSelect(leg.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(leg.id);
        }
      }}
    >
      {/* fat invisible hit-line so the thin leg is easy to hit / tap */}
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
      />
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={active ? 2.4 : 1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === 0 ? 3.4 : 2.6} fill={dot} />
      ))}
      <text
        x={leg.tip[0] + (leg.id.startsWith("L") ? -8 : 8)}
        y={leg.tip[1] + 4}
        textAnchor={leg.id.startsWith("L") ? "end" : "start"}
        fill={active ? GREEN : SUB}
        fontSize={11}
        fontWeight={active ? 600 : 400}
      >
        {leg.id}
      </text>
    </g>
  );
}

export function PlantSchematic() {
  const [sel, setSel] = useState("RF");
  const leg = LEGS.find((l) => l.id === sel) ?? LEGS[0];

  return (
    <figure className="cg-plant">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-labelledby="plant-title plant-desc"
        style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
      >
        <title id="plant-title">FlyGym Drosophila plant — morphology and leg kinematics</title>
        <desc id="plant-desc">
          A top-down schematic of the simulated fly with six legs, above the
          seven-degree-of-freedom kinematic chain of the currently selected leg:
          coxa yaw, pitch and roll, then trochanter–femur pitch and roll, then
          tibia pitch and tarsus pitch. Forty-two position actuators in total,
          seven per leg.
        </desc>

        {/* ---- region label ---- */}
        <text x={40} y={34} fill={GREEN} fontSize={11} letterSpacing="0.08em">
          PLANT
        </text>
        <text x={92} y={34} fill={SUB} fontSize={11}>
          · FlyGym / NeuroMechFly · from an X-ray microCT scan · units mm
        </text>

        {/* forward axis cue */}
        <g>
          <line x1={390} y1={92} x2={390} y2={58} stroke={SUB} strokeWidth={1} markerEnd="url(#plant-arrow)" />
          <text x={398} y={66} fill={SUB} fontSize={10}>
            forward +x
          </text>
        </g>
        <defs>
          <marker id="plant-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={SUB} />
          </marker>
        </defs>

        {/* ---- body midline: head · thorax · abdomen (top view) ---- */}
        <ellipse cx={390} cy={86} rx={20} ry={16} fill="rgba(232,230,223,0.05)" stroke="rgba(232,230,223,0.28)" strokeWidth={1} />
        <text x={390} y={90} textAnchor="middle" fill={SUB} fontSize={9.5}>head</text>

        <rect x={356} y={108} width={68} height={108} rx={14} fill="rgba(111,227,154,0.06)" stroke="rgba(111,227,154,0.45)" strokeWidth={1.2} />
        <text x={390} y={166} textAnchor="middle" fill={GREEN} fontSize={10.5}>thorax</text>
        <text x={390} y={180} textAnchor="middle" fill={SUB} fontSize={9}>tracked</text>

        <path
          d="M360 224 Q390 248 420 224 L412 300 Q390 318 368 300 Z"
          fill="rgba(232,230,223,0.04)"
          stroke="rgba(232,230,223,0.22)"
          strokeWidth={1}
        />
        <text x={390} y={272} textAnchor="middle" fill={SUB} fontSize={9.5}>abdomen</text>

        {/* ---- the six legs ---- */}
        {LEGS.map((l) => (
          <LegShape key={l.id} leg={l} active={l.id === sel} onSelect={setSel} />
        ))}

        {/* divider */}
        <line x1={40} y1={330} x2={740} y2={330} stroke="rgba(232,230,223,0.10)" strokeWidth={1} />

        {/* ---- 7-DoF chain of the selected leg ---- */}
        <text x={40} y={356} fill={GREEN} fontSize={11} letterSpacing="0.06em">
          {leg.label.toUpperCase()} LEG · 7 DoF
        </text>
        <text x={172} y={356} fill={SUB} fontSize={11}>
          · drives u[{leg.off}…{leg.off + 6}] of the 42-vector
        </text>

        {/* limb-link brackets */}
        {LINKS.map((lk) => {
          const x1 = nodeX(lk.from);
          const x2 = nodeX(lk.to);
          const mid = (x1 + x2) / 2;
          return (
            <g key={lk.seg}>
              <path
                d={`M${x1} 384 L${x1} 378 L${x2} 378 L${x2} 384`}
                fill="none"
                stroke="rgba(232,230,223,0.22)"
                strokeWidth={1}
              />
              <text x={mid} y={372} textAnchor="middle" fill={SUB} fontSize={10}>
                {lk.seg}
              </text>
            </g>
          );
        })}

        {/* chain backbone */}
        <line x1={nodeX(0)} y1={CHAIN_Y} x2={nodeX(DOF.length - 1)} y2={CHAIN_Y} stroke={GREEN} strokeWidth={1.4} />

        {/* DoF nodes */}
        {DOF.map((d, i) => {
          const x = nodeX(i);
          return (
            <g key={i}>
              <circle cx={x} cy={CHAIN_Y} r={6} fill="color-mix(in srgb, var(--green) 12%, transparent)" stroke={GREEN} strokeWidth={1.4} />
              <text x={x} y={CHAIN_Y - 14} textAnchor="middle" fill={INK} fontSize={10.5}>
                {d.axis}
              </text>
              <text x={x} y={CHAIN_Y + 26} textAnchor="middle" fill={SUB} fontSize={9.5}>
                u[{leg.off + i}]
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="cg-plant-cap" aria-live="polite">
        <span>
          <strong>42</strong> position actuators = 7&nbsp;DoF × 6&nbsp;legs
        </span>
        <span>
          ~<strong>87</strong> joints
        </span>
        <span>
          <strong>kp&nbsp;=&nbsp;50</strong> · ctrl ±3.14&nbsp;rad
        </span>
        <span>
          control <strong>250&nbsp;Hz</strong>
        </span>
        <span>
          <strong>40</strong> physics substeps @ 10&nbsp;kHz
        </span>
        <span className="cg-plant-cap-sel">
          selected: <strong>{leg.label}</strong> → u[{leg.off}…{leg.off + 6}]
        </span>
      </figcaption>
    </figure>
  );
}

export default PlantSchematic;
