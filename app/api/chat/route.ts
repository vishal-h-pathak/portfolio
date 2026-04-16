import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest } from "next/server";

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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await client.messages.stream({
    model: "claude-opus-4-6",
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
