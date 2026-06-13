/**
 * chat-oauth — isolated adapter that serves chat completions through the
 * Claude Agent SDK using subscription auth (CLAUDE_CODE_OAUTH_TOKEN from
 * `claude setup-token`) instead of pay-per-token API credits.
 *
 * The Agent SDK spawns the bundled Claude Code CLI as a subprocess. That
 * works under local `npm run dev` (Node on a real filesystem); on Vercel's
 * serverless runtime the CLI binary generally can't be bundled/spawned, so
 * callers must treat any throw from these functions as "fall through to
 * disabled" — never as a 5xx. See README "Chat auth".
 *
 * The conversation history is flattened into a single prompt because the
 * Agent SDK takes a prompt, not a raw messages array; each serverless-style
 * request replays the whole interview transcript, which is small (3–4
 * questions). Streaming is real (`includePartialMessages` relays the API's
 * text deltas) — if no deltas arrive but a final result does, the full
 * reply is yielded at once rather than fake-chunked.
 */

import { query, type Options } from "@anthropic-ai/claude-agent-sdk";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * The subprocess env REPLACES process.env, so inherit it but drop
 * ANTHROPIC_API_KEY — a present (billing-blocked) key would shadow the
 * subscription token inside the CLI's own auth resolution.
 */
function subprocessEnv(oauthToken: string): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  env.CLAUDE_CODE_OAUTH_TOKEN = oauthToken;
  return env;
}

function baseOptions(opts: {
  system: string;
  model: string;
  oauthToken: string;
}): Options {
  return {
    systemPrompt: opts.system,
    model: opts.model,
    maxTurns: 1,
    allowedTools: [],
    // Pure model call: don't load filesystem settings/CLAUDE.md (the
    // profile is already injected via systemPrompt) and don't write
    // session transcripts for every chat turn.
    settingSources: [],
    persistSession: false,
    env: subprocessEnv(opts.oauthToken),
  };
}

function flattenHistory(messages: ChatMessage[]): string {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
    .join("\n\n");
  return (
    "Below is the conversation so far. Reply with the assistant's next " +
    "message only — no transcript markers, no preamble.\n\n" +
    transcript
  );
}

/**
 * Stream the assistant's next reply for a chat history. Yields text chunks.
 * Throws if the agent subprocess can't start or the turn errors — the
 * caller decides whether that degrades to "disabled".
 */
export async function* oauthChatStream(opts: {
  system: string;
  messages: ChatMessage[];
  model: string;
  oauthToken: string;
}): AsyncGenerator<string> {
  const q = query({
    prompt: flattenHistory(opts.messages),
    options: { ...baseOptions(opts), includePartialMessages: true },
  });

  let streamed = false;
  let finalText = "";
  for await (const msg of q) {
    if (msg.type === "stream_event") {
      const ev = msg.event;
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        streamed = true;
        yield ev.delta.text;
      }
    } else if (msg.type === "result") {
      if (msg.subtype === "success") {
        finalText = msg.result;
      } else {
        const detail = msg.errors?.length ? ` — ${msg.errors.join("; ")}` : "";
        throw new Error(`agent SDK turn failed: ${msg.subtype}${detail}`);
      }
    }
  }
  // No partial deltas arrived but the turn succeeded (some runtimes/paths
  // don't relay stream events): send the whole reply at once, not faked
  // chunk-by-chunk.
  if (!streamed && finalText) yield finalText;
}

/** Single-shot completion (used by the profile-insight classifier). */
export async function oauthCompleteText(opts: {
  system: string;
  prompt: string;
  model: string;
  oauthToken: string;
}): Promise<string> {
  const q = query({ prompt: opts.prompt, options: baseOptions(opts) });
  for await (const msg of q) {
    if (msg.type === "result") {
      if (msg.subtype === "success") return msg.result;
      const detail = msg.errors?.length ? ` — ${msg.errors.join("; ")}` : "";
      throw new Error(`agent SDK turn failed: ${msg.subtype}${detail}`);
    }
  }
  throw new Error("agent SDK stream ended without a result message");
}
