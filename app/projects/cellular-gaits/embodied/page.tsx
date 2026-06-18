import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";

export const metadata: Metadata = {
  title: "Embodied connectome — Cellular Gaits",
  description: "The Eon direction: replacing the null model with real structure.",
};

export default function EmbodiedTabPage() {
  return (
    <ConceptScaffold
      name="Embodied connectome"
      lead="The endpoint: a real connectome, embodied — does real structure produce real behavior?"
      explainer={{
        chose: (
          <p>
            The neural cellular automaton is a generic <em>null model</em>. The
            arc beyond this redesign is to replace it with progressively more
            biological controllers — CPG → closed proprioceptive loop → the real
            VNC leg connectome from FlyWire as the controller — and ask whether
            real structure, embodied, produces real behavior. This is the
            Eon-Systems embodied-fly line, and connects to the neuromorphic
            angle (the FlyWire connectome on Loihi 2).
          </p>
        ),
      }}
    />
  );
}
