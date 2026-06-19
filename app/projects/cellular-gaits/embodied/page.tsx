import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";
import { ControllerLadder } from "@/components/cellular-gaits/ControllerLadder";

export const metadata: Metadata = {
  title: "Embodied connectome — Cellular Gaits",
  description:
    "The Eon direction: swapping the null-model controller for real connectome structure, embodied, and asking whether it produces real behaviour.",
};

type Ref = {
  authors: string;
  year: string;
  title: string;
  venue: string;
  href: string;
  note: string;
};

// Verified against the published versions (Nature / Nature Methods, 2024–2025)
// plus the Eon Systems write-up that frames this whole tab.
const REFERENCES: Ref[] = [
  {
    authors: "Shiu et al.",
    year: "2024",
    title:
      "A leaky integrate-and-fire computational model based on the connectome of the entire adult Drosophila brain",
    venue: "Nature",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11446845/",
    note: "The FlyWire connectome turned into a spiking LIF brain — wiring → dynamics.",
  },
  {
    authors: "Lappalainen et al.",
    year: "2024",
    title:
      "Connectome-constrained networks predict neural activity across the fly visual system",
    venue: "Nature",
    href: "https://www.nature.com/articles/s41586-024-07939-3",
    note: "Connectivity alone, trained on a task, predicts real neural responses — the vision half.",
  },
  {
    authors: "Wang-Chen et al.",
    year: "2024",
    title:
      "NeuroMechFly v2: simulating embodied sensorimotor control in adult Drosophila",
    venue: "Nature Methods",
    href: "https://www.nature.com/articles/s41592-024-02497-y",
    note: "The MuJoCo fly body (FlyGym) this project drives — sensing, terrain, motor feedback.",
  },
  {
    authors: "Vaxenburg et al.",
    year: "2025",
    title: "Whole-body physics simulation of fruit fly locomotion",
    venue: "Nature",
    href: "https://www.nature.com/articles/s41586-025-09029-4",
    note: "DeepMind + Janelia whole-body RL fly on MuJoCo — what a trained whole-body controller looks like.",
  },
  {
    authors: "Eon Systems",
    year: "",
    title: "How the Eon team produced a virtual embodied fly",
    venue: "write-up + fly-brain code",
    href: "https://eon.systems/updates/embodied-brain-emulation",
    note: "The reference embodied fly: connectome brain + vision + body on MuJoCo, run on CPU, GPU, and neuromorphic backends (incl. Loihi 2).",
  },
  {
    authors: "FlyWire",
    year: "2024",
    title: "Neuronal wiring diagram of an adult brain",
    venue: "Nature / flywire.ai",
    href: "https://flywire.ai/",
    note: "The connectome itself — the measured structure every rung above eventually draws on.",
  },
];

export default function EmbodiedTabPage() {
  return (
    <>
      <ConceptScaffold
        name="Embodied connectome"
        lead="The endpoint: a real connectome, embodied — does real structure produce real behaviour?"
        module={
          <>
            <ControllerLadder />
            {/* Rung 01 *is* the live fly on the Body tab — link to that one
                canonical home instead of re-embedding the identical native-gain
                walking loop here. */}
            <figure className="cg-ladder-anchor">
              <a
                className="cg-ladder-anchor-link"
                href="/projects/cellular-gaits/body"
              >
                <span className="cg-ladder-anchor-tag">RUNG 01 · LIVE TODAY</span>
                <span className="cg-ladder-anchor-go">
                  Watch the NCA null model walk this exact body, live, on the
                  Body tab →
                </span>
              </a>
              <figcaption>
                Rung 01, today — the NCA null model walking the FlyGym body
                (native gain, live-physics validated). The body and the slot stay
                fixed; every rung above replaces only what fills this slot.
              </figcaption>
            </figure>
          </>
        }
        explainer={{
          chose: (
            <p>
              A generic neural cellular automaton driving the fly — a deliberate{" "}
              <em>null model</em>. Its one job is to prove a <em>local rule</em>{" "}
              can walk the body at all. The rule was evolved, not designed, and it
              borrows nothing from real neural wiring. That emptiness is the
              feature: it&apos;s the baseline everything more biological gets
              measured against.
            </p>
          ),
          why: (
            <p>
              The deep question isn&apos;t &ldquo;can something walk this
              body&rdquo; — it&apos;s whether real connectome{" "}
              <strong>structure</strong>, embodied, produces real{" "}
              <strong>behaviour</strong>:{" "}
              <em>structure → dynamics → behaviour</em>. You can&apos;t read
              behaviour off a wiring diagram. Dynamics only appear when the
              circuit is run, and behaviour only appears when those dynamics are
              coupled to a body and physics. The body and the slot are held fixed
              precisely so that swapping the controller isolates the contribution
              of structure.
            </p>
          ),
          alternatives: (
            <p>
              The next rungs make the controller progressively more biological.{" "}
              <strong>Stage 2</strong>{" "}
              <a className="cg-inline-link" href="/projects/cellular-gaits/sensing">
                closes the sensory loop
              </a>{" "}
              — the dashed proprioceptive arc in the system diagram — so the fly
              stops walking blind. After that, pull the real VNC leg circuit from
              FlyWire and
              wire it directly to the legs, swapping the invented rule for measured
              connectivity. CPG and closed-loop are the rungs in between.
            </p>
          ),
          frontier: (
            <p>
              The reference point is{" "}
              <strong>Eon Systems&apos; embodied fly</strong>: a FlyWire
              connectome <strong>LIF brain</strong> (Shiu et al. 2024) +{" "}
              <strong>connectome-constrained vision</strong> (Lappalainen et al.
              2024) on the <strong>NeuroMechFly body</strong> (Wang-Chen et al.
              2024), all in MuJoCo, with brain↔body coupled through a sparse{" "}
              <strong>descending-neuron readout</strong> — the hand-mapped
              interface problem. A whole-body RL fly exists too (Vaxenburg et al.
              2025). And because it&apos;s a spiking connectome, it ports to{" "}
              <strong>neuromorphic hardware</strong> — the FlyWire brain run on
              Intel Loihi 2. This tab is the on-ramp; that&apos;s the build-out.
            </p>
          ),
        }}
      />

      <section className="cg-section" aria-labelledby="cg-refs-h">
        <p className="cg-section-eyebrow" id="cg-refs-h">
          § REFERENCES
        </p>
        <p className="cg-section-lead">
          The frontier, concretely — the papers and the reference system behind
          the rungs above.
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
