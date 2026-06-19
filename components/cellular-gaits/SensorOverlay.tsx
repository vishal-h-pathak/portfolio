"use client";

/**
 * <SensorOverlay> — the live proprioception of the fly on the Sensing tab,
 * drawn *on the body* (anchored over the FlyStage canvas) rather than only as a
 * block diagram. It shows exactly the two extra channels a closed loop reads
 * back — and the teaching point is that the open-loop NCA driving this fly
 * ignores them:
 *   • 6 per-leg foot contacts (lit when that tarsus is on the ground), in the
 *     hexapod LF/LM/LH · RF/RM/RH layout;
 *   • the 42 actuated joint angles as a live bar strip.
 *
 * Pure presentational SVG/DOM; the sampling happens in the parent's controller
 * callback (reads sim.footContacts() / sim.actuatorLengths() each control step).
 */

const GREEN = "#6FE39A";

// Foot-contact dot positions in a compact hexapod map, leg order
// [lf, lm, lh, rf, rm, rh] to match sim.footContacts().
const LEG_LABELS = ["LF", "LM", "LH", "RF", "RM", "RH"] as const;
const DOTS: { cx: number; cy: number }[] = [
  { cx: 12, cy: 10 }, // LF
  { cx: 12, cy: 30 }, // LM
  { cx: 12, cy: 50 }, // LH
  { cx: 52, cy: 10 }, // RF
  { cx: 52, cy: 30 }, // RM
  { cx: 52, cy: 50 }, // RH
];

export function SensorOverlay({
  contacts,
  angles,
}: {
  /** 6 per-leg foot contacts [lf,lm,lh,rf,rm,rh], 1 = on ground. */
  contacts: Uint8Array | null;
  /** 42 actuated joint angles (radians). */
  angles: Float32Array | null;
}) {
  const live = !!contacts;
  const nContact = contacts ? contacts.reduce((s, v) => s + v, 0) : 0;

  return (
    <div className="cg-sensor-overlay" aria-hidden={false}>
      <div className="cg-sensor-overlay-head">
        <span className="cg-sensor-overlay-tag">proprioception · live</span>
        <span className="cg-sensor-overlay-sub">
          {live ? `${nContact}/6 feet down` : "—"}
        </span>
      </div>

      {/* 6 foot contacts in the hexapod layout */}
      <svg
        className="cg-sensor-contacts"
        viewBox="0 0 64 60"
        width="64"
        height="60"
        role="img"
        aria-label={
          live
            ? `Foot contacts: ${LEG_LABELS.filter((_, i) => contacts![i]).join(", ") || "none"} on the ground`
            : "Foot contacts (waiting for live sim)"
        }
      >
        {/* body spine, for orientation */}
        <line x1="32" y1="6" x2="32" y2="54" stroke="rgba(232,230,223,0.18)" strokeWidth="1" />
        {DOTS.map((d, i) => {
          const on = !!contacts && contacts[i] === 1;
          return (
            <g key={LEG_LABELS[i]}>
              <line
                x1={32}
                y1={d.cy}
                x2={d.cx}
                y2={d.cy}
                stroke={on ? GREEN : "rgba(232,230,223,0.18)"}
                strokeWidth="1"
              />
              <circle
                cx={d.cx}
                cy={d.cy}
                r={4.5}
                fill={on ? GREEN : "transparent"}
                stroke={on ? GREEN : "rgba(232,230,223,0.32)"}
                strokeWidth="1.2"
              />
              <text
                x={d.cx + (d.cx < 32 ? -8 : 8)}
                y={d.cy + 3}
                fontSize="6.5"
                textAnchor={d.cx < 32 ? "end" : "start"}
                fill="rgba(232,230,223,0.5)"
                fontFamily="var(--mono)"
              >
                {LEG_LABELS[i]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 42 joint angles, live bar strip */}
      <div className="cg-sensor-joints">
        <span className="cg-sensor-joints-k">42 joint angles</span>
        <svg
          className="cg-sensor-joints-strip"
          viewBox="0 0 84 24"
          preserveAspectRatio="none"
          width="84"
          height="24"
          role="img"
          aria-label="Live readback of the 42 actuated joint angles"
        >
          <line x1="0" y1="12" x2="84" y2="12" stroke="rgba(232,230,223,0.16)" strokeWidth="0.5" />
          {Array.from({ length: 42 }, (_, i) => {
            const a = angles && angles[i] != null ? angles[i] : 0;
            // map ~±2 rad to ±half-height; centered bars
            const h = Math.max(-1, Math.min(1, a / 2)) * 11;
            const x = (i / 42) * 84 + 0.5;
            return (
              <rect
                key={i}
                x={x}
                y={h >= 0 ? 12 - h : 12}
                width={84 / 42 - 1}
                height={Math.abs(h) || 0.5}
                fill={GREEN}
                opacity={live ? 0.8 : 0.25}
              />
            );
          })}
        </svg>
      </div>

      <p className="cg-sensor-overlay-note">
        the body state a closed loop reads — this controller ignores it
      </p>
    </div>
  );
}

export default SensorOverlay;
