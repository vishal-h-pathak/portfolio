export type RoleMeta = { key: string; value: string };

export type Role = {
  start: string;
  end: string;
  title: string;
  org: string;
  location: string;
  current?: boolean;
  paragraphs: string[];
  meta: RoleMeta[];
};

export const EXPERIENCE: Role[] = [
  {
    start: "2018",
    end: "now",
    title: "Research Engineer",
    org: "Georgia Tech Research Institute",
    location: "Atlanta, GA",
    current: true,
    paragraphs: [
      "Started on Intel’s Loihi: deployed spiking neural networks via Kapoho Bay, wrote the host-side pipeline and core-mapping logic, built per-core spike-rate telemetry to diagnose the inevitable distribution mismatch between training and silicon. Authored leaky-integrate-and-fire neurons in VHDL for custom neuromorphic silicon.",
      "Branched into broader embedded ML / CV on Jetson and similar edge platforms when programs needed it — sensor pipelines, on-device inference, the usual integration work that makes a research demo behave like a system. Co-authored two papers and a demo across the neuromorphic stretch.",
      "Most recent stretch: more applied embedded ML and computer vision, plus quiet exploratory work on what LLM agents can and can’t do inside an experimental harness.",
    ],
    meta: [
      { key: "WORK", value: "Loihi · Kapoho Bay · VHDL · embedded ML · CV" },
      {
        key: "STACK",
        value: "Intel NxSDK · embedded C · VHDL · Python · Jetson",
      },
      { key: "OUTPUT", value: "2 papers · 1 demo" },
    ],
  },
  {
    start: "2017",
    end: "2018",
    title: "Hardware Engineer",
    org: "Rain Neuromorphics",
    location: "employee #5 · age 19",
    paragraphs: [
      "Joined as employee #5 at 19. Hand-assembled physical analog neuron circuits — memristive devices wired as LIF neurons on PCBs — and brought up the test rigs that drove them. The first time I held a working spike on a scope. Still the cleanest lesson I’ve had in how much physics a circuit will quietly do for you if you let it.",
    ],
    meta: [
      { key: "WORK", value: "Memristive LIF neurons · PCB bring-up" },
      { key: "STACK", value: "Memristive HW · KiCad · scope-driven debug" },
      { key: "TAG", value: "first job · age 19" },
    ],
  },
];
