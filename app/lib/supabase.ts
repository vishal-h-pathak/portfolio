import { createClient } from "@supabase/supabase-js";

export type JobStatus =
  // M-2 canonical lifecycle (career-ops alignment).
  | "discovered"
  | "new"
  | "approved"
  | "preparing"
  | "ready_for_review"
  | "prefilling"
  | "awaiting_human_submit"
  | "applied"
  | "failed"
  | "skipped"
  | "expired"
  | "ignored"
  // Legacy union members kept for back-compat with older dashboard
  // code that hasn't been updated to the new lifecycle yet. Migration
  // 007 collapsed every existing row in these states to ready_for_review,
  // and the CHECK constraint will reject any new write to them — so
  // these are read-only at this point.
  | "ready_to_submit"
  | "submit_confirmed"
  | "submitting"
  | "needs_review"
  | "submitted";


/**
 * M-1 form-answer drafts. Identity / contact / location / comp / work-auth
 * / current-employment fields are filled from profile.yml in Python; only
 * the four narrative fields below (and additional_questions) are LLM-
 * drafted. The cockpit (M-6) renders these as copy-paste drafts the
 * human can paste into form fields the per-ATS handler couldn't reach.
 */
export type FormAnswerQuestion = {
  question: string;
  draft_answer: string;
};

export type FormAnswers = {
  // Identity (pulled from profile.yml; never LLM-generated)
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  linkedin_url?: string;
  github_url?: string | null;
  portfolio_url?: string;
  // Location & comp
  current_location?: string;
  willing_to_relocate?: string;
  remote_preference?: string;
  salary_expectation?: string;
  work_authorization?: string;
  notice_period?: string;
  availability_to_start?: string;
  // Current employment
  current_company?: string;
  current_title?: string;
  years_of_experience?: number;
  // Narrative (LLM-drafted; constrained word counts)
  why_this_role?: string;
  why_this_company?: string;
  additional_info?: string | null;
  additional_questions?: FormAnswerQuestion[];
};

/**
 * Shape of the `submission_log` JSONB column written by job-submitter's
 * review/packet.py::build_packet. See that module for the source of truth;
 * this type mirrors it for the portfolio dashboard's review queue.
 */
export type FilledField = {
  label: string;
  value: string;
  confidence: number;
  kind: "text" | "select" | "file" | "checkbox" | "radio" | "textarea" | "other";
};

export type SkippedField = {
  label: string;
  reason: string;
};

export type PacketScreenshot = {
  label: string;
  storage_path: string;
};

export type SubmissionPacket = {
  attempt_n: number;
  adapter: string;
  reason: string;
  confidence: number;
  filled_fields: FilledField[];
  skipped_fields: SkippedField[];
  screenshots: PacketScreenshot[];
  stagehand_session_id: string | null;
  browserbase_replay_url: string | null;
  agent_reasoning: string | null;
  review_url: string;
};

export type Job = {
  id: string | number;
  title: string;
  company: string;
  location: string | null;
  score: number | null;
  tier: 1 | 2 | 3 | null;
  reasoning: string | null;
  url: string | null;
  source: string | null;
  status: JobStatus | null;
  created_at: string | null;
  status_updated_at: string | null;
  resume_path: string | null;
  cover_letter_path: string | null;
  resume_pdf_path: string | null;
  cover_letter_pdf_path: string | null;
  application_url: string | null;
  application_notes: string | null;
  applied_at: string | null;
  failure_reason: string | null;
  description: string | null;
  notified: boolean | null;
  // Populated by job-submitter when an attempt lands in needs_review. Null
  // until the submitter runs or after the reviewer approves/dismisses and
  // the packet is cleared. See SubmissionPacket above for the full shape.
  submission_log: SubmissionPacket | null;
  confidence: number | null;
  // Match Agent conversation persisted from the dashboard chat. Read by
  // the tailor at approval time and surfaced in the LLM prompts as
  // authoritative framing for THIS specific role. Null = no chat yet.
  match_chat: { role: "user" | "assistant"; content: string }[] | null;
  // Posting Legitimacy axis (J-2). Evaluated by the scorer alongside fit
  // but stored separately so it never leaks into the fit score. Surfaces
  // as a colored pill in the review panel — soft warning, not a gate.
  legitimacy: "high_confidence" | "proceed_with_caution" | "suspicious" | null;
  legitimacy_reasoning: string | null;
  // Archetype routing (J-4). Tailor classifies each JD into one of the
  // archetypes defined in profile.yml; persisted here for analytics
  // (/dashboard/insights) and to show the reviewer which lane was used.
  archetype: string | null;
  archetype_confidence: number | null;
  // M-1: form-answer drafts (career-ops Block H). Authoritative source
  // for both the per-ATS DOM handlers and the cockpit's copy-paste UI.
  // Null when score < 6 or the generation step failed.
  form_answers: FormAnswers | null;
  // M-3: stop-at-submit support columns.
  submission_url: string | null;          // resolved real ATS apply URL
  prefill_screenshot_path: string | null; // job-materials/{job_id}/prefill.png
  prefill_completed_at: string | null;    // when the per-ATS handler finished
  submitted_at: string | null;            // when the HUMAN clicked Mark Applied
  submission_notes: string | null;        // free-text notes from the cockpit modal
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);
