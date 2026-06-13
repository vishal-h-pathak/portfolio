/**
 * POST /api/chat — MatchAgent conversation turns.
 *
 * Auth follows the chain in app/lib/chat-auth.ts: API key → subscription
 * OAuth (Agent SDK) → disabled. A billing/auth failure on the API key is
 * marked for a 15-min cool-off and falls through in the same request —
 * one attempt, no retries. When nothing is available the route returns
 * 200 {disabled: true, reason} (never a 5xx): chat is an enhancer and its
 * absence must not look like a broken pipeline.
 *
 * Success responses stream text/plain; the disabled/error responses are
 * application/json, which is how the client tells them apart.
 */

import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  isApiKeyUnusableError,
  markApiKeyUnusable,
  resolveChatAuth,
} from "../../lib/chat-auth";
import { oauthChatStream, type ChatMessage } from "../../lib/chat-oauth";

export const runtime = "nodejs";

let cachedProfile: string | null = null;
async function getProfile() {
  if (cachedProfile) return cachedProfile;
  try {
    cachedProfile = await fs.readFile(path.join(process.cwd(), "CLAUDE.md"), "utf8");
  } catch {
    cachedProfile = "";
  }
  return cachedProfile;
}

async function* apiTextDeltas(
  stream: AsyncIterable<Anthropic.Messages.RawMessageStreamEvent>,
): AsyncGenerator<string> {
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

function textStreamResponse(chunks: AsyncIterable<string>, mode: "api" | "oauth") {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of chunks) {
          controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n[error: ${(err as Error).message}]`)
        );
      } finally {
        controller.close();
      }
    },
  });
  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Chat-Mode": mode,
    },
  });
}

export async function POST(req: NextRequest) {
  const { messages, job, mode } = await req.json();
  const profile = await getProfile();

  const matchAgentInstructions = `You are the Match Agent. Your job is to interview Vishal briefly (3–4 targeted questions, one at a time) and then produce tailored application materials for this specific job.

Conversation protocol:
1. The conversation will open with a hidden kickoff turn from Vishal. On your first reply, ask ONLY the first question. Do not repeat the intro line — that was already shown in the UI.
2. Ask exactly ONE question per message. Wait for the answer before asking the next.
3. Cover these topics across 3–4 questions (adapt the wording to this specific role): (a) why this role specifically interests him, (b) which parts of his experience he wants to emphasize for this job, (c) anything unusual about his situation for this application (timing, location, gaps, pivots, etc.), and optionally (d) one follow-up to sharpen whichever answer was thinnest.
4. After you have his answers, produce a final message containing two sections, clearly labeled:
   - **Tailored cover letter** — a full draft, ready to paste.
   - **Resume bullet suggestions** — 4–6 concrete bullet-point rewrites or additions tailored to this role, referencing specific experiences from his profile.
5. Do not produce the cover letter or bullets before the interview is done. Do not pad with fluff.

Voice: direct, specific, no corporate cliches. Match Vishal's technical depth.`;

  const baseSystem = `You are helping Vishal Pathak tailor his job application. Use the profile below as ground truth about who he is, what he wants, and how he works. Help him draft cover letters, tailor resume bullets, prep for interviews, and think through fit. Be direct, specific, and concise — no fluff. Reference concrete details from his background when relevant.`;

  const system = `${mode === "match-agent" ? matchAgentInstructions : baseSystem}

=== VISHAL'S PROFILE (from CLAUDE.md) ===
${profile}

=== JOB UNDER DISCUSSION ===
Title: ${job?.title ?? ""}
Company: ${job?.company ?? ""}
Location: ${job?.location ?? ""}
Tier: ${job?.tier ?? ""}
Score: ${job?.score ?? ""}
URL: ${job?.url ?? ""}
Reasoning (why this matched): ${job?.reasoning ?? ""}`;

  const chatMessages: ChatMessage[] = (messages ?? []).map(
    (m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }),
  );

  let auth = resolveChatAuth();

  if (auth.mode === "api") {
    const client = new Anthropic({ apiKey: auth.apiKey });
    try {
      // `create({stream: true})` rejects here on billing/auth errors —
      // before any bytes are committed — so the chain can still fall
      // through to OAuth or disabled.
      const stream = await client.messages.create({
        model: auth.model,
        max_tokens: 2048,
        system,
        messages: chatMessages,
        stream: true,
      });
      return textStreamResponse(apiTextDeltas(stream), "api");
    } catch (err) {
      if (!isApiKeyUnusableError(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `chat call failed: ${msg}` }, { status: 502 });
      }
      markApiKeyUnusable();
      auth = resolveChatAuth();
    }
  }

  if (auth.mode === "oauth") {
    try {
      const chunks = oauthChatStream({
        system,
        messages: chatMessages,
        model: auth.model,
        oauthToken: auth.token,
      });
      // Prime the generator before committing to a 200 stream: if the
      // agent subprocess can't start (e.g. Vercel serverless can't spawn
      // the bundled CLI), degrade to a clean disabled response instead.
      const first = await chunks.next();
      async function* primed() {
        if (!first.done) yield first.value;
        yield* chunks;
      }
      return textStreamResponse(primed(), "oauth");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({
        disabled: true,
        reason: `subscription auth unavailable on this runtime: ${msg}`,
      });
    }
  }

  return NextResponse.json({
    disabled: true,
    reason: auth.mode === "disabled" ? auth.reason : "chat auth unavailable",
  });
}
