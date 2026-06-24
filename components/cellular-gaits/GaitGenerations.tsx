/**
 * <GaitGenerations> — the highest-impact visual this page *wants*: the fly's
 * gait improving across generations (gen-0 stagger → mid lurch → late clean
 * walk), as three side-by-side clips reading off the ①②③ milestones of the
 * climb above.
 *
 * That footage does not exist yet and is NOT faked here. These are clearly
 * marked empty slots — a compute follow-up: re-render the gen-0 / mid / late
 * champions from their checkpoints with a world-fixed camera on the WIN box,
 * then drop the MP4s in. Until then the slots stand as an honest "to be
 * rendered," not a placeholder pretending to be data.
 *
 * Server component — no client JS.
 */

const GREEN = "#6FE39A";
const AMBER = "#E89B3D";
const SUB = "#8C8B83";

type Slot = {
  n: string;
  gen: string;
  fit: string;
  gait: string;
  accent: string;
};

const SLOTS: Slot[] = [
  { n: "1", gen: "generation 0", fit: "F ≈ 0 mm", gait: "stagger — twitches, can't hold a stance", accent: SUB },
  { n: "2", gen: "generation ~34", fit: "F ≈ 62 mm", gait: "lurch — drives forward, then stalls", accent: AMBER },
  { n: "3", gen: "generation 50", fit: "F = 86.6 mm", gait: "clean walk — the ~29 mm/s gait", accent: GREEN },
];

function PendingFrame({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 90" role="img" aria-label="Clip slot — render pending" style={{ display: "block", width: "100%", height: "auto" }}>
      <rect
        x={1}
        y={1}
        width={158}
        height={88}
        rx={3}
        fill="rgba(232,230,223,0.015)"
        stroke="rgba(232,230,223,0.18)"
        strokeWidth={1}
        strokeDasharray="5 4"
      />
      {/* a muted film/play glyph so the slot reads as "video goes here" */}
      <circle cx={80} cy={40} r={15} fill="none" stroke={accent} strokeWidth={1.2} opacity={0.7} />
      <path d="M75 33 L75 47 L88 40 Z" fill={accent} opacity={0.7} />
      <text x={80} y={70} textAnchor="middle" fontSize={7.5} fill={SUB} fontFamily="var(--mono)" letterSpacing="0.1em">
        RENDER PENDING
      </text>
    </svg>
  );
}

export function GaitGenerations() {
  return (
    <div className="cg-opt-gens-wrap">
      <div className="cg-opt-gens" role="group" aria-label="Gait across generations — clips to be rendered">
        {SLOTS.map((s) => (
          <figure className="cg-opt-gen" key={s.n}>
            <div className="cg-opt-gen-frame">
              <span className="cg-opt-gen-badge" style={{ borderColor: s.accent, color: s.accent }}>
                {s.n}
              </span>
              <PendingFrame accent={s.accent} />
            </div>
            <figcaption>
              <span className="cg-opt-gen-k">
                {s.gen} · <span style={{ color: s.accent }}>{s.fit}</span>
              </span>
              <span className="cg-opt-gen-sub">{s.gait}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="cg-opt-gens-note">
        <strong>To be rendered — not faked.</strong> The three clips that would
        let you <em>watch</em> the gait improve don&apos;t exist yet. They&apos;re
        a compute follow-up: re-render the gen-0, mid, and late champions from
        their checkpoints with a world-fixed camera, then drop them into these
        slots. The data above is real; this footage isn&apos;t recorded yet, so
        the slots stand empty rather than fabricated.
      </p>
    </div>
  );
}

export default GaitGenerations;
