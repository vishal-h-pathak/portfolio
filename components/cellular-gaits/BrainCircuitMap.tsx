"use client";

/**
 * <BrainCircuitMap> — where the escape circuit physically sits (The Embodied
 * Fly, rec #7). The anatomy-anchoring rule, applied to the brain: it draws a
 * schematic dorsal-brain silhouette and places the real neurons on it —
 *   LC4 + LPLC2  in the lobula complex (lateral, behind each eye)
 *   DNp01        central, descending toward the VNC
 * — with the looming input entering at the eyes and the Giant-Fiber output
 * descending out the bottom.
 *
 * Everything is driven by `public/cellular-gaits/data-eb/circuit.json`:
 *   · node sub-labels = per-hemisphere neuron counts (neurons.{LC4,LPLC2,DNp01})
 *   · edge thickness  = the convergence_syn_ge_1 synapse counts, so the
 *     right > left asymmetry (374/431, 458/622) is *visible* — the
 *     "right Giant Fiber out-fires left" finding made spatial.
 * Nothing is hardcoded; a re-export of the circuit flows straight through.
 *
 * Reuses the EscapeCircuit / SystemDiagram house style and popout interaction
 * (hover · tap · focus reveals each part; keyboard-focusable, Esc to dismiss,
 * edge-aware positioning). Pure SVG + React state — no WASM on a content route.
 *
 * HONEST: this is a *schematic*, hand-drawn brain outline — approximate region
 * placement, NOT a literal FlyWire neuropil render. Labelled as such on-figure.
 */

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const AMBER = "var(--amber)"; // the real circuit
const GREEN = "var(--green)"; // the Giant Fiber output
const SUB = "var(--ink-dim)";
const FAINT = "var(--ink-faint)";
const ONSET = "var(--signal-onset)"; // the looming cue entering at the eyes
const RULE = "rgba(232,230,223,0.22)";

const W = 680;
const H = 480;

// ── data shapes (a subset of circuit.json) ──────────────────────────────────
type NeuronInfo = {
  left: number;
  right: number;
  both: number;
  encodes: string;
  transmitter: string;
};
type Conv = { n_presynaptic_neurons: number; total_synapses: number };

export type CircuitData = {
  description?: string;
  flywire_release?: string;
  neurons: { LC4: NeuronInfo; LPLC2: NeuronInfo; DNp01: NeuronInfo };
  convergence_syn_ge_1: {
    "LC4->DNp01_left": Conv;
    "LC4->DNp01_right": Conv;
    "LPLC2->DNp01_left": Conv;
    "LPLC2->DNp01_right": Conv;
  };
  asymmetry?: { LC4_right_minus_left: number; LPLC2_right_minus_left: number };
};

type Box = { x: number; y: number; w: number; h: number };

// schematic node placement (dorsal view, anterior = top). Lobula nodes sit
// laterally behind each eye; the two Giant-Fiber nodes sit centrally, low.
const NODE: Record<string, Box> = {
  LC4_L: { x: 64, y: 150, w: 132, h: 50 },
  LPLC2_L: { x: 64, y: 226, w: 132, h: 50 },
  LC4_R: { x: 484, y: 150, w: 132, h: 50 },
  LPLC2_R: { x: 484, y: 226, w: 132, h: 50 },
  DNp01_L: { x: 276, y: 318, w: 60, h: 58 },
  DNp01_R: { x: 344, y: 318, w: 60, h: 58 },
};

function cx(b: Box) {
  return b.x + b.w / 2;
}
function cy(b: Box) {
  return b.y + b.h / 2;
}

type Item = { id: string; box: Box; title: string; sub: string[]; plain: ReactNode };
type Edge = {
  id: string;
  from: Box;
  to: Box;
  syn: number;
  pre: number;
  kind: "LC4" | "LPLC2";
  side: "left" | "right";
};

export function BrainCircuitMap({ circuit }: { circuit: CircuitData }) {
  const { neurons, convergence_syn_ge_1: conv } = circuit;

  // Build the four ipsilateral edges; thickness scales with synapse count so the
  // right-heavy asymmetry reads off the figure directly.
  const edges = useMemo<Edge[]>(() => {
    const raw: Edge[] = [
      { id: "LC4_L", from: NODE.LC4_L, to: NODE.DNp01_L, syn: conv["LC4->DNp01_left"].total_synapses, pre: conv["LC4->DNp01_left"].n_presynaptic_neurons, kind: "LC4", side: "left" },
      { id: "LPLC2_L", from: NODE.LPLC2_L, to: NODE.DNp01_L, syn: conv["LPLC2->DNp01_left"].total_synapses, pre: conv["LPLC2->DNp01_left"].n_presynaptic_neurons, kind: "LPLC2", side: "left" },
      { id: "LC4_R", from: NODE.LC4_R, to: NODE.DNp01_R, syn: conv["LC4->DNp01_right"].total_synapses, pre: conv["LC4->DNp01_right"].n_presynaptic_neurons, kind: "LC4", side: "right" },
      { id: "LPLC2_R", from: NODE.LPLC2_R, to: NODE.DNp01_R, syn: conv["LPLC2->DNp01_right"].total_synapses, pre: conv["LPLC2->DNp01_right"].n_presynaptic_neurons, kind: "LPLC2", side: "right" },
    ];
    return raw;
  }, [conv]);

  const synMin = Math.min(...edges.map((e) => e.syn));
  const synMax = Math.max(...edges.map((e) => e.syn));
  const widthOf = (syn: number) =>
    synMax === synMin ? 4 : 2 + ((syn - synMin) / (synMax - synMin)) * 8;

  const items = useMemo<Item[]>(() => {
    const mk = (id: string, title: string, sub: string[], plain: ReactNode): Item => ({
      id,
      box: NODE[id],
      title,
      sub,
      plain,
    });
    return [
      mk("LC4_L", "LC4", [`${neurons.LC4.left} neurons · left`, neurons.LC4.encodes], (
        <>
          <strong>LC4</strong>, a lobula-columnar visual projection neuron
          encoding <strong>{neurons.LC4.encodes}</strong>. {neurons.LC4.left} on
          the left ({neurons.LC4.both} both sides). Transmitter:{" "}
          {neurons.LC4.transmitter}. It sits in the <em>lobula complex</em>,
          laterally — right behind the eye.
        </>
      )),
      mk("LPLC2_L", "LPLC2", [`${neurons.LPLC2.left} neurons · left`, neurons.LPLC2.encodes], (
        <>
          <strong>LPLC2</strong>, a lobula-columnar visual projection neuron
          encoding <strong>{neurons.LPLC2.encodes}</strong>.{" "}
          {neurons.LPLC2.left} on the left ({neurons.LPLC2.both} both sides).
          Transmitter: {neurons.LPLC2.transmitter}. Also lateral, in the lobula
          complex.
        </>
      )),
      mk("LC4_R", "LC4", [`${neurons.LC4.right} neurons · right`, neurons.LC4.encodes], (
        <>
          <strong>LC4</strong> (right hemisphere) — {neurons.LC4.right} neurons,
          encoding {neurons.LC4.encodes}. {neurons.LC4.transmitter}.
        </>
      )),
      mk("LPLC2_R", "LPLC2", [`${neurons.LPLC2.right} neurons · right`, neurons.LPLC2.encodes], (
        <>
          <strong>LPLC2</strong> (right hemisphere) — {neurons.LPLC2.right}{" "}
          neurons, encoding {neurons.LPLC2.encodes}. {neurons.LPLC2.transmitter}.
        </>
      )),
      mk("DNp01_L", "DNp01", ["left GF", "1 neuron"], (
        <>
          <strong>DNp01 — the Giant Fiber</strong>, left. A single descending
          neuron ({neurons.DNp01.left} per hemisphere) carrying the{" "}
          <strong>{neurons.DNp01.encodes}</strong> down toward the VNC. The LC4 +
          LPLC2 of this hemisphere converge onto it.
        </>
      )),
      mk("DNp01_R", "DNp01", ["right GF", "1 neuron"], (
        <>
          <strong>DNp01 — the Giant Fiber</strong>, right. The right GF carries
          more converging synapses than the left (
          {conv["LC4->DNp01_right"].total_synapses + conv["LPLC2->DNp01_right"].total_synapses}{" "}
          vs{" "}
          {conv["LC4->DNp01_left"].total_synapses + conv["LPLC2->DNp01_left"].total_synapses}
          ) — which tracks the right-strong firing.
        </>
      )),
    ];
  }, [neurons, conv]);

  // edge popouts (keyed by edge id), reusing the same machinery as nodes
  const edgePlain = useCallback(
    (e: Edge): ReactNode => (
      <>
        <strong>{e.kind} → DNp01</strong> ({e.side}). {e.pre} presynaptic neurons,{" "}
        <strong>{e.syn} synapses</strong> converging onto the {e.side} Giant
        Fiber. Edge thickness here <em>is</em> that synapse count — the right
        edges are heavier because the right GF carries more.
      </>
    ),
    [],
  );

  // ── popout machinery (mirrors EscapeCircuit) ──────────────────────────────
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

  // active geometry: node box, or the midpoint of an edge
  const activeBox: Box | null = useMemo(() => {
    const node = items.find((it) => it.id === active);
    if (node) return node.box;
    const edge = edges.find((e) => e.id === active);
    if (edge)
      return {
        x: (cx(edge.from) + cx(edge.to)) / 2 - 20,
        y: (cy(edge.from) + cy(edge.to)) / 2 - 10,
        w: 40,
        h: 20,
      };
    return null;
  }, [active, items, edges]);

  const activeNode = items.find((it) => it.id === active) ?? null;
  const activeEdge = edges.find((e) => e.id === active) ?? null;
  const activeTitle = activeNode?.title ?? (activeEdge ? `${activeEdge.kind} → DNp01` : "");
  const activePlain = activeNode?.plain ?? (activeEdge ? edgePlain(activeEdge) : null);
  const activeClass = activeNode?.id.startsWith("DNp01") ? "runtime" : "training";

  useLayoutEffect(() => {
    if (!activeBox) return;
    const reposition = () => {
      const container = containerRef.current;
      const pop = popRef.current;
      if (!container || !pop) return;
      const cwid = container.clientWidth;
      const ch = container.clientHeight;
      const pw = pop.offsetWidth;
      const ph = pop.offsetHeight;
      const bx = (activeBox.x / W) * cwid;
      const by = (activeBox.y / H) * ch;
      const bw = (activeBox.w / W) * cwid;
      const bh = (activeBox.h / H) * ch;
      const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
      const left = clamp(bx + bw / 2 - pw / 2, 8, cwid - pw - 8);
      let top = by + bh + 10;
      if (top + ph > ch - 4) top = by - ph - 10;
      top = clamp(top, 8, ch - ph - 8);
      setPos({ left, top, ready: true });
    };
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [activeBox]);

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
      className="sysdiagram cg-braincircuit"
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === "Escape") dismiss();
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-labelledby="bcm-title bcm-desc"
        style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
      >
        <title id="bcm-title">
          A schematic dorsal fly brain showing where the escape circuit sits
        </title>
        <desc id="bcm-desc">
          A hand-drawn, approximate dorsal-brain outline. The looming detectors
          LC4 and LPLC2 sit laterally in the lobula complex behind each eye; they
          converge ipsilaterally onto the Giant Fiber DNp01, one per hemisphere,
          which descends centrally toward the ventral nerve cord. Each
          convergence edge is drawn with a thickness equal to its synapse count,
          so the right hemisphere&apos;s heavier wiring — {conv["LC4->DNp01_right"].total_synapses}{" "}
          and {conv["LPLC2->DNp01_right"].total_synapses} synapses on the right
          versus {conv["LC4->DNp01_left"].total_synapses} and{" "}
          {conv["LPLC2->DNp01_left"].total_synapses} on the left — is visible as
          thicker lines. This is a schematic, not a literal connectome render.
        </desc>

        <defs>
          {/* markerUnits=userSpaceOnUse → a fixed arrowhead size regardless of
              the edge's stroke width (which encodes synapse count), so the heavy
              edges don't sprout a giant arrowhead over the DNp01 nodes. */}
          <marker id="bcm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={AMBER} />
          </marker>
          <marker id="bcm-arrow-g" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={GREEN} />
          </marker>
        </defs>

        {/* ── schematic dorsal-brain silhouette (anterior = top) ── */}
        <path
          d="M150 120
             Q120 70 200 64
             Q270 58 300 96
             Q340 80 380 96
             Q410 58 480 64
             Q560 70 530 120
             Q588 150 560 230
             Q548 300 460 320
             L420 326
             Q400 360 340 360
             Q280 360 260 326
             L220 320
             Q132 300 120 230
             Q92 150 150 120 Z"
          fill="rgba(232,230,223,0.025)"
          stroke={RULE}
          strokeWidth={1.2}
        />
        {/* optic-lobe / lobula bulges (lateral) */}
        <ellipse cx={130} cy={205} rx={62} ry={86} fill="rgba(232,155,61,0.05)" stroke="rgba(232,155,61,0.25)" strokeWidth={1} />
        <ellipse cx={550} cy={205} rx={62} ry={86} fill="rgba(232,155,61,0.05)" stroke="rgba(232,155,61,0.25)" strokeWidth={1} />
        <text x={130} y={120} textAnchor="middle" fill={FAINT} fontSize={9.5}>lobula complex · L</text>
        <text x={550} y={120} textAnchor="middle" fill={FAINT} fontSize={9.5}>lobula complex · R</text>
        <text x={340} y={120} textAnchor="middle" fill={FAINT} fontSize={9.5}>central brain</text>

        {/* eyes + looming entering at the top */}
        {[{ x: 96, label: "left eye" }, { x: 584, label: "right eye" }].map((eye) => (
          <g key={eye.label}>
            <ellipse cx={eye.x} cy={56} rx={26} ry={18} fill="rgba(242,104,60,0.07)" stroke="rgba(242,104,60,0.5)" strokeWidth={1} />
            <text x={eye.x} y={30} textAnchor="middle" fill={ONSET} fontSize={9}>looming</text>
            <text x={eye.x} y={59} textAnchor="middle" fill={SUB} fontSize={8.5}>{eye.label}</text>
          </g>
        ))}
        {/* eye → lobula sense arrows */}
        <line x1={96} y1={74} x2={cx(NODE.LC4_L) - 10} y2={NODE.LC4_L.y - 4} stroke="rgba(242,104,60,0.4)" strokeWidth={1.2} strokeDasharray="3 3" />
        <line x1={584} y1={74} x2={cx(NODE.LC4_R) + 10} y2={NODE.LC4_R.y - 4} stroke="rgba(242,104,60,0.4)" strokeWidth={1.2} strokeDasharray="3 3" />

        {/* hemisphere midline */}
        <line x1={340} y1={70} x2={340} y2={356} stroke="rgba(232,230,223,0.08)" strokeWidth={1} strokeDasharray="2 6" />

        {/* ── convergence edges (thickness = synapse count) ── */}
        {edges.map((e) => {
          const x1 = cx(e.from);
          const y1 = e.from.y + e.from.h;
          const x2 = cx(e.to) + (e.side === "left" ? -8 : 8);
          const y2 = e.to.y;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          return (
            <g
              key={e.id}
              {...handlers(e.id)}
              aria-label={`${e.kind} to DNp01, ${e.side}: ${e.syn} synapses from ${e.pre} neurons. Activate for detail.`}
            >
              {/* fat invisible hit-area */}
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={16} />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={AMBER}
                strokeOpacity={active === e.id ? 1 : 0.78}
                strokeWidth={widthOf(e.syn)}
                strokeLinecap="round"
                markerEnd="url(#bcm-arrow)"
              />
              {/* Label sits in the open gap between the lateral node and the
                  central DNp01 (text extends inward), lifted off the edge line —
                  so it never lands on the LC4/LPLC2 node text. */}
              <text x={mx + (e.side === "left" ? 8 : -8)} y={my - 5} fill={SUB} fontSize={9} textAnchor={e.side === "left" ? "start" : "end"}>
                {e.syn} syn
              </text>
            </g>
          );
        })}

        {/* ── nodes ── */}
        {items.map((it) => {
          const isGF = it.id.startsWith("DNp01");
          const color = isGF ? GREEN : AMBER;
          const fill = isGF ? "rgba(111,227,154,0.10)" : "rgba(232,155,61,0.10)";
          const b = it.box;
          return (
            <g key={it.id} {...handlers(it.id)} aria-label={`${it.title}. ${it.sub.join(", ")}. Activate to reveal its role.`}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={fill} stroke={color} strokeWidth={active === it.id ? 2 : 1} />
              <text x={cx(b)} y={b.y + (isGF ? 24 : 20)} fill={color} fontSize={isGF ? 12 : 13} fontWeight={500} textAnchor="middle">
                {it.title}
              </text>
              {!isGF &&
                it.sub.map((line, i) => (
                  <text key={i} x={cx(b)} y={b.y + 33 + i * 11} fill={SUB} fontSize={9} textAnchor="middle">
                    {line}
                  </text>
                ))}
              {isGF && (
                <text x={cx(b)} y={b.y + 40} fill={SUB} fontSize={8.5} textAnchor="middle">
                  {it.sub[0]}
                </text>
              )}
            </g>
          );
        })}

        {/* descending output → VNC */}
        <line x1={340} y1={NODE.DNp01_L.y + NODE.DNp01_L.h} x2={340} y2={430} stroke={GREEN} strokeWidth={2} markerEnd="url(#bcm-arrow-g)" />
        <text x={348} y={410} fill={GREEN} fontSize={10}>↓ descending</text>
        <text x={348} y={424} fill={SUB} fontSize={9}>toward the VNC → body</text>

        {/* honesty label */}
        <text x={W - 8} y={H - 8} textAnchor="end" fill={FAINT} fontSize={9}>
          schematic · approximate placement — not a literal FlyWire render
        </text>
      </svg>

      {activeBox && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={`${activeTitle} — detail`}
          className={`sysdiagram-pop ${activeClass}`}
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

export default BrainCircuitMap;
