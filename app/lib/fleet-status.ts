import { createAdminClient } from "@/app/lib/supabase-admin";

/**
 * Sanitized fleet-status signal for the public workshop rail.
 *
 * Server-only: reads the fleet monitoring plane that lives in the same
 * Supabase project as the portfolio (the `fleet_`-prefixed tables, applied
 * 2026-06-21). Those tables are split public/private at the DB level:
 *
 *   - PUBLIC  (RLS `using(true)`): `fleet_machines`, `fleet_heartbeats`,
 *     `fleet_jobs`, and the `fleet_machine_status` view (latest heartbeat
 *     per machine + derived online/stale/offline).
 *   - PRIVATE (RLS enabled, zero policies → deny-all): `fleet_machine_secrets`,
 *     `fleet_job_links` (which hold `rc_url`/`rc_qr`/`cmd`/`metrics_url`/
 *     `log_tail`/`last_message`). The `/rc` URL is a live remote-control
 *     capability — anyone holding it can drive a running Claude Code session.
 *
 * This module reads ONLY the public view + the public columns of `fleet_jobs`,
 * and exposes ONLY aliases, derived state, a coarse rounded CPU%, and a
 * running-jobs count. It never selects a secret table or a sensitive column.
 *
 * Returns null on any failure — the rail degrades to a plain honest line, it
 * never errors. Mirrors the `getAgentSpend` / `getBenchActivity` never-throws
 * contract.
 *
 * Do not import from client components.
 */

export type FleetMachine = {
  alias: string;
  state: "online" | "stale" | "offline";
  cpu?: number;
};
export type FleetStatus = {
  machines: FleetMachine[];
  runningJobs: number;
};

function normalizeState(s: unknown): FleetMachine["state"] {
  return s === "online" || s === "stale" ? s : "offline";
}

export async function getFleetStatus(): Promise<FleetStatus | null> {
  try {
    const admin = createAdminClient();
    if (!admin) return null;

    // Whitelist columns explicitly: alias (name), derived state (status), and a
    // coarse CPU% (cpu_pct). NEVER select from the private tables or any
    // rc_url/token/cmd/last_message column.
    const { data, error } = await admin
      .from("fleet_machine_status")
      .select("name, status, cpu_pct");
    if (error) return null;

    const machines: FleetMachine[] = (data ?? [])
      .map((row) => {
        const cpuRaw = Number(row.cpu_pct);
        const machine: FleetMachine = {
          alias:
            typeof row.name === "string" && row.name ? row.name : "unknown",
          state: normalizeState(row.status),
        };
        if (Number.isFinite(cpuRaw)) machine.cpu = Math.round(cpuRaw);
        return machine;
      })
      .sort((a, b) => a.alias.localeCompare(b.alias));

    // Count only — never pull running-job rows (project/name stay private to
    // the gated views; the public rail surfaces just a count).
    const { count, error: jobsError } = await admin
      .from("fleet_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "running");
    const runningJobs = jobsError ? 0 : count ?? 0;

    return { machines, runningJobs };
  } catch {
    return null;
  }
}
