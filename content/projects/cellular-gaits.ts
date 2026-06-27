import type { Project } from "./schema";

export const cellularGaits: Project = {
  num: "B-04",
  slug: "cellular-gaits",
  tier: "lab",
  domain: "bio-sim",
  year: 2026,
  featured: true,
  title: "Cellular Gaits",
  oneLiner: "a real fly connectome, run as a spiking brain, drives a real fly body",
  status: "shipped",
  statusLabel: "SHIPPED · v1",
  repo: "vishal-h-pathak/cellular-gaits",
  updated: "2026-06",
  paragraphs: [
    {
      text: "The real FlyWire connectome — the electron-microscope wiring of an entire adult Drosophila brain — run as a 138,639-neuron spiking network, driving a biomechanical fly body in a closed loop. A looming threat is seen by the fly's looming-detector neurons (LC4, LPLC2); their spikes propagate through the real wiring to the Giant Fiber escape neuron (DNp01); that firing bolts the simulated body away — and the motion changes what it sees, so the loop closes through the physics.",
    },
    {
      text: "It started smaller: a 660-parameter neural cellular automaton, evolved with CMA-ES until its local update rule walked the same body — a null model standing in for the brain. The line from that placeholder to the real circuit is the whole project. Honest about the seam: this shows the connectome routing a looming cue to an embodied escape, not a calibrated escape threshold — in isolation the Giant Fiber saturates.",
      dim: true,
    },
  ],
  meta: [
    { key: "STACK", value: "FlyWire · LIF brain · NeuroMechFly · MuJoCo" },
    { key: "CONTROLLER", value: "real connectome · 138,639-neuron LIF" },
    { key: "RESULT", value: "looming → Giant Fiber → escape bolt" },
    { key: "BUILD", value: "Solo · Claude · v1", build: true },
  ],
  actions: [
    { label: "→ open cellular gaits", href: "/projects/cellular-gaits", primary: true },
  ],
};
