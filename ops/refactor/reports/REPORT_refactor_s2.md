# REPORT — Refactor Step 2: private tooling → gated in-app console

Branch: `refactor/site` (in-place, after s1b). Move + gate + nav-unify only — no
change to the tools' internal behavior, no deletions, no separate deployment.
Cross-machine WIP untouched. `npm run build` green. **Not pushed.**

Canonical spec: `docs/REFACTOR_PLAN.md` §7 / Phase 1.

---

## What changed

Three separate private surfaces (`/dashboard`, `/meridian`, `/agents/[token]`) —
two of them publicly footer-linked and one (`/meridian`) entirely ungated — are now
consolidated under **one auth-gated `/console`** on the same domain. Same app, same
domain, owner-only.

### Moves (via `git mv`, history preserved — 50 renames)
| From | To |
|------|----|
| `app/meridian/page.tsx` | `app/console/meridian/page.tsx` |
| `app/agents/[token]/**` | `app/console/agents/[token]/**` |
| `app/dashboard/**` | `app/console/jobs/**` |
| `app/dashboard/login/` | `app/console/login/` (lifted out of `jobs/`) |
| `app/api/dashboard/**` | `app/api/console/dashboard/**` |
| `app/api/meridian/` | `app/api/console/meridian/` |
| `app/api/materials/**` | `app/api/console/materials/**` |
| `app/api/chat/` | `app/api/console/chat/` |
| `app/api/dashboard-login/` | `app/api/console/login/` |

`app/api/bench/activity/**` + `app/lib/bench-activity.ts` + `components/WorkshopRail.tsx`
**stay public** (sanitized telemetry feed) — deliberately *not* moved or gated.

### Path rewrites inside the moved tree
- All client fetches updated to the new API prefixes (`/api/dashboard*` →
  `/api/console/dashboard*`, plus `meridian`/`materials`/`chat`/`dashboard-login`).
- All internal page-route links updated (`/dashboard*` → `/console/jobs*`),
  including `DashboardNav` items, BrowseView/review deep-links, `router.push`.
- Login POST handler now redirects to `/console` (success) / `/console/login?error=1`
  (failure); login page form posts to `/api/console/login`.
- Relative imports of the shared `app/lib/supabase` fixed for the new (one-level-
  deeper) location; everything else uses the `@/` alias or stays within the subtree.
- Doc-comment paths in `app/lib/supabase.ts` updated for accuracy.

### Gating — `middleware.ts`
- Matcher simplified to **`/console/:path*`** + **`/api/console/:path*`** — one
  matcher now covers every private surface, auto-gating the previously-ungated
  Meridian.
- Login surfaces (`/console/login` page and `/api/console/login` POST) are bypassed
  so there's still a way in. Unauthenticated `/console/*` → redirect to
  `/console/login`; unauthenticated `/api/console/*` → 401.

### One console nav — `app/console/layout.tsx` + `app/console/ConsoleNav.tsx`
- New umbrella layout adds a single `ConsoleNav` (Job pipeline · Meridian · ↗ site)
  as the shared top-level chrome for all console tools, plus a console home
  (`app/console/page.tsx`) listing the tools.
- Each tool keeps its own internal sub-navigation (the job pipeline's `DashboardNav`,
  Meridian's wordmark) **unchanged** — see Judgment calls below.

### Landing-page access (auth-aware, hidden from visitors)
- `components/Footer.tsx`: the public `APPENDIX` block (`/meridian`, `/dashboard`)
  is **removed**. A new `components/ConsoleLink.tsx` renders a discreet "console ↗"
  entry (reusing the footer's existing `.footer-appendix` treatment) **only for the
  signed-in owner**.
- `ConsoleLink` probes the gated `app/api/console/session` endpoint client-side: 200
  (middleware let us through) → show; 401 (visitor) → hide. See Judgment calls.

### Redirects — `next.config.ts`
`/meridian` → `/console/meridian`, `/dashboard/login` → `/console/login` (specific,
before the catch-all), `/dashboard` → `/console/jobs`, `/dashboard/:path*` →
`/console/jobs/:path*`. (All `permanent: true`, matching the existing CG redirect.)

### Content
`content/projects/meridian.ts` Meridian action → `/console/meridian` (gated).

---

## Judgment calls (deviations / interpretations worth noting)

1. **"One console nav (replacing DashboardNav + meridian's bespoke chrome)" —
   interpreted as *adding* the shared umbrella nav while *preserving* each tool's
   internal sub-nav.** Fully removing `DashboardNav` would delete the job pipeline's
   Overview/Review/Stories/Insights sub-navigation and its live review-queue badge —
   a regression to the tool's internal behavior, which the prompt's constraint
   forbids ("don't change the tools' internal behavior"). So the console now has a
   two-tier nav: ConsoleNav (which tool) over each tool's own nav (which page).
   Meridian's wordmark header is likewise left intact (editing the 1,470-line
   self-contained page to strip it is out of the "move + gate" spirit and risky).

2. **`ConsoleNav` is deliberately *not* sticky.** The job-pipeline pages own a
   `sticky top-0` `DashboardNav`; a second sticky bar at top-0 would collide. The
   umbrella bar scrolls with the page and the tool's own nav pins as before — zero
   change to `DashboardNav`'s layout.

3. **Auth-aware link via a client probe, not a server cookie read — to keep the
   public homepage static/ISR.** The `dashboard_auth` cookie is httpOnly, so the
   link must be decided server-side. Reading `cookies()` anywhere in the homepage
   render tree would force it dynamic, and `WorkshopRail`/`getBenchActivity` query
   Supabase per request relying on the page's `revalidate=300` (no fetch-level
   cache). To avoid that regression, the link is gated by a tiny client-side probe
   of the gated `/api/console/session` after hydration. Result: `/` stays `○ Static`
   (5m ISR) — confirmed in the build output. Trade-off: a brief post-hydration
   moment before the link appears for the owner only (visitors never see it).

---

## Verification

- `npm run build` — **green** (Turbopack, TypeScript type-check passes).
- Build route table confirms:
  - `/` → `○ Static` (5m revalidate) — homepage ISR **preserved**.
  - `/api/bench/activity` → `○ Static` (5m) — public rail feed **intact**.
  - `/console`, `/console/jobs*`, `/console/login`, `/console/meridian` → static;
    `/console/agents/[token]`, `/console/jobs/review/[job_id]` → dynamic.
  - `/api/console/*` (incl. `session`, `login`) → dynamic functions.
- Stale-reference scan across `app/ components/ content/`: no `/api/(dashboard|
  meridian|materials|chat|dashboard-login)` outside `/api/console/*`; no page-route
  `/dashboard` or `/meridian` literals outside the console tree.
- (Pre-existing, not introduced here) Next 16 warns that the `middleware` file
  convention is deprecated in favor of `proxy`; left as-is — out of scope.

### Acceptance (per prompt)
- [x] Every private tool reachable only under gated `/console/*`.
- [x] Unauthenticated `/console` → `/console/login`; `/meridian` + `/dashboard/*`
      redirect (meridian also now gated).
- [x] Authenticated owner sees the console entry from the landing page; visitors do
      not.
- [x] `npm run build` green; `WorkshopRail` still renders (public `bench/activity`
      untouched and still public).

**Owner QA suggestion (localhost):** with `DASHBOARD_PASSWORD` set, confirm (a)
`/console` redirects to login when logged out, (b) login lands on `/console` and the
footer "console ↗" link appears, (c) Meridian's live data loads at
`/console/meridian`, (d) the job pipeline review/tailor flows work end-to-end, (e)
`/meridian` and `/dashboard/...` old URLs redirect.
