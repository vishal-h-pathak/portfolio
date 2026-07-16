"use client";

/**
 * Cellular Gaits — the sensorimotor loop as it stands now (Sensing tab, E3).
 *
 * R3 consolidation: this used to be two near-identical panels (open-loop today /
 * closed-loop "Stage 2") with a dashed, not-yet-wired return arc. The loop is now
 * closed and live across the behaviors, so the honest picture is a SINGLE diagram
 * of the current system, not a toy before/after:
 *
 *   NCA grid → motor map → fly body   (forward path, solid green)
 *        ▲────────────────────┘        proprioceptive return, SOLID — 42 joint
 *                                       angles + 6 foot contacts written back every
 *                                       control step (closed · live)
 *   connectome brain ── tied to the controller slot: rung 3 swaps the NCA rule for
 *                       the real FlyWire connectome (looming → Giant Fiber → escape).
 *                       Its own loop is the Embodied page's job — shown here as a
 *                       labeled branch, not a second arc.
 *
 * Reuses the SystemDiagram house style + popout (hover · tap · focus reveals each
 * block's one-liner; keyboard-focusable, Esc to dismiss, edge-aware positioning).
 * Pure SVG + React state — NO three.js / WASM is pulled into this content route.
 */

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const GREEN = "var(--green)";
const SUB = "var(--ink-dim)";

// One panel coordinate system; the <svg> scales to fill its container. Block
// fractions (x/W, y/H) map linearly onto the container for popout positioning.
// The canvas is wide enough for a brain branch on the left and a horizontal
// proprioception label column on the right — no rotated/vertical text anywhere.
const W = 460;
const H = 300;

const BX = 132; // controller spine left edge (leaves room for the brain branch)
const BW = 150;
const BH = 56;
const CX = BX + BW / 2; // forward-arrow column, down the centre of the boxes
const RIGHT = BX + BW; // spine right edge — where the return arc attaches
const ARC_X = 330; // far edge of the return curve
const LABEL_X = 336; // horizontal label column to the right of the arc

// Brain branch chip on the left.
const NX = 12;
const NW = 104;

type Item = {
  id: string;
  /** Popout anchor box in SVG coords. */
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  /** runtime = green forward block; sensor = the return arc; alt = brain branch. */
  kind: "runtime" | "sensor" | "alt";
  plain: ReactNode;
};

type Block = { id: string; y: number; title: string; sub: string; plain: ReactNode };

const BLOCKS: Block[] = [
  {
    id: "grid",
    y: 22,
    title: "NCA grid",
    sub: "8×8×4 · 660 θ",
    plain:
      "One shared local rule on an 8×8×4 grid (660 params) emits the motor pattern. This is the controller slot — every rung plugs in here.",
  },
  {
    id: "map",
    y: 122,
    title: "Motor map",
    sub: "cells → 42 joints",
    plain: "Channel 0 of the top-left 7×6 sub-grid becomes 42 joint targets.",
  },
  {
    id: "body",
    y: 222,
    title: "Fly body",
    sub: "MuJoCo · 250 Hz",
    plain:
      "FlyGym MuJoCo Drosophila — 42 actuators, contact-rich, stepped at 250 Hz.",
  },
];

const PROPRIO: ReactNode = (
  <>
    <strong>42 joint angles + 6 foot contacts</strong> written back into the grid
    every control step, so the rule reacts to what the body is actually doing. The
    arc is <strong>solid — wired and live</strong> across the behaviors; in{" "}
    <strong>Perturbation</strong> it halves post-shove heading error
    (56.6°→26.5°).
  </>
);

const BRAIN: ReactNode = (
  <>
    The same controller slot also takes the project&apos;s top rung: the real
    FlyWire <strong>connectome run as a spiking brain</strong> — a looming threat
    routes through measured wiring (LC4/LPLC2 → the Giant Fiber, DNp01) to an
    escape. Built and live; its own loop is the{" "}
    <strong>Embodied</strong> page&apos;s story.
  </>
);

const ITEMS: Item[] = [
  ...BLOCKS.map(
    (b): Item => ({
      id: b.id,
      x: BX,
      y: b.y,
      w: BW,
      h: BH,
      title: b.title,
      kind: "runtime",
      plain: b.plain,
    }),
  ),
  {
    id: "proprio",
    x: RIGHT - 6,
    y: BLOCKS[0].y + BH / 2,
    w: LABEL_X - RIGHT + 70,
    h: BLOCKS[2].y + BH / 2 - (BLOCKS[0].y + BH / 2),
    title: "Proprioception",
    kind: "sensor",
    plain: PROPRIO,
  },
  {
    id: "brain",
    x: NX,
    y: BLOCKS[0].y,
    w: NW,
    h: BH,
    title: "Connectome brain",
    kind: "alt",
    plain: BRAIN,
  },
];

function SystemNowPanel({ idp }: { idp: string }) {
  // Stable identity so the popout-positioning effect (keyed on activeItem) does
  // not re-fire after its own setPos and loop (React #185).
  const items = useMemo(() => ITEMS, []);
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

  const activeItem = items.find((it) => it.id === active) ?? null;

  useLayoutEffect(() => {
    if (!activeItem) return;
    const reposition = () => {
      const container = containerRef.current;
      const pop = popRef.current;
      if (!container || !pop) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const pw = pop.offsetWidth;
      const ph = pop.offsetHeight;
      const bx = (activeItem.x / W) * cw;
      const by = (activeItem.y / H) * ch;
      const bw = (activeItem.w / W) * cw;
      const bh = (activeItem.h / H) * ch;
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
  }, [activeItem]);

  const titleId = `${idp}-title`;
  const descId = `${idp}-desc`;

  const topMid = BLOCKS[0].y + BH / 2;
  const botMid = BLOCKS[2].y + BH / 2;
  const gridMid = BLOCKS[0].y + BH / 2;

  return (
    <div
      className="sysdiagram cg-loop-panel"
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === "Escape") dismiss();
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-labelledby={`${titleId} ${descId}`}
        style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
      >
        <title id={titleId}>The sensorimotor loop, as built now</title>
        <desc id={descId}>
          The NCA grid drives the motor map, which drives the MuJoCo fly body. A
          solid proprioceptive arc carries 42 joint angles and 6 foot contacts
          from the body back into the grid, closing the loop — wired and live
          across the behaviors. The same controller slot also takes the connectome
          brain (looming to Giant Fiber to escape), shown as a branch on the left
          and detailed on the Embodied page.
        </desc>

        <defs>
          <marker id={`${idp}-green`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={GREEN} />
          </marker>
        </defs>

        {/* forward arrows (green, solid) */}
        <line x1={CX} y1={BLOCKS[0].y + BH} x2={CX} y2={BLOCKS[1].y} stroke={GREEN} strokeWidth={1.5} markerEnd={`url(#${idp}-green)`} />
        <line x1={CX} y1={BLOCKS[1].y + BH} x2={CX} y2={BLOCKS[2].y} stroke={GREEN} strokeWidth={1.5} markerEnd={`url(#${idp}-green)`} />

        {/* proprioceptive return arc — SOLID (the loop is closed) */}
        {(() => {
          const d = `M${RIGHT} ${botMid} C ${ARC_X} ${botMid - 8}, ${ARC_X} ${topMid + 8}, ${RIGHT} ${topMid}`;
          return (
            <g
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-expanded={active === "proprio"}
              aria-label="Proprioceptive feedback. Closed and live: 42 joint angles and 6 foot contacts feed back into the grid every control step. Activate to reveal more."
              style={{ cursor: "pointer", outline: "none" }}
              onMouseEnter={() => open("proprio")}
              onMouseLeave={scheduleClose}
              onFocus={() => open("proprio")}
              onBlur={scheduleClose}
              onClick={() => toggle("proprio")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle("proprio");
                }
              }}
            >
              {/* fat invisible hit-area so the thin arc is easy to focus / tap */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={18} />
              <path
                d={d}
                fill="none"
                stroke={GREEN}
                strokeWidth={active === "proprio" ? 2.2 : 1.6}
                markerEnd={`url(#${idp}-green)`}
              />
              {/* horizontal label column to the right of the arc */}
              {(() => {
                const ly = (topMid + botMid) / 2;
                return (
                  <>
                    <text x={LABEL_X} y={ly - 14} fill={SUB} fontSize={10}>joint angles</text>
                    <text x={LABEL_X} y={ly - 1} fill={SUB} fontSize={10}>+ foot contacts</text>
                    <text x={LABEL_X} y={ly + 15} fill={GREEN} fontSize={10} opacity={0.95}>closed · live</text>
                  </>
                );
              })()}
            </g>
          );
        })()}

        {/* brain branch — tied to the controller slot (no arrowhead: it is an
            alternative controller, not a feed). SOLID thin tie: this rung is
            built and live (the Embodied page), so it reads "real, swappable rung",
            not "planned/unwired". Detail + the Embodied page in the popout. */}
        <line
          x1={NX + NW}
          y1={gridMid}
          x2={BX}
          y2={gridMid}
          stroke={GREEN}
          strokeWidth={1.4}
          opacity={1}
        />
        <g
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={active === "brain"}
          aria-label="Connectome brain. The top rung: the same controller slot runs the real FlyWire connectome as a spiking brain. Detailed on the Embodied page. Activate to reveal more."
          style={{ cursor: "pointer", outline: "none" }}
          onMouseEnter={() => open("brain")}
          onMouseLeave={scheduleClose}
          onFocus={() => open("brain")}
          onBlur={scheduleClose}
          onClick={() => toggle("brain")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle("brain");
            }
          }}
        >
          <rect
            x={NX}
            y={BLOCKS[0].y}
            width={NW}
            height={BH}
            rx={6}
            fill="rgba(111,227,154,0.05)"
            stroke={GREEN}
            strokeOpacity={active === "brain" ? 1 : 0.85}
            strokeWidth={active === "brain" ? 1.8 : 1.2}
          />
          <text x={NX + 12} y={BLOCKS[0].y + 23} fill={GREEN} fontSize={11.5} fontWeight={500}>
            connectome
          </text>
          <text x={NX + 12} y={BLOCKS[0].y + 38} fill={GREEN} fontSize={11.5} fontWeight={500}>
            brain
          </text>
          <text x={NX + 12} y={BLOCKS[0].y + 51} fill={SUB} fontSize={9}>
            → Embodied
          </text>
        </g>
        <text x={NX} y={BLOCKS[0].y + BH + 16} fill={SUB} fontSize={9}>
          rung 3 · alt controller
        </text>

        {/* forward blocks (green) — each reveals its one-liner */}
        {BLOCKS.map((b) => (
          <g
            key={b.id}
            role="button"
            tabIndex={0}
            aria-haspopup="dialog"
            aria-expanded={active === b.id}
            aria-label={`${b.title}. ${b.sub}. Activate to reveal the detail.`}
            style={{ cursor: "pointer", outline: "none" }}
            onMouseEnter={() => open(b.id)}
            onMouseLeave={scheduleClose}
            onFocus={() => open(b.id)}
            onBlur={scheduleClose}
            onClick={() => toggle(b.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(b.id);
              }
            }}
          >
            <rect
              x={BX}
              y={b.y}
              width={BW}
              height={BH}
              rx={6}
              fill="rgba(111,227,154,0.10)"
              stroke={GREEN}
              strokeWidth={active === b.id ? 2 : 1}
            />
            <text x={BX + 14} y={b.y + 26} fill={GREEN} fontSize={13.5} fontWeight={500}>
              {b.title}
            </text>
            <text x={BX + 14} y={b.y + 43} fill={SUB} fontSize={10.5}>
              {b.sub}
            </text>
          </g>
        ))}
      </svg>

      {activeItem && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={`${activeItem.title} — detail`}
          className="sysdiagram-pop runtime"
          style={{ left: pos.left, top: pos.top, opacity: pos.ready ? 1 : 0 }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <h4>{activeItem.title}</h4>
          <p className="sysdiagram-pop-plain">{activeItem.plain}</p>
        </div>
      )}
    </div>
  );
}

export function SignalPathDiagram() {
  return (
    <figure className="cg-loop-fig" style={{ maxWidth: 560, margin: "0 auto" }}>
      <SystemNowPanel idp="sp-now" />
      <figcaption className="cg-loop-cap">
        <span className="cg-loop-tag" data-kind="closed">closed loop · live</span>
        the same forward path, with the proprioceptive arc now solid — wired and
        trained, live across the behaviors (the{" "}
        <a className="cg-inline-link" href="/projects/cellular-gaits/behaviors/perturbation">Perturbation</a> A/B)
      </figcaption>
    </figure>
  );
}

export default SignalPathDiagram;
