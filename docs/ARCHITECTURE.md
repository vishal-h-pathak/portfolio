# Architecture

One diagram owned by this repo (the **portfolio** architecture), plus a
reference copy of the **system context** diagram that's canonical in the
`job-pipeline` repo. Both are plain-text Mermaid so they render on GitHub, in
any markdown viewer, and stay easy to update alongside the code. Polished
standalone HTML renders (Mermaid via CDN, light theme) live in
[`docs/diagrams/`](diagrams/): [`portfolio.html`](diagrams/portfolio.html) and
[`system-context.html`](diagrams/system-context.html).

## 1. Portfolio architecture

**Legend:** yellow subgraphs are in-repo areas (public site, auth gate,
console, API layer, server lib helpers); grey boxes are external systems
(Supabase, GitHub, Anthropic, Vercel); the amber box mirrors job-pipeline's
canonical status enum. The console also fronts non-job-pipeline tabs (Amex
credit tracker, trading-agent, fleet) — those are collapsed into single boxes
since their internals aren't load-bearing here.

```mermaid
flowchart TD
    classDef external fill:#eef0f2,stroke:#7a7a7a,stroke-width:1px,color:#333;
    classDef spine fill:#fff6da,stroke:#b8860b,stroke-width:2px,color:#333;

    subgraph PUBLIC["Public site (vishal.pa.thak.io)"]
        MKT["Marketing site<br/>app/page.tsx + components<br/>(Hero, Bench, Experience, Lineage, Project, WorkshopRail)"]
    end

    subgraph GATE["Auth gate"]
        AUTH["middleware.ts<br/>DASHBOARD_PASSWORD cookie gate<br/>matches /console/* + /api/console/*"]
        LOGIN["/console/login + /api/console/login"]
    end

    subgraph CONSOLE["Console — operator cockpit (app/console/)"]
        CJ["Jobs tab<br/>BrowseView, ReviewPanel, RunsPanel,<br/>ManualTailorPanel, WatcherPanel, MatchAgent, stories, insights"]
        CO["Other tabs<br/>credits (Amex tracker), meridian (trading-agent), agents (fleet)"]
    end

    subgraph API["API layer (app/api/)"]
        AJ["console/dashboard/jobs<br/>PATCH, mark-applied, mark-failed, prefill, skip"]
        AR["console/dashboard/runs<br/>hunt, tailor, tailor-manual"]
        AS["console/dashboard/storage<br/>signed material URLs"]
        AM["console/dashboard misc<br/>pattern-analyses, profile-insight, stories, watchers"]
        AC["console/chat<br/>MatchAgent"]
        AMAT["console/materials/[jobId]/[kind]<br/>serve PDFs"]
        AB["bench/activity<br/>public sanitized telemetry (ungated)"]
    end

    subgraph LIB["Server helpers (app/lib/)"]
        LD["github-dispatch.ts<br/>workflow_dispatch"]
        LS["supabase.ts / supabase-admin.ts<br/>service-role client"]
        LST["job-status.generated.ts<br/>mirrors jobpipe status enum"]:::spine
        LO["agent-spend / cost-events / fleet-status<br/>other tabs' telemetry"]
    end

    SUPA[("Supabase<br/>Postgres jobs/runs/application_attempts + Storage")]:::external
    GH[("GitHub API")]:::external
    JP["job-pipeline GitHub Actions<br/>(other repo)"]:::external
    ANT["Anthropic API"]:::external
    VERCEL["Vercel<br/>hosting + env/secrets"]:::external

    VERCEL -->|"hosts + builds"| MKT
    MKT -->|"GET sanitized activity feed"| AB
    AB -->|"service-role read (aggregates only)"| LS

    AUTH -->|"no/invalid cookie -> redirect"| LOGIN
    LOGIN -->|"POST password -> sets dashboard_auth cookie"| AUTH
    AUTH -->|"valid cookie"| CJ
    AUTH -->|"valid cookie"| CO

    CJ -->|"list / patch / mark-applied / mark-failed / skip"| AJ
    CJ -->|"Run Hunt / Tailor All / Tailor Manual clicks"| AR
    CJ -->|"request signed material URL"| AS
    CJ -->|"pattern insights, profile insight, stories, watcher status"| AM
    CJ -->|"chat turn"| AC
    CJ -->|"view resume / cover-letter PDF"| AMAT
    CO -->|"tab-specific reads/writes"| LO

    AJ -->|"service-role client"| LS
    AS -->|"service-role client"| LS
    AM -->|"service-role client"| LS
    AMAT -->|"service-role client"| LS
    LO -->|"service-role client"| LS
    LS -->|"reads/writes jobs, runs, application_attempts, Storage"| SUPA

    AR -->|"workflow_dispatch(hunt.yml / tailor.yml / tailor-manual.yml)"| LD
    LD -->|"POST /actions/workflows/{wf}/dispatches"| GH
    GH -->|"triggers CI run"| JP

    AC -->|"chat completion call"| ANT

    LST -.->|"status -> tone mapping (lib/lifecycle.ts)"| CJ
```

## 2. System context — job-pipeline ⇄ portfolio

> **This copy is a reference mirror.** The canonical version of this diagram
> lives in `job-pipeline/docs/ARCHITECTURE.md` — update that one first, then
> sync this copy.

**Legend:** yellow subgraphs are each repo's collapsed internals; blue is the
human operator; grey boxes are external systems (Supabase, GitHub Actions,
Anthropic, SerpAPI/JSearch, Resend, Vercel); the amber box is the shared
status-lifecycle contract. **Supabase is the only bus** — job-pipeline and
portfolio never call each other directly, they meet at the database.
**Submit is the one exception to CI**: it runs locally on the human's machine
and is only ever given intent (a status row), never dispatched by GitHub
Actions.

```mermaid
flowchart TD
    classDef external fill:#eef0f2,stroke:#7a7a7a,stroke-width:1px,color:#333;
    classDef spine fill:#fff6da,stroke:#b8860b,stroke-width:2px,color:#333;
    classDef human fill:#e6f0ff,stroke:#3060a8,stroke-width:1.5px,color:#333;

    subgraph JOBPIPE["job-pipeline (Python)"]
        JP_HUNT["hunt<br/>GitHub Actions cron 14:00 UTC + dispatch"]
        JP_TAILOR["tailor<br/>GitHub Actions cron + dispatch"]
        JP_SUBMIT["submit<br/>local Playwright, human's machine — never CI"]
    end

    subgraph PORTFOLIO["portfolio (Next.js on Vercel)"]
        PF_MKT["Marketing site<br/>vishal.pa.thak.io"]
        PF_CONSOLE["Console · Jobs tab<br/>the operator cockpit"]
        PF_API["api/console/dashboard/*<br/>service-role routes"]
    end

    HUMAN["Human operator"]:::human

    SUPA[("Supabase<br/>jobs / runs / application_attempts / notifications + Storage")]:::external
    GHA[("GitHub Actions<br/>workflow_dispatch")]:::external
    ANT["Anthropic<br/>API + Max-plan OAuth"]:::external
    PAID["SerpAPI / JSearch"]:::external
    RESEND["Resend"]:::external
    VERCEL["Vercel"]:::external
    STATUS["Job status lifecycle spine<br/>jobpipe/shared/status.py"]:::spine

    GHA -->|"cron 14:00 UTC: hunt.yml"| JP_HUNT
    PAID -->|"paid search"| JP_HUNT
    ANT -->|"LLM scoring"| JP_HUNT
    JP_HUNT -->|"upsert: status=discovered/new"| SUPA
    JP_HUNT -->|"digest email"| RESEND

    PF_API -->|"workflow_dispatch(hunt.yml / tailor.yml / tailor-manual.yml)"| GHA
    GHA -->|"triggers: tailor.yml"| JP_TAILOR
    PF_CONSOLE -->|"approve job: status=approved"| SUPA
    SUPA -->|"poll status=approved"| JP_TAILOR
    ANT -->|"LLM resume + cover-letter generation"| JP_TAILOR
    JP_TAILOR -->|"materials + status=ready_for_review"| SUPA

    SUPA -->|"render review + materials"| PF_CONSOLE
    PF_CONSOLE -->|"click Pre-fill: status=prefilling"| SUPA
    SUPA -->|"poll status=prefilling (local watcher — NOT CI)"| JP_SUBMIT
    ANT -->|"universal-agent fill fallback"| JP_SUBMIT
    HUMAN -->|"reviews pre-fill, clicks Submit on the ATS"| JP_SUBMIT
    JP_SUBMIT -->|"status=awaiting_human_submit + browser-truth capture"| SUPA

    SUPA -->|"render Submit / Mark Applied controls"| PF_CONSOLE
    HUMAN -->|"clicks Mark Applied / Skip"| PF_CONSOLE
    PF_CONSOLE -->|"status=applied / skipped / failed / expired"| SUPA

    PF_CONSOLE -->|"jobs CRUD, run buttons, materials, chat"| PF_API
    PF_API -->|"service-role reads/writes"| SUPA
    PF_MKT -->|"public sanitized telemetry"| SUPA
    VERCEL -->|"hosts + serves"| PF_MKT
    VERCEL -->|"hosts + serves"| PF_CONSOLE

    STATUS -.->|"canonical enum source"| SUPA
    STATUS -.->|"mirrored: portfolio lib/job-status.generated.ts"| PF_CONSOLE
```

## Keeping this current

These diagrams are hand-maintained, not generated, so they will drift the
moment a route, tab, or external service changes without a matching edit
here. Treat a diagram update as part of the same PR whenever you: add or
remove a console tab or API route under `app/api/console/`; change how
`middleware.ts` gates access; add a new external service dependency; or
change how portfolio and job-pipeline talk to each other (a new
`workflow_dispatch` target, a new Supabase table, or anything that changes
the shared-database contract). The system-context diagram in this file is a
mirror — if job-pipeline's copy changes, pull that update over here too.
When in doubt, regenerate by re-reading this file, `app/api`, `app/console`,
`app/lib`, and `middleware.ts`, then re-validate every Mermaid block with
`npx @mermaid-js/mermaid-cli` (or a headless render of the HTML pages) before
committing — a diagram that doesn't render is worse than no diagram.
