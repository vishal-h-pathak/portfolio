export type LineageYear = "2016" | "2017" | "2018" | "now";

export type LineagePin = {
  year: LineageYear;
  title: string;
  summary: string;
  body: string;
  detailLabel: string;
};

export const LINEAGE: LineagePin[] = [
  {
    year: "2016",
    title: "Hodgkin–Huxley",
    summary:
      "Membranes as little RC circuits with voltage-dependent conductances.",
    detailLabel: "§ 2.1 · 2016",
    body:
      "<strong>Hodgkin–Huxley</strong> — the canonical model: membranes as RC circuits with voltage-dependent ion channels. Two coupled ODEs that, when you actually solve them on a computer at 19, leave a mark. The channel kinetics turn out to be most of the trick. Everything I built afterwards traced back to this one diagram.",
  },
  {
    year: "2017",
    title: "Memristors",
    summary:
      "Rain Neuromorphics, employee #5. Hand-soldered LIF neurons at 19.",
    detailLabel: "§ 2.2 · 2017 — Rain Neuromorphics",
    body:
      "Joined as employee #5. <strong>Memristive analog LIF neurons on PCBs</strong>, hand-assembled, debugged with a scope. The first time I saw a real spike trigger from physical hysteresis instead of a software loop. Still the cleanest lesson in letting the substrate do the math.",
  },
  {
    year: "2018",
    title: "Spiking nets",
    summary:
      "GTRI · Loihi/Kapoho Bay, neurons in VHDL, custom silicon, embedded ML.",
    detailLabel: "§ 2.3 · 2018 — GTRI",
    body:
      "<strong>Spiking nets on Intel Loihi.</strong> Host-side pipeline, core mapping, per-core spike-rate telemetry. Five years of neuromorphic + embedded ML — SNNs in VHDL for custom silicon, then the inevitable drift into CV/ML on Jetson when the program needed it. Two papers, one demo, a lot of debugging memory layouts at 2am.",
  },
  {
    year: "now",
    title: "Agents",
    summary:
      "Building agentic systems with an LLM in the loop. Day-job at GTRI — embedded ML / CV.",
    detailLabel: "§ 2.4 · now",
    body:
      "<strong>Agentic systems, with an LLM in the loop.</strong> What LLM agents can and can't do when you wire them into a real loop: trading, job pipelines, small private tools for friends. Day-job is still GTRI — embedded ML and computer vision. The bench section is the honest version of this pin.",
  },
];
