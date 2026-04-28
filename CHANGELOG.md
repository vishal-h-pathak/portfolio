# Changelog

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
