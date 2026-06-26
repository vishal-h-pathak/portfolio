import type { SupabaseClient } from "@supabase/supabase-js";
import { anthropicCostUsd } from "@/lib/pricing";

/**
 * Server-only cost-event recorder for the portfolio's Anthropic call sites.
 *
 * The TypeScript counterpart to `jobpipe/shared/cost.record_anthropic`: it
 * builds the `units` jsonb from a call's usage object, prices it via
 * `lib/pricing.ts`, and writes one row to `public.cost_events` (migration
 * 016). Both portfolio call sites — chat (Opus, streaming) and
 * profile-insight (Haiku) — go through here so the row shape stays
 * single-sourced.
 *
 * Best-effort by design: every write is wrapped so a Supabase blip costs a
 * missing telemetry row, never a failed user request. Mirrors the Python
 * recorder's "telemetry must never break the call site" rule.
 *
 * The portfolio only ever calls Anthropic on the API-key path, so
 * `authPath` defaults to "api_key" and dollars are always attributed (the
 * oauth/cost_usd=0 branch lives on the pipeline side).
 *
 * Do not import from client components.
 */

// Tolerant shape: Anthropic's Usage carries these four token fields; the
// cache_* fields are absent on calls that don't touch the prompt cache.
export type AnthropicUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

function asInt(value: number | null | undefined): number {
  return Math.trunc(Number(value) || 0);
}

export async function recordAnthropicCost(
  admin: SupabaseClient,
  opts: {
    stage: string;
    model: string;
    usage: AnthropicUsage | null | undefined;
    authPath?: "api_key" | "oauth";
    jobId?: string | null;
  },
): Promise<void> {
  const { stage, model, usage, authPath = "api_key", jobId = null } = opts;

  const inputTokens = asInt(usage?.input_tokens);
  const outputTokens = asInt(usage?.output_tokens);
  const cacheRead = asInt(usage?.cache_read_input_tokens);
  const cacheCreation = asInt(usage?.cache_creation_input_tokens);

  const units = {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read: cacheRead,
    cache_creation: cacheCreation,
  };

  const costUsd =
    authPath === "oauth"
      ? 0
      : anthropicCostUsd(
          model,
          inputTokens,
          outputTokens,
          cacheRead,
          cacheCreation,
        );

  try {
    const { error } = await admin.from("cost_events").insert({
      // run_id stays null: portfolio chat/insight aren't part of a pipeline run.
      stage,
      service: "anthropic",
      model,
      auth_path: authPath,
      job_id: jobId,
      units,
      cost_usd: costUsd,
    });
    if (error) {
      console.warn(`cost_events insert failed (${stage}): ${error.message}`);
    }
  } catch (err) {
    // Telemetry must never raise into the request path.
    console.warn(
      `cost_events insert threw (${stage}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
