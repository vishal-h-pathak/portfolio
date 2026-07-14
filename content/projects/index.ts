// Content registry barrel.
//
// Aggregates every project record (in canonical order), runs a build-time
// integrity guard, and re-exports the public surface. Importing
// `@/content/projects` resolves here, so existing call sites are unchanged.
//
// Adding a project = drop one `<slug>.ts` file and add it to RAW below.

import type { Project, ProjectTier } from "./schema";
import { soliton } from "./soliton";
import { papercuts } from "./papercuts";
import { jobPipeline } from "./job-pipeline";
import { cellularGaits } from "./cellular-gaits";
import { fleetControlSystem } from "./fleet-control-system";
import { thisSite } from "./this-site";

export * from "./schema";

// Array order is the display order and must match ascending `num` plates
// (enforced below) — soliton inherits meridian's B-01 slot, "This site"
// stays the closing B-06 entry.
const RAW: Project[] = [soliton, papercuts, jobPipeline, cellularGaits, fleetControlSystem, thisSite];

// Build-time integrity guard. Plain TS (no zod in the client bundle): runs at
// module load, so a malformed or duplicated entry throws and fails the build.
const NUM_RE = /^B-\d{2}$/;
const SLUG_RE = /^[a-z0-9-]+$/;

function assertRegistry(projects: Project[]): Project[] {
  const seenSlugs = new Set<string>();
  const seenNums = new Set<string>();

  projects.forEach((p, i) => {
    if (!NUM_RE.test(p.num)) {
      throw new Error(
        `[content/projects] malformed num "${p.num}" on "${p.slug}" — expected /^B-\\d{2}$/`,
      );
    }
    if (!SLUG_RE.test(p.slug)) {
      throw new Error(
        `[content/projects] malformed slug "${p.slug}" on "${p.title}" — expected /^[a-z0-9-]+$/`,
      );
    }
    if (seenSlugs.has(p.slug)) {
      throw new Error(`[content/projects] duplicate slug "${p.slug}"`);
    }
    if (seenNums.has(p.num)) {
      throw new Error(`[content/projects] duplicate num "${p.num}"`);
    }
    const expectedNum = `B-${String(i + 1).padStart(2, "0")}`;
    if (p.num !== expectedNum) {
      throw new Error(
        `[content/projects] out-of-order num "${p.num}" on "${p.slug}" at position ${i} — expected "${expectedNum}" (array order must match ascending num)`,
      );
    }
    seenSlugs.add(p.slug);
    seenNums.add(p.num);
  });

  return projects;
}

export const PROJECTS: Project[] = assertRegistry(RAW);

export const byTier = (tier: ProjectTier): Project[] =>
  PROJECTS.filter((p) => p.tier === tier);

export const bySlug = (slug: string): Project | undefined =>
  PROJECTS.find((p) => p.slug === slug);
