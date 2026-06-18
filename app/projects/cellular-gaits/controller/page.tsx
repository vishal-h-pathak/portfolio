import type { Metadata } from "next";
import { CriticalityPlayground } from "@/components/cellular-gaits/CriticalityPlayground";

export const metadata: Metadata = {
  title: "Controller — Cellular Gaits",
  description:
    "The evolved neural cellular automaton, running live: the gain knob moves it between order and the edge of chaos.",
};

export default function ControllerTabPage() {
  return (
    <section className="cg-section">
      <p className="cg-section-eyebrow">§ CONTROLLER · CRITICALITY</p>
      <p className="cg-section-lead">
        The real evolved controller, running live in your browser. The{" "}
        <em>gain</em> knob scales how hard each cell drives its tanh — the one
        dial that moves the whole system between order and chaos. Watch two
        numbers: the <em>state-change rate</em> (how violently the grid churns)
        barely moves as you turn the knob, but the <em>Lyapunov exponent λ</em>{" "}
        (whether a tiny nudge grows or fades) flips from negative to positive as
        you cross the edge of chaos. The controller&apos;s own setting —{" "}
        <em>native, gain 1.0</em> — sits just on the ordered side: a strong,
        repeatable rhythm, not chaos. Push the gain past ~1.3 and the
        sensitivity map ignites.
      </p>
      <CriticalityPlayground />
    </section>
  );
}
