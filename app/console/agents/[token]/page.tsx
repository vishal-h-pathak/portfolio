"use client";

import { useState } from "react";
import { Pill } from "../../components/Pill";

// ── Agent Definitions ─────────────────────────────────────────────────────
// This is the source of truth for how each agent is configured to operate.
// Update this when you change an agent's scheduler, interval, or dependencies.

interface AgentScheduleJob {
  name: string;
  interval: string;
  note?: string;
}

interface AgentDependency {
  name: string;
  envVar?: string;
  required: boolean;
}

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  entryPoint: string;
  dir: string;
  scheduler: "apscheduler" | "manual" | "external";
  schedulerNote: string;
  jobs: AgentScheduleJob[];
  dependencies: AgentDependency[];
  processManagement: string;
  howToStart: string;
  howToStop: string;
  howToCheck: string;
  concerns: string[];
}

const AGENTS: AgentConfig[] = [
  {
    id: "meridian",
    name: "MERIDIAN",
    description:
      "5-specialist trading agent. Ingests geopolitical news and market data, runs multi-agent deliberation, generates BUY/HOLD/SELL decisions. Paper trading only via Alpaca.",
    entryPoint: "main.py",
    dir: "~/dev/jarvis/trading-agent",
    scheduler: "apscheduler",
    schedulerNote:
      "APScheduler (BlockingScheduler) runs inside the process. Once started, it manages all job timing internally.",
    jobs: [
      {
        name: "Ingestion cycle",
        interval: "15 min (market hours) / 45 min (after-hours) / 90 min (weekends)",
        note: "Adaptive — runs more frequently when markets are open",
      },
      {
        name: "Fallback decision",
        interval: "Every 3 hours",
        note: "Fires if market is open and >3h since last decision cycle",
      },
      {
        name: "Morning briefing",
        interval: "9:00 AM ET, Mon–Fri",
        note: "Generates daily market briefing, no trades",
      },
      {
        name: "EOD review",
        interval: "3:30 PM ET, Mon–Fri",
        note: "End-of-day position review, close_only=True",
      },
      {
        name: "Stop loss check",
        interval: "Every 5 min (market hours)",
      },
      {
        name: "Geo synthesizer",
        interval: "Every 4 hours",
        note: "Synthesizes geopolitical situation across all themes",
      },
      {
        name: "Ingest watchdog",
        interval: "Every 10 min",
        note: "Enforces ingestion SLA — alerts if data pipeline stalls",
      },
      {
        name: "Calendar refresh",
        interval: "Sundays 8:00 AM ET",
      },
      {
        name: "Hit tracker",
        interval: "4:15 PM ET, Mon–Fri",
      },
    ],
    dependencies: [
      { name: "Anthropic API", envVar: "ANTHROPIC_API_KEY", required: true },
      { name: "Alpaca (Paper)", envVar: "ALPACA_PAPER_API_KEY", required: true },
      { name: "Alpaca Secret", envVar: "ALPACA_PAPER_SECRET_KEY", required: true },
      { name: "Pushover", envVar: "PUSHOVER_USER_KEY", required: false },
      { name: "ChromaDB", required: true },
    ],
    processManagement:
      "File-based lock at logs/cycle_running.lock with 10-minute auto-expiration. PID file at logs/logs/agent_process.pid.",
    howToStart: "cd ~/dev/jarvis/trading-agent && python main.py",
    howToStop: "Kill the python process (check PID file) or Ctrl+C",
    howToCheck:
      "cat logs/logs/status.json — check last_updated timestamp. If >4h old during market hours, the agent is likely down.",
    concerns: [
      "Agent went dormant April 1–8 with no explanation — scheduler or process may have crashed",
      "All 4 BUY signals show executed=false — Alpaca order submission may be broken",
      "APEX subsystem has never been started (no logs directory exists)",
    ],
  },
  {
    id: "job-applicant",
    name: "Job Applicant",
    description:
      "Picks up approved jobs from Supabase, tailors resume and cover letter using Claude + voice profile, generates LaTeX PDF resume, queues for human review before Playwright submission.",
    entryPoint: "main.py",
    dir: "~/dev/jarvis/job-applicant",
    scheduler: "manual",
    schedulerNote:
      "No internal scheduler. The polling loop was intentionally removed to prevent unattended API usage. Must be triggered externally.",
    jobs: [
      {
        name: "Process approved jobs",
        interval: "On demand (python main.py)",
        note: "Tailors materials for jobs with status='approved'",
      },
      {
        name: "Submit confirmed jobs",
        interval: "On demand (python main.py)",
        note: "Historical: submitted applications the human had confirmed in the dashboard. Decommissioned with the legacy repos — the jobpipe submit flow (pre-fill + human submit) replaced it, and the status it polled was retired by migration 011.",
      },
    ],
    dependencies: [
      { name: "Anthropic API", envVar: "ANTHROPIC_API_KEY", required: true },
      { name: "Supabase", envVar: "SUPABASE_URL", required: true },
      { name: "Supabase Key", envVar: "SUPABASE_KEY", required: true },
      { name: "pdflatex", required: true },
      { name: "Playwright (for form filling)", required: false },
    ],
    processManagement: "None — stateless single-run model. Exits after one cycle.",
    howToStart: "cd ~/dev/jarvis/job-applicant && python main.py",
    howToStop: "N/A — exits on its own",
    howToCheck: "python main.py --status  (prints job counts by pipeline status)",
    concerns: [
      "Needs external scheduling (cron or Cowork task) to run periodically",
      "POLL_INTERVAL_MINUTES=120 is configured but not enforced — it's just a config value now",
      "Playwright applicants not yet built for any ATS besides generic",
    ],
  },
  {
    id: "job-hunter",
    name: "Job Hunter",
    description:
      "Discovers job postings from Indeed, RemoteOK, SerpAPI, and WellFound. Scores each against candidate profile. Writes new jobs to Supabase with status='new'.",
    entryPoint: "job_agent.py (via run_agent.sh)",
    dir: "~/dev/jarvis/job-hunter",
    scheduler: "external",
    schedulerNote:
      "No internal scheduler. Uses run_agent.sh shell script wrapper. Requires cron or external task to run periodically.",
    jobs: [
      {
        name: "Discovery + scoring cycle",
        interval: "On demand (bash run_agent.sh)",
        note: "Fetches from all sources, scores, writes to Supabase",
      },
    ],
    dependencies: [
      { name: "Anthropic API", envVar: "ANTHROPIC_API_KEY", required: true },
      { name: "Supabase", envVar: "SUPABASE_URL", required: true },
      { name: "Supabase Key", envVar: "SUPABASE_KEY", required: true },
      { name: "SerpAPI", envVar: "SERPAPI_KEY", required: true },
      { name: "Resend (email)", envVar: "RESEND_API_KEY", required: false },
    ],
    processManagement:
      "Stateless per-run. Tracks seen jobs in seen_jobs.json to avoid duplicates. Logs to agent.log.",
    howToStart: "cd ~/dev/jarvis/job-hunter && bash run_agent.sh",
    howToStop: "N/A — exits on its own",
    howToCheck: "tail -5 agent.log — check last run timestamp",
    concerns: [
      "No scheduled runs configured — must be run manually or via cron",
      "seen_jobs.json grows unbounded — may need periodic cleanup",
      "SerpAPI has rate limits that could throttle discovery",
    ],
  },
];

// ── Components ────────────────────────────────────────────────────────────

const SCHEDULER_TONE = {
  apscheduler: "live",
  manual: "attention",
  external: "failed",
} as const;

const SCHEDULER_LABEL: Record<AgentConfig["scheduler"], string> = {
  apscheduler: "Self-scheduling",
  manual: "Manual trigger",
  external: "Needs cron/task",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 font-mono text-[10px] uppercase tracking-kicker text-ink-faint">
      {children}
    </div>
  );
}

function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <code className="block border border-rule bg-bg px-2 py-1 text-xs leading-relaxed text-ink-dim">
      {children}
    </code>
  );
}

function AgentCard({ agent }: { agent: AgentConfig }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-rule bg-bg-raised">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full p-5 text-left transition-colors duration-150 hover:bg-bg-card"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-ink">{agent.name}</h3>
            <Pill tone={SCHEDULER_TONE[agent.scheduler]}>
              {SCHEDULER_LABEL[agent.scheduler]}
            </Pill>
          </div>
          <span className="text-sm text-ink-faint">{expanded ? "−" : "+"}</span>
        </div>
        <p className="text-sm leading-relaxed text-ink-dim">{agent.description}</p>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-rule px-5 pb-5 pt-4">
          {/* Quick reference */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <SectionLabel>Entry point</SectionLabel>
              <CodeChip>{agent.entryPoint}</CodeChip>
            </div>
            <div>
              <SectionLabel>Directory</SectionLabel>
              <CodeChip>{agent.dir}</CodeChip>
            </div>
          </div>

          {/* Scheduler info */}
          <div>
            <SectionLabel>Scheduling</SectionLabel>
            <p className="mb-3 text-xs text-ink-dim">{agent.schedulerNote}</p>

            <div className="space-y-1.5">
              {agent.jobs.map((job, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1 border border-rule-soft bg-bg px-3 py-2 text-xs sm:flex-row sm:items-start sm:gap-3"
                >
                  <span className="font-medium text-ink sm:min-w-[140px] sm:shrink-0">
                    {job.name}
                  </span>
                  <span className="font-mono text-ink-dim">{job.interval}</span>
                  {job.note && (
                    <span className="text-ink-faint sm:ml-auto">{job.note}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <SectionLabel>Dependencies</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {agent.dependencies.map((dep, i) => (
                <span
                  key={i}
                  className={
                    "border px-2 py-1 font-mono text-xs " +
                    (dep.required
                      ? "border-rule text-ink-dim"
                      : "border-dashed border-rule text-ink-faint")
                  }
                  title={dep.envVar ? `env: ${dep.envVar}` : undefined}
                >
                  {dep.name}
                  {dep.envVar && (
                    <span className="ml-1 text-[10px] text-ink-faint">
                      ({dep.envVar})
                    </span>
                  )}
                  {!dep.required && <span className="ml-1 text-ink-faint">optional</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Operations */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Start", value: agent.howToStart },
              { label: "Stop", value: agent.howToStop },
              { label: "Check status", value: agent.howToCheck },
            ].map((op) => (
              <div key={op.label}>
                <SectionLabel>{op.label}</SectionLabel>
                <CodeChip>{op.value}</CodeChip>
              </div>
            ))}
          </div>

          {/* Process management */}
          <div>
            <SectionLabel>Process management</SectionLabel>
            <p className="text-xs text-ink-dim">{agent.processManagement}</p>
          </div>

          {/* Concerns */}
          {agent.concerns.length > 0 && (
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-kicker text-amber">
                Known issues / concerns
              </div>
              <div className="space-y-1.5">
                {agent.concerns.map((c, i) => (
                  <p
                    key={i}
                    className="relative pl-3 text-xs text-amber before:absolute before:left-0 before:content-['!']"
                  >
                    {c}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

/**
 * Agent runbooks — how each background agent is configured to operate.
 * Middleware already gates the whole /console/** surface (DASHBOARD_PASSWORD),
 * so this page carries no auth of its own; the [token] path segment is
 * vanity-only (kept so existing bookmarked runbook links don't 404).
 */
export default function AgentStatusPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-kicker text-ink-faint">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green" />
          Agent runbooks
        </div>
        <h1 className="mt-3 font-serif text-2xl tracking-tight text-ink">
          Operational status
        </h1>
        <p className="mt-2 max-w-prose text-sm text-ink-dim">
          How each agent is configured to run. Update the AGENTS array in
          this file when you change an agent&apos;s setup.
        </p>
      </header>

      {/* Quick status grid */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((agent) => (
          <div key={agent.id} className="border border-rule bg-bg-raised p-3">
            <div className="mb-1 font-mono text-xs text-ink-dim">{agent.name}</div>
            <Pill tone={SCHEDULER_TONE[agent.scheduler]}>
              {SCHEDULER_LABEL[agent.scheduler]}
            </Pill>
            <div className="mt-2 text-[11px] text-ink-faint">
              {agent.jobs.length} job{agent.jobs.length !== 1 ? "s" : ""} configured
            </div>
          </div>
        ))}
      </div>

      {/* Agent cards */}
      <div className="space-y-4">
        {AGENTS.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      <div className="mt-12 border-t border-rule-soft pt-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-kicker text-ink-faint">
          This page is only accessible via the console auth gate
        </p>
      </div>
    </main>
  );
}
