"use client";

import { use, useState, useEffect } from "react";

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
        note: "Submits applications for jobs with status='submit_confirmed'",
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

// ── Token Validation ──────────────────────────────────────────────────────

const VALID_TOKEN = process.env.NEXT_PUBLIC_AGENT_STATUS_TOKEN || "jarvis-status-2026";

// ── Components ────────────────────────────────────────────────────────────

function StatusBadge({ scheduler }: { scheduler: string }) {
  const colors: Record<string, string> = {
    apscheduler: "bg-emerald-900 text-emerald-300 border-emerald-700",
    manual: "bg-amber-900 text-amber-300 border-amber-700",
    external: "bg-red-900 text-red-300 border-red-700",
  };
  const labels: Record<string, string> = {
    apscheduler: "Self-scheduling",
    manual: "Manual trigger",
    external: "Needs cron/task",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border ${colors[scheduler] || "bg-gray-800 text-gray-400 border-gray-700"}`}
    >
      {labels[scheduler] || scheduler}
    </span>
  );
}

function AgentCard({ agent }: { agent: AgentConfig }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-neutral-800 rounded-lg bg-neutral-900/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 hover:bg-neutral-900/80 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h3 className="text-neutral-100 font-medium text-lg">{agent.name}</h3>
            <StatusBadge scheduler={agent.scheduler} />
          </div>
          <span className="text-neutral-600 text-sm">{expanded ? "−" : "+"}</span>
        </div>
        <p className="text-neutral-400 text-sm leading-relaxed">{agent.description}</p>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-neutral-800 pt-4 space-y-5">
          {/* Quick reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                Entry point
              </div>
              <code className="text-xs text-neutral-300 bg-neutral-800 px-2 py-1 rounded">
                {agent.entryPoint}
              </code>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                Directory
              </div>
              <code className="text-xs text-neutral-300 bg-neutral-800 px-2 py-1 rounded">
                {agent.dir}
              </code>
            </div>
          </div>

          {/* Scheduler info */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
              Scheduling
            </div>
            <p className="text-xs text-neutral-400 mb-3">{agent.schedulerNote}</p>

            <div className="space-y-1.5">
              {agent.jobs.map((job, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 text-xs bg-neutral-800/50 rounded px-3 py-2"
                >
                  <span className="text-neutral-200 font-medium min-w-[140px] shrink-0">
                    {job.name}
                  </span>
                  <span className="text-neutral-400 font-mono">{job.interval}</span>
                  {job.note && (
                    <span className="text-neutral-600 ml-auto shrink-0">
                      {job.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
              Dependencies
            </div>
            <div className="flex flex-wrap gap-2">
              {agent.dependencies.map((dep, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-1 rounded ${
                    dep.required
                      ? "bg-neutral-800 text-neutral-300 border border-neutral-700"
                      : "bg-neutral-900 text-neutral-500 border border-neutral-800"
                  }`}
                  title={dep.envVar ? `env: ${dep.envVar}` : undefined}
                >
                  {dep.name}
                  {dep.envVar && (
                    <span className="text-neutral-600 ml-1 font-mono text-[10px]">
                      ({dep.envVar})
                    </span>
                  )}
                  {!dep.required && (
                    <span className="text-neutral-600 ml-1">optional</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Operations */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Start", value: agent.howToStart },
              { label: "Stop", value: agent.howToStop },
              { label: "Check status", value: agent.howToCheck },
            ].map((op) => (
              <div key={op.label}>
                <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                  {op.label}
                </div>
                <code className="text-[11px] text-neutral-400 bg-neutral-800 px-2 py-1.5 rounded block leading-relaxed">
                  {op.value}
                </code>
              </div>
            ))}
          </div>

          {/* Process management */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
              Process management
            </div>
            <p className="text-xs text-neutral-400">{agent.processManagement}</p>
          </div>

          {/* Concerns */}
          {agent.concerns.length > 0 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber-500 mb-2">
                Known issues / concerns
              </div>
              <div className="space-y-1.5">
                {agent.concerns.map((c, i) => (
                  <p
                    key={i}
                    className="text-xs text-amber-300/70 pl-3 relative before:content-['!'] before:absolute before:left-0 before:text-amber-500"
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

export default function AgentStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthorized(token === VALID_TOKEN);
  }, [token]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-600 font-mono text-sm">Loading...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-600 font-mono text-sm">404</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
            Agent Control Panel
          </p>
          <h1 className="text-xl font-medium text-neutral-100 mb-2">
            Operational Status
          </h1>
          <p className="text-sm text-neutral-500">
            How each agent is configured to run. Update the AGENTS array in
            this file when you change an agent&apos;s setup.
          </p>
        </div>

        {/* Quick status grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {AGENTS.map((agent) => (
            <div
              key={agent.id}
              className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3"
            >
              <div className="font-mono text-xs text-neutral-400 mb-1">
                {agent.name}
              </div>
              <StatusBadge scheduler={agent.scheduler} />
              <div className="mt-2 text-[11px] text-neutral-500">
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

        <div className="mt-12 pt-6 border-t border-neutral-900 text-center">
          <p className="font-mono text-[10px] text-neutral-700 uppercase tracking-widest">
            This page is only accessible via direct URL
          </p>
        </div>
      </div>
    </main>
  );
}
