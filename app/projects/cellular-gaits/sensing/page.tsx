import type { Metadata } from "next";
import { ConceptScaffold } from "@/components/cellular-gaits/ConceptScaffold";

export const metadata: Metadata = {
  title: "Sensing — Cellular Gaits",
  description: "What the controller feels about the body it drives.",
};

export default function SensingTabPage() {
  return (
    <ConceptScaffold
      name="Sensing"
      lead="Open loop vs closed loop: does the grid feel the legs it moves?"
      explainer={{
        chose: (
          <p>
            Currently <strong>open-loop</strong>: the grid never receives body
            state — it walks blind, emitting the same rhythm regardless of what
            the legs actually do. The next step feeds proprioceptive body state
            back into the cells to close the loop.
          </p>
        ),
      }}
    />
  );
}
