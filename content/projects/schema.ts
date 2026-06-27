// Content registry schema for Bench / project entries.
//
// This file is the typed contract for every project record. It preserves the
// original `Project` shape verbatim (so the existing UI keeps rendering) and
// ADDS classification + scaling fields. None of the new fields are read by the
// current UI — they exist so a new project can be added as one validated file.

export type ProjectStatus = "live" | "wip" | "shipped" | "archived";

export type ProjectMeta = {
  key: string;
  value: string;
  build?: boolean;
};

export type ProjectAction = {
  label: string;
  href: string;
  primary?: boolean;
};

export type ProjectParagraph = {
  text: string;
  dim?: boolean;
};

// Which auto-generated index an entry belongs to.
export type ProjectTier = "project" | "lab";

// Fixed domain enum — the anti-junk-drawer classification axis.
export type ProjectDomain =
  | "agentic"
  | "trading"
  | "social"
  | "tooling"
  | "bio-sim"
  | "neuro"
  | "cv-ml"
  | "site";

// A live demo / dashboard MOUNT point (never merged into body copy).
export type ProjectEmbed = {
  component: string; // key into a lazy embed registry
  poster: string; // /public path to a static poster
  height?: number;
};

export type ProjectLinks = {
  repo?: string;
  demo?: string;
};

export type Project = {
  // identity ----------------------------------------------------------------
  num: string;
  title: string;
  oneLiner: string;

  // classification (additive — not read by the current UI) ------------------
  slug: string;
  tier: ProjectTier;
  domain: ProjectDomain;
  year: number;
  featured?: boolean;
  tags?: string[];
  summary?: string;

  // status + body (original fields, verbatim) -------------------------------
  status: ProjectStatus;
  statusLabel: string;

  // last-updated provenance (additive) --------------------------------------
  // `repo` is the GitHub source of truth (owner/name) for a live "last updated"
  // date; `updated` is a manual YYYY-MM fallback used when the API can't
  // resolve (e.g. a private repo with no GITHUB_TOKEN set).
  repo?: string;
  updated?: string;
  paragraphs: ProjectParagraph[];
  meta: ProjectMeta[];
  actions: ProjectAction[];

  // optional scaling fields (additive) --------------------------------------
  builtWith?: string[];
  embed?: ProjectEmbed;
  links?: ProjectLinks;
  thumbnail?: string;
};
