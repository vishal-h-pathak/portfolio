import type { Project } from "./schema";

export const fleetControlSystem: Project = {
  num: "B-06",
  slug: "fleet-control-system",
  tier: "project",
  domain: "tooling",
  year: 2026,
  featured: false,
  title: "Fleet Mission Control",
  oneLiner: "single pane of glass over every machine · realtime telemetry",
  summary:
    "A realtime control plane over all my machines — heartbeats, job status, and remote dispatch from any device.",
  status: "wip",
  statusLabel: "WIP",
  repo: "vishal-h-pathak/fleet-mission-control",
  updated: "2026-06",
  paragraphs: [
    {
      text: "Machines (Mac cockpit, the sentry workstation, phone, future nodes) push heartbeats and job status to a Supabase message bus — no inbound ports, everything sits behind Tailscale. A phone-responsive dashboard reads it in realtime: what's running everywhere, logs and metrics, and dispatch or steer work from any device, including the job's live remote-control session.",
    },
    {
      text: "P0 monitoring is live: the schema, a token-authed ingest function, and the reporter agent are deployed and validated against live data. The realtime dashboard is next; the control plane comes last, behind real auth.",
      dim: true,
    },
  ],
  meta: [
    { key: "STACK", value: "Node · Supabase (RLS · edge fns) · Tailscale · Next" },
    { key: "STATUS", value: "P0 live · dashboard WIP" },
    { key: "BUILD", value: "Solo · Claude · ongoing", build: true },
  ],
  actions: [
    { label: "readme", href: "https://github.com/vishal-h-pathak/fleet-mission-control" },
  ],
  builtWith: ["multi-machine-agents", "supabase"],
  links: { repo: "https://github.com/vishal-h-pathak/fleet-mission-control" },
};
