import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/app/lib/supabase-admin";
import { recordAnthropicCost } from "@/app/lib/cost-events";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// The chat model. Opus, API-key only (no oauth path in the portfolio).
const MODEL = "claude-opus-4-6";

// Per-day token ceiling — the audit's "cheap insurance" against a runaway
// chat loop quietly burning Opus tokens. Counts all tokens (input + output +
// cache) recorded under stage="chat" since 00:00 UTC; over the ceiling we
// refuse with a friendly 429 before calling Anthropic. Env-overridable.
const DEFAULT_CHAT_DAILY_TOKEN_CEILING = 1_000_000;

function chatDailyTokenCeiling(): number {
  const raw = Number(process.env.CHAT_DAILY_TOKEN_CEILING);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CHAT_DAILY_TOKEN_CEILING;
}

// Sum today's stage="chat" token usage from cost_events. Returns null on any
// error so the ceiling fails OPEN — a Supabase blip must never wedge the chat.
async function chatTokensUsedToday(
  admin: SupabaseClient,
): Promise<number | null> {
  const todayStartIso = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
  const { data, error } = await admin
    .from("cost_events")
    .select("units")
    .eq("stage", "chat")
    .gte("created_at", todayStartIso);
  if (error || !data) {
    if (error) console.warn(`chat ceiling: usage query failed: ${error.message}`);
    return null;
  }
  let total = 0;
  for (const row of data as { units: Record<string, number> | null }[]) {
    const u = row.units ?? {};
    total +=
      (u.input_tokens ?? 0) +
      (u.output_tokens ?? 0) +
      (u.cache_read ?? 0) +
      (u.cache_creation ?? 0);
  }
  return total;
}

// Seconds until the next 00:00 UTC, for the 429's Retry-After header.
function secondsUntilUtcMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

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

export async function POST(req: NextRequest) {
  const { messages, job, mode } = await req.json();
  const profile = await getProfile();

  // Server-side service-role client for cost telemetry. Null if Supabase env
  // vars are absent — in that case we skip the ceiling (fail open) and the
  // cost-event write, never blocking the chat on missing telemetry config.
  const admin = createAdminClient();

  // Per-day token ceiling: refuse over budget BEFORE spending on Anthropic.
  if (admin) {
    const usedToday = await chatTokensUsedToday(admin);
    const ceiling = chatDailyTokenCeiling();
    if (usedToday !== null && usedToday >= ceiling) {
      return new Response(
        "The daily chat budget has been reached. This is a safety cap to " +
          "keep API spend in check — please try again after 00:00 UTC.",
        {
          status: 429,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Retry-After": String(secondsUntilUtcMidnight()),
          },
        },
      );
    }
  }

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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        // Stream finished cleanly — capture usage and record one cost_events
        // row. finalMessage() resolves from the events we just iterated.
        // job?.id ties this chat spend to the job being tailored. Telemetry is
        // best-effort and self-contained: it must never surface to the user.
        if (admin) {
          try {
            const finalMessage = await stream.finalMessage();
            await recordAnthropicCost(admin, {
              stage: "chat",
              model: MODEL,
              usage: finalMessage.usage,
              jobId: job?.id ?? null,
            });
          } catch (recordErr) {
            console.warn(
              `chat cost recording failed: ${
                recordErr instanceof Error ? recordErr.message : String(recordErr)
              }`,
            );
          }
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
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
