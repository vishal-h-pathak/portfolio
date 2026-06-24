import type { Metadata } from "next";
import { ControllerLadder } from "@/components/cellular-gaits/ControllerLadder";
import { EmbodiedLoop, type LoopCondition, type LoopConfig } from "@/components/cellular-gaits/EmbodiedLoop";
import { BrainCircuitMap, type CircuitData } from "@/components/cellular-gaits/BrainCircuitMap";
import { GfResponse, type GfResponseData } from "@/components/cellular-gaits/GfResponse";
import {
  EmbodiedConditions,
  type ConditionMeta,
} from "@/components/cellular-gaits/EmbodiedConditions";
import { CG_BASE } from "@/components/cellular-gaits/tabs";

import manifestJson from "@/public/cellular-gaits/data-eb/manifest.json";
import circuitJson from "@/public/cellular-gaits/data-eb/circuit.json";
import gfResponseJson from "@/public/cellular-gaits/data-eb/gf_response.json";

export const metadata: Metadata = {
  title: "The Embodied Fly — Cellular Gaits",
  description:
    "The built result: a real FlyWire connectome, run as a 138,639-neuron spiking brain, routes a looming threat through real wiring to the Giant Fiber (DNp01) and bolts a NeuroMechFly body — closed through the physics. Honest about what it is and isn't: a looming cue routed to an embodied escape, not a calibrated threshold.",
};

// ── parse the bundle against the WP-D schema (no science numbers hardcoded) ──
type Manifest = {
  config: LoopConfig & { n_steps: number; control_dt_s: number; threat_seed: number };
  conditions: ConditionMeta[];
};
const manifest = manifestJson as unknown as Manifest;
const circuit = circuitJson as unknown as CircuitData;
const gfResponse = gfResponseJson as unknown as GfResponseData;

const CONDITIONS = manifest.conditions;
const CONFIG = manifest.config;
const loopConditions: LoopCondition[] = CONDITIONS.map((c) => ({
  key: c.key,
  label: c.label,
  azimuth_deg: c.azimuth_deg,
  gf_peak_hz: c.gf_peak_hz,
  outcome: c.outcome,
}));

const left = CONDITIONS.find((c) => c.key === "left_threat");
const right = CONDITIONS.find((c) => c.key === "right_threat");

type Ref = {
  authors: string;
  year: string;
  title: string;
  venue: string;
  href: string;
  note: string;
};

const REFERENCES: Ref[] = [
  {
    authors: "Shiu et al.",
    year: "2024",
    title:
      "A leaky integrate-and-fire computational model based on the connectome of the entire adult Drosophila brain",
    venue: "Nature",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11446845/",
    note: "The FlyWire connectome turned into a spiking LIF brain — the model run here.",
  },
  {
    authors: "Dorkenwald, Schlegel et al.",
    year: "2024",
    title: "Neuronal wiring diagram of an adult brain (FlyWire)",
    venue: "Nature / flywire.ai",
    href: "https://flywire.ai/",
    note: "The connectome itself — the measured v783 wiring the brain is built from.",
  },
  {
    authors: "Wang-Chen et al.",
    year: "2024",
    title:
      "NeuroMechFly v2: simulating embodied sensorimotor control in adult Drosophila",
    venue: "Nature Methods",
    href: "https://www.nature.com/articles/s41592-024-02497-y",
    note: "The MuJoCo fly body (FlyGym) the brain drives.",
  },
  {
    authors: "von Reyn et al.",
    year: "2017",
    title:
      "Feature integration drives probabilistic behavior in the Drosophila escape system",
    venue: "Neuron",
    href: "https://doi.org/10.1016/j.neuron.2017.03.010",
    note: "The Giant Fiber sums size + velocity; single-spike timing sets the takeoff.",
  },
  {
    authors: "Ache et al.",
    year: "2019",
    title: "Neural basis for looming size and velocity encoding in the Drosophila giant fiber escape pathway",
    venue: "Current Biology",
    href: "https://doi.org/10.1016/j.cub.2019.02.009",
    note: "LC4 (velocity) + LPLC2 (size) → DNp01 — the circuit reproduced here.",
  },
  {
    authors: "Eon Systems",
    year: "",
    title: "How the Eon team produced a virtual embodied fly",
    venue: "write-up + fly-brain code",
    href: "https://eon.systems/updates/embodied-brain-emulation",
    note: "The reference embodied fly this is a hand-built recreation of — connectome brain + body on MuJoCo, run on CPU, GPU, and neuromorphic backends (incl. Loihi 2).",
  },
];

export default function EmbodiedTabPage() {
  return (
    <>
      {/* ── §1 the hero: the four-part loop, achieved ── */}
      <section className="cg-section">
        <p className="cg-section-eyebrow">§ THE EMBODIED FLY</p>
        <p className="cg-section-lead">
          The built result. A real <strong>FlyWire connectome</strong>, run as a
          spiking brain, drives a real fly body: a looming threat becomes a{" "}
          <strong>Giant-Fiber spike</strong> becomes an <strong>escape bolt</strong>,
          and the loop closes through the physics. This is the top of the line the
          rest of the bench climbs — the place the real circuit finally drives the
          body.
        </p>

        <EmbodiedLoop conditions={loopConditions} config={CONFIG} />

        <div className="cg-eb-prose">
          <p>
            We took the electron-microscope wiring diagram of an entire adult{" "}
            <em>Drosophila</em> brain — <strong>138,639 leaky-integrate-and-fire
            neurons</strong>, ~15 million synapses, the real FlyWire v783
            connectome — ran it as a spiking network, and used it to drive a
            biomechanically real fly body in MuJoCo, in a closed sensory-motor
            loop. A looming &ldquo;predator&rdquo; is seen by the fly&apos;s
            looming-detector neurons; their spikes propagate through the actual
            wiring to the <strong>Giant Fiber</strong>{" "}escape command neuron; and
            that neuron&apos;s firing makes the simulated fly bolt away — after
            which its movement changes what it sees, and the loop repeats.
          </p>
          <p className="cg-eb-prose-dim">
            It is a hand-built, miniature recreation of Eon Systems&apos; embodied-fly
            demo: their integration of the same published parts (the FlyWire
            connectome, the Shiu LIF brain, the NeuroMechFly body). A
            research/demonstration platform, not a complete fly. The honest line,
            kept throughout: this shows the real connectome <em>routing a looming
            cue to an embodied escape</em> — not a calibrated escape threshold.
          </p>
        </div>
      </section>

      {/* ── §2 where the circuit physically sits ── */}
      <section className="cg-section" aria-labelledby="cg-eb-circuit-h">
        <p className="cg-section-eyebrow" id="cg-eb-circuit-h">
          § THE ESCAPE CIRCUIT · WHERE IT SITS
        </p>
        <p className="cg-section-lead">
          Inside that brain is the real escape sub-circuit. The looming detectors{" "}
          <strong>LC4</strong> (≈ angular velocity) and <strong>LPLC2</strong>{" "}
          (≈ angular size) sit laterally in the lobula complex, behind each eye, and
          converge ipsilaterally onto <strong>DNp01, the Giant Fiber</strong>, which
          descends toward the body. The wiring is asymmetric, and it is drawn so you
          can see it: each edge&apos;s thickness <em>is</em> its synapse count.
        </p>

        <div className="cg-tab-module" role="region" aria-label="Brain-region circuit map">
          <BrainCircuitMap circuit={circuit} />
        </div>

        <div className="cg-eb-prose">
          <p>
            The numbers come straight from the connectome:{" "}
            <strong>{circuit.neurons.LC4.both} LC4</strong> +{" "}
            <strong>{circuit.neurons.LPLC2.both} LPLC2</strong> neurons converging
            on <strong>{circuit.neurons.DNp01.both} Giant Fibers</strong>. The right
            Giant Fiber carries more converging synapses than the left —{" "}
            {circuit.convergence_syn_ge_1["LC4->DNp01_right"].total_synapses}/
            {circuit.convergence_syn_ge_1["LC4->DNp01_left"].total_synapses} for LC4,{" "}
            {circuit.convergence_syn_ge_1["LPLC2->DNp01_right"].total_synapses}/
            {circuit.convergence_syn_ge_1["LPLC2->DNp01_left"].total_synapses} for
            LPLC2 — which is exactly why the right Giant Fiber out-fires the left in
            the live run. The brain outline is a hand-drawn schematic for placement,
            not a literal neuropil render; the counts and synapses are real.
          </p>
        </div>
      </section>

      {/* ── §3 the GF as an instrument ── */}
      <section className="cg-section" aria-labelledby="cg-eb-gf-h">
        <p className="cg-section-eyebrow" id="cg-eb-gf-h">
          § THE GIANT FIBER · AS AN INSTRUMENT
        </p>
        <p className="cg-section-lead">
          Drive LC4 and LPLC2 in the live connectome and the Giant Fiber fires;
          silence them and it goes quiet. The curve below is the real brain-only
          sweep — and the toggle is the proof that the Giant Fiber only fires{" "}
          <em>through</em> these inputs.
        </p>

        <div className="cg-tab-module" role="region" aria-label="Giant Fiber response curve">
          <GfResponse data={gfResponse} />
        </div>
      </section>

      {/* ── §4 the result — three conditions ── */}
      <section className="cg-section" aria-labelledby="cg-eb-result-h">
        <p className="cg-section-eyebrow" id="cg-eb-result-h">
          § THE RESULT · LOOMING → ESCAPE
        </p>
        <p className="cg-section-lead">
          Three runs through the closed loop: a threat from the left, a threat from
          the right, and a no-threat baseline.{" "}
          {left && right && (
            <>
              Left threat → Giant Fiber <strong>{left.gf_peak_hz} Hz</strong> →{" "}
              {left.outcome}; right threat → <strong>{right.gf_peak_hz} Hz</strong> →{" "}
              {right.outcome}; baseline → Giant Fiber silent, the fly just walks.
            </>
          )}{" "}
          The brain is the causal link.
        </p>

        <div className="cg-tab-module" role="region" aria-label="The three condition panels">
          <EmbodiedConditions conditions={CONDITIONS} />
        </div>
      </section>

      {/* ── §5 the engineering constraint: built once, then stepped ── */}
      <section className="cg-section" aria-labelledby="cg-eb-timing-h">
        <p className="cg-section-eyebrow" id="cg-eb-timing-h">
          § BUILT ONCE, THEN STEPPED
        </p>
        <p className="cg-section-lead">
          The make-or-break constraint. Building the spiking network reads a ~100 MB
          connectivity table; rebuilding it every window would take minutes. So the
          brain is built <strong>once per condition</strong>, then{" "}
          <strong>stepped</strong> with a runtime-settable input rate — brain and
          body advancing in lockstep every {(CONFIG.sync_window_s * 1000).toFixed(0)}{" "}
          ms.
        </p>
        <div className="cg-eb-timing" role="img" aria-label="Timeline: a one-time brain build of about 14 seconds per condition, then many fast 15-millisecond synchronized steps.">
          <div className="cg-eb-timing-build">
            <span className="cg-eb-timing-bar" style={{ flex: "0 0 110px" }} />
            <span className="cg-eb-timing-lab">build ≈ 14 s · once</span>
          </div>
          <div className="cg-eb-timing-steps">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className="cg-eb-timing-tick" />
            ))}
            <span className="cg-eb-timing-lab">
              then step · {(CONFIG.sync_window_s * 1000).toFixed(0)} ms brain↔body window (≈150 ms wall-clock each)
            </span>
          </div>
        </div>
        <p className="cg-eb-prose-cap">
          Timings from the WP-D export run (the bundle is reproducible — seeded,
          re-running the script reproduces it byte-for-byte).
        </p>
      </section>

      {/* ── §6 honest limits — at full prominence ── */}
      <section className="cg-section" aria-labelledby="cg-eb-limits-h">
        <p className="cg-section-eyebrow" id="cg-eb-limits-h">
          § HONEST LIMITS
        </p>
        <p className="cg-section-lead">
          Honesty is the brand — these carry the same weight as the headline. What
          this is, and what it isn&apos;t:
        </p>
        <ul className="cg-eb-limits">
          <li>
            <strong>Not a calibrated threshold.</strong> The claim is &ldquo;the
            real connectome routes a looming cue to an embodied escape,&rdquo; not a
            claim about the escape <em>threshold</em> or stimulus{" "}
            <em>selectivity</em>. In isolation the Giant Fiber saturates easily — real
            selectivity lives in whole-brain inhibition this stack doesn&apos;t yet
            capture. Don&apos;t read the response curve as &ldquo;the fly escapes at N
            Hz of looming.&rdquo;
          </li>
          <li>
            <strong>Coarse, flickering readout.</strong> One DNp01 per hemisphere,
            read over a {(CONFIG.sync_window_s * 1000).toFixed(0)} ms window → the
            mean Giant-Fiber rate is quantized in ~33 Hz steps and flickers. The
            per-side peak split (here {left?.gf_peak_hz} vs {right?.gf_peak_hz} Hz){" "}
            <strong>can swap ±1 step run-to-run</strong>; it is seeded here so the
            committed bundle is reproducible. The <em>direction</em> is bearing-driven
            and deterministic regardless of seed.
          </li>
          <li>
            <strong>Hand-tuned, sparse coupling.</strong> Three interface mappings
            (looming→Hz gain {CONFIG.loom_hz_gain}, GF→drive ref{" "}
            {CONFIG.dnp01_ref_hz} / peak {CONFIG.drive_peak},{" "}
            {(CONFIG.sync_window_s * 1000).toFixed(0)} ms sync) are knobs, not
            measurements. One descending neuron stands in for the whole escape
            command; the looming front-end is a hand-built stand-in for the visual
            pathway; v1 drives LC4 and LPLC2 identically (splitting size→LPLC2,
            velocity→LC4 is the faithful next step).
          </li>
          <li>
            <strong>Inherited body asymmetry, ground-only.</strong> The left-strong /
            right-weak escape is the trained body controller&apos;s asymmetry,
            reported not hidden. It is a ground turn-and-flee — no true takeoff yet.
          </li>
          <li>
            <strong>A predicted, snapshot cartoon.</strong> One connectome;
            neurotransmitter signs are <em>predicted</em>, not measured;
            leaky-integrate-and-fire neurons omit dendritic computation, channels,
            plasticity (no learning — the wiring is frozen), and neuromodulation.
          </li>
          <li>
            <strong>&ldquo;Structure → behavior&rdquo; is a direction explored, not
            proven.</strong> This is the first complete vertical slice of that
            question, not an answer to it.
          </li>
        </ul>
      </section>

      {/* ── §7 the line this completes (the ladder, demoted) ── */}
      <section className="cg-section" aria-labelledby="cg-eb-line-h">
        <p className="cg-section-eyebrow" id="cg-eb-line-h">
          § THE LINE THIS COMPLETES
        </p>
        <p className="cg-section-lead">
          The bench walked one line: from a generic null-model controller to the real
          circuit. This page is its top rung — the connectome, embodied.
        </p>
        <div className="cg-tab-module" role="region" aria-label="The controller ladder">
          <ControllerLadder />
          <figure className="cg-ladder-anchor">
            <a className="cg-ladder-anchor-link" href={`${CG_BASE}/body`}>
              <span className="cg-ladder-anchor-tag">RUNG 01 · LIVE TODAY</span>
              <span className="cg-ladder-anchor-go">
                Watch the NCA null model walk this exact body, live, on the Body tab →
              </span>
            </a>
            <figcaption>
              Rung 01, the NCA null model walking the FlyGym body (native gain,
              live-physics validated) — the placeholder the brain replaces. The body
              and the slot stay fixed; each rung up replaces only what fills the
              controller slot, and the top rung is the real connectome on this page.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── references footer ── */}
      <section className="cg-section" aria-labelledby="cg-refs-h">
        <p className="cg-section-eyebrow" id="cg-refs-h">
          § REFERENCES
        </p>
        <p className="cg-section-lead">
          The published parts this is built from — the connectome, the brain model,
          the body, the escape circuit, and the reference system.
        </p>
        <ol className="cg-refs">
          {REFERENCES.map((r) => (
            <li key={r.href} className="cg-ref">
              <a
                className="cg-inline-link cg-ref-title"
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {r.title}
              </a>
              <span className="cg-ref-meta">
                {r.authors}
                {r.year ? ` · ${r.year}` : ""} · {r.venue}
              </span>
              <span className="cg-ref-note">{r.note}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
