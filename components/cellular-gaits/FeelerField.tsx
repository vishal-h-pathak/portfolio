"use client";

/**
 * Cellular Gaits — the seek-vs-avoid arbitration visual (Navigation behavior, N-B).
 *
 * Navigation is the *synthesis* behavior: seek a goal AND avoid obstacles. This
 * top-down schematic makes the arbitration legible. The fly homes on an odor
 * goal beacon (the chemotaxis gradient, reused) and senses obstacles with two
 * bilateral "feeler" fans — short-range obstacle proximity, left field vs right.
 * Two emergent drives fall out of two bilateral asymmetries:
 *   • a SEEK vector  — turn toward the goal, from the odor L−R asymmetry
 *   • an AVOID vector — turn away from the near obstacle, from the feeler L−R
 *     asymmetry; the detour *direction* is emergent, nothing hard-codes it
 * and the controller must ARBITRATE the two when they point different ways. The
 * resolved DETOUR heading is seek ⊕ avoid: it bends around the wall.
 *
 * Honesty (see the tab copy): unlike escape, navigation has NO clean real-circuit
 * seam — real flies avoid obstacles with vision / optic flow, not feeler rays.
 * This feeler front-end is a robotics rangefinder abstraction, so this visual is
 * about the two-drive arbitration, deliberately NOT a neuron map.
 *
 * The geometry is analytic and deterministic (ray–circle casts against the
 * obstacle; the vectors are the real sums, not hand-drawn), so it renders the
 * same with or without a trained controller — N-C drops the live
 * place-the-goal / drag-the-obstacles FlyStage into the page's placeholder slot.
 *
 * Reuses the EscapeCircuit / SystemDiagram house style + popout interaction:
 * hover · tap · focus reveals each part's one-line role; keyboard-focusable,
 * Esc to dismiss, edge-aware popout positioning. Pure SVG + React state — NO
 * three.js / WASM is pulled into this content route.
 */

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const GREEN = "#6FE39A"; // the resolved detour heading (our controller's action)
const AMBER = "#E89B3D"; // the odor goal beacon + the seek drive (toward goal)
const DANGER = "#F2683C"; // the obstacle + the avoid drive (away from the wall)
const INK = "#E8E6DF";
const SUB = "#8C8B83";
const RULE = "rgba(232,230,223,0.18)";

// SVG coordinate system; the <svg> scales to fill its width. Box fractions
// (x/W, y/H) map linearly onto the container for popout positioning.
const W = 560;
const H = 408;

// Fly fixed near the bottom, facing straight up (screen −y). The feelers fan
// out from its head; the goal sits up ahead, the obstacle in between.
const FX = 282;
const FY = 330;
const HEAD = { x: FX, y: FY - 17 }; // where the feeler rays originate

const GOAL = { x: 316, y: 46 }; // odor goal beacon, slightly off straight-ahead
const OBST = { x: 232, y: 178, r: 39 }; // obstacle, biased to the LEFT of the path

const MAX_RANGE = 158; // feeler reach (px)
const N_PER_SIDE = 4; // rays per forward field
const FAN_INNER = 10 * (Math.PI / 180); // innermost ray, off the forward axis
const FAN_OUTER = 64 * (Math.PI / 180); // outermost ray
const SEEK_GAIN = 86; // draw length of the homing drive
const AVOID_GAIN = 150; // strength of the per-ray push-back

type Pt = { x: number; y: number };

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Unit vector from a→b. */
function unit(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const m = Math.hypot(dx, dy) || 1;
  return { x: dx / m, y: dy / m };
}

/**
 * Distance from `HEAD` along unit direction `dir` to the first intersection with
 * the obstacle circle, or null if the ray misses (or the hit is out of range /
 * behind the head). Standard ray–circle solve.
 */
function rayHit(dir: Pt): number | null {
  const ocx = HEAD.x - OBST.x;
  const ocy = HEAD.y - OBST.y;
  const b = ocx * dir.x + ocy * dir.y;
  const c = ocx * ocx + ocy * ocy - OBST.r * OBST.r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0 || t > MAX_RANGE) return null;
  return t;
}

type Ray = {
  /** signed fan angle from forward; <0 = left field, >0 = right field. */
  angle: number;
  dir: Pt;
  end: Pt; // where we draw the ray to (hit point or full reach)
  prox: number; // 0 (clear) … 1 (obstacle right at the head)
  side: "L" | "R";
};

/** The two feeler fans, computed once (the scene is fixed). */
function buildRays(): Ray[] {
  const rays: Ray[] = [];
  for (let i = 0; i < N_PER_SIDE; i++) {
    const a = FAN_INNER + (FAN_OUTER - FAN_INNER) * (i / (N_PER_SIDE - 1));
    for (const sgn of [-1, 1] as const) {
      const angle = sgn * a;
      // forward = (0,−1); rotate clockwise (screen) by `angle`.
      const dir = { x: Math.sin(angle), y: -Math.cos(angle) };
      const hit = rayHit(dir);
      const len = hit ?? MAX_RANGE;
      rays.push({
        angle,
        dir,
        end: { x: HEAD.x + dir.x * len, y: HEAD.y + dir.y * len },
        prox: hit == null ? 0 : 1 - hit / MAX_RANGE,
        side: sgn < 0 ? "L" : "R",
      });
    }
  }
  return rays;
}

type Box = { x: number; y: number; w: number; h: number };

type Kind = "goal" | "obstacle" | "feeler" | "seek" | "avoid" | "detour" | "fly";

type Part = {
  id: string;
  /** popout anchor box (in SVG user space). */
  box: Box;
  title: string;
  kind: Kind;
  plain: ReactNode;
};

// popout border variant per kind (reuses the SystemDiagram pop variants)
const POP_CLASS: Record<Kind, string> = {
  goal: "training", // amber
  seek: "training", // amber
  obstacle: "planned",
  avoid: "planned",
  feeler: "planned",
  detour: "runtime", // green
  fly: "runtime", // green
};

export function FeelerField() {
  const rays = useMemo(buildRays, []);

  // ── derived geometry: the two bilateral asymmetries → two drives → arbitration ─
  const {
    proxL,
    proxR,
    seekEnd,
    avoidEnd,
    detourEnd,
    avoidVec,
    seekUnit,
  } = useMemo(() => {
    const left = rays.filter((r) => r.side === "L");
    const rightR = rays.filter((r) => r.side === "R");
    // "nearest obstacle in this field" = the strongest feeler in it.
    const pL = Math.max(0, ...left.map((r) => r.prox));
    const pR = Math.max(0, ...rightR.map((r) => r.prox));

    // AVOID: every feeler that sees the wall pushes back along its own ray.
    // The sum points away from the obstacle; its lateral sign falls straight
    // out of the L−R feeler asymmetry — nothing hard-codes which way to dodge.
    let ax = 0;
    let ay = 0;
    for (const r of rays) {
      ax += r.prox * -r.dir.x;
      ay += r.prox * -r.dir.y;
    }
    ax *= AVOID_GAIN / N_PER_SIDE;
    ay *= AVOID_GAIN / N_PER_SIDE;

    // SEEK: home on the goal (the odor up-gradient direction).
    const su = unit({ x: FX, y: FY }, GOAL);
    const sx = su.x * SEEK_GAIN;
    const sy = su.y * SEEK_GAIN;

    // ARBITRATION: the detour heading is the vector sum of the two drives.
    const dx = sx + ax;
    const dy = sy + ay;
    const dLen = Math.hypot(dx, dy) || 1;
    const DETOUR_DRAW = 132;

    return {
      proxL: pL,
      proxR: pR,
      seekUnit: su,
      avoidVec: { x: ax, y: ay },
      seekEnd: { x: FX + sx, y: FY + sy },
      avoidEnd: { x: FX + ax, y: FY + ay },
      detourEnd: {
        x: FX + (dx / dLen) * DETOUR_DRAW,
        y: FY + (dy / dLen) * DETOUR_DRAW,
      },
    };
  }, [rays]);

  // which side the emergent detour bends toward (for the readout copy)
  const avoidSide = avoidVec.x >= 0 ? "right" : "left";
  const fmt = (v: number) => v.toFixed(2);

  const PARTS: Part[] = useMemo(
    () => [
      {
        id: "goal",
        box: { x: GOAL.x - 30, y: GOAL.y - 18, w: 60, h: 44 },
        title: "Odor goal beacon",
        kind: "goal",
        plain: (
          <>
            The goal, sensed as an <strong>odor gradient</strong> — the{" "}
            <em>chemotaxis cue, reused</em>. It is{" "}
            <strong>bilateral</strong>: the left−right antenna difference says
            which way the goal lies. That asymmetry is the <em>seek</em> drive.
          </>
        ),
      },
      {
        id: "obstacle",
        box: { x: OBST.x - OBST.r, y: OBST.y - OBST.r, w: OBST.r * 2, h: OBST.r * 2 },
        title: "Obstacle",
        kind: "obstacle",
        plain: (
          <>
            A wall in the path. The feelers sense <em>how near</em> it is on each
            side — but <strong>nothing tells the fly which way to dodge</strong>.
            The detour direction has to fall out of the asymmetry.
          </>
        ),
      },
      {
        id: "feelerL",
        box: { x: 70, y: 150, w: 150, h: 150 },
        title: "Left feeler field",
        kind: "feeler",
        plain: (
          <>
            A fan of <strong>short-range feelers</strong> over the left forward
            field — a hand-built rangefinder, <em>not</em> biology. Each ray
            reads obstacle proximity; brighter = nearer. Strongest here ={" "}
            <code>proxL {fmt(proxL)}</code>.
          </>
        ),
      },
      {
        id: "feelerR",
        box: { x: 340, y: 150, w: 150, h: 150 },
        title: "Right feeler field",
        kind: "feeler",
        plain: (
          <>
            The mirror fan over the right forward field. Strongest ray ={" "}
            <code>proxR {fmt(proxR)}</code>. The <em>difference</em>{" "}
            <code>proxL − proxR</code> is the bilateral asymmetry that the avoid
            direction emerges from — the same motif as chemotaxis and escape.
          </>
        ),
      },
      {
        id: "seek",
        box: {
          x: Math.min(FX, seekEnd.x) - 14,
          y: Math.min(FY, seekEnd.y) - 14,
          w: Math.abs(seekEnd.x - FX) + 28,
          h: Math.abs(seekEnd.y - FY) + 28,
        },
        title: "Seek drive",
        kind: "seek",
        plain: (
          <>
            <strong>Turn toward the goal.</strong> The homing vector, from the
            odor left−right asymmetry — the chemotaxis reflex, intact. On its own
            it would walk the fly <em>straight into the wall</em>.
          </>
        ),
      },
      {
        id: "avoid",
        box: {
          x: Math.min(FX, avoidEnd.x) - 14,
          y: Math.min(FY, avoidEnd.y) - 14,
          w: Math.abs(avoidEnd.x - FX) + 28,
          h: Math.abs(avoidEnd.y - FY) + 28,
        },
        title: "Avoid drive",
        kind: "avoid",
        plain: (
          <>
            <strong>Turn away from the near wall.</strong> Each feeler that sees
            the obstacle pushes back along its own ray; the sum points away from
            it. The wall sits left, so the push is to the{" "}
            <strong>{avoidSide}</strong> — <em>emergent</em>, never hard-coded.
          </>
        ),
      },
      {
        id: "detour",
        box: {
          x: Math.min(FX, detourEnd.x) - 16,
          y: Math.min(FY, detourEnd.y) - 16,
          w: Math.abs(detourEnd.x - FX) + 32,
          h: Math.abs(detourEnd.y - FY) + 32,
        },
        title: "Detour heading",
        kind: "detour",
        plain: (
          <>
            <strong>The arbitration: seek ⊕ avoid.</strong> The two competing
            drives summed — the heading the controller actually takes. It{" "}
            <strong>bends {avoidSide} around the obstacle</strong> while still
            carrying toward the goal. This is the whole behavior, in one vector.
          </>
        ),
      },
      {
        id: "fly",
        box: { x: FX - 16, y: FY - 18, w: 32, h: 40 },
        title: "The fly (warm-started forager)",
        kind: "fly",
        plain: (
          <>
            Warm-started from the <strong>chemotaxis forager</strong>. With the
            feelers off it is the pure forager — it walks straight at the goal,{" "}
            <em>into the wall</em>. The <strong>avoidance is the added skill</strong>.
          </>
        ),
      },
    ],
    [proxL, proxR, seekEnd, avoidEnd, detourEnd, avoidSide],
  );

  // ── popout machinery (shared with EscapeCircuit) ──────────────────────────
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, ready: false });

  const containerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const open = useCallback(
    (id: string) => {
      cancelClose();
      setActive(id);
      setPos((p) => ({ ...p, ready: false }));
    },
    [cancelClose],
  );

  const scheduleClose = useCallback(() => {
    if (pinned) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setActive(null), 130);
  }, [pinned, cancelClose]);

  const toggle = useCallback(
    (id: string) => {
      cancelClose();
      if (pinned && active === id) {
        setPinned(false);
        setActive(null);
      } else {
        setPinned(true);
        setActive(id);
        setPos((p) => ({ ...p, ready: false }));
      }
    },
    [pinned, active, cancelClose],
  );

  const dismiss = useCallback(() => {
    setPinned(false);
    setActive(null);
  }, []);

  const activePart = PARTS.find((p) => p.id === active) ?? null;

  useLayoutEffect(() => {
    if (!activePart) return;
    const reposition = () => {
      const container = containerRef.current;
      const pop = popRef.current;
      if (!container || !pop) return;
      const cwid = container.clientWidth;
      const ch = container.clientHeight;
      const pw = pop.offsetWidth;
      const ph = pop.offsetHeight;
      const bx = (activePart.box.x / W) * cwid;
      const by = (activePart.box.y / H) * ch;
      const bw = (activePart.box.w / W) * cwid;
      const bh = (activePart.box.h / H) * ch;
      const left = clamp(bx + bw / 2 - pw / 2, 8, cwid - pw - 8);
      let top = by + bh + 10;
      if (top + ph > ch - 4) top = by - ph - 10;
      top = clamp(top, 8, ch - ph - 8);
      setPos({ left, top, ready: true });
    };
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [activePart]);

  const handlers = (id: string) => ({
    role: "button" as const,
    tabIndex: 0,
    "aria-haspopup": "dialog" as const,
    "aria-expanded": active === id,
    style: { cursor: "pointer", outline: "none" },
    onMouseEnter: () => open(id),
    onMouseLeave: scheduleClose,
    onFocus: () => open(id),
    onBlur: scheduleClose,
    onClick: () => toggle(id),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle(id);
      }
    },
  });

  // arrow drawing helper: a vector from the fly with an arrowhead marker.
  const Vector = ({
    id,
    end,
    color,
    width,
    label,
    labelDx = 0,
    labelDy = 0,
  }: {
    id: string;
    end: Pt;
    color: string;
    width: number;
    label: string;
    labelDx?: number;
    labelDy?: number;
  }) => {
    const part = PARTS.find((p) => p.id === id)!;
    const isOn = active === id;
    return (
      <g
        {...handlers(id)}
        aria-label={`${part.title}. ${typeofPlain(part)} Activate to reveal its role.`}
      >
        {/* invisible fat hit-line so the thin arrow is easy to focus/hover */}
        <line
          x1={FX}
          y1={FY}
          x2={end.x}
          y2={end.y}
          stroke="transparent"
          strokeWidth={16}
        />
        <line
          x1={FX}
          y1={FY}
          x2={end.x}
          y2={end.y}
          stroke={color}
          strokeWidth={isOn ? width + 0.8 : width}
          markerEnd={`url(#nav-arrow-${id})`}
          opacity={isOn ? 1 : 0.92}
        />
        <text
          x={end.x + labelDx}
          y={end.y + labelDy}
          fill={color}
          fontSize={11}
          fontWeight={500}
          textAnchor="middle"
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <figure className="cg-feeler-fig">
      <div className="cg-feeler-stage">
        <div
          className="sysdiagram cg-feeler-diagram"
          ref={containerRef}
          onKeyDown={(e) => {
            if (e.key === "Escape") dismiss();
          }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-labelledby="nav-feeler-title nav-feeler-desc"
            style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
          >
            <title id="nav-feeler-title">
              Top-down navigation schematic: a fly arbitrating a seek-the-goal
              drive against an avoid-the-obstacle drive
            </title>
            <desc id="nav-feeler-desc">
              A top-down view of a fly facing up toward an odor goal beacon, with
              an obstacle in the path. Two fans of short-range feeler rays sweep
              the left and right forward fields and read how near the obstacle is
              on each side. From the odor left−right asymmetry comes a seek
              vector pointing toward the goal; from the feeler left−right
              asymmetry comes an avoid vector pointing away from the obstacle.
              The two are summed into an emergent detour heading that bends around
              the obstacle while still carrying toward the goal. Nothing hard-codes
              which way to dodge. Each element is focusable and reveals its role.
              The feelers are a robotics rangefinder abstraction, not a biological
              circuit.
            </desc>

            <defs>
              {(
                [
                  ["seek", AMBER],
                  ["avoid", DANGER],
                  ["detour", GREEN],
                ] as const
              ).map(([id, color]) => (
                <marker
                  key={id}
                  id={`nav-arrow-${id}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0L10 5L0 10z" fill={color} />
                </marker>
              ))}
              <radialGradient id="nav-goal-glow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor={AMBER} stopOpacity={0.42} />
                <stop offset="0.5" stopColor={AMBER} stopOpacity={0.14} />
                <stop offset="1" stopColor={AMBER} stopOpacity={0} />
              </radialGradient>
            </defs>

            {/* arena backdrop */}
            <rect
              x={0.5}
              y={0.5}
              width={W - 1}
              height={H - 1}
              rx={8}
              fill="rgba(232,230,223,0.015)"
              stroke={RULE}
              strokeWidth={1}
            />

            {/* the straight fly→goal line the pure forager would take (into the wall) */}
            <line
              x1={FX}
              y1={FY}
              x2={GOAL.x}
              y2={GOAL.y}
              stroke={RULE}
              strokeWidth={1}
              strokeDasharray="2 6"
            />

            {/* ── the two feeler fans ── */}
            {(["L", "R"] as const).map((side) => {
              const id = side === "L" ? "feelerL" : "feelerR";
              const part = PARTS.find((p) => p.id === id)!;
              return (
                <g
                  key={id}
                  {...handlers(id)}
                  aria-label={`${part.title}. ${typeofPlain(part)} Activate to reveal its role.`}
                >
                  {rays
                    .filter((r) => r.side === side)
                    .map((r, i) => {
                      const lit = r.prox > 0;
                      return (
                        <g key={i}>
                          <line
                            x1={HEAD.x}
                            y1={HEAD.y}
                            x2={r.end.x}
                            y2={r.end.y}
                            stroke={lit ? DANGER : SUB}
                            strokeWidth={lit ? 1.4 + r.prox * 1.6 : 1}
                            strokeDasharray={lit ? undefined : "2 4"}
                            opacity={
                              active === id ? 1 : lit ? 0.55 + 0.45 * r.prox : 0.4
                            }
                          />
                          {lit && (
                            <circle
                              cx={r.end.x}
                              cy={r.end.y}
                              r={2 + r.prox * 2.4}
                              fill={DANGER}
                              opacity={0.5 + 0.5 * r.prox}
                            />
                          )}
                        </g>
                      );
                    })}
                  <text
                    x={side === "L" ? 96 : W - 96}
                    y={150}
                    fill={SUB}
                    fontSize={10}
                    textAnchor="middle"
                    letterSpacing="0.04em"
                  >
                    {side === "L" ? "feelers · L" : "feelers · R"}
                  </text>
                </g>
              );
            })}

            {/* ── the obstacle ── */}
            <g
              {...handlers("obstacle")}
              aria-label={`Obstacle. ${typeofPlain(PARTS.find((p) => p.id === "obstacle")!)} Activate to reveal its role.`}
            >
              <circle
                cx={OBST.x}
                cy={OBST.y}
                r={OBST.r}
                fill="rgba(242,104,60,0.10)"
                stroke={DANGER}
                strokeWidth={active === "obstacle" ? 2 : 1.4}
                strokeDasharray="5 4"
              />
              <text
                x={OBST.x}
                y={OBST.y + 4}
                fill={DANGER}
                fontSize={10.5}
                textAnchor="middle"
                letterSpacing="0.04em"
              >
                WALL
              </text>
            </g>

            {/* ── the odor goal beacon ── */}
            <g
              {...handlers("goal")}
              aria-label={`Odor goal beacon. ${typeofPlain(PARTS.find((p) => p.id === "goal")!)} Activate to reveal its role.`}
            >
              <circle cx={GOAL.x} cy={GOAL.y} r={34} fill="url(#nav-goal-glow)" />
              <circle
                cx={GOAL.x}
                cy={GOAL.y}
                r={7}
                fill={AMBER}
                stroke={INK}
                strokeWidth={1.3}
              />
              <circle
                cx={GOAL.x}
                cy={GOAL.y}
                r={12}
                fill="none"
                stroke={AMBER}
                strokeWidth={1}
                opacity={active === "goal" ? 0.95 : 0.6}
              />
              <text
                x={GOAL.x + 18}
                y={GOAL.y + 4}
                fill={AMBER}
                fontSize={10.5}
                letterSpacing="0.04em"
              >
                GOAL
              </text>
            </g>

            {/* ── the three drives (order: detour on top) ── */}
            <Vector id="seek" end={seekEnd} color={AMBER} width={2} label="seek" labelDy={-7} />
            <Vector id="avoid" end={avoidEnd} color={DANGER} width={2} label="avoid" labelDy={14} labelDx={6} />
            <Vector id="detour" end={detourEnd} color={GREEN} width={2.6} label="detour" labelDy={-7} />

            {/* ── the fly body (oriented marker, facing up) ── */}
            <g
              {...handlers("fly")}
              aria-label={`The fly, a warm-started chemotaxis forager. ${typeofPlain(PARTS.find((p) => p.id === "fly")!)} Activate to reveal its role.`}
            >
              <ellipse
                cx={FX}
                cy={FY}
                rx={9}
                ry={14}
                fill="rgba(232,230,223,0.12)"
                stroke={INK}
                strokeWidth={active === "fly" ? 2 : 1.4}
              />
              <circle cx={HEAD.x} cy={HEAD.y} r={3.4} fill={INK} />
            </g>
          </svg>

          {activePart && (
            <div
              ref={popRef}
              role="dialog"
              aria-label={`${activePart.title} — detail`}
              className={`sysdiagram-pop ${POP_CLASS[activePart.kind]}`}
              style={{ left: pos.left, top: pos.top, opacity: pos.ready ? 1 : 0 }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <h4>{activePart.title}</h4>
              <p className="sysdiagram-pop-plain">{activePart.plain}</p>
            </div>
          )}
        </div>

        {/* ── the arbitration readout: two asymmetries → two drives → one heading ── */}
        <div className="cg-feeler-readout">
          <p className="cg-feeler-readout-eyebrow">two drives, arbitrated</p>

          <div className="cg-feeler-drive" data-drive="seek">
            <p className="cg-feeler-drive-h">
              <span className="cg-feeler-dot" style={{ background: AMBER }} />
              seek · toward goal
            </p>
            <p className="cg-feeler-drive-p">
              from the odor <code>L − R</code> antenna asymmetry — the homing
              drive. Alone, it walks into the wall.
            </p>
          </div>

          <div className="cg-feeler-drive" data-drive="avoid">
            <p className="cg-feeler-drive-h">
              <span className="cg-feeler-dot" style={{ background: DANGER }} />
              avoid · away from wall
            </p>
            <div className="cg-feeler-bars" aria-hidden="true">
              <div className="cg-feeler-bar-row">
                <span className="cg-feeler-bar-k" data-lead={proxL >= proxR ? "1" : undefined}>
                  proxL
                </span>
                <span className="cg-feeler-bar-track">
                  <span
                    className="cg-feeler-bar-fill"
                    style={{ width: `${Math.round(proxL * 100)}%` }}
                  />
                </span>
                <span className="cg-feeler-bar-v">{fmt(proxL)}</span>
              </div>
              <div className="cg-feeler-bar-row">
                <span className="cg-feeler-bar-k" data-lead={proxR > proxL ? "1" : undefined}>
                  proxR
                </span>
                <span className="cg-feeler-bar-track">
                  <span
                    className="cg-feeler-bar-fill"
                    style={{ width: `${Math.round(proxR * 100)}%` }}
                  />
                </span>
                <span className="cg-feeler-bar-v">{fmt(proxR)}</span>
              </div>
            </div>
            <p className="cg-feeler-drive-p">
              wall reads stronger on the <strong>left</strong>{" "}
              (<code>proxL − proxR = {(proxL - proxR >= 0 ? "+" : "") + fmt(proxL - proxR)}</code>),
              so the push is to the <strong>{avoidSide}</strong> — emergent.
            </p>
          </div>

          <p className="cg-feeler-arb">
            <span className="cg-feeler-arb-k">seek ⊕ avoid</span>
            <span className="cg-feeler-arb-v" style={{ color: GREEN }}>
              → detour {avoidSide} around the wall
            </span>
          </p>
        </div>
      </div>

      <figcaption className="cg-feeler-cap">
        The fly never plans a path. It holds <strong>two competing drives</strong>{" "}
        — <span style={{ color: AMBER }}>seek the goal</span> (odor{" "}
        <code>L − R</code>) and{" "}
        <span style={{ color: DANGER }}>avoid the wall</span> (feeler{" "}
        <code>L − R</code>) — and the <span style={{ color: GREEN }}>detour</span>{" "}
        is just their sum. The dodge <strong>direction is emergent</strong>, the
        same bilateral-asymmetry trick as chemotaxis and escape. Note: the
        feelers are a <strong>robotics rangefinder abstraction</strong> — real
        flies avoid obstacles with vision / optic flow, so this is a capability
        demo, deliberately <em>not</em> a neuron map.
      </figcaption>
    </figure>
  );
}

/** Flatten a part's role into a short plain-text aria sentence (no JSX). */
function typeofPlain(part: Part): string {
  const map: Record<string, string> = {
    goal: "The goal, sensed as a reused bilateral odor gradient.",
    obstacle: "A wall in the path; nothing tells the fly which way to dodge.",
    feelerL: "Short-range feelers over the left forward field; a rangefinder abstraction, not biology.",
    feelerR: "Short-range feelers over the right forward field; the left minus right difference drives the dodge.",
    seek: "The homing drive toward the goal, from the odor asymmetry.",
    avoid: "The push away from the near wall, from the feeler asymmetry; emergent, not hard-coded.",
    detour: "The arbitration: seek plus avoid, the heading actually taken; it bends around the wall.",
    fly: "A warm-started chemotaxis forager; with feelers off it walks straight into the wall.",
  };
  return map[part.id] ?? "";
}

export default FeelerField;
