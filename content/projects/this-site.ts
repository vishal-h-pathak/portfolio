import type { Project } from "./schema";

export const thisSite: Project = {
  num: "B-05",
  slug: "this-site",
  tier: "project",
  domain: "site",
  year: 2026,
  title: "This site",
  oneLiner: "the page you are reading",
  status: "shipped",
  statusLabel: "SHIPPED",
  repo: "vishal-h-pathak/portfolio",
  updated: "2026-06",
  paragraphs: [
    {
      text: "Designed in conversation with Claude across two committed directions, then synthesized into one: notebook column on the left, workshop rail on the right. Built the way the rest of the bench is built — a long evening of iteration with an LLM in the loop, until the layout felt like the work it’s describing.",
    },
  ],
  meta: [
    { key: "STACK", value: "Next 16 · React 19 · TypeScript" },
    { key: "URL", value: "you’re on it" },
    { key: "BUILD", value: "Solo · Claude · 4 days", build: true },
  ],
  actions: [],
};
