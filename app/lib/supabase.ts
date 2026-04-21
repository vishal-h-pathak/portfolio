import { createClient } from "@supabase/supabase-js";

export type JobStatus =
  | "new"
  | "approved"
  | "preparing"
  | "ready_to_submit"
  | "submit_confirmed"
  | "submitting"
  | "needs_review"
  | "submitted"
  | "applied"
  | "failed"
  | "ignored";

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
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);
