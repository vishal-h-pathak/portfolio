import type { Project } from "./schema";

export const meridian: Project = {
  num: "B-01",
  slug: "meridian",
  tier: "project",
  domain: "trading",
  year: 2026,
  featured: true,
  title: "Meridian",
  oneLiner: "autonomous trading agent · paper portfolio · 14d cycles",
  status: "live",
  statusLabel: "LIVE · 14d",
  repo: "vishal-h-pathak/trading-agent",
  updated: "2026-06",
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
};
