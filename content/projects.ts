export type ProjectStatus = "live" | "wip" | "shipped";

export type ProjectMeta = {
  key: string;
  value: string;
  build?: boolean;
};

export type ProjectAction = {
  label: string;
  href: string;
  primary?: boolean;
};

export type ProjectParagraph = {
  text: string;
  dim?: boolean;
};

export type Project = {
  num: string;
  title: string;
  oneLiner: string;
  status: ProjectStatus;
  statusLabel: string;
  paragraphs: ProjectParagraph[];
  meta: ProjectMeta[];
  actions: ProjectAction[];
};

export const PROJECTS: Project[] = [
  {
    num: "B-01",
    title: "Meridian",
    oneLiner: "autonomous trading agent · paper portfolio · 14d cycles",
    status: "live",
    statusLabel: "LIVE · 14d",
    paragraphs: [
      {
        text: "Multi-brain LLM-driven trading harness — fundamentals, technicals, news, options flow, sentiment, event/macro — running a paper portfolio in 14-day cycles. Confluence radar collapses six signal types into a single grade per ticker; a reasoning view exposes the prompt chain that produced each decision.",
      },
      {
        text: "Currently running paper-only. The point is to study how the agents actually reason and disagree, not to claim a number.",
        dim: true,
      },
    ],
    meta: [
      { key: "STACK", value: "Next · Recharts · Supabase · Anthropic SDK" },
      { key: "SIGNALS", value: "6 brains, 1 grade" },
      { key: "MODE", value: "paper portfolio" },
      { key: "BUILD", value: "Solo · Claude · 6 wks", build: true },
    ],
    actions: [
      { label: "→ open meridian", href: "/meridian", primary: true },
      { label: "readme", href: "https://github.com/vishal-h-pathak/trading-agent" },
    ],
  },
  {
    num: "B-02",
    title: "Papercuts",
    oneLiner: "private reading club · papercuts.cc",
    status: "live",
    statusLabel: "LIVE · day 1",
    paragraphs: [
      {
        text: "A private site for my book club — ten friends, a book a cycle, one of us picks each round. Replaces a sprawl of Google Calendar + Drive folder + group chat with one place: magic-link auth, schedule, books index, audiobook streaming behind signed URLs.",
      },
      {
        text: "Stood up in a single sitting yesterday and shipped to the group the same night. The fun part wasn’t the code — it was watching how short the gap can be between “wouldn’t this be nice” and friends actually using it, when an LLM is doing the typing with you.",
        dim: true,
      },
    ],
    meta: [
      { key: "STACK", value: "Next · Supabase · signed URLs" },
      { key: "USERS", value: "10 · book club" },
      { key: "URL", value: "papercuts.cc" },
      { key: "BUILD", value: "Solo · Claude · 1 evening", build: true },
    ],
    actions: [
      {
        label: "→ open papercuts",
        href: "https://papercuts.cc",
        primary: true,
      },
    ],
  },
  {
    num: "B-03",
    title: "Job Pipeline",
    oneLiner: "hunt → tailor → submit · one pipeline",
    status: "wip",
    statusLabel: "WIP · v0",
    paragraphs: [
      {
        text: "One pipeline: hunt → tailor → submit. The hunter runs on a daily cron and surfaces roles I’d care about (filters defense / generic gov / mission-less); tailor drafts the materials per posting. The point is to learn agentic loops on something I’ll feel the cost of when they fail.",
      },
      {
        text: "Currently dogfooding. Every application goes through a dashboard cockpit where I review and hit submit myself — nothing auto-submits, on purpose.",
        dim: true,
      },
    ],
    meta: [
      { key: "STACK", value: "Python · LLM · scrapers" },
      { key: "STATUS", value: "WIP · v0 dogfood" },
      { key: "BUILD", value: "Solo · Claude · ongoing", build: true },
    ],
    actions: [
      {
        label: "readme",
        href: "https://github.com/vishal-h-pathak/job-pipeline",
      },
    ],
  },
  {
    num: "B-04",
    title: "Cellular Gaits",
    oneLiner: "a real fly connectome, run as a spiking brain, drives a real fly body",
    status: "shipped",
    statusLabel: "SHIPPED · v1",
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
  },
  {
    num: "B-05",
    title: "This site",
    oneLiner: "the page you are reading",
    status: "shipped",
    statusLabel: "SHIPPED",
    paragraphs: [
      {
        text: "Designed in conversation with Claude across two committed directions, then synthesized into one: notebook column on the left, workshop rail on the right. Built the way the rest of the bench is built — a long evening of iteration with an LLM in the loop, until the layout felt like the work it’s describing.",
      },
    ],
    meta: [
      { key: "STACK", value: "HTML · vanilla JS · taste" },
      { key: "URL", value: "you’re on it" },
      { key: "BUILD", value: "Solo · Claude · 4 days", build: true },
    ],
    actions: [],
  },
];
