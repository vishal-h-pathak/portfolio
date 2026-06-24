"use client";

/**
 * Cellular Gaits — sensorimotor loop, open vs closed (Behaviors hub, C2-B).
 *
 * The upgrade of the SystemDiagram / SignalPathDiagram dashed feedback arc: two
 * interactive panels side by side, before / after.
 *   - OPEN (today):   grid → motor map → body, with the proprioceptive return
 *     arc drawn DASHED — planned, not wired. The grid drives the legs but never
 *     feels them.
 *   - CLOSED (now):   the same forward path, with the proprioceptive arc drawn
 *     SOLID — joint angles + foot contacts written back into the grid. The loop
 *     is closed; goal-directed behaviour becomes possible.
 *
 * Reuses the SystemDiagram house style and popout interaction (hover · tap ·
 * focus reveals each block's one-liner; keyboard-focusable, Esc to dismiss,
 * edge-aware popout positioning). Pure SVG + React state — NO three.js / WASM is
 * pulled into this content route.
 */

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const GREEN = "#6FE39A";
const GRAY = "rgba(232,230,223,0.45)";
const SUB = "#8C8B83";

// One panel coordinate system; the <svg> scales to fill its grid cell. Block
// fractions (x/W, y/H) map linearly onto the container for popout positioning.
// W is wide enough to hold a right-hand label column so the proprioceptive-arc
// labels read horizontally instead of being rotated vertical.
const W = 330;
const H = 320;

const BX = 20;
const BW = 150;
const BH = 58;
const CX = BX + BW / 2; // forward-arrow column (down the centre of the boxes)

type Item = {
  id: string;
  /** Popout anchor box in SVG coords. */
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  /** Green forward block vs the sensory return arc. */
  kind: "runtime" | "sensor";
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
      "One shared local rule on an 8×8×4 grid (660 params) emits the motor pattern.",
  },
  {
    id: "map",
    y: 131,
    title: "Motor map",
    sub: "cells → 42 joints",
    plain: "Channel 0 of the top-left 7×6 sub-grid becomes 42 joint targets.",
  },
  {
    id: "body",
    y: 240,
    title: "Fly body",
    sub: "MuJoCo · 250 Hz",
    plain:
      "FlyGym MuJoCo Drosophila — 42 actuators, contact-rich, stepped at 250 Hz.",
  },
];

const ARC_OPEN: ReactNode = (
  <>
    Joint angles + foot contacts. <strong>Nothing flows back yet</strong> — the
    grid drives the legs but never feels them, so it plays the same rhythm no
    matter what the body does.
  </>
);
const ARC_CLOSED: ReactNode = (
  <>
    <strong>42 joint angles + 6 foot contacts</strong> written back into the grid
    every control step, so the rule can react to what the body is actually doing.
    The dashed arc, finally solid — wired and trained in the{" "}
    <strong>Perturbation</strong> behavior, where it halves post-shove heading
    error.
  </>
);

function panelItems(closed: boolean): Item[] {
  const blocks: Item[] = BLOCKS.map((b) => ({
    id: b.id,
    x: BX,
    y: b.y,
    w: BW,
    h: BH,
    title: b.title,
    kind: "runtime" as const,
    plain: b.plain,
  }));
  const arc: Item = {
    id: "arc",
    x: BX + BW - 6,
    y: BLOCKS[0].y + BH / 2,
    w: W - (BX + BW) + 6,
    h: BLOCKS[2].y + BH / 2 - (BLOCKS[0].y + BH / 2),
    title: "Proprioception",
    kind: "sensor",
    plain: closed ? ARC_CLOSED : ARC_OPEN,
  };
  return [...blocks, arc];
}

function LoopPanel({ closed, idp }: { closed: boolean; idp: string }) {
  // Memoized so `items` (and therefore `activeItem`) keep a stable identity
  // across renders — otherwise the popout-positioning effect, keyed on
  // `activeItem`, would re-fire after its own setPos and loop (React #185).
  const items = useMemo(() => panelItems(closed), [closed]);
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

  const arcColor = closed ? GREEN : GRAY;
  const titleId = `${idp}-title`;
  const descId = `${idp}-desc`;

  // y-centres of the three boxes for the forward + return geometry.
  const topMid = BLOCKS[0].y + BH / 2;
  const botMid = BLOCKS[2].y + BH / 2;
  const arcX = W - 96; // far edge of the return curve (leaves a right label column)

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
        <title id={titleId}>
          {closed ? "Closed-loop sensorimotor path" : "Open-loop sensorimotor path"}
        </title>
        <desc id={descId}>
          The NCA grid drives the motor map, which drives the MuJoCo fly body.
          {closed
            ? " A solid proprioceptive arc carries 42 joint angles and 6 foot contacts from the body back into the grid, closing the loop."
            : " A dashed, not-yet-wired proprioceptive arc shows where joint angles and foot contacts would feed back; today there is no return path and the grid walks blind."}
        </desc>

        <defs>
          <marker id={`${idp}-green`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={GREEN} />
          </marker>
          <marker id={`${idp}-arc`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={arcColor} />
          </marker>
        </defs>

        {/* forward arrows (green, solid) */}
        <line x1={CX} y1={BLOCKS[0].y + BH} x2={CX} y2={BLOCKS[1].y} stroke={GREEN} strokeWidth={1.5} markerEnd={`url(#${idp}-green)`} />
        <line x1={CX} y1={BLOCKS[1].y + BH} x2={CX} y2={BLOCKS[2].y} stroke={GREEN} strokeWidth={1.5} markerEnd={`url(#${idp}-green)`} />

        {/* proprioceptive return arc — dashed (open) / solid (closed) */}
        {(() => {
          const d = `M${BX + BW} ${botMid} C ${arcX} ${botMid - 8}, ${arcX} ${topMid + 8}, ${BX + BW} ${topMid}`;
          return (
            <g
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-expanded={active === "arc"}
              aria-label={`Proprioceptive feedback. ${closed ? "Closed: joint angles and foot contacts feed back into the grid." : "Open: no feedback is wired yet."} Activate to reveal more.`}
              style={{ cursor: "pointer", outline: "none" }}
              onMouseEnter={() => open("arc")}
              onMouseLeave={scheduleClose}
              onFocus={() => open("arc")}
              onBlur={scheduleClose}
              onClick={() => toggle("arc")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle("arc");
                }
              }}
            >
              {/* fat invisible hit-area so the thin arc is easy to focus / tap */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={18} />
              <path
                d={d}
                fill="none"
                stroke={arcColor}
                strokeWidth={active === "arc" ? 2 : 1.4}
                strokeDasharray={closed ? undefined : "5 4"}
                markerEnd={`url(#${idp}-arc)`}
              />
              {/* Horizontal label column to the right of the arc (was rotated
                  vertical, which read poorly). */}
              {(() => {
                const lx = arcX + 16;
                const ly = (topMid + botMid) / 2;
                return closed ? (
                  <>
                    <text x={lx} y={ly - 14} fill={SUB} fontSize={9}>joint angles</text>
                    <text x={lx} y={ly - 2} fill={SUB} fontSize={9}>+ foot contacts</text>
                    <text x={lx} y={ly + 14} fill={GREEN} fontSize={9} opacity={0.9}>wired · solid</text>
                  </>
                ) : (
                  <>
                    <text x={lx} y={ly - 8} fill={SUB} fontSize={9}>proprioception</text>
                    <text x={lx} y={ly + 6} fill={SUB} fontSize={9}>not wired</text>
                    <text x={lx} y={ly + 18} fill={SUB} fontSize={9} opacity={0.9}>· dashed</text>
                  </>
                );
              })()}
            </g>
          );
        })()}

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
          className={`sysdiagram-pop ${activeItem.kind === "sensor" ? (closed ? "runtime" : "planned") : "runtime"}`}
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

export function ClosedLoopDiagram() {
  return (
    <div className="cg-loop-paths">
      <figure className="cg-loop-fig">
        <figcaption className="cg-loop-cap">
          <span className="cg-loop-tag" data-kind="now">open loop · today</span>
          the grid drives the legs but never feels them — the return arc is dashed
        </figcaption>
        <LoopPanel closed={false} idp="cl-open" />
      </figure>
      <figure className="cg-loop-fig">
        <figcaption className="cg-loop-cap">
          <span className="cg-loop-tag" data-kind="closed">closed loop · wired</span>
          joint angles + foot contacts feed back — the same arc, now solid (the{" "}
          <a className="cg-inline-link" href="/projects/cellular-gaits/behaviors/perturbation">Perturbation</a> behavior)
        </figcaption>
        <LoopPanel closed idp="cl-closed" />
      </figure>
    </div>
  );
}

export default ClosedLoopDiagram;
