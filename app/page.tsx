"use client";

import { useState } from "react";

// ── Navigation ────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "about", label: "About" },
  { id: "resume", label: "Resume" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
  { id: "pages", label: "Pages" },
];

function Nav({
  active,
  onNav,
}: {
  active: string;
  onNav: (id: string) => void;
}) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-sm border-b border-neutral-900">
      <div className="mx-auto max-w-3xl px-6 flex items-center justify-between h-12">
        <button
          onClick={() => onNav("about")}
          className="font-mono text-xs tracking-widest text-neutral-400 hover:text-neutral-100 transition-colors"
        >
          VP
        </button>
        <div className="flex gap-6">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`font-mono text-xs tracking-wider transition-colors ${
                active === item.id
                  ? "text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ── About Section ─────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <section id="about" className="mb-32">
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-6">
        Vishal Pathak · Atlanta, GA
      </p>
      <p className="text-neutral-300 mb-8 text-[15px] leading-relaxed">
        I work in AI hardware. This site is a hub for my professional
        experience and the projects I&apos;ve been building — most of which
        use AI to extend what one person can do.
      </p>

      <div className="border-l-2 border-neutral-800 pl-5 space-y-6 text-neutral-300 text-[15px] leading-relaxed">
        <p>
          In an undergraduate course in Bioelectrical Systems, I learned that
          a neuron&apos;s membrane is basically a little RC circuit with some
          voltage-dependent conductances: ion channels opening and closing,
          capacitance charging, a spike falling out of the math. Having just
          finished my circuits courses, I was completely captured learning
          about Hodgkin and Huxley and their pioneering experiments. Since
          then, I&apos;ve been enamored with anything that involves modeling
          brain behavior using circuitry and physical devices.
        </p>
        <p>
          My professional journey began with{" "}
          <span className="text-neutral-100">Rain Neuromorphics</span>,
          building physical analog neuron circuits using memristive devices
          wired as leaky-integrate-and-fire neurons on hand-assembled PCBs.
        </p>
        <p>
          That work led to four years at{" "}
          <span className="text-neutral-100">GTRI</span>, where I deployed
          spiking neural networks on Intel&apos;s Loihi hardware, modeled
          neurons in VHDL for custom silicon, and eventually moved into
          broader computer vision and embedded ML on Jetson.
        </p>
        <p>
          Now I&apos;m working on connectomics and embodied simulation,
          and building autonomous AI agents as a way to learn the tooling
          from the inside.
        </p>
      </div>
    </section>
  );
}

// ── Resume Section ────────────────────────────────────────────────────────

const SKILLS = {
  "Neuromorphic & Hardware": [
    "Intel Loihi / Kapoho Bay",
    "VHDL / RTL design",
    "Memristive devices",
    "PCB design (EagleCAD / Altium)",
    "SNN conversion pipelines",
    "Fixed-point arithmetic",
    "RS-232 / RS-485 serial",
  ],
  "ML & Computer Vision": [
    "PyTorch / TensorFlow",
    "TensorRT / ONNX",
    "RT-DETR / YOLO",
    "Jetson Orin / AGX",
    "HPC training pipelines",
    "Edge deployment",
    "AFSIM surrogate models",
  ],
  "Neuroscience & Simulation": [
    "Brian2 / NEST",
    "MuJoCo / FlyGym",
    "Hodgkin-Huxley models",
    "Connectomics (FlyWire)",
    "Gymnasium / RL",
    "Spike-train analysis",
  ],
  "Software & Infrastructure": [
    "Python / TypeScript",
    "Next.js / React",
    "Supabase / PostgreSQL",
    "Claude API / LLM tooling",
    "PyQt6 desktop GUIs",
    "Docker / Linux",
    "Git / CI-CD",
  ],
};

const EXPERIENCE = [
  {
    title: "Algorithms & Analysis Engineer",
    org: "Georgia Tech Research Institute (GTRI)",
    period: "2021 – Present",
    bullets: [
      "SPARSE (2021–2024): Developed VHDL models of CUBA and LIF neurons matching Intel LavaSDK behavior for simulation-to-FPGA deployment. Deployed and benchmarked spiking networks on Intel Kapoho Bay. Built DNN→SNN conversion pipeline using backpropagation in the spiking regime for overhead imagery and radar processing. Trained models on ICEHAMMER HPC cluster.",
      "360-SA (2023–Present): Established pytest-based test suite on HPC covering KITTI data ingestion, object detection, and tracking pipeline validation. Designed Jacamar-CI pipeline for automated build/test/deploy on vehicle-mounted 360° camera systems. Engineered hardware fix using TI SD384EVK board for impedance mismatch between cameras and Wolf Orin platform. Built a custom frame grabber for HGH's Spynel MWIR panoramic thermal camera so it could feed into the rest of the vision pipeline. Ported the operator GUI from tkinter to PyQt6 with collapsible/movable sub-windows and individually selectable elements.",
      "HACS (2024): Managed full lifecycle of custom thermal control PCB — hand-populated 0402 components on milled EagleCAD boards. Wrote C++ firmware for STM32 to control thermal switches and stream status over raw UDP/TCP.",
      "GREMLIN (2023): Selected model architectures for post-processing MWIR video. Designed annotation-repair algorithm that re-labels mis-detections by running data through trained models and performing similarity comparison between detections.",
      "ENFIRE (2024–Present): Assembled rugged portable sensor enclosure housing Jetson Orin, Ouster LiDAR, DAGR receiver, power pack, and network switch. Conducted campus-scale SLAM and point-cloud mapping tests.",
      "DRAGON (2024): Implemented Chrony time synchronization across multi-drone swarm and profiled system resilience under simulated network disruptions.",
      "PAAM (2024): Built visualizations and surrogate models for high-dimensional AFSIM simulation data to support exploratory analysis and faster parameter sweeps than re-running the full simulation.",
      "SHELAC (Nov 2025–Present): Deployed two weather stations and three anemometers along the northern edge of the building roof, running ruggedized Ethernet and serial cabling through a roof hatch into the LIDAR lab. Sourced all cable stock, connectors, and converters, then bench-tested everything with a coworker before on-roof install. Converted the Young sonic anemometer from RS-232 to RS-485 with an in-line converter to preserve signal integrity across the long cable run.",
    ],
  },
  {
    title: "Electrical Engineering Intern",
    org: "Rain Neuromorphics",
    period: "2017 – 2018",
    bullets: [
      "Designed and tested FPGA-based measurement system with Altera FPGA communicating with Arduino interface for characterizing in-house memristive devices",
      "Developed and manufactured PCB in EAGLE to house 40 leaky integrate-and-fire neurons, integrating measurement system circuitry",
      "Analyzed spiking behavior data output from measurement system to benchmark MNIST dataset performance on neuromorphic hardware",
    ],
  },
];

const EDUCATION = [
  {
    degree: "B.S. Electrical Engineering, cum laude",
    school: "Florida Institute of Technology",
    period: "2019 – 2021",
    note: "",
  },
];

function ResumeSection() {
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  return (
    <section id="resume" className="mb-32">
      <h2 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-10">
        Resume
      </h2>

      {/* Skills grid */}
      <div className="grid grid-cols-2 gap-4 mb-14">
        {Object.entries(SKILLS).map(([category, skills]) => (
          <button
            key={category}
            onClick={() =>
              setExpandedSkill(expandedSkill === category ? null : category)
            }
            className="text-left bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors"
          >
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-neutral-400 mb-3">
              {category}
            </h4>
            {expandedSkill === category ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="text-xs bg-neutral-800 text-neutral-300 px-2 py-1 rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                {skills.slice(0, 3).join(" · ")} …
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Experience */}
      <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-6">
        Experience
      </h3>
      <div className="space-y-10 mb-14">
        {EXPERIENCE.map((exp) => (
          <div key={exp.org} className="relative pl-5 border-l border-neutral-800">
            <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-700" />
            <div className="flex items-baseline justify-between mb-1">
              <h4 className="text-neutral-100 text-[15px]">{exp.title}</h4>
              <span className="font-mono text-xs text-neutral-500 ml-4 shrink-0">
                {exp.period}
              </span>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-3">
              {exp.org}
            </p>
            <ul className="space-y-2">
              {exp.bullets.map((b, i) => (
                <li
                  key={i}
                  className="text-neutral-400 text-[13px] leading-relaxed pl-4 relative before:content-['–'] before:absolute before:left-0 before:text-neutral-600"
                >
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Education */}
      <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-6">
        Education
      </h3>
      {EDUCATION.map((ed) => (
        <div key={ed.school} className="pl-5 border-l border-neutral-800 relative">
          <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-700" />
          <div className="flex items-baseline justify-between mb-1">
            <h4 className="text-neutral-100 text-[14px]">{ed.degree}</h4>
            <span className="font-mono text-xs text-neutral-500 ml-4 shrink-0">
              {ed.period}
            </span>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-1">
            {ed.school}
          </p>
          {ed.note && (
            <p className="text-neutral-500 text-xs">{ed.note}</p>
          )}
        </div>
      ))}
    </section>
  );
}

// ── Projects Section ──────────────────────────────────────────────────────

type ProjectId = "meridian" | "connectome" | "jobpipeline" | null;

const PROJECTS = [
  {
    id: "meridian" as const,
    title: "MERIDIAN",
    tagline: "Autonomous trading agent",
    tech: "Python · Claude API · ChromaDB · Alpaca · APScheduler",
    summary:
      "A five-specialist AI pipeline that ingests geopolitical news, semiconductor supply chain data, and market signals to generate trading decisions. Each cycle runs a full deliberation: news synthesis, sentiment analysis, geopolitical assessment, bull/bear research, then a dual-brain fusion of quantitative scoring and narrative reasoning.",
    details: {
      architecture: [
        "NewsSynthesizer — aggregates 14 data sources (Reuters, Yahoo Finance, Seeking Alpha, etc.) into thematic briefs",
        "SentimentAnalyst — scores institutional options flow and retail sentiment per ticker",
        "GeoAnalyst — maintains a persistent geopolitical situation model across two macro themes (semiconductors/Taiwan and Iran/Hormuz)",
        "BullResearcher + BearResearcher — adversarial pair that argues both sides of every potential trade",
        "ConfluenceScorer — quantitative brain that grades setups on RSI, Z-score, momentum, IV rank, and volume",
        "NARRATIVE_OVERRIDE — allows the narrative engine to bypass weak quant scores when geopolitical conviction is high",
      ],
      audit: {
        period: "March 29 – April 9, 2026 (10 days)",
        decisions: 17,
        buySignals: 4,
        executed: 0,
        briefings: 14,
        ragDocs: 325,
        themes: ["Semiconductor supply chain disruption", "Iran/Hormuz oil supply shock"],
        hindsight:
          "Agent correctly identified INTC (+36.6%) and MU (+26.5%) as opportunities. NVDA BUY signals would have returned +5-6%. XOM BUY was correctly flagged as overbought by quant signals but overridden by narrative — lost 9.5%.",
      },
    },
  },
  {
    id: "connectome" as const,
    title: "Connectome Fly",
    tagline: "Embodied neural simulation",
    tech: "Python · Brian2 · MuJoCo · FlyGym · Gymnasium",
    summary:
      "Using a connectome-derived spiking neural network to drive locomotion in a simulated Drosophila. The goal is to see how close you can get to real fly behavior using the real wiring — FlyGym on top of MuJoCo for the body, Brian2 for the spiking network, Gymnasium wrapping it all together.",
    details: {
      architecture: [
        "FlyWire connectome data → Brian2 spiking network topology",
        "Brian2 LIF neurons with biologically-derived synaptic weights",
        "MuJoCo physics simulation via FlyGym for body dynamics",
        "Gymnasium RL interface for training and evaluation",
        "Spike-train analysis pipeline for comparing simulated vs. real fly neural recordings",
      ],
      audit: null,
    },
  },
  {
    id: "jobpipeline" as const,
    title: "Job Pipeline",
    tagline: "AI-powered application system",
    tech: "Python · TypeScript · Next.js · Supabase · Claude API · Playwright",
    summary:
      "A three-agent pipeline that discovers relevant job postings, scores and surfaces them for review, then tailors resumes and cover letters in my voice for approved applications. Includes a swipe-to-approve dashboard and a review panel for inspecting generated materials before submission.",
    details: {
      architecture: [
        "job-hunter — discovers and scores postings against a candidate profile, writes to Supabase",
        "Portfolio dashboard — swipe/browse interface for reviewing and approving jobs",
        "job-applicant — generates tailored resume modifications and cover letters using voice profile, queues for human review before Playwright submission",
        "Status lifecycle: new → approved → preparing → ready_to_submit → submit_confirmed → applied",
      ],
      audit: null,
    },
  },
];

function ProjectCard({
  project,
  isExpanded,
  onToggle,
}: {
  project: (typeof PROJECTS)[0];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`border rounded-lg transition-all duration-200 ${
        isExpanded
          ? "border-neutral-700 bg-neutral-900/70"
          : "border-neutral-800 bg-neutral-900/30 hover:border-neutral-700"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-5"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-neutral-100 text-[15px] font-medium">
            {project.title}
          </h3>
          <span className="font-mono text-[11px] text-neutral-500">
            {project.tagline}
          </span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 mb-3">
          {project.tech}
        </p>
        <p className="text-neutral-400 text-[13px] leading-relaxed">
          {project.summary}
        </p>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-neutral-800 pt-4">
          <h4 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-3">
            Architecture
          </h4>
          <div className="space-y-2 mb-4">
            {project.details.architecture.map((item, i) => (
              <p
                key={i}
                className="text-neutral-400 text-[12px] leading-relaxed pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-neutral-600"
              >
                {item}
              </p>
            ))}
          </div>

          {project.details.audit && (
            <>
              <h4 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-3 mt-5">
                10-Day Audit
              </h4>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-neutral-800/50 rounded p-2.5">
                  <div className="font-mono text-lg text-neutral-100">
                    {project.details.audit.decisions}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase">
                    Decisions
                  </div>
                </div>
                <div className="bg-neutral-800/50 rounded p-2.5">
                  <div className="font-mono text-lg text-emerald-400">
                    {project.details.audit.buySignals}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase">
                    Buy signals
                  </div>
                </div>
                <div className="bg-neutral-800/50 rounded p-2.5">
                  <div className="font-mono text-lg text-neutral-100">
                    {project.details.audit.briefings}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase">
                    Briefings
                  </div>
                </div>
                <div className="bg-neutral-800/50 rounded p-2.5">
                  <div className="font-mono text-lg text-neutral-100">
                    {project.details.audit.ragDocs}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase">
                    RAG docs
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  Themes tracked:{" "}
                </span>
                {project.details.audit.themes.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded mr-2"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-neutral-400 text-[12px] leading-relaxed">
                {project.details.audit.hindsight}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectsSection() {
  const [expanded, setExpanded] = useState<ProjectId>(null);

  return (
    <section id="projects" className="mb-32">
      <h2 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-10">
        Projects
      </h2>
      <div className="space-y-4">
        {PROJECTS.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isExpanded={expanded === project.id}
            onToggle={() =>
              setExpanded(expanded === project.id ? null : project.id)
            }
          />
        ))}
      </div>
    </section>
  );
}

// ── Contact Section ───────────────────────────────────────────────────────

function ContactSection() {
  return (
    <section id="contact" className="mb-16">
      <h2 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-6">
        Contact
      </h2>
      <div className="space-y-3">
        <a
          href="mailto:vishalp@thak.io"
          className="block text-neutral-200 underline decoration-neutral-700 underline-offset-4 hover:decoration-neutral-300 transition-colors"
        >
          vishalp@thak.io
        </a>
        <p className="text-neutral-500 text-[13px]">
          Atlanta-based, remote-friendly, open to relocating for the right thing.
        </p>
      </div>
    </section>
  );
}

// ── Pages Section ────────────────────────────────────────────────────

const SITE_PAGES = [
  {
    title: "MERIDIAN Visualizations",
    href: "/meridian",
    description: "Decision timeline, quantitative signals, geopolitical trajectory, and performance tracking from the trading agent.",
  },
  {
    title: "Job Dashboard",
    href: "/dashboard",
    description: "Browse, review, and approve job listings surfaced by the hunter agent.",
  },
  {
    title: "Agent Status",
    href: "/agents/jarvis-status-2026",
    description: "Operational status for all running agents — scheduling, dependencies, known issues.",
  },
];

function PagesSection() {
  return (
    <section id="pages" className="mb-32">
      <h2 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-10">
        Pages
      </h2>
      <div className="space-y-3">
        {SITE_PAGES.map((page) => (
          <a
            key={page.href}
            href={page.href}
            className="block border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 hover:bg-neutral-900/50 transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-neutral-200 text-[14px]">{page.title}</h3>
              <span className="font-mono text-[11px] text-neutral-600">→</span>
            </div>
            <p className="text-neutral-500 text-[12px]">{page.description}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeSection, setActiveSection] = useState("about");

  const handleNav = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <Nav active={activeSection} onNav={handleNav} />
      <main className="mx-auto max-w-3xl px-6 pt-24 pb-16 text-[15px] leading-relaxed">
        <AboutSection />
        <ResumeSection />
        <ProjectsSection />
        <ContactSection />
        <PagesSection />

        <div className="border-t border-neutral-900 pt-6 text-center">
          <p className="font-mono text-[10px] text-neutral-700 uppercase tracking-widest">
            Built with Next.js · Deployed on Vercel
          </p>
        </div>
      </main>
    </>
  );
}
