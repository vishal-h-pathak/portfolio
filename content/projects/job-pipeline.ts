import type { Project } from "./schema";

export const jobPipeline: Project = {
  num: "B-03",
  slug: "job-pipeline",
  tier: "project",
  domain: "agentic",
  year: 2026,
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
};
