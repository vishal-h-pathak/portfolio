# Vishal Pathak — Agent Profile
Ground truth for all agents. Update this file as new information is gathered.

## Identity
EE background; **has been working in AI since 2017, and that throughline is the story.** It started in neuromorphic hardware and brain-inspired computing — the Hodgkin-Huxley model in college (ion channels as RC circuits scaling to cognition), then Rain Neuromorphics at 19 as employee #5 hand-building memristive LIF neuron PCBs, then four years at GTRI (SNN deployment on Intel Kapoho Bay, VHDL neuron modeling, and a steadily widening applied skillset: computer vision, embedded ML, real deployment). That arc — early-AI roots through a broad applied career — has brought him to where he is today: building tools across many domains with frontier agentic workflows, and trying to learn as much as he can about these tools to stay ahead as AI advancement accelerates.

Neuromorphics/SNNs are now **the depth that explains how he thinks (systems, emergence), not the pitch.** The present-tense identity is *agentic builder*.

## Current interest (the thread the portfolio should convey)
> In his words: "I want a new job that lets me continue doing what I've been doing: using frontier agentic workflows to build tools for whomever needs them."

That present-tense interest — agentic builder, learning these tools to stay ahead as AI accelerates — is what the portfolio exists to convey.

> **Job-search targeting lives elsewhere.** Role tiers, compensation, disqualifiers, and application-form defaults are owned by the **`job-pipeline`** project — canonically in `profile/profile.yml` (with `job-pipeline/CLAUDE.md` as its prose mirror). Don't duplicate hiring criteria here; this file is about who he is and what the site presents. (Note for agents: earlier in the 2026 search the priority was neuroscience/neuromorphic roles; as of mid-2026 that flipped to agentic-workflow / frontier-model work. Treat neuro as origin and depth, not the headline.)

## How he works
Good communicator, creative problem-solver, works best with clear direction and a compelling reason to solve the problem. Self-aware about needing external structure to stay focused. Strong once pointed at something.

## Key technical skills
**Agentic / current:** frontier agentic workflows for building real tools end-to-end (the portfolio itself, Meridian trading telemetry, Cellular Gaits, the job pipeline, Papercuts), multi-machine agent orchestration, LLM app plumbing (Anthropic SDK, Supabase, Next.js/React).
**Applied ML/CV & embedded (GTRI breadth):** RT-DETRv2, PyTorch, TensorFlow, HPC training, embedded ML (Jetson Orin), real-world CV deployment.
**Neuromorphic / hardware (roots):** VHDL SNN implementation, Intel Kapoho Bay, memristive hardware, DNN→SNN conversion, FlyGym, MuJoCo, Brian2, Gymnasium API, PCB design (EagleCAD/Altium), C++, Python.
> The full breadth of the GTRI skillset is documented in files within the `portfolio` and `job-pipeline` projects — pull from those when detailing experience rather than relying on this summary alone.

## Portfolio goal
vishal.pa.thak.io should showcase **one thing: him.** A visitor should come away understanding (1) his interests, (2) the jobs and path that got him here — AI since 2017, neuromorphics → GTRI → agentic building, (3) the wide skillset built over the GTRI years, and (4) the new agentic work he's doing now. The organizing throughline is *"working in AI since 2017 brought me here,"* with the present-tense identity being an agentic builder of tools across domains. Neuromorphics is the deep origin discovered one layer in, not the front door. The diverse project set (bio-sim, trading, a book club, job tooling) is an asset, not sprawl — it's the evidence for "tools for whomever needs them." Prioritize personality and genuine content over polish; it should not read as a generated candidate page.

## Personal
From Cape Canaveral, FL. Moved to Atlanta April 2022. Runs a book club (papercuts.cc). Into cooking, audiobooks, agentic AI projects.

## Cross-machine workflow (two machines: MAC cockpit + WIN 5900X/3080Ti compute)
This project runs across two machines, either of which can do either role. Before any work:
- **Read `docs/cellular-gaits/SYNC.md` FIRST** (live state: what's running where, branch claims, next actions). Update it last and commit it with your work.
- **Pull at session start, commit + push at session stop.** Never leave uncommitted work when switching machines.
- **One branch is advanced from one machine at a time** — claim it in SYNC.md before starting.
- Only small things cross git (code, docs, web-export bundles); `checkpoints/`/`outputs/`/`.venv/` stay local (gitignored). Heavy compute runs on WIN.
- Full protocol + one-time setup (Tailscale/SSH, W&B): `docs/cellular-gaits/CROSS_MACHINE.md`.
