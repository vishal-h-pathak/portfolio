# REPORT — Rail: live agent-spend panel (replaces WIP rail)

**Branch:** `refactor/site` (in-place, builds on s1b + s2)
**Date:** 2026-06-26
**Prompt:** `ops/refactor/prompts/PROMPT_refactor_rail_spend.md`
**Status:** done, committed, NOT pushed (awaiting localhost QA).

## What changed

The right-side rail no longer renders fake-"live" values or placeholder
copy. It now surfaces one real, server-fetched, sanitized signal: rolling
7-day model spend across the owner's agentic systems.

### Files
- **NEW** `app/lib/agent-spend.ts` — server-only `getAgentSpend(): Promise<{ total7d, byStage[] } | null>`.
  Reads `cost_events` via the existing `createAdminClient`, windows the last
  7 days (`now − 7×864e5`, same edge math as the costs route), sums per stage,
  rounds to whole cents (floors sub-cent noise), returns the top 3 stages by
  spend. Selects **only** `stage, cost_usd` — never model/units/run_id/job_id.
  `try/catch → null`; never throws. Mirrors the `getBenchActivity` contract.
- **REWRITTEN** `components/WorkshopRail.tsx` — server-fetches `getAgentSpend()`,
  renders a single `// model spend · 7d` panel (rolling total + per-stage rows)
  using the existing `.rail-block` / `.rail-row` styles. `Legend` kept.
- **DELETED** `components/rail/StatusBlock.tsx`, `NowPlaying.tsx`, `RecentLedger.tsx`
  (all carried hardcoded/placeholder/WIP copy).

### Aggregation reuse
Dollar figures match the gated console cost route
(`app/api/console/dashboard/costs/route.ts`): same `cost_events` source, same
7-day window, same per-stage sum — only rounded to whole cents and sanitized
(no model/service/units/per-row detail) for public exposure.

## Live numbers (what the rail shows now)

Queried the live ledger (project `sbmsxerwgylpfkkkjtku`, the job-pipeline
Supabase the rail authenticates to), 7-day window, `cost_usd > 0`:

| stage | usd |
|-------|-----|
| **rolling total** | **$1.80** |
| hunt | $1.74 |
| discovery | $0.05 |

- `cost_events` had **≥1 row in the window: yes — 46 rows** (hunt 45, discovery 1).
- Top-3 cap: only 2 stages exist in-window, so both render.
- The total ($1.80) vs sum-of-stages ($1.79) differ by 1¢ — expected artifact of
  rounding each aggregate independently after summing; both are honest rounded
  aggregates, not a bug.

So the rail renders:

```
// model spend            7d
rolling total          $1.80
hunt                   $1.74
discovery              $0.05
```

## Empty state
If `getAgentSpend()` returns `null` (misconfigured env / query error) or
`total7d === 0`, the panel renders `rolling total · —` with no stage rows —
a plain honest line, never "to be wired" / placeholder / scaffolding copy.

## Constraints honored
- Server-side fetch + ISR only (page is `revalidate = 300`); service-role key
  stays server-side; nothing secret reaches the client.
- Aggregate-only output (rounded USD + coarse stage labels); no raw rows,
  models, prompts, or token units leak.
- No decorative/fake liveness; zero WIP/placeholder copy remains in the rail.
- `Legend` (the page-wide green/amber color key) retained.

## Follow-up note (no action taken — would break a live importer)
`app/lib/bench-activity.ts` and `app/api/bench/activity/route.ts` are **still
referenced** by the public bench-activity API route, so both were left in
place. The rail no longer consumes them. If `/api/bench/activity` is itself
retired in a later step, both become dead and can be removed together — flagged
for later cleanup only.

## Acceptance
- `npm run build` → **green** (`✓ Compiled successfully`); `/` stays ISR.
- Rail shows real 7-day spend (or `—` when empty); no placeholder/WIP text.
- `StatusBlock` / `NowPlaying` / `RecentLedger` gone; `Legend` stays.
- No secrets reach the client; `getAgentSpend` never throws.
