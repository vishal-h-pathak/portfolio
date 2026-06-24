"use client";

/**
 * Cellular Gaits — the controller ladder (E7, embodied tab).
 *
 * A themed signal-flow companion to SystemDiagram. The whole project is one
 * controller slot driving one FlyGym body; the scientific arc is to swap the
 * controller for progressively more *biological* structure and ask whether real
 * structure, embodied, produces real behaviour:
 *
 *   NCA null model (done) → closed proprioceptive loop (done) → the real
 *   FlyWire connectome brain in the loop: looming → Giant Fiber → escape (LIVE)
 *
 * All three rungs are built. The slot and the body are held fixed (neutral,
 * "fixed" kind) so the only thing that changes between rungs is the controller's
 * internal structure. The green path marks the live chain — it runs all the way
 * down to the connectome-brain rung, which is the climax (see the Embodied tab).
 *
 * Reuses the .sysdiagram / .sysdiagram-pop CSS from SystemDiagram. Hover · tap ·
 * focus reveals each rung's "what changes"; Esc closes; popout is edge-aware.
 * No new physics — purely explanatory.
 */

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// SVG coordinate system. Block fractions (x/W, y/H) map linearly onto the
// container so the popout can be positioned over its block.
const W = 780;
const H = 520;

type Kind = "today" | "fixed";
/** Which popout border style to borrow from .sysdiagram-pop.* */
type Pop = "runtime" | "training" | "planned";

type Block = {
  id: string;
  kind: Kind;
  pop: Pop;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stage badge, e.g. "01 · TODAY". Omitted for the fixed slot/body. */
  stage?: string;
  title: string;
  sub: string;
  /** Short plain-language "what changes" line; also the screen-reader text. */
  plain: string;
  /** Fuller detail revealed in the popout. */
  body: ReactNode;
};

const PALETTE: Record<
  Kind,
  { stroke: string; fill: string; title: string; dash?: string }
> = {
  today: { stroke: "#6FE39A", fill: "rgba(111,227,154,0.10)", title: "#6FE39A" },
  fixed: {
    stroke: "rgba(232,230,223,0.32)",
    fill: "rgba(232,230,223,0.04)",
    title: "#B9B7AE",
  },
};

const SUB = "#8C8B83";
const RAIL = "rgba(232,230,223,0.28)";

// Four rungs down the left, each ~84 tall. Top → bottom = increasingly
// biological. Mid-y values feed the connector + rail geometry below.
const RUNG_X = 24;
const RUNG_W = 300;
const RUNG_H = 84;
const RAIL_X = 356;

const BLOCKS: Block[] = [
  {
    id: "nca",
    kind: "today",
    pop: "runtime",
    x: RUNG_X,
    y: 64,
    w: RUNG_W,
    h: RUNG_H,
    stage: "01 · DONE",
    title: "NCA — null model",
    sub: "generic local rule",
    plain:
      "A generic neural cellular automaton, evolved by CMA-ES — proves a local update rule can walk the body, but the rule is invented, not biological. The placeholder the brain replaces.",
    body: (
      <>
        <p className="sysdiagram-pop-note">
          <strong>The starting rung.</strong> 660 params on an 8×8×4 grid, parked
          at λ≈−0.26 (just inside the ordered edge). A deliberate{" "}
          <em>null model</em>: it says a local rule <em>can</em> drive the body —
          and nothing about real neural structure. That absence is the point;
          the line climbs from here to the real circuit.
        </p>
      </>
    ),
  },
  {
    id: "loop",
    kind: "today",
    pop: "runtime",
    x: RUNG_X,
    y: 196,
    w: RUNG_W,
    h: RUNG_H,
    stage: "02 · DONE",
    title: "Closed proprioceptive loop",
    sub: "sensing → controller",
    plain:
      "Joint angles + foot contacts fed back in — the controller stops walking blind. Live across the perturbation, chemotaxis, and escape behaviors.",
    body: (
      <p className="sysdiagram-pop-note">
        The loop is closed: gait becomes reactive, and a sensed cue can steer the
        body. This is what the behavior pages run — the prerequisite the
        connectome rung below plugs straight into.
      </p>
    ),
  },
  {
    id: "brain",
    kind: "today",
    pop: "runtime",
    x: RUNG_X,
    y: 328,
    w: RUNG_W,
    h: RUNG_H,
    stage: "03 · LIVE",
    title: "Real connectome brain in the loop",
    sub: "looming → Giant Fiber → escape",
    plain:
      "The real FlyWire connectome, run as a spiking brain: a looming threat routes through measured wiring to the Giant Fiber (DNp01) and bolts the body. Built and validated.",
    body: (
      <p className="sysdiagram-pop-note">
        The wiring is no longer invented — it&apos;s <em>measured</em>. Driving the
        looming-detector neurons (LC4/LPLC2) in the live connectome fires the
        Giant Fiber, whose rate becomes the escape drive. The honest line: this
        shows the connectome routing the cue to an embodied escape, not a
        calibrated threshold (in isolation the Giant Fiber saturates). Walked out
        on the{" "}
        <a className="cg-inline-link" href="/projects/cellular-gaits/embodied">
          Embodied
        </a>{" "}
        tab.
      </p>
    ),
  },
  {
    id: "slot",
    kind: "fixed",
    pop: "planned",
    x: 420,
    y: 195,
    w: 140,
    h: 112,
    title: "controller slot",
    sub: "42 targets / step",
    plain:
      "Every rung plugs into the same interface: emit 42 joint targets each control step.",
    body: (
      <p className="sysdiagram-pop-note">
        Held <strong>fixed</strong>. Keeping the interface constant is what makes
        the comparison clean — only the controller&apos;s internal structure
        changes.
      </p>
    ),
  },
  {
    id: "body",
    kind: "fixed",
    pop: "planned",
    x: 606,
    y: 195,
    w: 150,
    h: 112,
    title: "FlyGym body",
    sub: "same MuJoCo fly",
    plain:
      "The same NeuroMechFly / FlyGym fly for every rung — 42 actuators, ~87 joints.",
    body: (
      <p className="sysdiagram-pop-note">
        Held <strong>fixed</strong>. Same body, same physics, same readout — so
        any change in behaviour comes from the controller, not the body.
      </p>
    ),
  },
];

const blockById = (id: string) => BLOCKS.find((b) => b.id === id)!;
const midY = (id: string) => {
  const b = blockById(id);
  return b.y + b.h / 2;
};

// Connectors rung → rail. All three rungs are built, so all are solid green.
const CONNECTORS: { id: string; stroke: string; dash?: string }[] = [
  { id: "nca", stroke: PALETTE.today.stroke },
  { id: "loop", stroke: PALETTE.today.stroke },
  { id: "brain", stroke: PALETTE.today.stroke },
];

const FEED_Y = midY("slot"); // rail → slot → body all sit on this line

function BlockShape({
  b,
  active,
  onOpen,
  onClose,
  onToggle,
}: {
  b: Block;
  active: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
  onToggle: (id: string) => void;
}) {
  const c = PALETTE[b.kind];
  return (
    <g
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-expanded={active}
      aria-label={`${b.stage ? b.stage + ". " : ""}${b.title}. ${b.plain} Activate to reveal more.`}
      style={{ cursor: "pointer", outline: "none" }}
      onMouseEnter={() => onOpen(b.id)}
      onMouseLeave={onClose}
      onFocus={() => onOpen(b.id)}
      onBlur={onClose}
      onClick={() => onToggle(b.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(b.id);
        }
      }}
    >
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx={6}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={active ? 2 : 1}
        strokeDasharray={c.dash}
      />
      {active && (
        <rect
          x={b.x - 4}
          y={b.y - 4}
          width={b.w + 8}
          height={b.h + 8}
          rx={9}
          fill="none"
          stroke={c.stroke}
          strokeWidth={1}
          opacity={0.45}
        />
      )}
      {b.stage && (
        <text
          x={b.x + 14}
          y={b.y + 22}
          fill={SUB}
          fontSize={10}
          letterSpacing="0.1em"
        >
          {b.stage}
        </text>
      )}
      <text
        x={b.x + 14}
        y={b.y + (b.stage ? 46 : 34)}
        fill={c.title}
        fontSize={14.5}
        fontWeight={500}
      >
        {b.title}
      </text>
      <text x={b.x + 14} y={b.y + (b.stage ? 59 : 54)} fill={SUB} fontSize={11.5}>
        {b.sub}
      </text>
      {/* Bottom-right affordance. Dropped to the card's lower edge and the stage
          sub lifted (above), so a long sub like "looming → Giant Fiber → escape"
          no longer runs into this right-aligned line. */}
      <text
        x={b.x + b.w - 12}
        y={b.y + b.h - 8}
        fill={SUB}
        fontSize={10}
        opacity={0.85}
        textAnchor="end"
      >
        ⓘ hover · tap · focus
      </text>
    </g>
  );
}

export function ControllerLadder() {
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; ready: boolean }>({
    left: 0,
    top: 0,
    ready: false,
  });

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

  const activeBlock = BLOCKS.find((b) => b.id === active) ?? null;

  useLayoutEffect(() => {
    if (!activeBlock) return;
    const reposition = () => {
      const container = containerRef.current;
      const pop = popRef.current;
      if (!container || !pop) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const pw = pop.offsetWidth;
      const ph = pop.offsetHeight;
      const bx = (activeBlock.x / W) * cw;
      const by = (activeBlock.y / H) * ch;
      const bw = (activeBlock.w / W) * cw;
      const bh = (activeBlock.h / H) * ch;

      const clamp = (v: number, lo: number, hi: number) =>
        v < lo ? lo : v > hi ? hi : v;
      const left = clamp(bx + bw / 2 - pw / 2, 8, cw - pw - 8);
      let top = by + bh + 10;
      if (top + ph > ch - 4) top = by - ph - 10;
      top = clamp(top, 8, ch - ph - 8);
      setPos({ left, top, ready: true });
    };
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [activeBlock]);

  return (
    <div
      className="sysdiagram"
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === "Escape") dismiss();
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="ladder-title ladder-desc"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          fontFamily: "var(--mono)",
        }}
      >
        <title id="ladder-title">The controller ladder</title>
        <desc id="ladder-desc">
          One controller slot drives one FlyGym MuJoCo fly body. The scientific
          arc swaps progressively more biological controllers into that slot, and
          all three rungs are built: rung one is a generic neural cellular
          automaton null model; rung two closes the proprioceptive sensing loop,
          live across the behaviors; rung three runs the real FlyWire connectome
          as a spiking brain in the loop, where a looming threat routes through
          measured wiring to the Giant Fiber and bolts the body. Top to bottom is
          increasingly biological. The slot and the body are held fixed so only
          the controller&apos;s structure changes between rungs.
        </desc>

        <defs>
          <marker
            id="ladder-green"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" fill="#6FE39A" />
          </marker>
          <marker
            id="ladder-gray"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" fill={RAIL} />
          </marker>
        </defs>

        {/* Header */}
        <text
          x={RUNG_X}
          y={22}
          fill="#6FE39A"
          fontSize={11}
          letterSpacing="0.16em"
        >
          CONTROLLER LADDER
        </text>
        <text x={RUNG_X + 178} y={22} fill={SUB} fontSize={11}>
          · one slot, one body — only the structure changes
        </text>
        <text x={RUNG_X} y={H - 14} fill={SUB} fontSize={10.5} opacity={0.85}>
          top → bottom: increasingly biological
        </text>

        {/* Rail spine: the four rungs converge here, then feed the slot. */}
        <line
          x1={RAIL_X}
          y1={midY("nca")}
          x2={RAIL_X}
          y2={midY("brain")}
          stroke={RAIL}
          strokeWidth={1.4}
        />

        {/* Connectors rung → rail (all three built → all solid green) */}
        {CONNECTORS.map((c) => {
          const y = midY(c.id);
          return (
            <line
              key={c.id}
              x1={RUNG_X + RUNG_W}
              y1={y}
              x2={RAIL_X}
              y2={y}
              stroke={c.stroke}
              strokeWidth={1.5}
              strokeDasharray={c.dash}
            />
          );
        })}

        {/* Live path: rail → slot → body (green = the built chain, down to the brain rung) */}
        <line
          x1={RAIL_X}
          y1={FEED_Y}
          x2={blockById("slot").x}
          y2={FEED_Y}
          stroke="#6FE39A"
          strokeWidth={1.5}
          markerEnd="url(#ladder-green)"
        />
        <line
          x1={blockById("slot").x + blockById("slot").w}
          y1={FEED_Y}
          x2={blockById("body").x}
          y2={FEED_Y}
          stroke="#6FE39A"
          strokeWidth={1.5}
          markerEnd="url(#ladder-green)"
        />
        {/* Centered above the slot+body pair — the slot→body gap is far too
            narrow to hold this label without it running across both boxes. */}
        <text
          x={(blockById("slot").x + blockById("body").x + blockById("body").w) / 2}
          y={blockById("slot").y - 12}
          textAnchor="middle"
          fill="#6FE39A"
          fontSize={10}
        >
          ▷ live · all rungs built
        </text>

        {BLOCKS.map((b) => (
          <BlockShape
            key={b.id}
            b={b}
            active={active === b.id}
            onOpen={open}
            onClose={scheduleClose}
            onToggle={toggle}
          />
        ))}

        {/* Legend */}
        <g fontSize={11}>
          <rect
            x={RUNG_X}
            y={H - 38}
            width={16}
            height={10}
            rx={2}
            fill={PALETTE.today.fill}
            stroke={PALETTE.today.stroke}
          />
          <text x={RUNG_X + 24} y={H - 29} fill={SUB}>
            built · live
          </text>
          <rect
            x={RUNG_X + 132}
            y={H - 38}
            width={16}
            height={10}
            rx={2}
            fill={PALETTE.fixed.fill}
            stroke={PALETTE.fixed.stroke}
          />
          <text x={RUNG_X + 156} y={H - 29} fill={SUB}>
            held fixed
          </text>
        </g>
      </svg>

      {activeBlock && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={`${activeBlock.title} — what changes`}
          className={`sysdiagram-pop ${activeBlock.pop}`}
          style={{
            left: pos.left,
            top: pos.top,
            opacity: pos.ready ? 1 : 0,
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <h4>{activeBlock.title}</h4>
          <p className="sysdiagram-pop-plain">{activeBlock.plain}</p>
          <div className="sysdiagram-pop-body">{activeBlock.body}</div>
        </div>
      )}
    </div>
  );
}
