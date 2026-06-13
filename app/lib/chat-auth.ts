/**
 * chat-auth — server-side auth resolution for the MatchAgent chat and the
 * J-11 profile-insight classifier (the two routes that call Anthropic).
 *
 * Resolution chain, evaluated per request:
 *   1. ANTHROPIC_API_KEY set AND not cooling off       → mode "api"
 *   2. CLAUDE_CODE_OAUTH_TOKEN set (subscription auth) → mode "oauth"
 *   3. neither                                         → mode "disabled"
 *
 * When an API call fails with a billing/credit error (or an invalid key),
 * the route reports it via markApiKeyUnusable() and the key is skipped for
 * the next 15 minutes, so subsequent requests fall through to OAuth or
 * disabled instead of burning a doomed attempt per turn.
 *
 * The cool-off lives in module state: per warm serverless instance, reset
 * on cold start. That's fine — the worst case after a cold start is one
 * failed call before the instance re-learns the key is dead.
 *
 * Chat is an enhancer, not a gate: nothing in review/approve/skip/tailor
 * may depend on this resolving to anything but "disabled".
 */

export type ChatMode = "api" | "oauth" | "disabled";

export type ChatAuthResolution =
  | { mode: "api"; apiKey: string; model: string }
  | { mode: "oauth"; token: string; model: string }
  | { mode: "disabled"; reason: string };

const COOL_OFF_MS = 15 * 60 * 1000;

let apiKeyCoolOffUntil = 0;

export function chatModel(): string {
  return process.env.CHAT_MODEL?.trim() || "claude-opus-4-8";
}

export function resolveChatAuth(): ChatAuthResolution {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const coolingOff = Date.now() < apiKeyCoolOffUntil;
  if (apiKey && !coolingOff) {
    return { mode: "api", apiKey, model: chatModel() };
  }

  const token = process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim();
  if (token) {
    return { mode: "oauth", token, model: chatModel() };
  }

  const reason =
    apiKey && coolingOff
      ? "ANTHROPIC_API_KEY failed with a billing/auth error and is cooling off; no CLAUDE_CODE_OAUTH_TOKEN configured"
      : "neither ANTHROPIC_API_KEY nor CLAUDE_CODE_OAUTH_TOKEN is configured";
  return { mode: "disabled", reason };
}

/** Skip the API key for the next 15 minutes (one attempt + cool-off, no retries). */
export function markApiKeyUnusable(): void {
  apiKeyCoolOffUntil = Date.now() + COOL_OFF_MS;
}

/**
 * True for errors that mean the key won't work until a human intervenes:
 * billing/credit failures (400/402-class with a billing message) and
 * invalid-key auth failures (401). Transient errors (429, 5xx, network)
 * return false so a healthy key isn't benched by a blip.
 */
export function isApiKeyUnusableError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 401) return true;
  if (status === 400 || status === 402 || status === 403) {
    const msg =
      err instanceof Error ? err.message : typeof err === "string" ? err : "";
    return /billing|credit|balance|purchase|payment|plan/i.test(msg);
  }
  return false;
}
