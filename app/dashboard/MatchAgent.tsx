"use client";

import { useEffect, useRef, useState } from "react";
import type { Job } from "../lib/supabase";

type Message = { role: "user" | "assistant"; content: string };

// J-11: classifier verdict for the most recent exchange. When
// `generalizable === true`, the UI surfaces a "Save to profile" button
// that appends the summary to the user-layer learned-insights.md.
type InsightCandidate = {
  generalizable: boolean;
  summary: string;
  reasoning: string;
};

export default function MatchAgent({ job, onClose }: { job: Job; onClose: () => void }) {
  const intro = `I'm looking at **${job.title}** at **${job.company}**. Before I start tailoring your application, I have a few questions.`;

  // The intro line is a fixed, client-side preamble shown as the first
  // assistant bubble. The actual API conversation starts from the user's
  // first answer; the server's system prompt instructs the model to open
  // with its first question.
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: intro },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const kickedOff = useRef(false);
  // True conversation history sent to the API (may include hidden turns).
  const apiHistoryRef = useRef<Message[]>([]);
  // J-11 state — most recent classifier verdict + UI status of the save.
  const [insight, setInsight] = useState<InsightCandidate | null>(null);
  const [insightSaving, setInsightSaving] = useState(false);
  const [insightStatus, setInsightStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (kickedOff.current) return;
    kickedOff.current = true;
    const kickoff: Message = {
      role: "user",
      content: "(begin interview — ask your first question)",
    };
    apiHistoryRef.current = [kickoff];
    void runTurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runTurn() {
    setStreaming(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiHistoryRef.current,
          job,
          mode: "match-agent",
        }),
      });
      // Disabled/error replies come back as JSON (success streams are
      // text/plain). Auth can die mid-conversation — e.g. the API key
      // hits a billing wall and no OAuth token is configured — and that
      // must read as a quiet notice, not a thrown error.
      if ((res.headers.get("content-type") ?? "").includes("application/json")) {
        const body = (await res.json().catch(() => null)) as
          | { disabled?: boolean; error?: string }
          | null;
        if (body?.disabled) {
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = {
              role: "assistant",
              content: "match agent offline — approvals unaffected",
            };
            return copy;
          });
          return;
        }
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
      apiHistoryRef.current = [
        ...apiHistoryRef.current,
        { role: "assistant", content: acc },
      ];
      // Persist the conversation after the assistant's reply lands. The
      // tailor reads this column at approval time, so saving here
      // captures everything up to the most recent exchange even if the
      // user closes the panel mid-conversation.
      void persistChat(apiHistoryRef.current);
      // J-11 — fire-and-forget classifier on the recent turns. If the
      // model thinks Vishal revealed a generalizable preference, the
      // "Save to profile" button appears.
      void classifyForInsight(apiHistoryRef.current);
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `Error: ${(err as Error).message}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  // J-11 — Run the classifier. Only update state if the most recent
  // user message has actually arrived (skip on the kick-off turn before
  // Vishal has said anything substantive).
  async function classifyForInsight(history: Message[]) {
    const cleaned = history.filter(
      (m) => !(m.role === "user" && m.content.startsWith("(begin interview")),
    );
    // Need at least one user-content turn after the kickoff to bother.
    const hasRealUserTurn = cleaned.some((m) => m.role === "user");
    if (!hasRealUserTurn) return;
    try {
      const res = await fetch("/api/dashboard/profile-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "classify", history: cleaned }),
      });
      if (!res.ok) return;
      const verdict = (await res.json()) as InsightCandidate;
      // Only flip the button on if the verdict is positive AND the
      // summary string is non-empty. Reset to null on a negative
      // verdict so a fresh-but-non-generalizable turn clears stale UI.
      if (verdict.generalizable && verdict.summary.trim()) {
        setInsight(verdict);
        setInsightStatus("idle");
        setInsightError(null);
      } else {
        setInsight(null);
      }
    } catch {
      // Classification failures are non-fatal; the chat still works.
    }
  }

  async function saveInsight() {
    if (!insight || insightSaving) return;
    setInsightSaving(true);
    setInsightError(null);
    try {
      const res = await fetch("/api/dashboard/profile-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          summary: insight.summary,
          source_job_id: job.id,
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `save failed: ${res.status}`);
      }
      setInsightStatus("saved");
    } catch (err) {
      setInsightStatus("error");
      setInsightError(err instanceof Error ? err.message : String(err));
    } finally {
      setInsightSaving(false);
    }
  }

  // Save the running conversation back to jobs.match_chat. Filters out the
  // hidden kickoff turn ("(begin interview — ask your first question)") so
  // the persisted record is just the human-readable interview.
  async function persistChat(history: Message[]) {
    const cleaned = history.filter(
      (m) =>
        !(m.role === "user" && m.content.startsWith("(begin interview")),
    );
    try {
      await fetch(`/api/dashboard/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_chat: cleaned }),
      });
    } catch (err) {
      // Failure here is non-fatal — the conversation still works in
      // memory; only the next-run tailor loses access to it.
      console.warn("MatchAgent: failed to persist chat:", err);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    apiHistoryRef.current = [...apiHistoryRef.current, userMsg];
    await runTurn();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col border-l border-rule bg-bg-raised sm:max-w-md"
      >
        <header className="flex items-start justify-between gap-3 border-b border-rule p-4">
          <div className="min-w-0">
            <div className="mb-0.5 text-[10px] uppercase tracking-[0.18em] text-green">
              Match Agent
            </div>
            <h2 className="truncate text-[13px] font-medium text-ink">{job.title}</h2>
            <p className="truncate text-xs text-ink-faint">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-2 text-2xl leading-none text-ink-faint transition-colors duration-150 hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-8 whitespace-pre-wrap border border-rule bg-bg px-3 py-2 leading-relaxed text-ink"
                  : "mr-4 whitespace-pre-wrap border-l-2 border-green-dim pl-3 leading-relaxed text-ink-dim"
              }
            >
              {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
            </div>
          ))}
        </div>

        {insight && (
          <div className="border-t border-rule bg-bg-card px-4 py-3">
            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-amber">
              Generalizable preference detected
            </div>
            <p className="mb-2 text-xs text-ink">
              <span className="text-amber">“</span>
              {insight.summary}
              <span className="text-amber">”</span>
            </p>
            {insight.reasoning && (
              <p className="mb-2 text-[11px] italic text-ink-dim">
                {insight.reasoning}
              </p>
            )}
            <div className="flex items-center gap-2">
              {insightStatus === "saved" ? (
                <span className="text-xs text-green">
                  ✓ Saved to learned-insights.md
                </span>
              ) : (
                <>
                  <button
                    onClick={saveInsight}
                    disabled={insightSaving}
                    className="border border-amber px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber transition-colors duration-150 hover:bg-amber hover:text-bg active:duration-0 disabled:opacity-40"
                  >
                    {insightSaving ? "saving…" : "save to profile"}
                  </button>
                  <button
                    onClick={() => setInsight(null)}
                    className="border border-rule px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-dim transition-colors duration-150 hover:border-amber hover:text-amber active:duration-0"
                  >
                    dismiss
                  </button>
                </>
              )}
              {insightStatus === "error" && insightError && (
                <span className="text-xs text-red">{insightError}</span>
              )}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2 border-t border-rule p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Answer…"
            className="flex-1 border border-rule bg-bg px-3 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-amber focus:outline-none"
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="border border-rule px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-dim transition-colors duration-150 hover:border-amber hover:text-amber active:duration-0 disabled:opacity-40"
          >
            send
          </button>
        </form>
      </aside>
    </div>
  );
}
