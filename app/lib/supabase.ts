import { createClient } from "@supabase/supabase-js";

export type JobStatus =
  | "new"
  | "approved"
  | "preparing"
  | "ready_to_submit"
  | "submit_confirmed"
  | "applied"
  | "failed"
  | "ignored";

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
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);
