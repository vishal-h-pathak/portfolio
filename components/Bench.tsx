"use client";

import { useEffect, useState } from "react";
import { PROJECTS } from "@/content/projects";
import { Margin } from "./Margin";
import { Project } from "./Project";
import { Section } from "./Section";

type BenchProps = {
  // slug -> "updated …" label, resolved server-side in app/page.tsx.
  updatedMap?: Record<string, string>;
};

export function Bench({ updatedMap }: BenchProps) {
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());

  // Esc collapses all open project cards.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape" && openProjects.size > 0) setOpenProjects(new Set());
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openProjects]);

  const toggle = (num: string) => {
    setOpenProjects((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  return (
    <Section
      id="bench"
      amber
      margin={
        <Margin
          blocks={[
            { label: "§ 4", body: "BENCH" },
            {
              label: "WHAT",
              body: "Tools I build end-to-end, solo, with agentic workflows.",
            },
            { dim: true, body: "click any row to expand" },
          ]}
        />
      }
    >
      <div className="sec-head">
        <div>
          <div className="eyebrow amber">§ 4 &nbsp;·&nbsp; BENCH</div>
          <h2>Bench</h2>
        </div>
        <div className="status amber">5 projects</div>
      </div>
      <p className="bench-intro">
        Personal projects, built independently of GTRI.
      </p>
      {PROJECTS.map((project) => (
        <Project
          key={project.num}
          project={project}
          updatedLabel={updatedMap?.[project.slug]}
          isOpen={openProjects.has(project.num)}
          onToggle={() => toggle(project.num)}
        />
      ))}
    </Section>
  );
}
