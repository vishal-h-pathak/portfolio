/**
 * lib/pricing.ts — token → USD rate table for the cost tracker (portfolio side).
 *
 * A tiny, dependency-free mirror of `jobpipe/shared/pricing.py`. The two
 * portfolio Anthropic call sites (chat + profile-insight) use this to
 * convert token counts to dollars before writing a `cost_events` row, the
 * same way the Python pipeline does at its call sites.
 *
 * ⚠️ KEEP IN SYNC with `job-pipeline/jobpipe/shared/pricing.py`. The numbers
 * (USD per million tokens, by model family) are duplicated on purpose — the
 * two repos don't share code — so any rate change must land in both tables.
 * As of the build plan (2026-06-26): Opus 5/25, Sonnet 3/15, Haiku 1/5.
 *
 * Cache accounting follows Anthropic's billing model, identical to the
 * Python table:
 *   - `cache_read` (prompt-cache hit) is billed at -90% of the input rate
 *     (i.e. 10% of input).
 *   - `cache_creation` (writing a cache block) is billed at the input rate.
 *
 * An unknown model never throws and never guesses: it returns 0 and warns,
 * so a surprise model id degrades telemetry rather than breaking a call.
 */

// USD per million tokens, by model family. cache_read priced at -90% of
// input; cache_creation at the input rate (see module docstring).
export const RATES: Record<string, { in: number; out: number }> = {
  "claude-opus-4": { in: 5.0, out: 25.0 },
  "claude-sonnet-4": { in: 3.0, out: 15.0 },
  "claude-haiku-4": { in: 1.0, out: 5.0 },
};

// Fraction of the input rate charged for a prompt-cache read (a 90% discount).
const CACHE_READ_DISCOUNT = 0.1;

const PER_MTOK = 1_000_000;

/**
 * Return the rate whose family is a prefix of `model`.
 *
 * Longest-prefix wins so a hypothetical `claude-opus-4` vs a future
 * `claude-opus-40` can't collide on the shorter key — mirrors the Python
 * `_family_for`.
 */
function familyFor(model: string): { in: number; out: number } | null {
  const matches = Object.entries(RATES).filter(([family]) =>
    model.startsWith(family),
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => b[0].length - a[0].length);
  return matches[0][1];
}

/**
 * Convert Anthropic token counts to USD for `model`.
 *
 * Matches `model` to a family in {@link RATES} by prefix. `cacheRead` is
 * priced at 10% of the input rate; `cacheCreation` at the full input rate.
 * An unknown model returns 0 and warns — it never throws.
 */
export function anthropicCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheRead = 0,
  cacheCreation = 0,
): number {
  const rate = familyFor(model);
  if (rate === null) {
    console.warn(`pricing: no rate for model ${model} — recording cost_usd=0`);
    return 0;
  }
  return (
    (inputTokens * rate.in +
      outputTokens * rate.out +
      cacheRead * rate.in * CACHE_READ_DISCOUNT +
      cacheCreation * rate.in) /
    PER_MTOK
  );
}
