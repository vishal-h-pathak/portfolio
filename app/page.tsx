import { Bench } from "@/components/Bench";
import { Contact } from "@/components/Contact";
import { Experience } from "@/components/Experience";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { KbdHint } from "@/components/KbdHint";
import { Lineage } from "@/components/Lineage";
import { Nav } from "@/components/Nav";
import { Notebook } from "@/components/Notebook";
import { WorkshopRail } from "@/components/WorkshopRail";
import { PROJECTS } from "@/content/projects";
import {
  formatUpdatedFallback,
  formatUpdatedLabel,
  getLastUpdated,
} from "@/app/lib/last-updated";

// ISR: the workshop rail server-renders live jobpipe telemetry; 5 min
// staleness is acceptable there (matches /api/bench/activity). The bench
// last-updated dates resolve here too, server-side and ISR-cached.
export const revalidate = 300;

// Resolve a { slug -> "updated …" } map: prefer the live GitHub `pushed_at`,
// fall back to the manual `updated` (YYYY-MM), else omit the slug entirely.
async function resolveUpdatedMap(): Promise<Record<string, string>> {
  const entries = await Promise.all(
    PROJECTS.map(async (p) => {
      let label: string | null = null;
      if (p.repo) {
        const date = await getLastUpdated(p.repo);
        if (date) label = formatUpdatedLabel(date);
      }
      if (!label && p.updated) label = formatUpdatedFallback(p.updated);
      return [p.slug, label] as const;
    }),
  );
  return Object.fromEntries(
    entries.filter((e): e is [string, string] => e[1] !== null),
  );
}

export default async function Home() {
  const updatedMap = await resolveUpdatedMap();

  return (
    <>
      <Nav />
      <div className="page">
        <Notebook>
          <Hero />
          <Lineage />
          <Experience />
          <Bench updatedMap={updatedMap} />
          <Contact />
        </Notebook>
        <WorkshopRail />
      </div>
      <Footer />
      <KbdHint />
    </>
  );
}
