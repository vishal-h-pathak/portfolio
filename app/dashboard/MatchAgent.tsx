"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, type Job } from "../lib/supabase";

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
      await supabase
        .from("jobs")
        .update({ match_chat: cleaned })
        .eq("id", job.id);
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
        className="w-full sm:max-w-md h-full bg-neutral-950 border-l border-neutral-800 flex flex-col"
      >
        <header className="p-4 border-b border-neutral-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 mb-0.5">
              Match Agent
            </div>
            <h2 className="font-medium text-neutral-100 truncate">{job.title}</h2>
            <p className="text-xs text-neutral-500 truncate">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-200 text-2xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-6 rounded-lg bg-neutral-800/70 text-neutral-100 px-3 py-2 whitespace-pre-wrap"
                  : "mr-6 rounded-lg bg-neutral-900/60 border border-neutral-800 text-neutral-200 px-3 py-2 whitespace-pre-wrap"
              }
            >
              {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
            </div>
          ))}
        </div>

        {insight && (
          <div className="border-t border-neutral-800 px-4 py-3 bg-amber-950/20">
            <div className="text-[10px] uppercase tracking-widest text-amber-400 mb-1">
              Generalizable preference detected
            </div>
            <p className="text-sm text-amber-100 mb-2">
              <span className="text-amber-300">“</span>
              {insight.summary}
              <span className="text-amber-300">”</span>
            </p>
            {insight.reasoning && (
              <p className="text-[11px] text-amber-200/70 mb-2 italic">
                {insight.reasoning}
              </p>
            )}
            <div className="flex items-center gap-2">
              {insightStatus === "saved" ? (
                <span className="text-xs text-emerald-400">
                  ✓ Saved to learned-insights.md
                </span>
              ) : (
                <>
                  <button
                    onClick={saveInsight}
                    disabled={insightSaving}
                    className="text-xs px-3 py-1.5 rounded border border-amber-700 bg-amber-900/40 hover:bg-amber-800/60 text-amber-100 disabled:opacity-40"
                  >
                    {insightSaving ? "Saving…" : "Save to profile"}
                  </button>
                  <button
                    onClick={() => setInsight(null)}
                    className="text-xs px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-400"
                  >
                    Dismiss
                  </button>
                </>
              )}
              {insightStatus === "error" && insightError && (
                <span className="text-xs text-red-400">{insightError}</span>
              )}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="border-t border-neutral-800 p-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Answer…"
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600"
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-3 py-2 text-sm rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </aside>
    </div>
  );
}
