import type { Project } from "./schema";

// B-01 was MERIDIAN (the 5-specialist LLM trading harness). SOLITON is its
// replacement after the honest review — the plate number carries over, the
// architecture didn't. Old links: /meridian and /console/meridian both
// redirect to /projects/soliton (next.config.ts).
export const soliton: Project = {
  num: "B-01",
  slug: "soliton",
  tier: "project",
  domain: "trading",
  year: 2026,
  featured: true,
  title: "Soliton",
  oneLiner: "can the most advanced available model trade? · public paper race",
  status: "live",
  statusLabel: "LIVE · paper",
  repo: "vishal-h-pathak/trading-agent",
  updated: "2026-07",
  paragraphs: [
    {
      text: "Systematic rebuild of the old MERIDIAN trading agent, which produced one trade in two months and a lot of expensive reasoning. This time every strategy is a pre-registered mechanical rule set, backtested first — verdict: no edge survived real-chain friction, published anyway — and the experiment on top is the point: two paper accounts run by Fable over an API, raced in public against the mechanical control, a dynamical-state overlay, and SPY buy-and-hold.",
    },
    {
      text: "Every decision journaled verbatim, evidence status printed honestly on each track. Paper money throughout — success means beating the controls over 100+ logged trades, not being up in week one.",
      dim: true,
    },
  ],
  meta: [
    { key: "STACK", value: "Python engine · Alpaca paper · Supabase · Next" },
    { key: "TRACKS", value: "2 Fable + 3 reference lines" },
    { key: "EVIDENCE", value: "labeled per track, negatives included" },
    { key: "BUILD", value: "Solo · Claude · greenfield rebuild", build: true },
  ],
  actions: [
    { label: "→ watch the race", href: "/projects/soliton", primary: true },
    { label: "readme", href: "https://github.com/vishal-h-pathak/trading-agent" },
  ],
};
