# Dashboard UX Review — landing-page declutter + cost-widget placement (2026-06)

> Independent review, 2026-06-24. Builds on the prior audit at
> `graphify-out/DASHBOARD_UX_REVIEW.md` (still largely valid) — this one
> re-prioritizes for the specific complaint that **the landing page got busy**,
> corrects for code added since that audit, and adds cost-widget placement, which
> the prior review does not cover.

The dashboard is a **single-user tool**: one person running a review→decide→submit
loop over a handful of rows. Every recommendation is in service of that loop.

---

## 1. What makes the landing page busy

`/dashboard` (`app/dashboard/page.tsx`, 654 lines) owns all jobs state and renders
either an inline `SwipeView` (~370 lines of that file) or **`BrowseView.tsx` —
1,306 lines, the heaviest file by 2.4×**. On the Browse landing page, **before a
single job row is visible**, the user scrolls past, top to bottom:

1. Header + row count + `? keys` button.
2. **`<ManualTailorPanel />`** (344 lines) — paste-a-URL form + polling + result.
3. **`<RunsPanel />`** (451 lines) — run-hunt / tailor-all buttons + 10-row ledger,
   own 5-15s poll loop.
4. **`<WatcherPanel />`** (194 lines) — dual-machine switcher, own 10s heartbeat
   poll. **New since the prior review** — this is the biggest single new
   contributor to the clutter.
5. **Submit-lane banner** + `submit all tailored` bulk button.
6. **8-control toolbar** — search, status-group, tier, score min/max, source,
   location, MS/PhD gate, sort + reset.
7. Sticky bulk-selection bar (on select).
8. "Action needed" section (always rendered, even when empty).
9. Tier groups 1 / 1.5 / 2 / 3 / other.

Concretely, what's wrong:

- **Four polling operational panels stacked vertically** (Manual, Runs, Watcher),
  each with its own header, cadence, and local state. **Three independent
  `setInterval` loops** run on the landing page at once (RunsPanel 5-15s,
  WatcherPanel 10s, nav action-count 30s). None of them is the daily job — yet they
  consume the entire first viewport on a 13" laptop.
- **Up to 6 pills per card** (`BrowseView.tsx:1045-1053`): `StatusBadge`,
  `LifecyclePill`, `TierPill`, `DegreeGatePill`, `LocationBadge`, age — plus a tone
  border stripe and a score readout. `StatusBadge` + `LifecyclePill` are provably
  redundant (both derive from `lifecycle.ts`).
- **The same list is sliced four different ways** — toolbar status-group, the
  "Action needed" pin, tier sections, and the location filter all partition the same
  rows. status-group directly duplicates the section grouping.
- **Three separate "submit one job" affordances** still exist: per-row `submit`
  button, `submit all tailored` bulk, and the cockpit Pre-fill. The per-row path
  even duplicates the bulk path's guard logic.
- **Two "Submit lane" titles collide** (`BrowseView.tsx:557` and
  `review/page.tsx:117`).
- **Swipe vs Browse toggle lives in the nav**, inviting accidental mode switches on
  desktop into a whole parallel ~370-line surface.

The good news: the action layer (`useOptimisticAction`, `JobActions`,
`lifecycle.ts`) and the token system are genuinely well-built. The problem is
**purely surface density on the landing page**, and it got worse because Watcher
was added as a fourth operational panel above the list.

---

## 2. Decluttering recommendations (prioritized by impact-per-effort)

### Tier 1 — reclaim the first viewport (near-zero risk)

1. **Collapse the four operational panels into one `<details>` "Operations" drawer,
   collapsed by default.** Wrap `ManualTailorPanel`, `RunsPanel`, `WatcherPanel`
   (and the submit-lane banner) in a single collapsible section at
   `BrowseView.tsx:542-582`. **This is the highest-leverage single change** and the
   most direct answer to "the landing page got busy." Their poll logic is untouched;
   only their visual footprint collapses. *(The prior review proposed this for
   Runs/Manual; Watcher makes it mandatory.)*
2. **Delete the Browse submit-lane banner + `submit all tailored`**
   (`BrowseView.tsx:546-582` + associated state ~110 lines). `/dashboard/review` is
   the dedicated submit lane; this removes a full duplicate surface.
3. **Remove `LifecyclePill` from Browse cards** (`BrowseView.tsx:1047`) — one-line
   delete, instantly lighter cards. Keep `StatusBadge`; keep the pill in the cockpit
   header where progress context earns its place.
4. **Collapse the filter rack to search + sort + tier** (`BrowseView.tsx:599-683`).
   Cut status-group (duplicates section grouping), score min/max, source, MS/PhD
   gate. For a few-hundred-row single-user dataset these are filtering ceremony.
5. **Strip leaked debug/scaffolding** — the `submitted_at: …ISO…` line in the
   cockpit banner (`review/[job_id]/page.tsx:631-635`) and the "charts deferred for
   v2…" insights footer (`insights/page.tsx:853-856`).

### Tier 2 — structural

6. **Make Browse back-half rows link-only** — drop the per-row `submit` button
   (`BrowseView.tsx:1194-1232`); `ready_for_review` should link to the cockpit only.
   Kills the third submit entry point and its duplicated guard.
7. **Demote Swipe to a responsive behavior of the one list**, not a co-equal nav
   toggle — removes ~370 lines from `page.tsx` and the `viewMode` pref.
8. **Merge `/dashboard/review` into `/dashboard` as a pinned "Needs you" zone** and
   rename `/dashboard/review/[job_id]` → `/dashboard/job/[id]`. One loop, one detail
   surface.

### Where this review nuances the prior one

- **Rank the Operations drawer above the LifecyclePill delete.** The prior review
  led with the pill; for *this* complaint the four-panel stack is the dominant
  visual mass. Both are cheap — do the drawer first.
- **Don't cut WatcherPanel — relocate it.** It's genuinely useful (it tells you
  which machine will claim a `prefilling` job, relevant right before you submit).
  Move it into the Operations drawer, and surface one derived fact (e.g. "watcher:
  macbook") as a tiny nav indicator so the thing that matters daily stays visible
  without the whole panel.

---

## 3. Cost-widget placement

**There is no cost/spend data in the dashboard data layer today** — no
`cost`/`spend`/`usd`/`tokens` field on `jobs` or `runs` (the `runs` route selects
no cost column). So these widgets are net-new and need a backing source first; the
natural one is a `runs.cost_usd` column + a `cost_events` table (see
`job-pipeline/reviews/COST_TRACKING_PLAN.md`). Once that exists:

**Recommended split placement — ledger column + insights section, NOT a nav stat.**

**A. Per-run spend → cost column in the RunsPanel recent-runs ledger.**
`RunsPanel.tsx:351-417` already renders a per-run row (kind, status, time, GHA
link). Add one right-aligned `tabular-nums` cell (`$0.42`) in the existing flex row
(~line 368-390), plus a footer summing visible runs ("10 runs · $4.18"). Correct
home because the run is the unit that incurs spend, it needs zero new layout, and it
lands inside the Operations drawer — cost detail lives with the tooling that
generated it, out of the daily loop.

**B. Total / aggregate spend → a "Spend" section on the Insights page.**
`insights/page.tsx` is purpose-built for aggregates and already has the primitives:
`KpiTile` (lines 348-371) and `Panel`/`PanelHeader` (253-280). Add 2-3 KPI tiles
to the existing `sm:grid-cols-4` grid (660-701): "Total spend", "This week",
"Cost per applied". Add a `<Panel>` with a daily-spend `LineChart` (mirror "Daily
inflow" at 794-818) or cost-by-stage `BarChart` (mirror "Tier yield" at 739-762) —
the recharts scaffolding, `CHART` palette, and mount-gating are all already there.
This is exactly the "SerpAPI budget meter" the page's own deferred-for-v2 footer
promised; ship it and delete the footer.

**C. Do NOT add a nav spend stat.** It re-clutters the surface this review is
lightening, spend isn't a per-glance daily signal (unlike the action-count badge),
and a second self-fetching nav item compounds existing friction. If you want any
always-visible number, put a muted total in the Operations drawer header.

---

## 4. Fit with the existing design system

No component library, no `design-system/` token package — styling is Tailwind
utilities over CSS custom properties in `app/globals.css` (`:root`). Confirmed
tokens: `--bg`, `--bg-raised`, `--bg-card`, `--ink`/`--ink-dim`/`--ink-faint`,
`--rule`/`--rule-soft`, `--green`/`--green-dim`, `--amber`/`--amber-dim`, `--red`.
Visual language: dense hairline-bordered cards, serif headings over mono
micro-labels (`font-mono text-[10px] uppercase tracking-[0.18em]`), `tabular-nums`
for numbers, amber = "human action needed", green = "working/done", red = failure,
a 2px left tone stripe (`lifecycle.ts:124-135`).

Any cost widget should use `tabular-nums`, the mono micro-label caption, and a
neutral `text-ink`/`text-ink-dim` value (cost is not a tone event — reserve amber
for over-budget).

**Two token bugs to fix while in here:**
- `--blue` / `border-blue-dim` are used by the Browse submit-lane
  (`BrowseView.tsx:554,557`) and the review staged stripe (`review/page.tsx:278`)
  but **`--blue` is not defined in `globals.css`** — those borders render
  transparent. Deleting the submit-lane banner (rec #2) removes the BrowseView use;
  either define `--blue` or re-token the review staged stripe.
- `insights/page.tsx:44-56` hand-mirrors token hexes into a `CHART` object that
  will drift from `globals.css`. Reuse `CHART` for any new spend chart rather than
  introducing new hexes.

---

## 5. Bottom line

The single highest-impact move is **wrapping the four operational panels into one
collapsed Operations drawer** — it reclaims the entire first viewport at near-zero
risk. Everything else in Tier 1 is cheap reinforcement. For cost: there's no spend
data yet (add `runs.cost_usd` + `cost_events`), and when it lands, put **per-run
cost as a ledger column inside that drawer** and **total/aggregate spend as KPI
tiles + a chart on Insights** — keep it out of the nav and out of the daily loop.
