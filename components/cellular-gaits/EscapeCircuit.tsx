"use client";

/**
 * Cellular Gaits — the connectome-bridge visual (Escape behavior, X-B).
 *
 * The most connectome-forward diagram on the site yet: it draws the *real*
 * Drosophila escape circuit as the amber backbone —
 *   looming → LC4 (angular velocity) + LPLC2 (angular size)
 *           → Giant Fiber / DNp01 (sums size + velocity; single-spike timing
 *             sets a short vs long takeoff)
 *           → motor / takeoff
 * — and maps our hand-built stand-in (green) onto it: our two bilateral loom
 * channels ↔ LC4 + LPLC2, our learned NCA controller ↔ the descending readout.
 * The dashed band across the LC→DNp01 edge marks the seam where the real FlyWire
 * LC4/LPLC2 → DNp01 wiring is now wired in — run as a spiking connectome in the
 * embodied loop (see the Embodied tab). Sources: Ache et al. 2019
 * (Current Biology, GF size/velocity encoding) and von Reyn et al. 2017
 * (single-spike timing → short/long takeoff).
 *
 * Reuses the SystemDiagram / ClosedLoopDiagram house style and popout
 * interaction (hover · tap · focus reveals each part's one-liner; keyboard-
 * focusable, Esc to dismiss, edge-aware popout positioning). Pure SVG + React
 * state — NO three.js / WASM is pulled into this content route.
 */

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const GREEN = "#6FE39A"; // our hand-built stand-in
const AMBER = "#E89B3D"; // the real Drosophila circuit
const SUB = "#8C8B83";
const RULE = "rgba(232,230,223,0.30)";

// SVG coordinate system; the <svg> scales to fill its width. Box fractions
// (x/W, y/H) map linearly onto the container for popout positioning.
const W = 680;
const H = 470;

type Kind = "real" | "ours";

type Node = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  /** One or two short sub-lines under the title. */
  sub: string[];
  kind: Kind;
  /** The popout's one-line role. */
  plain: ReactNode;
};

// --- the real circuit (amber backbone) ---
const LOOM = { x: 330, y: 28, w: 230, h: 50 };
const LC4 = { x: 300, y: 122, w: 138, h: 58 };
const LPLC2 = { x: 470, y: 122, w: 138, h: 58 };
const GF = { x: 320, y: 246, w: 250, h: 66 };
const MOTOR = { x: 330, y: 362, w: 230, h: 54 };

// --- our stand-in (green rail, left) ---
const LOOMCH = { x: 24, y: 122, w: 180, h: 58 };
const CTRL = { x: 24, y: 246, w: 180, h: 66 };

// the FlyWire seam — a dashed band across the LC→DNp01 edge (now wired in)
const SEAM = { x: 292, y: 196, w: 326, h: 30 };

const NODES: Node[] = [
  {
    id: "loom",
    ...LOOM,
    title: "Looming object",
    sub: ["bilateral · left + right eye"],
    kind: "real",
    plain: (
      <>
        A looming stimulus — an object on a collision course, its retinal image
        expanding. It is detected <strong>bilaterally</strong> (both eyes), and
        that left/right comparison is what makes the escape{" "}
        <em>direction-invariant</em>: it works for any approach azimuth.
      </>
    ),
  },
  {
    id: "lc4",
    ...LC4,
    title: "LC4",
    sub: ["angular velocity", "≈ linear"],
    kind: "real",
    plain: (
      <>
        A type of <strong>lobula columnar</strong> visual projection neuron that
        encodes the object&apos;s <strong>angular velocity</strong> — roughly
        linear in how fast the image is expanding.
      </>
    ),
  },
  {
    id: "lplc2",
    ...LPLC2,
    title: "LPLC2",
    sub: ["angular size", "≈ Gaussian"],
    kind: "real",
    plain: (
      <>
        A type of <strong>lobula columnar</strong> visual projection neuron that
        encodes the object&apos;s <strong>angular size</strong> — roughly
        Gaussian, peaking as the object fills the eye near collision.
      </>
    ),
  },
  {
    id: "gf",
    ...GF,
    title: "Giant Fiber / DNp01",
    sub: ["sums size + velocity", "1 spike → short / long takeoff"],
    kind: "real",
    plain: (
      <>
        The descending neuron where the looming detectors converge on the lateral
        dendrite — <strong>~55 LC4 + ~108 LPLC2 neurons per hemisphere</strong>,
        through hundreds of synapses (LC4 ~374–431, LPLC2 ~458–622 per side in
        FlyWire v783). The Giant Fiber effectively <strong>sums size + velocity</strong>;
        the timing of its <strong>single spike</strong> sets the motor program — a
        short (fast, less stable) vs long (slower, coordinated) takeoff.
      </>
    ),
  },
  {
    id: "motor",
    ...MOTOR,
    title: "Motor / takeoff",
    sub: ["short (fast) · long (coordinated)"],
    kind: "real",
    plain: (
      <>
        The escape motor program. GF-spike timing selects a short or long
        takeoff; a second, <strong>GF-independent</strong> pathway drives the
        slower, deliberate evasive maneuvers (turn-and-walk-away, evasive flight
        turns).
      </>
    ),
  },
  {
    id: "loomch",
    ...LOOMCH,
    title: "2 bilateral loom channels",
    sub: ["size + expansion · L/R", "→ NCA grid"],
    kind: "ours",
    plain: (
      <>
        <strong>Our stand-in.</strong> Two hand-built looming sensor channels —
        object angular size and expansion rate, left vs right — written into the
        NCA grid each step. Size stands in for <strong>LPLC2</strong>,
        expansion/velocity for <strong>LC4</strong>.
      </>
    ),
  },
  {
    id: "ctrl",
    ...CTRL,
    title: "learned NCA controller",
    sub: ["the descending readout"],
    kind: "ours",
    plain: (
      <>
        <strong>Our stand-in.</strong> The learned NCA controller plays the role
        of the descending readout: it reads the loom channels and drives the
        legs to flee. The <em>direction</em> of escape emerges from the L/R
        asymmetry — nothing hard-codes which way to go.
      </>
    ),
  },
];

const SEAM_PLAIN: ReactNode = (
  <>
    <strong>The seam, now wired.</strong> The <em>actual</em> LC4/LPLC2 → DNp01
    wiring — pulled from FlyWire and run as a spiking connectome — is now in the
    loop, routing a looming cue to an embodied escape. A concrete,
    self-contained sub-circuit, far smaller than the whole brain; this is
    exactly where it wired in (the Embodied tab).
  </>
);

type Item = Node | { id: "seam"; x: number; y: number; w: number; h: number };

const SEAM_ITEM = { id: "seam" as const, ...SEAM };
const ITEMS: Item[] = [...NODES, SEAM_ITEM];

// popout class per kind (reuses the SystemDiagram pop variants)
const POP_CLASS: Record<string, string> = {
  real: "training", // amber
  ours: "runtime", // green
  seam: "planned", // dashed
};

function cx(b: { x: number; w: number }) {
  return b.x + b.w / 2;
}

export function EscapeCircuit() {
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
  const activeKind =
    activeItem && "kind" in activeItem ? activeItem.kind : "seam";
  const activeTitle =
    activeItem && "title" in activeItem ? activeItem.title : "FlyWire seam";
  const activePlain =
    activeItem && "plain" in activeItem ? activeItem.plain : SEAM_PLAIN;

  useLayoutEffect(() => {
    if (!activeItem) return;
    const reposition = () => {
      const container = containerRef.current;
      const pop = popRef.current;
      if (!container || !pop) return;
      const cwid = container.clientWidth;
      const ch = container.clientHeight;
      const pw = pop.offsetWidth;
      const ph = pop.offsetHeight;
      const bx = (activeItem.x / W) * cwid;
      const by = (activeItem.y / H) * ch;
      const bw = (activeItem.w / W) * cwid;
      const bh = (activeItem.h / H) * ch;
      const clamp = (v: number, lo: number, hi: number) =>
        v < lo ? lo : v > hi ? hi : v;
      const left = clamp(bx + bw / 2 - pw / 2, 8, cwid - pw - 8);
      let top = by + bh + 10;
      if (top + ph > ch - 4) top = by - ph - 10;
      top = clamp(top, 8, ch - ph - 8);
      setPos({ left, top, ready: true });
    };
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [activeItem]);

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

  return (
    <div
      className="sysdiagram cg-escape-circuit"
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === "Escape") dismiss();
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-labelledby="esc-title esc-desc"
        style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
      >
        <title id="esc-title">The Drosophila escape circuit, with our stand-in mapped onto it</title>
        <desc id="esc-desc">
          A looming object is detected bilaterally and read by two visual
          projection neuron types — LC4, encoding angular velocity, and LPLC2,
          encoding angular size. Both converge on the Giant Fiber descending
          neuron DNp01, which sums size and velocity; the timing of its single
          spike sets a short or long takeoff, driving the motor and takeoff
          program. Our hand-built stand-in maps onto this: two bilateral looming
          sensor channels stand in for LC4 and LPLC2, and a learned neural
          cellular automaton controller stands in for the descending readout. A
          dashed band on the LC4/LPLC2 to DNp01 edge marks the seam where the
          real FlyWire wiring is now wired in, run as a spiking connectome in the
          embodied loop. Each part is focusable and reveals its role.
        </desc>

        <defs>
          <marker id="esc-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={AMBER} />
          </marker>
          <marker id="esc-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={GREEN} />
          </marker>
        </defs>

        {/* region headers */}
        <text x={LOOMCH.x} y={16} fill={GREEN} fontSize={10} letterSpacing="0.06em">
          OUR HAND-BUILT STAND-IN
        </text>
        <text x={cx(GF)} y={16} fill={AMBER} fontSize={10} letterSpacing="0.06em" textAnchor="middle">
          REAL DROSOPHILA ESCAPE CIRCUIT
        </text>

        {/* forward amber arrows — looming fans to LC4 + LPLC2 */}
        <line x1={cx(LOOM)} y1={LOOM.y + LOOM.h} x2={cx(LC4)} y2={LC4.y} stroke={AMBER} strokeWidth={1.5} markerEnd="url(#esc-amber)" />
        <line x1={cx(LOOM)} y1={LOOM.y + LOOM.h} x2={cx(LPLC2)} y2={LPLC2.y} stroke={AMBER} strokeWidth={1.5} markerEnd="url(#esc-amber)" />

        {/* LC4 + LPLC2 converge on the Giant Fiber (these cross the seam band) */}
        <line x1={cx(LC4)} y1={LC4.y + LC4.h} x2={cx(GF) - 36} y2={GF.y} stroke={AMBER} strokeWidth={1.5} markerEnd="url(#esc-amber)" />
        <line x1={cx(LPLC2)} y1={LPLC2.y + LPLC2.h} x2={cx(GF) + 36} y2={GF.y} stroke={AMBER} strokeWidth={1.5} markerEnd="url(#esc-amber)" />

        {/* Giant Fiber → motor / takeoff */}
        <line x1={cx(GF)} y1={GF.y + GF.h} x2={cx(MOTOR)} y2={MOTOR.y} stroke={AMBER} strokeWidth={1.5} markerEnd="url(#esc-amber)" />

        {/* green mapping arrows (double-headed, dashed): stand-in ↔ real */}
        <line x1={LOOMCH.x + LOOMCH.w} y1={LOOMCH.y + LOOMCH.h / 2} x2={LC4.x - 6} y2={LC4.y + LC4.h / 2} stroke={GREEN} strokeWidth={1.3} strokeDasharray="5 4" markerStart="url(#esc-green)" markerEnd="url(#esc-green)" />
        <line x1={CTRL.x + CTRL.w} y1={CTRL.y + CTRL.h / 2} x2={GF.x - 6} y2={GF.y + GF.h / 2} stroke={GREEN} strokeWidth={1.3} strokeDasharray="5 4" markerStart="url(#esc-green)" markerEnd="url(#esc-green)" />

        {/* the FlyWire seam — dashed band over the LC→DNp01 edge (now wired in) */}
        <g {...handlers("seam")} aria-label="The FlyWire seam: where the real LC4/LPLC2 to DNp01 wiring is now wired in, run as a spiking connectome in the embodied loop. Activate to reveal more.">
          {/* Opaque fill (page bg) so the two converging arrows pass behind the
              band instead of running through its label text — the convergence
              still reads as entering the seam, then descending into the GF. */}
          <rect x={SEAM.x} y={SEAM.y} width={SEAM.w} height={SEAM.h} rx={5} fill="rgba(11,11,12,0.96)" stroke={RULE} strokeWidth={active === "seam" ? 1.6 : 1} strokeDasharray="6 4" />
          <text x={cx(SEAM)} y={SEAM.y + SEAM.h / 2 + 3.5} fill={SUB} fontSize={9.5} textAnchor="middle">
            ↳ the real FlyWire LC4/LPLC2 → DNp01 wiring is wired in HERE
          </text>
        </g>

        {/* all boxed nodes (real = amber, ours = green) */}
        {NODES.map((n) => {
          const color = n.kind === "real" ? AMBER : GREEN;
          const fill =
            n.kind === "real" ? "rgba(232,155,61,0.10)" : "rgba(111,227,154,0.10)";
          const subY = n.sub.length > 1 ? n.h / 2 + 2 : n.h / 2 + 8;
          return (
            <g
              key={n.id}
              {...handlers(n.id)}
              aria-label={`${n.title}. ${n.sub.join(", ")}. ${n.kind === "ours" ? "Our stand-in." : "Real circuit."} Activate to reveal its role.`}
            >
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={6}
                fill={fill}
                stroke={color}
                strokeWidth={active === n.id ? 2 : 1}
              />
              <text x={n.x + n.w / 2} y={n.y + (n.sub.length > 1 ? 22 : 25)} fill={color} fontSize={13} fontWeight={500} textAnchor="middle">
                {n.title}
              </text>
              {n.sub.map((line, i) => (
                <text
                  key={i}
                  x={n.x + n.w / 2}
                  y={n.y + subY + i * 12}
                  fill={SUB}
                  fontSize={9.5}
                  textAnchor="middle"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>

      {activeItem && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={`${activeTitle} — detail`}
          className={`sysdiagram-pop ${POP_CLASS[activeKind]}`}
          style={{ left: pos.left, top: pos.top, opacity: pos.ready ? 1 : 0 }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <h4>{activeTitle}</h4>
          <p className="sysdiagram-pop-plain">{activePlain}</p>
        </div>
      )}
    </div>
  );
}

export default EscapeCircuit;
