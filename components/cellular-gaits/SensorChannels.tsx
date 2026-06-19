/**
 * Cellular Gaits — what proprioception feeds in, and exactly where it lands
 * (Behaviors / perturbation). Refined for C2-C to match the *trained*
 * closed-loop controller's pinned `sensors` spec (closed_loop_controller.json):
 *
 *   • ch4 — 42 joint angles (actuator_length, normalized θ/3.14), laid one per
 *     cell onto the 7×6 motor block (rows 0–6, cols 0–5);
 *   • ch5 — 6 per-leg foot contacts {0,1} on the bottom row (row 7, cols 0–5).
 *
 * These are two *extra conv1 input channels*; the recurrent state stays 4
 * channels and the motor readout is unchanged. Pure SVG, server-renderable — NO
 * three.js / WASM on this content route.
 */

const GREEN = "#6FE39A";
const TEAL = "#5BD6C6";
const SUB = "#8C8B83";
const INK = "#E8E6DF";

const W = 600;
const H = 300;

// 8×8 grid on the right.
const N = 8;
const CELL = 20;
const GAP = 2;
const GX = 372;
const GY = 58;
const cellXY = (r: number, c: number): [number, number] => [
  GX + c * (CELL + GAP),
  GY + r * (CELL + GAP),
];

// Cell roles: the 7×6 motor block carries the joint angles (ch4); the bottom
// row's first 6 cells carry the foot contacts (ch5); everything else is plain
// recurrent state.
function role(r: number, c: number): "angle" | "contact" | "state" {
  if (r <= 6 && c <= 5) return "angle";
  if (r === 7 && c <= 5) return "contact";
  return "state";
}

export function SensorChannels() {
  return (
    <figure className="cg-chan">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="cg-sc-title cg-sc-desc"
        style={{ display: "block", width: "100%", height: "auto", fontFamily: "var(--mono)" }}
      >
        <title id="cg-sc-title">Proprioceptive sensor channels into the NCA grid</title>
        <desc id="cg-sc-desc">
          The closed loop adds two extra input channels. Channel four carries the
          42 joint angles, normalized and laid one per cell onto the seven-by-six
          motor block. Channel five carries the six per-leg foot contacts on the
          bottom row. The four recurrent state channels and the motor readout are
          unchanged; the sensor channels enter only at the first convolution.
        </desc>

        <defs>
          <marker id="cg-sc-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={GREEN} />
          </marker>
          <marker id="cg-sc-teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={TEAL} />
          </marker>
        </defs>

        {/* region labels */}
        <text x={20} y={28} fill={GREEN} fontSize={11} letterSpacing="0.08em">
          SENSORY BUS
        </text>
        <text x={118} y={28} fill={SUB} fontSize={11}>
          · what the loop adds · 2 extra channels
        </text>

        {/* ── input group 1: 42 joint angles (6 legs × 7) → ch4 ── */}
        <g>
          <rect x={20} y={62} width={150} height={86} rx={6} fill="rgba(111,227,154,0.06)" stroke={GREEN} strokeWidth={1} />
          <text x={30} y={82} fill={INK} fontSize={12} fontWeight={500}>
            42 joint angles
          </text>
          <text x={30} y={97} fill={SUB} fontSize={9.5}>
            actuator_length · θ/3.14 → ch4
          </text>
          {Array.from({ length: 6 }).map((_, leg) =>
            Array.from({ length: 7 }).map((__, dof) => (
              <rect
                key={`${leg}-${dof}`}
                x={30 + dof * 18}
                y={106 + leg * 6}
                width={13}
                height={3.5}
                rx={1}
                fill={GREEN}
                opacity={0.55}
              />
            )),
          )}
        </g>

        {/* ── input group 2: 6 foot contacts → ch5 ── */}
        <g>
          <rect x={20} y={166} width={150} height={56} rx={6} fill="rgba(91,214,198,0.06)" stroke={TEAL} strokeWidth={1} />
          <text x={30} y={186} fill={INK} fontSize={12} fontWeight={500}>
            6 foot contacts
          </text>
          <text x={30} y={201} fill={SUB} fontSize={9.5}>
            1 / leg · boolean → ch5
          </text>
          {Array.from({ length: 6 }).map((_, leg) => (
            <circle key={leg} cx={36 + leg * 22} cy={213} r={4} fill="none" stroke={TEAL} strokeWidth={1.2} />
          ))}
        </g>

        {/* ── routing: each bus → its grid region ── */}
        <line x1={170} y1={105} x2={300} y2={105} stroke={GREEN} strokeWidth={1.4} />
        <line x1={300} y1={105} x2={GX - 6} y2={GY + 60} stroke={GREEN} strokeWidth={1.6} markerEnd="url(#cg-sc-green)" />
        <text x={250} y={98} fill={SUB} fontSize={9.5} textAnchor="middle">
          7×6 motor block
        </text>
        <line x1={170} y1={194} x2={300} y2={194} stroke={TEAL} strokeWidth={1.4} />
        <line x1={300} y1={194} x2={GX - 6} y2={GY + 7 * (CELL + GAP) + CELL / 2} stroke={TEAL} strokeWidth={1.6} markerEnd="url(#cg-sc-teal)" />
        <text x={250} y={210} fill={SUB} fontSize={9.5} textAnchor="middle">
          bottom row
        </text>

        {/* depth cue: the 4 recurrent state channels stacked behind the grid */}
        {[1, 2, 3, 4].map((k) => (
          <rect
            key={k}
            x={GX + k * 5}
            y={GY - k * 5}
            width={N * (CELL + GAP) - GAP}
            height={N * (CELL + GAP) - GAP}
            rx={2}
            fill="none"
            stroke="rgba(232,230,223,0.3)"
            strokeWidth={0.8}
            strokeDasharray="3 3"
            opacity={0.5 - k * 0.08}
          />
        ))}

        {/* ── the 8×8 grid, cells colored by role ── */}
        {Array.from({ length: N }).map((_, r) =>
          Array.from({ length: N }).map((__, c) => {
            const [x, y] = cellXY(r, c);
            const k = role(r, c);
            const fill =
              k === "angle"
                ? "rgba(111,227,154,0.5)"
                : k === "contact"
                  ? "rgba(91,214,198,0.6)"
                  : "rgba(232,230,223,0.05)";
            const stroke = k === "angle" ? GREEN : k === "contact" ? TEAL : "rgba(232,230,223,0.25)";
            return (
              <rect
                key={`${r}-${c}`}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={2}
                fill={fill}
                stroke={stroke}
                strokeWidth={k === "state" ? 0.8 : 1.2}
                opacity={k === "state" ? 0.7 : 1}
              />
            );
          }),
        )}

        {/* grid label + legend */}
        <text x={GX} y={GY - 26} fill={GREEN} fontSize={11} letterSpacing="0.06em">
          8×8 GRID · 4 state + 2 sensor
        </text>
        <text x={GX} y={GY + N * (CELL + GAP) + 16} fill={GREEN} fontSize={10}>
          ▪ ch4 joint angles (7×6)
        </text>
        <text x={GX} y={GY + N * (CELL + GAP) + 30} fill={TEAL} fontSize={10}>
          ▪ ch5 foot contacts (row 7)
        </text>
      </svg>

      <figcaption className="cg-chan-cap">
        <strong>48</strong> proprioceptive signals — 42 joint angles (ch4) + 6
        foot contacts (ch5) — entered as two extra <code>conv1</code> input
        channels, the placement pinned by the trained{" "}
        <code>closed_loop_controller.json</code>. The recurrent state stays 4
        channels; zero these two and the rule is open-loop again.
      </figcaption>
    </figure>
  );
}

export default SensorChannels;
