import type { Project } from "./schema";

// B-01. VANE is the public paper-trading experiment: a rule-based, diversified
// equity book run on a paper account and measured against SPY total return
// from a recorded Day 0. Its live numbers come from the `site_export` row
// `vane` (app/lib/vane-export.ts); this entry is only the bench plate.
export const vane: Project = {
  num: "B-01",
  slug: "vane",
  tier: "project",
  domain: "trading",
  year: 2026,
  featured: true,
  title: "VANE",
  oneLiner: "a boring, rules-based paper portfolio · measured against SPY from Day 0",
  status: "wip",
  statusLabel: "PAPER",
  repo: "vishal-h-pathak/trading-agent",
  updated: "2026-11",
  paragraphs: [
    {
      text: "A mechanical, diversified equity strategy run on a paper account with a pre-registered rule set and a weekly minimum-activity requirement. The page shows the equity curve against SPY total return from a recorded Day 0, every position by tranche, and every trade, including the ones the trade floor forced.",
    },
    {
      text: "The research verdict and its evidence label are printed as published. If the data feed is stale or the export is malformed, the page says so instead of showing anything that looks live.",
      dim: true,
    },
  ],
  meta: [
    { key: "STACK", value: "Python engine · Alpaca paper · Supabase · Next" },
    { key: "BENCHMARK", value: "SPY total return from Day 0" },
    { key: "EVIDENCE", value: "labeled, negatives included" },
    { key: "SOURCE", value: "private (live trading system)" },
    { key: "BUILD", value: "Solo · Claude · greenfield", build: true },
  ],
  actions: [{ label: "→ see the portfolio", href: "/projects/vane", primary: true }],
};
