/**
 * <GaitGenerations> — the highest-impact visual this page wants: the fly's gait
 * improving across generations (gen-0 stagger → mid lurch → late clean walk), as
 * three side-by-side clips reading off the ①②③ milestones of the climb above.
 *
 * These are the real replayed champions (R2 wave-2): each milestone's controller
 * was reloaded from its checkpoint and rolled out open-loop through one shared
 * world-fixed overhead camera (`gaitcam`) — identical camera, resolution, frame
 * count, and playback across all three, so the only thing that changes is how far
 * the same fly gets. gen-0 twitches at the origin; mid lurches forward and drifts;
 * the gen-50 champion walks clean. Not faked, not decorative — the same evolved
 * weights behind the fitness numbers above, played back.
 *
 * Server component — no client JS (autoplaying muted-loop <video> needs none).
 */

const GREEN = "var(--green)";
const AMBER = "var(--amber)";
const SUB = "var(--ink-dim)";

type Slot = {
  n: string;
  gen: string;
  fit: string;
  gait: string;
  accent: string;
  clip: string;
};

const SLOTS: Slot[] = [
  { n: "1", gen: "generation 0", fit: "F ≈ 0 mm", gait: "stagger — twitches, can't hold a stance", accent: SUB, clip: "gait_gen0.mp4" },
  { n: "2", gen: "generation ~34", fit: "F ≈ 62 mm", gait: "lurch — drives forward, then stalls", accent: AMBER, clip: "gait_mid.mp4" },
  { n: "3", gen: "generation 50", fit: "F = 86.6 mm", gait: "clean walk — the ~29 mm/s gait", accent: GREEN, clip: "gait_final.mp4" },
];

export function GaitGenerations() {
  return (
    <div className="cg-opt-gens-wrap">
      <div className="cg-opt-gens" role="group" aria-label="Gait across generations — three replayed champions">
        {SLOTS.map((s) => (
          <figure className="cg-opt-gen" key={s.n}>
            <div className="cg-opt-gen-frame">
              <span className="cg-opt-gen-badge" style={{ borderColor: s.accent, color: s.accent }}>
                {s.n}
              </span>
              <video
                className="cg-opt-gen-clip"
                src={`/cellular-gaits/data-opt/${s.clip}`}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-label={`${s.gen}, fitness ${s.fit}: ${s.gait}.`}
              />
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
        The <strong>same fly</strong>, three points along its own evolution. Each
        clip replays that generation&apos;s champion controller — reloaded from its
        checkpoint and rolled out through one <em>shared world-fixed camera</em> at
        the same scale and frame count — so the only thing changing is how far it
        gets. Watch it go stagger → lurch → clean walk: that growing displacement{" "}
        <em>is</em> the fitness climbing above it.
      </p>
    </div>
  );
}

export default GaitGenerations;
