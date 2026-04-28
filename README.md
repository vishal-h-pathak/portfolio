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
    dashboard/jobs/[job_id]/    # approve / dismiss endpoints
    dashboard/profile-insight/  # Classify + save learned insights (J-11)
    dashboard-login/            # Session cookie issuer
    meridian/                   # Trading-agent telemetry
  dashboard/
    page.tsx                    # Triage + browse view
    MatchAgent.tsx              # Per-job chat → tailor framing (+J-11 writeback)
    ReviewPanel.tsx             # Approve packet (+J-2 legitimacy pill, +J-4 archetype pill)
    review/[job_id]/page.tsx    # Submission packet detail
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
