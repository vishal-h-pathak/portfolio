"use client";

/**
 * Cellular Gaits — system-design block diagram (companion to BuildPlanDAG).
 *
 * LIVING DOC. This is the canonical at-a-glance view of the *actual* system:
 * the two coupled loops (runtime control + training/evolution), each block, and
 * the real mathematical model behind it (revealed on hover / tap / focus). Keep
 * it in sync with docs/cellular-gaits/build-plan.md and the constants in
 * public/cellular-gaits/model/manifest.json + the cellular-gaits repo
 * (nca.py / env.py / evolve.py). When the system changes — a loop closes, a
 * block is rewired, a constant moves — edit the BLOCKS / EDGES arrays below AND
 * the markdown ledger in the same change.
 *
 * Colour semantics:
 *   runtime path  = green  (#6FE39A)  — per control step, 250 Hz, solid
 *   training path = amber  (#E89B3D)  — per 3 s rollout, solid
 *   planned/sensing = dashed gray     — NOT yet implemented (open-loop today)
 */

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Math } from "@/components/cellular-gaits/Math";

// SVG coordinate system. The <svg> fills the container width at this aspect
// ratio, so block fractions (x/W, y/H) map linearly onto the container for
// popout positioning.
const W = 780;
const H = 560;

type Kind = "runtime" | "training" | "planned";

type Block = {
  id: string;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  /** Short plain-language line shown in the popout + screen-reader description. */
  plain: string;
  /** The real model / facts behind the block. */
  body: ReactNode;
};

const PALETTE: Record<
  Kind,
  { stroke: string; fill: string; title: string; dash?: string }
> = {
  runtime: { stroke: "#6FE39A", fill: "rgba(111,227,154,0.10)", title: "#6FE39A" },
  training: { stroke: "#E89B3D", fill: "rgba(232,155,61,0.10)", title: "#E89B3D" },
  planned: {
    stroke: "rgba(232,230,223,0.3)",
    fill: "rgba(232,230,223,0.03)",
    title: "#B9B7AE",
    dash: "5 4",
  },
};

const SUB = "#8C8B83";

const BLOCKS: Block[] = [
  {
    id: "controller",
    kind: "runtime",
    x: 40,
    y: 90,
    w: 192,
    h: 92,
    title: "NCA controller",
    sub: "runtime · receives θ",
    plain:
      "Neural cellular automaton — one shared rule on an 8×8×4 grid, 660 params.",
    body: (
      <>
        <Math tex="h_o(p) = \tanh\!\big(g\,(b^{1}_o + \textstyle\sum W^{1} s)\big)" />
        <Math tex="s'_c(p) = \operatorname{clip}\!\big(b^{2}_c + \textstyle\sum W^{2} h,\, -1,\, 1\big)" />
        <p className="sysdiagram-pop-note">
          One shared rule runs on every cell of the 8×8 grid (4 channels).
          The gain <code>g</code> is the criticality knob.
        </p>
      </>
    ),
  },
  {
    id: "mapping",
    kind: "runtime",
    x: 294,
    y: 90,
    w: 192,
    h: 92,
    title: "Motor mapping",
    sub: "runtime · cells → joints",
    plain: "Channel 0 of the top-left 7×6 sub-grid → 42 joint targets.",
    body: (
      <>
        <Math tex="u = \operatorname{vec}\big(s_0[0{:}7,\,0{:}6]\big) \in [-1,1]^{42}" />
        <Math tex="q^{*} = \operatorname{clip}(u,-1,1)\cdot 3.14\ \text{rad}" />
        <p className="sysdiagram-pop-note">
          One CA tick per control step. 42 targets → FlyGym’s 42 position
          actuators.
        </p>
      </>
    ),
  },
  {
    id: "body",
    kind: "runtime",
    x: 548,
    y: 90,
    w: 192,
    h: 92,
    title: "Fly body / plant",
    sub: "runtime · MuJoCo",
    plain: "FlyGym / NeuroMechFly MuJoCo fly.",
    body: (
      <ul className="sysdiagram-pop-list">
        <li>42 position actuators (<code>kp = 50</code>), ~87 joints</li>
        <li>control 250 Hz = 40 physics steps @ 10 kHz</li>
        <li>units mm · thorax <code>nmf/c_thorax</code> tracked</li>
      </ul>
    ),
  },
  {
    id: "sensing",
    kind: "planned",
    x: 294,
    y: 248,
    w: 192,
    h: 82,
    title: "Sensing",
    sub: "planned · proprioception",
    plain: "Joint angles + foot contacts fed back into the grid.",
    body: (
      <p className="sysdiagram-pop-note">
        Joint angles + foot contacts fed back into the grid.{" "}
        <strong>Not yet implemented</strong> — the controller is currently
        open-loop (walks blind). Closes in Stage 2.
      </p>
    ),
  },
  {
    id: "fitness",
    kind: "training",
    x: 548,
    y: 396,
    w: 192,
    h: 82,
    title: "Fitness F",
    sub: "training · per rollout",
    plain:
      "Forward distance minus a stability penalty, measured after warm-up.",
    body: (
      <>
        <Math tex="F = \big(x^{\text{end}}_{\text{thorax}} - x^{\text{start}}_{\text{thorax}}\big) - 0.05\, N_{\text{below}}" />
        <Math tex="z_{\text{thr}} = 0.5\, z_{\text{thorax}}" />
        <p className="sysdiagram-pop-note">
          Forward distance walked, minus a small penalty per step the thorax
          sags below half standing height.
        </p>
      </>
    ),
  },
  {
    id: "optimizer",
    kind: "training",
    x: 40,
    y: 396,
    w: 192,
    h: 82,
    title: "CMA-ES optimizer",
    sub: "training · emits θ",
    plain: "Gradient-free search — physics isn’t differentiable.",
    body: (
      <>
        <Math tex="\theta^{*} = \arg\min_{\theta}\, \big(-F(\theta)\big),\quad \theta\in\mathbb{R}^{660}" />
        <p className="sysdiagram-pop-note">
          Population 32, <code>σ₀ = 0.3</code>, 50 generations. Best v1 ≈ 86.6 mm.
        </p>
      </>
    ),
  },
];

// Edges drawn under the blocks, in the SVG coordinate space [x1,y1,x2,y2].
const RUNTIME_EDGES: [number, number, number, number][] = [
  [232, 136, 294, 136], // controller → mapping
  [486, 136, 548, 136], // mapping → body
];
const TRAINING_EDGES: [number, number, number, number][] = [
  [645, 182, 645, 396], // body → fitness (down the right)
  [548, 437, 232, 437], // fitness → optimizer (along the bottom)
  [136, 396, 136, 182], // optimizer → controller (up the left, carries θ)
];
const FEEDBACK_EDGES: [number, number, number, number][] = [
  [612, 182, 488, 282], // body → sensing
  [292, 300, 198, 182], // sensing → controller
];

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
      aria-label={`${b.title}. ${b.plain} Activate to reveal the model.`}
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
      {/* Focus/active ring */}
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
      <text x={b.x + 14} y={b.y + 34} fill={c.title} fontSize={14.5} fontWeight={500}>
        {b.title}
      </text>
      <text x={b.x + 14} y={b.y + 54} fill={SUB} fontSize={11.5}>
        {b.sub}
      </text>
      <text x={b.x + 14} y={b.y + b.h - 13} fill={SUB} fontSize={10.5} opacity={0.85}>
        ⓘ hover · tap · focus
      </text>
    </g>
  );
}

export function SystemDiagram() {
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

  // Position the popout near its block, clamped to stay on-screen. Recomputed
  // when the active block changes and on resize.
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
        aria-labelledby="sysd-title sysd-desc"
        style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
      >
        <title id="sysd-title">Cellular Gaits system-design diagram</title>
        <desc id="sysd-desc">
          Two coupled loops. The runtime control loop (green, per 250 Hz control
          step) runs the NCA controller into the motor mapping into the MuJoCo
          fly body, with a dashed proprioceptive feedback arc — sensing — that is
          not yet implemented (the controller is open-loop today and closes in
          Stage 2). The training loop (amber, per 3-second rollout) scores the
          body with a fitness function, feeds it to the CMA-ES optimizer, and
          sends the evolved parameters theta back into the controller.
        </desc>

        <defs>
          <marker id="sysd-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#6FE39A" />
          </marker>
          <marker id="sysd-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#E89B3D" />
          </marker>
          <marker id="sysd-gray" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="rgba(232,230,223,0.45)" />
          </marker>
        </defs>

        {/* Band headers */}
        <text x={40} y={42} fill="#6FE39A" fontSize={11} letterSpacing="0.08em">
          RUNTIME LOOP
        </text>
        <text x={146} y={42} fill={SUB} fontSize={11}>
          · per control step · 250 Hz
        </text>
        <text x={40} y={376} fill="#E89B3D" fontSize={11} letterSpacing="0.08em">
          TRAINING LOOP
        </text>
        <text x={150} y={376} fill={SUB} fontSize={11}>
          · per 3 s rollout
        </text>

        {/* Training edges (amber, solid) */}
        {TRAINING_EDGES.map((e, i) => (
          <line key={`t${i}`} x1={e[0]} y1={e[1]} x2={e[2]} y2={e[3]} stroke="#E89B3D" strokeWidth={1.5} markerEnd="url(#sysd-amber)" />
        ))}
        <text x={148} y={300} fill="#E89B3D" fontSize={11}>
          θ · 660 params
        </text>

        {/* Feedback edges (dashed gray, planned) */}
        {FEEDBACK_EDGES.map((e, i) => (
          <line key={`f${i}`} x1={e[0]} y1={e[1]} x2={e[2]} y2={e[3]} stroke="rgba(232,230,223,0.45)" strokeWidth={1.4} strokeDasharray="5 4" markerEnd="url(#sysd-gray)" />
        ))}
        <text x={390} y={352} textAnchor="middle" fill={SUB} fontSize={10.5}>
          proprioception · open-loop today → Stage 2
        </text>

        {/* Runtime edges (green, solid) */}
        {RUNTIME_EDGES.map((e, i) => (
          <line key={`r${i}`} x1={e[0]} y1={e[1]} x2={e[2]} y2={e[3]} stroke="#6FE39A" strokeWidth={1.5} markerEnd="url(#sysd-green)" />
        ))}

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
          <line x1={40} y1={520} x2={66} y2={520} stroke="#6FE39A" strokeWidth={1.5} markerEnd="url(#sysd-green)" />
          <text x={74} y={524} fill={SUB}>runtime</text>
          <line x1={170} y1={520} x2={196} y2={520} stroke="#E89B3D" strokeWidth={1.5} markerEnd="url(#sysd-amber)" />
          <text x={204} y={524} fill={SUB}>training</text>
          <line x1={300} y1={520} x2={326} y2={520} stroke="rgba(232,230,223,0.45)" strokeWidth={1.4} strokeDasharray="5 4" markerEnd="url(#sysd-gray)" />
          <text x={334} y={524} fill={SUB}>planned (sensing)</text>
        </g>
      </svg>

      {activeBlock && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={`${activeBlock.title} — model`}
          className={`sysdiagram-pop ${activeBlock.kind}`}
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
