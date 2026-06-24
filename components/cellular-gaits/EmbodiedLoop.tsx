"use client";

/**
 * <EmbodiedLoop> — the four-part anatomy loop, the hero of The Embodied Fly
 * (recs #1, #2). It draws Eon's closed sensorimotor loop as the real animal:
 *
 *   ① SENSE   a looming object on the eyes (the threat from the chosen azimuth)
 *   ② BRAIN   spikes propagate the real LC4/LPLC2 → DNp01 wiring; the Giant
 *             Fiber fires (a spike animates along the converging edge)
 *   ③ DESCEND the GF firing rate becomes a scalar escape drive
 *   ④ BODY    NeuroMechFly turns the drive into a directed bolt
 *   └─────────► the fly moves → the looming changes → back to ①  (through physics)
 *
 * Each stage is anchored on the actual fly (a top-down silhouette built in the
 * PlantSchematic idiom): sense→eyes, brain→head, descend→neck, body→thorax/legs.
 * A condition toggle (left threat / right threat / no threat) drives every number
 * straight from the bundle — GF peak and outcome from `manifest.conditions[]`,
 * the drive from the manifest `config` motor map — nothing science-bearing is
 * hardcoded.
 *
 * Reuses the EscapeCircuit popout interaction (hover · tap · focus, Esc to
 * dismiss, edge-aware). Pure SVG + React + SMIL — no physics engine on a content
 * route.
 */

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const AMBER = "#E89B3D"; // the real circuit / sense
const GREEN = "#6FE39A"; // the live output / body
const THREAT = "#F2683C";
const INK = "#E8E6DF";
const SUB = "#8C8B83";
const FAINT = "#7E7A6D";
const RULE = "rgba(232,230,223,0.22)";

const W = 720;
const H = 540;

export type LoopCondition = {
  key: string;
  label: string;
  azimuth_deg: number | null;
  gf_peak_hz: number;
  outcome: string;
};
export type LoopConfig = {
  loom_hz_gain: number;
  loom_hz_max: number;
  drive_peak: number;
  dnp01_ref_hz: number;
  sync_window_s: number;
};

type Derived = {
  side: "left" | "right" | null;
  firing: boolean;
  drive: number; // motor map applied to the GF peak (manifest config)
  turn: -1 | 0 | 1; // screen turn sense from the outcome text (+1 = right/CW)
};

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function derive(c: LoopCondition, cfg: LoopConfig): Derived {
  const side = c.azimuth_deg == null ? null : c.azimuth_deg === 90 ? "left" : "right";
  const firing = c.gf_peak_hz > 0;
  // motor map straight from the bundle config: drive = drive_peak · clip(gf/ref)
  const drive = cfg.drive_peak * clamp01(c.gf_peak_hz / cfg.dnp01_ref_hz);
  const o = c.outcome.toLowerCase();
  const turn: -1 | 0 | 1 = o.includes("right") ? 1 : o.includes("left") ? -1 : 0;
  return { side, firing, drive, turn };
}

// stage cards (right column)
type Card = { id: string; n: string; title: string; box: { x: number; y: number; w: number; h: number } };
const CARDS: Card[] = [
  { id: "sense", n: "①", title: "SENSE", box: { x: 360, y: 56, w: 345, h: 84 } },
  { id: "brain", n: "②", title: "BRAIN", box: { x: 360, y: 160, w: 345, h: 116 } },
  { id: "descend", n: "③", title: "DESCEND", box: { x: 360, y: 296, w: 345, h: 80 } },
  { id: "body", n: "④", title: "BODY", box: { x: 360, y: 396, w: 345, h: 84 } },
];

// anatomical anchor points on the fly silhouette (left half)
const ANCHOR: Record<string, [number, number]> = {
  sense: [175, 84],
  brain: [175, 104],
  descend: [175, 138],
  body: [175, 210],
};

export function EmbodiedLoop({
  conditions,
  config,
}: {
  conditions: LoopCondition[];
  config: LoopConfig;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, ready: false });
  const [condKey, setCondKey] = useState(conditions[0]?.key ?? "left_threat");

  const cond = conditions.find((c) => c.key === condKey) ?? conditions[0];
  const d = useMemo(() => derive(cond, config), [cond, config]);

  // ── popout machinery (mirrors EscapeCircuit) ──
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

  const STAGE_DETAIL: Record<string, ReactNode> = useMemo(
    () => ({
      sense: (
        <>
          A looming object on a collision course expands on the retina. A
          hand-built front-end splits its <strong>angular size and expansion</strong>{" "}
          left/right by bearing and drives the looming neurons at{" "}
          <code>Hz = {config.loom_hz_gain} · loom</code> (capped {config.loom_hz_max}).
          The honest stand-in for the full visual pathway.
        </>
      ),
      brain: (
        <>
          The cue enters the <strong>real FlyWire connectome</strong> run as a
          spiking network. <strong>LC4</strong> (velocity) and{" "}
          <strong>LPLC2</strong> (size) converge on <strong>DNp01, the Giant
          Fiber</strong>, through the measured wiring —{" "}
          {d.firing ? (
            <>here it fires <strong>{cond.gf_peak_hz} Hz</strong>.</>
          ) : (
            <>no loom, so the Giant Fiber stays <strong>silent</strong>.</>
          )}
        </>
      ),
      descend: (
        <>
          The Giant Fiber is a <strong>scalar command</strong>: its firing rate
          becomes an escape <strong>drive</strong> via the motor map{" "}
          <code>drive = {config.drive_peak} · clip(GF / {config.dnp01_ref_hz})</code>{" "}
          = <strong>{d.drive.toFixed(3)}</strong>. Direction comes from{" "}
          <em>which eye</em> saw the threat, not the GF (its L/R difference is
          wiring-dominated).
        </>
      ),
      body: (
        <>
          The drive feeds the trained <strong>NeuroMechFly</strong> controller
          (87 joints, MuJoCo), which turns the scalar into a real motion:{" "}
          <strong>{cond.outcome}</strong>. Then the fly has moved, the looming
          geometry has changed, and the loop runs again.
        </>
      ),
    }),
    [cond, config, d],
  );

  const activeBox = CARDS.find((c) => c.id === active)?.box ?? null;
  const activeCard = CARDS.find((c) => c.id === active) ?? null;

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

  // brain mini-circuit geometry (inside the BRAIN card)
  const bc = CARDS[1].box;
  const LC4 = { x: bc.x + 16, y: bc.y + 22, w: 74, h: 28 };
  const LPLC2 = { x: bc.x + 16, y: bc.y + 64, w: 74, h: 28 };
  // Wider + shifted left so the "DNp01 · Giant Fiber" label fits inside the box
  // with padding — it used to overflow onto the converging arrowheads (clipping
  // "DNp01" to "p01").
  const GFB = { x: bc.x + 206, y: bc.y + 42, w: 132, h: 34 };
  const lc4Out: [number, number] = [LC4.x + LC4.w, LC4.y + LC4.h / 2];
  const lplc2Out: [number, number] = [LPLC2.x + LPLC2.w, LPLC2.y + LPLC2.h / 2];
  const gfInTop: [number, number] = [GFB.x, GFB.y + 10];
  const gfInBot: [number, number] = [GFB.x, GFB.y + GFB.h - 10];

  return (
    <div className="cg-eb-loop">
      <div className="cg-eb-loop-head">
        <span className="cg-eb-loop-eyebrow">the closed loop · pick a condition</span>
        <div className="cg-eb-conds" role="group" aria-label="Choose a condition">
          {conditions.map((c) => (
            <button
              key={c.key}
              type="button"
              className="cg-pg-btn"
              data-active={c.key === condKey ? "1" : undefined}
              aria-pressed={c.key === condKey}
              onClick={() => setCondKey(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="sysdiagram cg-eb-loop-svg"
        ref={containerRef}
        onKeyDown={(e) => {
          if (e.key === "Escape") dismiss();
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-labelledby="ebloop-title ebloop-desc"
          style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
        >
          <title id="ebloop-title">The four-part embodied escape loop on the fly</title>
          <desc id="ebloop-desc">
            {`Condition: ${cond.label}. A looming object is sensed ${
              d.side ? `on the fly's ${d.side} eye` : "by neither eye (no threat)"
            }; it drives LC4 and LPLC2, which converge on the Giant Fiber DNp01 through the real connectome wiring; ${
              d.firing
                ? `the Giant Fiber fires ${cond.gf_peak_hz} hertz, which becomes an escape drive of ${d.drive.toFixed(
                    3,
                  )}`
                : "the Giant Fiber stays silent, so there is no escape drive"
            }; the NeuroMechFly body then ${cond.outcome}. The fly's motion changes what it sees, closing the loop through the physics. Sense is anchored at the eyes, brain at the head, descend at the neck, body at the thorax and legs.`}
          </desc>

          <defs>
            <marker id="eb-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={AMBER} />
            </marker>
            <marker id="eb-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={GREEN} />
            </marker>
            <marker id="eb-i" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill={INK} />
            </marker>
          </defs>

          {/* ── the feedback loop arrow (closes through the physics) ── */}
          <path
            d="M520 480 C520 512 500 516 460 516 L70 516 C44 516 40 512 40 486 L40 92 C40 66 52 60 92 60"
            fill="none"
            stroke="rgba(232,230,223,0.3)"
            strokeWidth={1.4}
            strokeDasharray="5 5"
            markerEnd="url(#eb-i)"
          />
          <text x={250} y={533} fill={FAINT} fontSize={10} textAnchor="middle">
            the fly moves → the looming changes → back to ①   (the loop closes through the physics)
          </text>

          {/* ── the fly silhouette (top-down dorsal, facing up) ── */}
          {/* eyes */}
          {[
            { side: "left" as const, ex: 150 },
            { side: "right" as const, ex: 200 },
          ].map((e) => {
            const lit = d.side === e.side;
            return (
              <g key={e.side}>
                <ellipse
                  cx={e.ex}
                  cy={92}
                  rx={14}
                  ry={11}
                  fill={lit ? "rgba(242,104,60,0.35)" : "rgba(232,230,223,0.05)"}
                  stroke={lit ? THREAT : "rgba(232,230,223,0.3)"}
                  strokeWidth={lit ? 1.8 : 1}
                />
              </g>
            );
          })}
          {/* head */}
          <ellipse cx={175} cy={100} rx={42} ry={30} fill="rgba(232,155,61,0.05)" stroke="rgba(232,155,61,0.3)" strokeWidth={1.1} />
          <text x={175} y={104} textAnchor="middle" fill={SUB} fontSize={9}>brain</text>
          {/* thorax */}
          <rect x={145} y={134} width={60} height={92} rx={16} fill="rgba(111,227,154,0.05)" stroke="rgba(111,227,154,0.3)" strokeWidth={1.1} />
          <text x={175} y={184} textAnchor="middle" fill={SUB} fontSize={9}>thorax</text>
          {/* abdomen */}
          <path d="M149 230 Q175 252 201 230 L194 312 Q175 330 156 312 Z" fill="rgba(232,230,223,0.035)" stroke="rgba(232,230,223,0.2)" strokeWidth={1} />
          {/* legs (3 per side) */}
          {[150, 174, 198].map((ly, i) => (
            <g key={i} stroke="rgba(232,230,223,0.28)" strokeWidth={1}>
              <line x1={145} y1={ly} x2={104 - i * 4} y2={ly - 14 + i * 12} />
              <line x1={205} y1={ly} x2={246 + i * 4} y2={ly - 14 + i * 12} />
            </g>
          ))}
          {/* the threat, approaching the lit eye */}
          {d.side && (
            <g>
              {(() => {
                const ex = d.side === "left" ? 150 : 200;
                const ox = d.side === "left" ? 56 : 294;
                return (
                  <>
                    <line x1={ox} y1={48} x2={ex + (d.side === "left" ? -10 : 10)} y2={84} stroke={THREAT} strokeWidth={1.4} strokeDasharray="3 3" markerEnd="url(#eb-a)" />
                    <circle cx={ox} cy={48} r={7} fill="rgba(242,104,60,0.55)" stroke={THREAT} strokeWidth={1.2} />
                    <text x={ox} y={34} textAnchor="middle" fill={THREAT} fontSize={9}>
                      looming · {cond.azimuth_deg}°
                    </text>
                  </>
                );
              })()}
            </g>
          )}
          {/* the bolt — a curved turn arrow off the thorax, sensed from the outcome */}
          {d.turn !== 0 ? (
            <g>
              <path
                d={
                  d.turn === 1
                    ? "M175 250 q44 26 36 70"
                    : "M175 250 q-44 26 -36 70"
                }
                fill="none"
                stroke={GREEN}
                strokeWidth={2.2}
                markerEnd="url(#eb-g)"
              />
              <text x={175 + d.turn * 60} y={336} textAnchor="middle" fill={GREEN} fontSize={9.5}>
                bolt
              </text>
            </g>
          ) : (
            <g>
              <line x1={175} y1={250} x2={175} y2={330} stroke="rgba(232,230,223,0.5)" strokeWidth={1.8} markerEnd="url(#eb-i)" />
              <text x={175} y={344} textAnchor="middle" fill={SUB} fontSize={9.5}>just walks</text>
            </g>
          )}
          <text x={175} y={64} textAnchor="middle" fill={FAINT} fontSize={9}>the fly · dorsal</text>

          {/* ── stage anchor connectors (card ↔ fly region) ── */}
          {CARDS.map((c) => {
            const [ax, ay] = ANCHOR[c.id];
            return (
              <line
                key={`anc-${c.id}`}
                x1={c.box.x}
                y1={c.box.y + c.box.h / 2}
                x2={ax + 30}
                y2={ay}
                stroke={active === c.id ? "rgba(232,230,223,0.4)" : "rgba(232,230,223,0.12)"}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            );
          })}

          {/* ── vertical flow arrows between the stage cards ── */}
          {CARDS.slice(0, -1).map((c, i) => {
            const next = CARDS[i + 1];
            const x = c.box.x + 40;
            return (
              <line
                key={`flow-${c.id}`}
                x1={x}
                y1={c.box.y + c.box.h}
                x2={x}
                y2={next.box.y}
                stroke="rgba(232,230,223,0.4)"
                strokeWidth={1.6}
                markerEnd="url(#eb-i)"
              />
            );
          })}

          {/* ── the four stage cards ── */}
          {CARDS.map((c) => {
            const isBrain = c.id === "brain";
            const isBody = c.id === "body";
            const accent = isBody ? GREEN : AMBER;
            return (
              <g key={c.id} {...handlers(c.id)} aria-label={`Stage ${c.n} ${c.title}. Activate for detail.`}>
                <rect
                  x={c.box.x}
                  y={c.box.y}
                  width={c.box.w}
                  height={c.box.h}
                  rx={8}
                  fill="rgba(232,230,223,0.02)"
                  stroke={active === c.id ? accent : RULE}
                  strokeWidth={active === c.id ? 1.8 : 1}
                />
                <text x={c.box.x + 14} y={c.box.y + 24} fill={accent} fontSize={15} fontWeight={600}>
                  {c.n}
                </text>
                <text x={c.box.x + 38} y={c.box.y + 24} fill={INK} fontSize={12.5} fontWeight={500} letterSpacing="0.08em">
                  {c.title}
                </text>

                {/* per-stage content */}
                {c.id === "sense" && (
                  <text x={c.box.x + 14} y={c.box.y + 52} fill={SUB} fontSize={11}>
                    {d.side
                      ? `looming on the ${d.side} eye · ${cond.azimuth_deg}° azimuth`
                      : "no threat · both eyes quiet"}
                  </text>
                )}

                {c.id === "descend" && (
                  <>
                    <text x={c.box.x + 14} y={c.box.y + 50} fill={SUB} fontSize={11}>
                      GF rate → escape drive
                    </text>
                    <text x={c.box.x + 14} y={c.box.y + 67} fill={d.firing ? GREEN : SUB} fontSize={12} fontWeight={500}>
                      drive = {d.drive.toFixed(3)}
                    </text>
                  </>
                )}

                {c.id === "body" && (
                  <text x={c.box.x + 14} y={c.box.y + 54} fill={GREEN} fontSize={12} fontWeight={500}>
                    {cond.outcome}
                  </text>
                )}

                {/* brain mini-circuit: LC4 + LPLC2 → DNp01, with a spike */}
                {isBrain && (
                  <>
                    {[LC4, LPLC2].map((b, i) => (
                      <g key={i}>
                        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={5} fill="rgba(232,155,61,0.1)" stroke={AMBER} strokeWidth={1} />
                        <text x={b.x + b.w / 2} y={b.y + 14} textAnchor="middle" fill={AMBER} fontSize={11} fontWeight={500}>
                          {i === 0 ? "LC4" : "LPLC2"}
                        </text>
                        <text x={b.x + b.w / 2} y={b.y + 24} textAnchor="middle" fill={SUB} fontSize={8}>
                          {i === 0 ? "velocity" : "size"}
                        </text>
                      </g>
                    ))}
                    {/* converging edges */}
                    <line x1={lc4Out[0]} y1={lc4Out[1]} x2={gfInTop[0]} y2={gfInTop[1]} stroke={AMBER} strokeWidth={1.5} markerEnd="url(#eb-a)" />
                    <line x1={lplc2Out[0]} y1={lplc2Out[1]} x2={gfInBot[0]} y2={gfInBot[1]} stroke={AMBER} strokeWidth={1.5} markerEnd="url(#eb-a)" />
                    {/* DNp01 / Giant Fiber */}
                    <rect
                      x={GFB.x}
                      y={GFB.y}
                      width={GFB.w}
                      height={GFB.h}
                      rx={6}
                      fill={d.firing ? "rgba(111,227,154,0.14)" : "rgba(232,230,223,0.04)"}
                      stroke={d.firing ? GREEN : SUB}
                      strokeWidth={d.firing ? 1.8 : 1}
                    />
                    <text x={GFB.x + GFB.w / 2} y={GFB.y + 15} textAnchor="middle" fill={d.firing ? GREEN : SUB} fontSize={10} fontWeight={500}>
                      DNp01 · Giant Fiber
                    </text>
                    <text x={GFB.x + GFB.w / 2} y={GFB.y + 28} textAnchor="middle" fill={d.firing ? GREEN : SUB} fontSize={11}>
                      {d.firing ? `${cond.gf_peak_hz} Hz` : "silent · 0 Hz"}
                    </text>
                    {/* the spike, animating along the converging edges (only when firing) */}
                    {d.firing && (
                      <g key={`spike-${cond.key}`}>
                        <circle r={3.4} fill={GREEN}>
                          <animateMotion dur="1.3s" repeatCount="indefinite" path={`M${lc4Out[0]} ${lc4Out[1]} L${gfInTop[0]} ${gfInTop[1]}`} />
                        </circle>
                        <circle r={3.4} fill={GREEN}>
                          <animateMotion dur="1.3s" begin="0.45s" repeatCount="indefinite" path={`M${lplc2Out[0]} ${lplc2Out[1]} L${gfInBot[0]} ${gfInBot[1]}`} />
                        </circle>
                      </g>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {activeCard && (
          <div
            ref={popRef}
            role="dialog"
            aria-label={`${activeCard.title} — detail`}
            className={`sysdiagram-pop ${activeCard.id === "body" ? "runtime" : "training"}`}
            style={{ left: pos.left, top: pos.top, opacity: pos.ready ? 1 : 0 }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <h4>
              {activeCard.n} {activeCard.title}
            </h4>
            <p className="sysdiagram-pop-plain">{STAGE_DETAIL[activeCard.id]}</p>
          </div>
        )}
      </div>

      <p className="cg-eb-loop-cap">
        The brain sits between a real sensor and a real body, and the loop closes
        through the physical world — not a shortcut. Numbers track{" "}
        <strong>{cond.label}</strong>:{" "}
        {d.firing ? (
          <>
            the Giant Fiber fires <strong>{cond.gf_peak_hz} Hz</strong>, the drive
            is <strong>{d.drive.toFixed(3)}</strong>, and the body{" "}
            <strong>{cond.outcome}</strong>.
          </>
        ) : (
          <>
            no loom, the Giant Fiber is <strong>silent</strong>, and the fly{" "}
            <strong>{cond.outcome}</strong>.
          </>
        )}{" "}
        Hover or tap a stage for the mechanism.
      </p>
    </div>
  );
}

export default EmbodiedLoop;
