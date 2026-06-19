/**
 * GaitClips — three recorded MuJoCo rollouts (D) at low / native / high gain,
 * so you can *see* the gait degrade across the criticality axis that the chart
 * quantifies. These are precomputed clips, not a live sim: running a second
 * live MuJoCo+three.js stage next to the playground risks the frame budget, so
 * we show D's recordings here and link to the live fly on the Body tab (where a
 * single FlyStage owns the frame).
 */

import Link from "next/link";

const CLIPS: { src: string; label: string; sub: string }[] = [
  { src: "/cellular-gaits/data/clip_gain_lo.mp4", label: "low gain", sub: "ordered · under-driven" },
  { src: "/cellular-gaits/data/clip_gain_native.mp4", label: "native · g=1.0", sub: "86.6 mm · the peak" },
  { src: "/cellular-gaits/data/clip_gain_hi.mp4", label: "high gain", sub: "past the edge · collapses" },
];

export function GaitClips() {
  return (
    <div className="cg-gaitclips-wrap">
      <div className="cg-gaitclips" role="group" aria-label="Recorded gaits at low, native, and high gain">
        {CLIPS.map((c) => (
          <figure className="cg-gaitclip" key={c.src}>
            <video
              src={c.src}
              autoPlay
              loop
              muted
              playsInline
              aria-label={`Recorded fly rollout at ${c.label} (${c.sub})`}
            />
            <figcaption>
              <span className="cg-gaitclip-k">{c.label}</span>
              <span className="cg-gaitclip-sub">{c.sub}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="cg-pg-cap">
        recorded rollouts (D) · not live —{" "}
        <Link href="/projects/cellular-gaits/body" className="cg-inline-link">
          watch the live fly on the Body tab →
        </Link>
      </p>
    </div>
  );
}
