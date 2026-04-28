# Changelog

## 2026-04-28 — Career-ops alignment (M-6 manual-submission cockpit)

Dashboard side of the broader career-ops alignment landing in the
sibling `job-applicant` repo. The cockpit at
`/dashboard/review/[job_id]` becomes the single source of truth for
whether a job got submitted — clicking "Mark Applied" stamps
`submitted_at`. The system never auto-applies.

- **M-6 (cockpit)**: Replaced `/dashboard/review/[job_id]` UI with a
  manual-submission cockpit. Sections: header (title / company / score
  / tier / archetype pill / legitimacy pill / status pill), per-state
  status banner, three-accordion materials section (resume PDF, cover
  letter PDF + text, form-answer drafts with copy buttons per identity
  row + per narrative section + per role-specific additional question),
  inline pre-fill screenshot via signed URL, Match Agent panel (J-11,
  unchanged), and a sticky action bar with **Pre-fill Form / Mark
  Applied (modal w/ submission_notes) / Open Application Manually /
  Skip / Mark Failed**.
- **M-6 (API)**: Four new auth-gated routes under
  `app/api/dashboard/jobs/[job_id]/`:
  - `prefill/route.ts` — guards `status='ready_for_review'`, writes
    `'prefilling'` so the job-applicant polling loop picks it up next
    cycle.
  - `mark-applied/route.ts` — body `{submission_notes?}`; stamps
    `submitted_at` (M-3 column, source of truth) + `applied_at`
    (legacy back-compat), records notes.
  - `skip/route.ts` — body `{reason?}`; writes `status='skipped'`
    + `application_notes`.
  - `mark-failed/route.ts` — body `{reason?}`; writes
    `status='failed'` + `failure_reason`.
- **M-6 (types)**: `app/lib/supabase.ts` extended:
  - `JobStatus` updated to the new M-2 canonical enum (legacy values
    kept as union members so older list-view code still type-checks;
    Postgres CHECK enforces that writes go to the new enum).
  - New `FormAnswers` + `FormAnswerQuestion` types matching the
    `tailor/form_answers.py` schema in `job-applicant`.
  - `Job` extended with `form_answers`, `submission_url`,
    `prefill_screenshot_path`, `prefill_completed_at`,
    `submitted_at`, `submission_notes`.

Schema migration `007_career_ops_alignment.sql` (applied via Supabase
MCP) added the supporting columns and CHECK constraint; the dashboard
just reads what's there.

`tsc --noEmit` passes clean.


## 2026-04-27 — Career-ops integration

Dashboard-side updates that ride on top of the schema and pipeline
changes in the sibling `job-hunter` and `job-applicant` repos.

- **J-2**: `legitimacy` + `legitimacy_reasoning` added to the `Job`
  type. Colored pill (emerald / amber / red) on `ReviewPanel.tsx` and
  matching small pill on `review/[job_id]/page.tsx`. Reasoning shows
  on hover. Soft warning only — never gates approval.
- **J-3**: New `/dashboard/stories` page reads from `star_stories`,
  filters by archetype + tag substring + master-only toggle. Each
  card has a ★ master toggle (writes back) and a checkbox for
  multi-select export to a markdown brief.
- **J-4**: `archetype` + `archetype_confidence` added to the `Job`
  type and surfaced as a violet pill on the review panel.
- **J-6**: New `PatternAnalysisSection` on `/dashboard/insights`
  reads the latest row from `pattern_analyses` (written by the
  applicant cron script) and renders flagged-pattern cards plus a
  horizontal bar chart of group response rates.
- **J-11**: `MatchAgent.tsx` now calls
  `/api/dashboard/profile-insight` with `action: "classify"` after
  every assistant turn. When the classifier flags a generalizable
  preference, an amber panel surfaces a "Save to profile" button
  that POSTs `action: "save"`; the route appends to
  `../job-hunter/profile/learned-insights.md`. The user-layer prompt
  loader picks the file up automatically.
