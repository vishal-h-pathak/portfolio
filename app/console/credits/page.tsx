/**
 * Credits — statement-credit dashboard for the gated console.
 *
 * Read-only this milestone (M3): renders a vendored M1 snapshot of the
 * Amex Credit Tracker's mock dataset (see data/README.md). All figures are
 * derived server-side from the static JSON via pure helpers in lib/.
 *
 * M5 swaps the static dataset for a live adapter, adds "mark used" writes,
 * and wires the notifier's at-risk feed.
 */

import datasetJson from "./data/dataset.json";
import { AtRiskBanner } from "./components/AtRiskBanner";
import { CardCredits } from "./components/CardCredits";
import { CategoryBar } from "./components/CategoryBar";
import { KpiStrip } from "./components/KpiStrip";
import {
  AS_OF,
  allProgress,
  atRiskProgress,
  capturedByCategory,
  kpiSummary,
  progressByCard,
} from "./lib/derive";
import { shortDate } from "./lib/format";
import type { CreditsDataset } from "./lib/types";

export const metadata = { title: "Credits · Console" };

const dataset = datasetJson as unknown as CreditsDataset;

export default function CreditsPage() {
  const kpis = kpiSummary(dataset, AS_OF);
  const atRisk = atRiskProgress(allProgress(dataset, AS_OF));
  const byCard = progressByCard(dataset, AS_OF);
  const categories = capturedByCategory(dataset);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-6">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-green"
          />
          Statement credits
        </div>
        <h1 className="mt-3 font-serif text-[26px] tracking-tight text-ink">
          Credits
        </h1>
        <p className="mt-1 max-w-prose text-xs text-ink-dim">
          Recovering every annual-fee credit across Amex Platinum, Amex Gold,
          and Chase Sapphire Preferred — captured, remaining, and what&apos;s
          about to expire. Read-only snapshot as of {shortDate(AS_OF.toISOString())}.
        </p>
      </header>

      <div className="grid gap-4">
        <KpiStrip kpis={kpis} asOf={AS_OF} />
        <AtRiskBanner items={atRisk} />
        <div className="grid gap-4">
          {byCard.map(({ card, items }) => (
            <CardCredits key={card.cardId} card={card} items={items} />
          ))}
        </div>
        <CategoryBar data={categories} />
      </div>

      <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Vendored M1 snapshot · {dataset.credits.length} credits ·{" "}
        {dataset.cards.length} cards · live data + writes land in M5
      </p>
    </main>
  );
}
