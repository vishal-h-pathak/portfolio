import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { CriticalityPlayground } from "@/components/cellular-gaits/CriticalityPlayground";
import { GainSweepChart } from "@/components/cellular-gaits/GainSweepChart";
import { GaitClips } from "@/components/cellular-gaits/GaitClips";

export const metadata: Metadata = {
  title: "Controller — Cellular Gaits",
  description:
    "The evolved neural cellular automaton, running live: the gain knob moves it between order and the edge of chaos — and the real physics says distance peaks right where it sits.",
};

export default function ControllerTabPage() {
  return (
    <ConceptScaffold
      name="Controller · Criticality"
      lead={
        <>
          The real evolved 660-param rule, running live in your browser: the{" "}
          <em>gain</em> knob is the one dial that moves the whole system between
          order and the edge of chaos. The playground only <em>poses</em> the
          criticality question — λ flips sign as you cross the edge while the
          state-change rate barely moves. Below it is the answer: D ran the real
          MuJoCo physics across nine gains, and walking distance peaks exactly at
          the native gain and collapses the moment λ tips into chaos.
        </>
      }
      module={
        <div className="cg-controller-module">
          <CriticalityPlayground />

          <div className="cg-result">
            <p className="cg-result-eyebrow">§ THE ANSWER · D RAN THE PHYSICS</p>
            <p className="cg-result-lead">
              The playground&apos;s old caveat — <em>&ldquo;we haven&apos;t run
              the physics yet&rdquo;</em> — is now resolved. In the real engine,
              walking distance is single-peaked at the native gain{" "}
              <strong>1.0 (86.6 mm)</strong> and collapses on both sides, and the
              performance cliff lands exactly where λ crosses zero{" "}
              <strong>(gain ~1.3–1.5)</strong>: the moment the cellular automaton
              tips into chaos, the gait dissolves. The evolved controller parked
              itself at λ≈−0.26 — just inside the ordered edge. The same
              gain→distance curve, reframed as <em>what fitness actually
              rewarded</em>, is the{" "}
              <a className="cg-inline-link" href="/projects/cellular-gaits/objective">
                Objective
              </a>{" "}
              tab.
            </p>
            <GainSweepChart />
            <GaitClips />
          </div>
        </div>
      }
      explainer={{
        chose: (
          <p>
            A neural cellular automaton — one shared <strong>660-param</strong>{" "}
            rule on an <code>8×8×4</code> grid, run on every cell. The gain{" "}
            <code>g</code> scales the pre-activation of each cell&apos;s{" "}
            <code>tanh</code>; it is the single criticality knob this whole tab
            turns.
          </p>
        ),
        why: (
          <p>
            The minimal model of local-rule emergence — deliberately generic. It
            is a <em>null model</em>: if even a generic local rule, tuned to the
            edge of chaos, walks a real fly body, then elaborate structure
            isn&apos;t <em>required</em> for the behavior — which is the cleanest
            baseline against which the biological controllers are measured.
          </p>
        ),
        alternatives: (
          <p>
            Explanatory only — <strong>not live-swappable</strong> here (real
            CPG/MLP controllers don&apos;t exist in this build yet): a{" "}
            <strong>CPG</strong> of coupled oscillators (the standard for legged
            gaits); a plain <strong>MLP/RNN</strong> reading proprioception; a
            hand-built <strong>reflex</strong> controller (stance/swing rules).
            Each trades the NCA&apos;s emergence for more built-in structure.
          </p>
        ),
        frontier: (
          <p>
            Replaced — and not with a leg circuit, with the brain. The real
            FlyWire escape wiring (<strong>LC4/LPLC2 → the Giant Fiber, DNp01</strong>)
            now runs as a spiking connectome in a closed loop, routing a looming
            threat to an embodied escape: measured structure, embodied, producing
            behavior. The honest version — it shows the connectome routing the
            cue, not a calibrated escape threshold. Walked out on the{" "}
            <a className="cg-inline-link" href="/projects/cellular-gaits/embodied">
              Embodied
            </a>{" "}
            tab.
          </p>
        ),
      }}
    />
  );
}
