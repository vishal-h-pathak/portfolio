"use client";

/**
 * <MotorMap> — the E4 "motor mapping" interactive module.
 *
 * Makes the "which number moves which leg" wiring concrete. Channel 0 of the
 * top-left 7×6 sub-grid of the 8×8 CA state is read ROW-MAJOR into a 42-vector
 * u ∈ [-1,1]; entry i is written to actuator i (manifest.json order), which the
 * engine rescales `clip(u,-1,1)·3.14 rad` and applies as that joint's target.
 *
 * Two synced, bidirectional surfaces:
 *   · the 8×8 grid (42 motor cells numbered with their actuator index i), and
 *   · a top-down schematic fly (6 legs × 7 joints).
 * Hover/focus either side → the matching element on the other lights up. The
 * grid position and the leg are deliberately decorrelated — that IS the point:
 * the assignment is a wiring convenience, not anything biological.
 *
 * Beside them runs a real live <FlyStage> driven by the evolved NCA. Pin a
 * joint and flip "override on live fly" to clamp that single target and watch
 * exactly that one joint move while the other 41 keep walking.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type {
  FlyStageController,
  FlyStageCtx,
} from "@/components/cellular-gaits/FlyStage";
import type { FlySim } from "@/lib/mujoco-fly";

const FlyStage = dynamic(
  () => import("@/components/cellular-gaits/FlyStage").then((m) => m.FlyStage),
  { ssr: false },
);

// ----- the fixed mapping --------------------------------------------------
// 42 actuators = 6 legs × 7 DOF, in manifest / control order. leg = ⌊i/7⌋,
// dof = i%7. The grid read is the SAME 42 values flattened row-major over the
// 7×6 sub-grid, so grid cell (r,c) → i = r*6 + c. Two different flattenings of
// the same 42 numbers, which is why position on the grid says nothing about
// which leg moves.
const LEG_KEYS = ["LF", "LM", "LH", "RF", "RM", "RH"] as const;
const LEG_LABEL: Record<string, string> = {
  LF: "left front",
  LM: "left mid",
  LH: "left hind",
  RF: "right front",
  RM: "right mid",
  RH: "right hind",
};
const DOF_LABEL = [
  "coxa · yaw",
  "coxa · pitch",
  "coxa · roll",
  "femur · pitch",
  "femur · roll",
  "tibia · pitch",
  "tarsus · pitch",
] as const;

const MOTOR_ROWS = 7;
const MOTOR_COLS = 6;
const N_ACT = 42;

const legOf = (i: number) => Math.floor(i / 7);
const dofOf = (i: number) => i % 7;
const cellOf = (i: number) => ({ r: Math.floor(i / MOTOR_COLS), c: i % MOTOR_COLS });

type ActuatorMeta = { actuator: string; joint: string };

// ----- grid geometry ------------------------------------------------------
const G = 8;
const CELL = 30;
const CGAP = 3;
const GPAD = 16;
const GW = GPAD * 2 + G * CELL + (G - 1) * CGAP;
const cellXY = (r: number, c: number) => ({
  x: GPAD + c * (CELL + CGAP),
  y: GPAD + r * (CELL + CGAP),
});

// ----- fly geometry -------------------------------------------------------
const FW = 320;
const FH = 360;
// leg root anchors on the thorax + outward unit direction (SVG y is down)
const LEG_GEO: Record<string, { bx: number; by: number; dx: number; dy: number }> = {
  LF: { bx: 132, by: 138, dx: -0.86, dy: -0.51 },
  LM: { bx: 128, by: 178, dx: -1, dy: 0 },
  LH: { bx: 132, by: 218, dx: -0.86, dy: 0.51 },
  RF: { bx: 188, by: 138, dx: 0.86, dy: -0.51 },
  RM: { bx: 192, by: 178, dx: 1, dy: 0 },
  RH: { bx: 188, by: 218, dx: 0.86, dy: 0.51 },
};
const LEG_LEN = 124;
// fraction along the leg for each of the 7 DOF nodes (proximal → distal)
const DOF_T = [0.1, 0.2, 0.3, 0.48, 0.6, 0.78, 0.94];
const nodeXY = (legKey: string, dof: number) => {
  const g = LEG_GEO[legKey];
  const t = DOF_T[dof];
  return { x: g.bx + g.dx * LEG_LEN * t, y: g.by + g.dy * LEG_LEN * t };
};
const legTip = (legKey: string) => {
  const g = LEG_GEO[legKey];
  return { x: g.bx + g.dx * LEG_LEN, y: g.by + g.dy * LEG_LEN };
};

const ACCENT = "var(--green)"; // runtime green, matches the system diagram

export function MotorMap() {
  // active = what's being previewed (hover/focus); pinned = the committed pick
  // that the override drives. Display uses hovered ?? pinned.
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(0);
  const active = hovered ?? pinned;

  const [meta, setMeta] = useState<ActuatorMeta[] | null>(null);

  // override-on-live-fly state
  const [overrideOn, setOverrideOn] = useState(false);
  const [overrideVal, setOverrideVal] = useState(0);
  const [ready, setReady] = useState(false);

  // refs the FlyStage controller reads without re-subscribing
  const pinnedRef = useRef(pinned);
  const overrideOnRef = useRef(overrideOn);
  const overrideValRef = useRef(overrideVal);
  const ncaRef = useRef<{ motors: () => Float32Array; reset: () => void } | null>(null);
  const attachedRef = useRef(false);
  useEffect(() => void (pinnedRef.current = pinned), [pinned]);
  useEffect(() => void (overrideOnRef.current = overrideOn), [overrideOn]);
  useEffect(() => void (overrideValRef.current = overrideVal), [overrideVal]);

  // load the manifest (for the exact actuator/joint strings) + the evolved NCA
  useEffect(() => {
    let cancelled = false;
    fetch("/cellular-gaits/model/manifest.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((m: { actuators: ActuatorMeta[] }) => {
        if (!cancelled) setMeta(m.actuators);
      })
      .catch(() => {/* readout falls back to derived labels */});

    (async () => {
      try {
        const { loadController, makeNcaController } = await import("@/lib/nca");
        const w = await loadController();
        if (cancelled) return;
        ncaRef.current = makeNcaController(w);
        setReady(true);
      } catch {
        /* FlyStage still runs its own default NCA */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Stable controller: the real NCA, with one motor target optionally clamped.
  const controller = useCallback<FlyStageController>((ctx: FlyStageCtx) => {
    const nca = ncaRef.current!;
    if (!attachedRef.current) {
      // wire the FlyStage reset button to also re-seed our NCA gait
      (ctx.sim as FlySim & { _ncaReset?: () => void })._ncaReset = () => nca.reset();
      attachedRef.current = true;
    }
    const u = nca.motors();
    const p = pinnedRef.current;
    if (overrideOnRef.current && p != null) {
      const v = overrideValRef.current;
      u[p] = v < -1 ? -1 : v > 1 ? 1 : v;
    }
    return u;
  }, []);

  const metaFor = (i: number): ActuatorMeta =>
    meta?.[i] ?? {
      actuator: `${LEG_KEYS[legOf(i)]}·${DOF_LABEL[dofOf(i)].replace(" · ", "-")}`,
      joint: "—",
    };

  const onPick = useCallback(
    (i: number) => setPinned((cur) => (cur === i ? null : i)),
    [],
  );

  return (
    <div className="cg-mm">
      {/* ---- what the module is doing, in plain language ---- */}
      <p className="cg-mm-intro">
        The evolved rule produces an <strong>8×8×4</strong> grid of numbers every
        tick. To drive the body we read <strong>channel 0</strong> of the top-left{" "}
        <strong>7×6</strong> block, row by row — 42 numbers, one per joint. Number{" "}
        <code>i</code> becomes the target for actuator <code>i</code>, rescaled{" "}
        <code>clip(u,−1,1)·3.14 rad</code>: the rule&apos;s unitless −1…1 output
        turned into a joint angle of ±180°, which the physics engine then drives
        that joint toward. Hover a grid cell or a leg joint to trace that wiring —
        the grid position is deliberately <em>unrelated</em> to which leg moves.
      </p>

      {/* ---- the two synced mapping surfaces ---- */}
      <div className="cg-mm-surfaces">
        <Grid
          active={active}
          pinned={pinned}
          onHover={setHovered}
          onPick={onPick}
        />
        <Fly
          active={active}
          pinned={pinned}
          onHover={setHovered}
          onPick={onPick}
        />
      </div>

      <Readout
        active={active}
        meta={active != null ? metaFor(active) : null}
        overrideVal={overrideOn && pinned != null && pinned === active ? overrideVal : null}
      />

      {/* ---- live fly + single-joint override ---- */}
      <div className="cg-mm-live">
        <div className="cg-mm-stage">
          <FlyStage
            controller={ready ? controller : undefined}
            height={300}
            fallbackClipSrc="/cellular-gaits/data/clip_gain_native.mp4"
          />
        </div>
        <Override
          pinned={pinned}
          pinnedLabel={pinned != null ? actuatorShort(pinned) : null}
          on={overrideOn}
          val={overrideVal}
          onToggle={setOverrideOn}
          onVal={setOverrideVal}
        />
      </div>

      {/* ---- the alternatives are the interesting part (promoted) ---- */}
      <div className="cg-mm-alts">
        <p className="cg-mm-alts-h">The alternatives are the interesting part</p>
        <p>
          One cell → one joint is just the cheap wiring. The directions worth
          building out — and worth visualizing — are richer: a{" "}
          <strong>learned readout</strong> that lets evolution place the motor taps
          itself; a <strong>population code</strong> where many cells vote on each
          joint instead of one cell owning it; and the real biological version, a{" "}
          <strong>descending-neuron interface</strong> — command neurons projecting
          from the brain onto the leg controllers. That last one isn&apos;t
          hypothetical here: the Giant Fiber (<strong>DNp01</strong>) firing rate is
          already read out as the escape drive in the embodied loop.{" "}
          <a className="cg-inline-link" href="/projects/cellular-gaits/embodied">
            See the descending interface on the Embodied tab →
          </a>
        </p>
      </div>
    </div>
  );
}

function actuatorShort(i: number) {
  return `i=${i} · ${LEG_KEYS[legOf(i)]} · ${DOF_LABEL[dofOf(i)]}`;
}

// ---------------------------------------------------------------------------
// Grid: 8×8 cells; the top-left 7×6 = 42 motor cells are numbered with their
// actuator index. The rest are channel-0 cells that aren't read.
// ---------------------------------------------------------------------------
function Grid({
  active,
  pinned,
  onHover,
  onPick,
}: {
  active: number | null;
  pinned: number | null;
  onHover: (i: number | null) => void;
  onPick: (i: number) => void;
}) {
  const cells = [];
  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      const motor = r < MOTOR_ROWS && c < MOTOR_COLS;
      const i = motor ? r * MOTOR_COLS + c : -1;
      const { x, y } = cellXY(r, c);
      if (!motor) {
        cells.push(
          <rect
            key={`n${r}-${c}`}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            rx={3}
            className="cg-mm-cell-off"
          />,
        );
        continue;
      }
      const isActive = i === active;
      const isPinned = i === pinned;
      cells.push(
        <g
          key={i}
          role="button"
          tabIndex={0}
          aria-label={`Motor cell ${i}, grid row ${r} column ${c}, drives ${actuatorShort(i)}`}
          aria-pressed={isPinned}
          className="cg-mm-hit"
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(i)}
          onBlur={() => onHover(null)}
          onClick={() => onPick(i)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPick(i);
            }
          }}
        >
          <rect
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            rx={3}
            className="cg-mm-cell"
            data-active={isActive ? "1" : undefined}
            data-pinned={isPinned ? "1" : undefined}
          />
          <text
            x={x + CELL / 2}
            y={y + CELL / 2}
            className="cg-mm-cell-i"
            data-active={isActive ? "1" : undefined}
          >
            {i}
          </text>
        </g>,
      );
    }
  }
  return (
    <figure className="cg-mm-fig">
      <svg
        viewBox={`0 0 ${GW} ${GW}`}
        className="cg-mm-svg"
        role="group"
        aria-label="8 by 8 cellular-automaton grid; the top-left 7 by 6 sub-grid of channel 0 holds the 42 motor cells, numbered by actuator index"
      >
        {cells}
      </svg>
      <figcaption className="cg-mm-cap">
        channel 0 · 8×8 — top-left <strong>7×6</strong> read row-major → u[0..41]
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Fly: top-down schematic, 6 legs × 7 joint nodes. Reverse-maps to the grid.
// ---------------------------------------------------------------------------
function Fly({
  active,
  pinned,
  onHover,
  onPick,
}: {
  active: number | null;
  pinned: number | null;
  onHover: (i: number | null) => void;
  onPick: (i: number) => void;
}) {
  const activeLeg = active != null ? LEG_KEYS[legOf(active)] : null;
  return (
    <figure className="cg-mm-fig">
      <svg
        viewBox={`0 0 ${FW} ${FH}`}
        className="cg-mm-svg"
        role="group"
        aria-label="Top-down schematic of the fly; six legs, each with seven joint markers that map to the grid"
      >
        {/* body */}
        <ellipse cx={160} cy={92} rx={20} ry={26} className="cg-mm-body" />
        <ellipse cx={160} cy={178} rx={30} ry={52} className="cg-mm-body" />
        <ellipse cx={160} cy={278} rx={22} ry={56} className="cg-mm-body" />

        {/* legs */}
        {LEG_KEYS.map((legKey) => {
          const g = LEG_GEO[legKey];
          const tip = legTip(legKey);
          const isLegActive = legKey === activeLeg;
          const labelX = g.bx + g.dx * (LEG_LEN + 12);
          const labelY = g.by + g.dy * (LEG_LEN + 12);
          return (
            <g key={legKey}>
              <line
                x1={g.bx}
                y1={g.by}
                x2={tip.x}
                y2={tip.y}
                className="cg-mm-limb"
                data-active={isLegActive ? "1" : undefined}
              />
              <text
                x={labelX}
                y={labelY}
                className="cg-mm-leg-label"
                data-active={isLegActive ? "1" : undefined}
                textAnchor={g.dx < 0 ? "end" : "start"}
              >
                {legKey}
              </text>
              {DOF_LABEL.map((_, dof) => {
                const i = LEG_KEYS.indexOf(legKey) * 7 + dof;
                const { x, y } = nodeXY(legKey, dof);
                const isActive = i === active;
                const isPinned = i === pinned;
                return (
                  <g
                    key={dof}
                    role="button"
                    tabIndex={0}
                    aria-label={`${LEG_LABEL[legKey]} ${DOF_LABEL[dof]} joint, actuator ${i}, driven by grid cell ${i}`}
                    aria-pressed={isPinned}
                    className="cg-mm-hit"
                    onMouseEnter={() => onHover(i)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(i)}
                    onBlur={() => onHover(null)}
                    onClick={() => onPick(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onPick(i);
                      }
                    }}
                  >
                    {/* enlarged invisible hit target */}
                    <circle cx={x} cy={y} r={10} className="cg-mm-node-hit" />
                    <circle
                      cx={x}
                      cy={y}
                      r={isActive ? 7 : 4.5}
                      className="cg-mm-node"
                      data-active={isActive ? "1" : undefined}
                      data-pinned={isPinned ? "1" : undefined}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <figcaption className="cg-mm-cap">
        6 legs × 7 joints — grid position is unrelated to which leg moves
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
function Readout({
  active,
  meta,
  overrideVal,
}: {
  active: number | null;
  meta: ActuatorMeta | null;
  overrideVal: number | null;
}) {
  if (active == null || meta == null) {
    return (
      <div className="cg-mm-readout cg-mm-readout-empty">
        hover or focus a cell or a joint to trace the wiring
      </div>
    );
  }
  const { r, c } = cellOf(active);
  const clamped = overrideVal != null ? Math.max(-1, Math.min(1, overrideVal)) : null;
  const rad = clamped != null ? (clamped * 3.14).toFixed(2) : null;
  return (
    <div className="cg-mm-readout">
      <div className="cg-mm-ro-line">
        <span className="cg-mm-ro-k">grid</span>
        <code>
          s₀[{r},{c}]
        </code>
        <span className="cg-mm-ro-arr">→</span>
        <span className="cg-mm-ro-k">u</span>
        <code>[{active}]</code>
        <span className="cg-mm-ro-arr">→</span>
        <span className="cg-mm-ro-k">joint</span>
        <code className="cg-mm-ro-act">{meta.joint}</code>
      </div>
      <div className="cg-mm-ro-line">
        <span className="cg-mm-ro-k">rescale</span>
        <code>
          q*[{active}] = clip(u,−1,1)·3.14 rad
          {rad != null ? ` = ${rad} rad` : ""}
        </code>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Override({
  pinned,
  pinnedLabel,
  on,
  val,
  onToggle,
  onVal,
}: {
  pinned: number | null;
  pinnedLabel: string | null;
  on: boolean;
  val: number;
  onToggle: (b: boolean) => void;
  onVal: (v: number) => void;
}) {
  const disabled = pinned == null;
  return (
    <div className="cg-mm-override">
      <p className="cg-mm-ov-h">Override one joint</p>
      <p className="cg-mm-ov-def">
        Pin a cell, then this slider <em>overrides</em> it — forcing that one
        joint&apos;s target to a value you pick instead of letting the evolved rule
        set it. The other 41 keep walking, so you can see exactly which leg that
        single number drives. The slider is the raw output <code>u ∈ [−1, 1]</code>;
        the fly receives <code>clip(u,−1,1)·3.14 rad</code>.
      </p>
      <label className="cg-mm-ov-toggle">
        <input
          type="checkbox"
          checked={on}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span>override on live fly</span>
      </label>
      <p className="cg-mm-ov-pin">
        {pinned == null ? (
          <span className="cg-mm-ov-hint">click a cell or joint to pin one</span>
        ) : (
          <span>
            pinned <code>{pinnedLabel}</code>
          </span>
        )}
      </p>
      <div className="cg-mm-ov-row" data-off={!on || disabled ? "1" : undefined}>
        <label htmlFor="cg-mm-ov">u</label>
        <input
          id="cg-mm-ov"
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={val}
          disabled={disabled || !on}
          onChange={(e) => onVal(parseFloat(e.target.value))}
        />
        <span className="cg-mm-ov-val">
          {val.toFixed(2)} → {(Math.max(-1, Math.min(1, val)) * 3.14).toFixed(2)} rad
        </span>
      </div>
      <PinnedFlyGlyph pinned={pinned} />
      <p className="cg-mm-ov-note">
        Clamps that one joint&apos;s target; the other 41 keep running the evolved
        gait — live MuJoCo.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A small top-down fly under the override slider: highlights which leg + joint
// the pinned cell actually drives, so the abstract index i lands on real anatomy.
// ---------------------------------------------------------------------------
function PinnedFlyGlyph({ pinned }: { pinned: number | null }) {
  if (pinned == null) {
    return (
      <p className="cg-mm-ov-glyph-hint">
        pin a joint to see which leg it moves
      </p>
    );
  }
  const legKey = LEG_KEYS[legOf(pinned)];
  const dof = dofOf(pinned);
  const node = nodeXY(legKey, dof);
  return (
    <figure className="cg-mm-ov-glyph">
      <svg
        viewBox={`10 58 300 292`}
        role="img"
        aria-label={`Top-down fly with the ${LEG_LABEL[legKey]} ${DOF_LABEL[dof]} joint highlighted`}
      >
        <ellipse cx={160} cy={92} rx={20} ry={26} className="cg-mm-body" />
        <ellipse cx={160} cy={178} rx={30} ry={52} className="cg-mm-body" />
        <ellipse cx={160} cy={278} rx={22} ry={56} className="cg-mm-body" />
        {LEG_KEYS.map((k) => {
          const g = LEG_GEO[k];
          const tip = legTip(k);
          return (
            <line
              key={k}
              x1={g.bx}
              y1={g.by}
              x2={tip.x}
              y2={tip.y}
              className="cg-mm-limb"
              data-active={k === legKey ? "1" : undefined}
            />
          );
        })}
        <circle cx={node.x} cy={node.y} r={8} className="cg-mm-node" data-active="1" />
      </svg>
      <figcaption className="cg-mm-cap">
        affecting <strong>{LEG_LABEL[legKey]}</strong> · {DOF_LABEL[dof]}
      </figcaption>
    </figure>
  );
}

export default MotorMap;
