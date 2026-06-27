# REPORT — Rail: live fleet-status panel alongside agent-spend

Branch: `refactor/site` (in-place). Implements `PROMPT_refactor_rail_fleet.md`.
Scope kept to this step only: the agent-spend panel, `agent-spend.ts`, and `Legend`
were not modified.

## What changed
- **New `app/lib/fleet-status.ts`** (server-only) — `getFleetStatus()` mirroring the
  `getAgentSpend` / `getBenchActivity` never-throws contract. Reads the public fleet
  monitoring plane via `createAdminClient` (service role), returns sanitized
  `{ machines: { alias, state, cpu? }[]; runningJobs }` or `null`. Wrapped in
  `try { … } catch { return null }`.
- **`components/WorkshopRail.tsx`** — added a `// fleet` `.rail-block` above the
  existing spend block, fetched server-side alongside spend (`Promise.all`). One
  `.rail-row` per machine (`alias · state · NN% cpu`, `online` gets the `.live` accent)
  plus a summary row (`N machines · M running`). Reuses existing `.rail-block` /
  `.rail-row` styles — no new visual system. Empty/null state renders
  `fleet · no machines reporting` (honest, never WIP/scaffolding copy).

## Fleet tables read
Schema read first from `~/dev/jarvis/fleet-mission-control/docs/SCHEMA.md` and
`supabase/migrations/20260621062352_fleet_p0_schema.sql` +
`…062353_fleet_p0_rls_and_grants.sql` — table/view/column names taken from there, not
guessed. The fleet plane shares the portfolio's Supabase project
(`sbmsxerwgylpfkkkjtku`), so the existing `createAdminClient` reads it server-side.

Read (public only):
- `fleet_machine_status` (view, `security_invoker`) — selected **only** `name`,
  `status`, `cpu_pct`. The view derives `status` as `online` (<30s), `stale` (<2m),
  else `offline` from `last_seen_at`.
- `fleet_jobs` — `count(*) where status='running'` only (head/count, no rows pulled).
  Project/name/kind never selected.

## Public / private split confirmed
- **Public-read (RLS `SELECT … using(true)`, in realtime publication):**
  `fleet_machines`, `fleet_heartbeats`, `fleet_jobs`, `fleet_machine_status` view.
- **PRIVATE — RLS enabled, zero policies → deny-all, service-role bypass only:**
  `fleet_machine_secrets` (`token_hash`, `tailscale_ip`) and `fleet_job_links`
  (`rc_url`, `rc_qr`, `cmd`, `metrics_url`, `log_tail`, `last_message`).
- **Never touched** the private tables or any secret column. `rc_url` is a live
  remote-control capability (driving a running Claude Code session) and is not read or
  exposed anywhere in this path. No secret columns are selected; no service-role key
  reaches the client (server-side fetch + ISR `revalidate = 300` only).

## Reporting at build time
At build/QA time the fleet was live: **2 machines online** —
`mac-cockpit` (online, ~26% cpu) and `sentry` (online, ~0% cpu) — with **2 running
jobs**. So the panel renders real data now; the `fleet · no machines reporting` empty
state was verified by code path (null/empty), not by an idle fleet, and is the normal
state when the reporter daemon isn't running.

## Acceptance
- `npm run build` — green.
- Rail shows the fleet panel (machines + running count) above the spend panel; both
  render; `Legend` intact.
- Empty state renders `fleet · no machines reporting`, not scaffolding copy.
- No secret columns selected; `getFleetStatus` never throws; no secrets reach the
  client.

Not pushed — left for localhost QA.
