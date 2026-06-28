# Vendored dataset snapshot

`dataset.json` is a **read-only M1 snapshot** of the Amex Credit Tracker's mock
dataset (23 credits across Amex Platinum / Gold + Chase Sapphire Preferred,
107 periods, 75 redemptions; seed 42, generated 2026-06-28).

It is **vendored, not imported** — the portfolio repo does not depend on the
tracker repo. Regenerate from the tracker:

```bash
# in ~/dev/jarvis/amex-credit-tracker
npm run mock:build        # writes mock/dist/dataset.json
cp mock/dist/dataset.json <portfolio>/app/console/credits/data/dataset.json
```

**M5 follow-up:** swap this static file for a live data adapter (real DB /
tracker API), and replace the stable showcase `as-of` anchor in
`../lib/derive.ts` with `new Date()`.
