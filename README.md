# portfolio

Personal site at [vishal.pa.thak.io](https://vishal.pa.thak.io) plus
the dashboard for the job-hunter / job-applicant pipeline that lives
in companion repos.

Stack: Next.js 16, React 19, Tailwind 4, Supabase JS, Anthropic SDK,
Recharts.

---

## What's here

```
app/
  page.tsx                      # Public landing
  layout.tsx, globals.css       # Shell + styles
  api/
    chat/route.ts               # Claude streaming chat (Match Agent + general)
    materials/[jobId]/[kind]/route.ts  # Signed URLs for job PDFs
    dashboard/jobs/[job_id]/    # approve / dismiss (legacy) +
                                 # prefill / mark-applied / skip / mark-failed (M-6 cockpit)
    dashboard/profile-insight/  # Classify + save learned insights (J-11)
    dashboard-login/            # Session cookie issuer
    meridian/                   # Trading-agent telemetry
  dashboard/
    page.tsx                    # Triage + browse view
    MatchAgent.tsx              # Per-job chat → tailor framing (+J-11 writeback)
    ReviewPanel.tsx             # Approve packet (+J-2 legitimacy pill, +J-4 archetype pill)
    review/[job_id]/page.tsx    # M-6 manual-submission cockpit
                                # (status banner + materials accordions +
                                #  form-answer drafts with copy buttons +
                                #  pre-fill screenshot + sticky action bar)
    insights/page.tsx           # Hunter charts + Pattern Analysis section (J-6)
    stories/page.tsx            # STAR+R bank — browse + curate + export (J-3)
    login/page.tsx              # Cookie-gated entry point
lib/
  supabase.ts                   # Client + Job / Packet / StarStory types
middleware.ts                   # dashboard_auth cookie guard
```

The job-hunter writes Supabase rows; the dashboard reads them and
provides the human-in-the-loop interfaces (approve, match-chat,
confirm-submit, story curation).

---

## Local dev

```bash
npm install
cp .env.example .env.local   # populate Supabase + Anthropic keys
npm run dev                  # http://localhost:3000
```

Type-check without building:

```bash
npx tsc --noEmit
```

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # signed URLs + admin writes
ANTHROPIC_API_KEY=
DASHBOARD_PASSWORD=            # gates /dashboard
```

---

## What changed (career-ops alignment, 2026-04-28) — M-6 cockpit

`/dashboard/review/[job_id]` is now a manual-submission cockpit aligned
to the new flow in the sibling `job-applicant` repo. The system never
auto-applies; clicking **"Mark Applied"** in this cockpit is the
single source of truth for whether a job got submitted.

Layout:

- **Header** — title / company / score / tier / archetype pill /
  legitimacy pill / current status pill
- **Status banner** — per-state message (`ready_for_review` →
  "click Pre-fill Form"; `prefilling` → "wait for browser";
  `awaiting_human_submit` → "review and click Submit yourself";
  `applied` / `failed` / `skipped` for terminals)
- **Three materials accordions**:
  - Tailored resume (PDF view + download via `/api/materials`)
  - Cover letter (PDF view + Copy text + inline preview)
  - Form-answer drafts (M-1 in job-applicant) with copy buttons per
    identity row, per narrative section, and per role-specific
    additional question
- **Pre-fill screenshot** rendered inline via signed URL when the
  orchestrator has uploaded one
- **Match Agent** (J-11) panel toggleable behind a button; chat is
  unchanged by this refactor
- **Sticky action bar**: Pre-fill Form / Mark Applied (modal w/
  optional notes) / Open Application Manually / Skip / Mark Failed

New API routes (all auth-gated by `middleware.ts`):

- `POST /api/dashboard/jobs/[job_id]/prefill` — `ready_for_review` →
  `prefilling` (the polling loop in `job-applicant/main.py` picks up
  next cycle and dispatches to a per-ATS DOM handler in a visible
  browser)
- `POST /api/dashboard/jobs/[job_id]/mark-applied` — body
  `{submission_notes?}`; stamps `submitted_at` + `applied_at`,
  records notes
- `POST /api/dashboard/jobs/[job_id]/skip` — `status='skipped'`
- `POST /api/dashboard/jobs/[job_id]/mark-failed` — `status='failed'`
  with `failure_reason`

`app/lib/supabase.ts` updated:

- `JobStatus` extended with the new M-2 canonical enum
  (`ready_for_review`, `prefilling`, `awaiting_human_submit`,
  `skipped`, `expired`); legacy values kept as union members so older
  list-view code still type-checks but writes are rejected by the
  Postgres CHECK constraint
- New `FormAnswers` + `FormAnswerQuestion` types mirroring the
  M-1 schema (identity / contact / location / comp + four narrative
  fields)
- `Job` extended with `form_answers`, `submission_url`,
  `prefill_screenshot_path`, `prefill_completed_at`, `submitted_at`,
  `submission_notes`

The legacy `approve` / `dismiss` endpoints are unchanged in this pass;
the cockpit doesn't use them. They may revisit in a follow-up sweep
if the older list view ever drives them again.

---

## What changed (career-ops integration, 2026-04-27)

- **J-2**: `legitimacy` + `legitimacy_reasoning` columns surfaced as a
  pill on `ReviewPanel.tsx` and `review/[job_id]/page.tsx`. Soft
  warning — never gates approval.
- **J-3**: New `/dashboard/stories` page reads from `star_stories`,
  filters by archetype + tag, multi-select export to markdown brief.
- **J-4**: `archetype` + `archetype_confidence` columns surfaced on
  the review panel.
- **J-6**: `PatternAnalysisSection` on `/dashboard/insights` reads the
  most recent `pattern_analyses` row (written by the applicant cron
  script) and renders flagged groups + a horizontal bar chart.
- **J-11**: `MatchAgent.tsx` calls a new `/api/dashboard/profile-insight`
  classifier after each turn. When a generalizable preference is
  detected, an amber panel surfaces a "Save to profile" button that
  appends to `../job-hunter/profile/learned-insights.md`.

---

## Companion repos

- `../job-hunter` — discovery + scoring
- `../job-applicant` — tailoring + submission
