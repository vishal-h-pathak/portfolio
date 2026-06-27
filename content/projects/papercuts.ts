import type { Project } from "./schema";

export const papercuts: Project = {
  num: "B-02",
  slug: "papercuts",
  tier: "project",
  domain: "social",
  year: 2026,
  title: "Papercuts",
  oneLiner: "private reading club · papercuts.cc",
  status: "live",
  statusLabel: "LIVE · day 1",
  repo: "vishal-h-pathak/papercuts-site",
  updated: "2026-06",
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
};
