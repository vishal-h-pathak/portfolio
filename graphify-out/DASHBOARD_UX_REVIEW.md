# Dashboard UX Review — job-pipeline cockpit

Pre-redesign usability audit. Read of every route and component under
`portfolio/app/dashboard/` plus the status contract in `job-pipeline/CLAUDE.md`.
The dashboard is a **single-user tool** (one person, Vishal, reviewing and
submitting his own job applications). That fact should drive every cut below:
much of the surface is built as if for a team or for scale it will never see.

---

## 1. Screen & component inventory

### Routes

| Route | File | Purpose | Complexity |
|---|---|---|---|
| `/dashboard` | `page.tsx` | Overview register. Owns jobs list + all mutations. Hosts browse OR swipe view. | ~655 lines (incl. full Swipe view inline) |
| `/dashboard` (browse) | `BrowseView.tsx` | Dense table: toolbar, filters, tier groups, bulk select, submit lane, keyboard layer, per-row action buttons. | **~1,305 lines — by far the heaviest** |
| `/dashboard/review` | `review/page.tsx` | "Submit lane" list — `awaiting_human_submit` + `ready_for_review` rows with quick actions. | ~357 lines |
| `/dashboard/review/[job_id]` | `review/[job_id]/page.tsx` | Manual-submission cockpit: materials, banner, screenshot, action bar, Match Agent. | ~847 lines |
| `/dashboard/insights` | `insights/page.tsx` | Hunter analytics: 8 KPI tiles, pie, 3 bar charts, line, funnel, pattern analysis, status grid. | ~860 lines |
| `/dashboard/stories` | `stories/page.tsx` | STAR+R interview-prep bank: filter, star "master", export markdown. | ~368 lines |
| `/dashboard/login` | `login/page.tsx` | Password gate. | ~48 lines, fine |

### Components

| Component | File | Purpose |
|---|---|---|
| DashboardNav | `components/DashboardNav.tsx` | Global nav (Overview / Review / Stories / Insights) + self-polling Review badge (30s). |
| ManualTailorPanel | `ManualTailorPanel.tsx` | Paste-a-URL → dispatch manual tailor; polls its run; result card. Mounted inside BrowseView. |
| RunsPanel | `RunsPanel.tsx` | Pipeline-run dispatch (hunt / tailor-all) + recent-runs ledger with poll-boost. Mounted inside BrowseView. |
| MatchAgent | `MatchAgent.tsx` | Slide-over chat "interview" before tailoring; J-11 "save to profile" insight capture. |
| JobBadges | `components/JobBadges.tsx` | Pill primitive + StatusBadge, RunStatusBadge, TierPill, LocationBadge, ConfidenceBadge, DegreeGatePill, **LifecyclePill**. |
| AdapterBadge | `components/AdapterBadge.tsx` | ATS-kind chip (greenhouse/lever/…). |
| ReasonPick | `components/ReasonPick.tsx` | Skip/ignore reason quick-pick modal. |
| Modal / Button / Skeleton / Toast | `components/` | Primitives. Healthy. |
| lifecycle.ts | `lib/lifecycle.ts` | Single source of truth for status → tone / stage / labels. Good. |

Note: `RecentLedger` and `StatusBadge` mentioned in the brief — the ledger
lives **inside** RunsPanel (not a standalone reusable), and StatusBadge is in
JobBadges. No separate files.

---

## 2. The core job

Vishal's day-to-day is a **review→decide→submit loop over a handful of rows**,
not data exploration. The honest decomposition:

1. **Triage new finds.** Hunt surfaces scored roles. He approves the few worth
   pursuing and dismisses the rest. (High volume, low time-per-item.)
2. **Tailor.** One click per approved row; the agent generates materials async.
3. **Review materials + submit.** The real work: read the tailored resume /
   cover letter / form answers, pre-fill the form, submit it himself in the
   open browser, mark applied. (Low volume, high time-per-item — this is where
   judgment lives.)
4. **Occasional:** glance at insights; pull STAR stories before an interview.

**Ideal fast path:** open dashboard → "Action needed" shows what's waiting →
open one row → read materials → pre-fill → submit in browser → mark applied →
next. Triage of new finds is a separate, faster mode (approve/skip in bulk).

Everything else (charts, run dispatch ledgers, manual-URL tailor, swipe deck,
chat interview) is **secondary or operational** and should not compete with
that loop for primary screen real estate.

---

## 3. Usability findings

### A. The review/submit loop is spread across three surfaces with overlap
This is the biggest problem. The same back-half states (`ready_for_review`,
`awaiting_human_submit`) are actionable in **three** places:
- `BrowseView` "Action needed" section + per-row buttons (`review materials`,
  `submit`, `finish submit ↗`, `skip`).
- `/dashboard/review` list ("Submit lane") with its own `submitted ✓ → next` /
  `skip` quick actions and a `VerificationSummary`.
- `/dashboard/review/[job_id]` cockpit (the actual detail/submit surface).

A user landing on `/dashboard` has no clear signal which of the first two to
use. They show the same rows with different controls and different copy. The
brief itself lists "review/page.tsx" and the in-Browse submit lane as separate
things — they *are* separate, and that's the bug.

### B. Two parallel "submit lane" UIs, both inside the loop
- `BrowseView.tsx:544-580` renders a **"Submit lane"** banner with a
  *"submit all tailored"* bulk button.
- `/dashboard/review/page.tsx` is titled **"Submit lane"** too.
Same name, two screens, different scope. Confusing labeling and duplicated
mental model.

### C. Three different entry points to "submit one job"
1. Per-row `submit` button in Browse (`/prefill`, optimistic → `prefilling`).
2. `submit all tailored` bulk in Browse.
3. `pre-fill form` button in the cockpit (`/prefill` again).
All three hit the same `/prefill` route. Three affordances for one action,
with subtly different copy ("submit" vs "enqueue" vs "pre-fill form").

### D. Two status visualizations on every Browse card, side by side
Each `BrowseCard` renders **both** `StatusBadge` *and* `LifecyclePill`
(`BrowseView.tsx:1044-1045`). They're derived from the same `lifecycle.ts` and
can never disagree — so the LifecyclePill is decorative redundancy. The 5-segment
progress bar is clever but adds visual noise to a dense list the user scans fast.

### E. Swipe view is an entire second triage UI for a desktop-first single user
`page.tsx` carries a full Tinder-style swipe deck (~370 lines: pointer drag,
fly-off animation, tier picker, bucket toggle) as a co-equal view mode. It
duplicates triage that Browse already does (approve/skip) and only makes sense
on mobile. For one user who works at a desk, this is a lot of surface area and
state (`viewMode` pref, separate skeletons, separate empty states) to maintain.

### F. RunsPanel + ManualTailorPanel are operational chrome wedged above the list
Both mount inside BrowseView between the header and the register
(`BrowseView.tsx:541-542`). On every visit to the main screen the user sees:
manual-URL form, run-dispatch buttons, a recent-runs ledger with its own poll
loop and dismiss/clear-completed device-local state — *before* getting to the
jobs. These are "I want to kick off a hunt" tools, used occasionally, occupying
prime above-the-fold space daily.

### G. Filter toolbar is overbuilt for the data volume
BrowseView's toolbar has 7–8 controls: search, status group, tier, score
min/max, source, location, MS/PhD gate, sort — all persisted to localStorage
(`FILTERS_KEY`). For a few hundred rows and one user, this is enterprise-grade
filtering. Status-group filter especially overlaps with the tier sections and
the "Action needed" pin, producing several ways to slice the same list.

### H. Two status taxonomies the user must hold in their head
- Raw statuses (`ready_for_review`, `awaiting_human_submit`, `prefilling`…)
  shown verbatim in the cockpit header (`status: awaiting_human_submit`).
- Friendly relabels (`STATUS_LABEL`: "review ready", "awaiting submit",
  "pre-filling") in badges.
- Browse's own status **groups** ("unreviewed / in progress / needs action /
  done").
- Insights' funnel stages ("Notify-flagged / Approved+ / Materials ready+").
Four vocabularies for one lifecycle. The user sees raw enum strings in some
places and prose in others.

### I. "Mark applied" exists in two places with different weight
- Cockpit: full modal with optional notes (`MarkAppliedModal`).
- Review list: one-click `submitted ✓ → next` (no notes).
Same state transition, two UX contracts. Fine as a design *if* intentional, but
currently it reads as accidental drift, and the quick one in the list bypasses
the notes capture the cockpit treats as important.

### J. Smaller friction / dead ends
- Cockpit Match Agent is a toggle-to-expand inline panel, but on `/dashboard`
  the *same* MatchAgent is a full-screen slide-over. Two presentations of one
  component.
- `Enter` in Browse routes `ready_for_review`/needs-action rows to the cockpit
  but everything else opens the MatchAgent slide-over — inconsistent payoff for
  the same key depending on row state, undocumented in the keys help.
- Insights mirrors token hex values by hand (`CHART` object) with a comment
  warning they'll drift from `globals.css` — a known maintenance trap.
- Insights footer literally lists "charts deferred for v2" inside the shipped
  UI — leftover scaffolding text shown to the user.
- Cockpit shows `submitted_at` as a raw ISO string in the banner
  (`review/[job_id]/page.tsx:633`) — debug output leaking into UI.
- Nav badge polls every 30s for one number (`action-count`); fine, but it's the
  only nav item that self-fetches — slightly surprising.

---

## 4. Redundancies to cut

| Cut / merge | Rationale |
|---|---|
| **LifecyclePill on Browse cards** | Duplicates StatusBadge; same source, can't disagree. Keep StatusBadge only (or keep the pill *only* in the cockpit header where progress context helps). |
| **One of the two "Submit lane" surfaces** | Browse's submit-lane banner and `/dashboard/review` are the same idea. Pick the dedicated route; drop the banner from Browse. |
| **Swipe view** | Mobile-only triage duplicating Browse's approve/skip. Cut it, or gate it behind an explicit `?mode=swipe` rather than a co-equal toggle the desktop user toggles by accident. |
| **`submit all tailored` bulk button** | One user submitting in a visible browser one at a time gains little from a bulk-enqueue; it adds a confirm modal + skip-reason accounting. Drop or demote. |
| **Per-row `submit` in Browse** | The cockpit's pre-fill is the real submit entry. The Browse row should *link to* the cockpit, not also offer pre-fill. Removes entry-point #3. |
| **Status-group filter** | Overlaps tier sections + "Action needed" pin. The list is already grouped; the filter is a third way to do the same slicing. |
| **Score min/max + several toolbar controls** | Keep search + sort + maybe tier. The rest is filtering ceremony for a small dataset. |
| **One-click `mark applied` vs modal** | Pick one contract. Recommend: keep the modal (notes matter for the audit trail), make the list action open it. |
| **Hand-mirrored chart hexes** | Read from CSS custom properties / a shared token module instead of the `CHART` literal. |
| **Insights "deferred for v2" footer + raw ISO timestamps** | Remove leftover scaffolding/debug text from shipped UI. |

---

## 5. Streamlined UX proposal

Reframe around the single loop. Three screens, not six. Operational tools become
a drawer, not a wall.

```
/dashboard                      ← THE loop. One screen, two stacked zones.
│
├── Zone 1: Needs you (pinned top)
│     rows in ready_for_review / awaiting_human_submit / failed
│     each row → one primary CTA that matches its state:
│        ready_for_review     → "Review & submit"  (→ detail)
│        awaiting_human_submit→ "Finish submit"    (→ detail)
│        failed               → "Retry" / "Review"
│
├── Zone 2: Triage (new finds)
│     scored rows, grouped by tier, dense scan list
│     per row: Approve · Skip(reason).  Approve auto-queues tailor
│     (drop the separate "tailor" click — approving IS the intent)
│     bulk approve/skip via shift-select (keep — it's cheap and good)
│
├── search + sort only (kill the filter rack)
└── ⚙ Operations drawer (collapsed by default)
      run hunt · tailor all approved · paste-a-URL tailor · recent runs ledger

/dashboard/job/[id]             ← merged detail+submit cockpit (rename from /review)
│   the ONE place a single job is worked
│   ├─ header: title/company/score/tier/legitimacy + friendly status (no raw enum)
│   ├─ status banner: what to do next
│   ├─ materials: resume / cover letter / form answers (copy buttons)
│   ├─ pre-fill screenshot (when present)
│   ├─ Match Agent (inline, collapsible)
│   └─ sticky action bar: ONE state-aware primary
│         ready_for_review      → Pre-fill form
│         awaiting_human_submit → Mark applied (modal w/ notes)
│         + secondary: open manually ↗ · skip · mark failed

/dashboard/insights             ← keep, trim to the 3 charts he reads
/dashboard/stories              ← keep, leave near-as-is (clean, self-contained)
```

### Primary flow as a step sequence (the daily loop)
1. **Land on `/dashboard`.** "Needs you" zone shows the 0–5 rows waiting.
2. **Click a waiting row → `/dashboard/job/[id]`.**
3. **Read materials.** Resume/CL/form answers in accordions.
4. **Pre-fill form** (primary CTA). Browser opens locally.
5. **Submit in the browser yourself** (system never auto-submits).
6. **Mark applied** (now the primary CTA) → modal → notes → back to dashboard.
7. **Repeat;** when "Needs you" is empty, drop to Triage and approve new finds.

Key principle: **the list never offers submit affordances.** Lists route to the
one detail surface; the detail surface owns the state machine. That single rule
kills entry-point sprawl (finding C) and the three-surface overlap (finding A).

---

## 6. Quick wins vs bigger bets

### Quick wins (low effort, high impact)
- **Remove LifecyclePill from Browse cards.** One-line delete; instantly less
  noise. (Keep StatusBadge.)
- **Remove the Browse "Submit lane" banner + `submit all tailored`.** Deletes a
  whole confusing parallel surface; `/dashboard/review` stays.
- **Make Browse back-half rows link-only** (drop the per-row `submit` button so
  there's one submit entry, the cockpit).
- **Strip Insights scaffolding:** delete the "deferred for v2" footer line and
  the raw-ISO `submitted_at` debug string in the cockpit banner.
- **Collapse the filter rack to search + sort (+ tier).** Remove score min/max,
  status-group, source, gate selects.
- **Document the `Enter`-key dual behavior** in KeysHelp, or unify it (always
  open detail).
- **Rename one of the two "Submit lane" titles** so the vocabulary stops
  colliding even before the bigger merge lands.

### Bigger bets (restructure)
- **Merge `/dashboard/review` (list) into `/dashboard`** as the "Needs you"
  zone, and rename `/dashboard/review/[job_id]` → `/dashboard/job/[id]`. One
  loop, one detail surface.
- **Move RunsPanel + ManualTailorPanel into a collapsible Operations drawer.**
  Reclaim above-the-fold for jobs.
- **Cut or demote Swipe view.** If mobile triage matters, make it a responsive
  behavior of the one list, not a second 370-line view with its own state.
- **Collapse the four status vocabularies to one** friendly set (driven by
  `lifecycle.ts` `STATUS_LABEL`), used everywhere including the cockpit header
  and the insights funnel. Never show raw enum strings to the user.
- **Unify MatchAgent presentation** (inline collapsible everywhere, or slide-over
  everywhere — not both).
- **Source chart colors from tokens** to kill the hand-mirrored `CHART` drift
  trap.

---

### One-line verdict
The pipeline logic is solid and the component primitives (Pill, lifecycle.ts,
optimistic actions, Toast) are genuinely well-built. The problem is **surface
sprawl**: a single-user review→submit loop is spread across three screens with
three submit entry points and four status vocabularies. Collapse it to one loop
screen + one detail screen, push operational tooling into a drawer, and delete
the redundant second triage (swipe) and second submit-lane. Every cut above is
in service of the one thing this tool exists to do.
