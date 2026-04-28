/**
 * /api/dashboard/profile-insight (J-11)
 *
 * Two operations:
 *   - POST { action: "classify", history }
 *       Runs a small Anthropic call on the recent chat turns and decides
 *       whether the conversation revealed a generalizable preference
 *       worth saving back to Vishal's profile (vs. a job-specific
 *       comment that doesn't generalize). Returns
 *       { generalizable: boolean, summary: string, reasoning: string }.
 *
 *   - POST { action: "save", summary, source_job_id }
 *       Appends the summary to `../job-hunter/profile/learned-insights.md`
 *       under a dated heading. The user-layer profile loader picks the
 *       file up automatically because `learned-insights.md` is in
 *       `_USER_LAYER_FILES`. Idempotent — re-running with the same
 *       summary appends a fresh dated entry; the operator de-dupes by
 *       hand if needed.
 *
 * Auth: protected by middleware.ts (dashboard_auth cookie).
 */

import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = "claude-haiku-4-5-20251001";

const CLASSIFIER_SYSTEM = `You are inspecting the most recent turns of a chat between Vishal Pathak (a job-seeker) and an AI Match Agent that's helping him decide whether a specific job is a fit and what to emphasize on his application. Your job is to decide whether this exchange contains a "generalizable preference" — a learning ABOUT VISHAL that would help future tailoring runs across many roles, not just THIS role.

Examples of GENERALIZABLE insights:
- "I'd consider defense AI if it's clearly applied research" → updates his disqualifier list, applies to many future roles.
- "I want to be in the same building as the team I'm building for" → broad preference, applies to every future role.
- "I'd take a 20% comp cut for connectomics" → comp policy, applies broadly.

Examples of JOB-SPECIFIC context (NOT generalizable):
- "I want to emphasize my 360-SA work for this Anthropic role" → emphasis decision specific to this application.
- "Tell them about my Spynel frame grabber" → one-job framing detail.
- "This recruiter sent a weird email" → noise.

Be conservative. Most chat content is NOT generalizable. Only flag the conversation when the user clearly stated a preference that would be useful for FUTURE roles he hasn't seen yet.

Respond with ONLY a JSON object:

{
  "generalizable": true | false,
  "summary": "<one-sentence statement of the insight in Vishal's voice — empty string if not generalizable>",
  "reasoning": "<one sentence on why>"
}`;

type Message = { role: "user" | "assistant"; content: string };

async function classify(history: Message[]) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userMsg =
    "Recent chat turns (most recent last):\n\n" +
    history
      .slice(-6)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: CLASSIFIER_SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });
  const text = resp.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("classifier response had no JSON object");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function resolveLearnedInsightsPath(): string {
  // The dashboard runs from `portfolio/` during local dev. The canonical
  // user-layer profile lives in the sibling `job-hunter/profile/` repo.
  // process.cwd() inside `next dev` is the portfolio root, so
  // `../job-hunter/profile/learned-insights.md` is the target.
  return path.join(
    process.cwd(),
    "..",
    "job-hunter",
    "profile",
    "learned-insights.md",
  );
}

async function ensureFileExists(p: string) {
  try {
    await fs.access(p);
  } catch {
    const header =
      "# Learned Insights\n\n" +
      "User-layer file. Each entry below was confirmed by Vishal in a\n" +
      "Match Agent chat as a *generalizable* preference (vs. a job-\n" +
      "specific comment). The prompt loader concatenates this file into\n" +
      "every prompt's profile injection — entries take effect on the\n" +
      "next tailoring run.\n\n";
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, header, "utf8");
  }
}

async function append(summary: string, sourceJobId: string | null) {
  const target = resolveLearnedInsightsPath();
  await ensureFileExists(target);
  const today = new Date().toISOString().slice(0, 10);
  const sourceTag = sourceJobId ? ` · job ${sourceJobId}` : "";
  const block = `\n## Learned ${today}${sourceTag}\n\n${summary.trim()}\n`;
  await fs.appendFile(target, block, "utf8");
  return target;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body?.action;

  try {
    if (action === "classify") {
      const history = (body?.history ?? []) as Message[];
      if (!Array.isArray(history) || history.length === 0) {
        return NextResponse.json(
          { error: "history must be a non-empty array" },
          { status: 400 },
        );
      }
      const result = await classify(history);
      return NextResponse.json(result);
    }

    if (action === "save") {
      const summary = String(body?.summary ?? "").trim();
      const sourceJobId = body?.source_job_id ? String(body.source_job_id) : null;
      if (!summary) {
        return NextResponse.json(
          { error: "summary is required and must be non-empty" },
          { status: 400 },
        );
      }
      const written = await append(summary, sourceJobId);
      return NextResponse.json({ ok: true, written });
    }

    return NextResponse.json(
      { error: `unknown action: ${action}` },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
