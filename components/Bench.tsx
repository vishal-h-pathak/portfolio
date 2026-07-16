"use client";

import { useState } from "react";
import { PROJECTS } from "@/content/projects";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { Margin } from "./Margin";
import { Project } from "./Project";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

type BenchProps = {
  // slug -> "updated …" label, resolved server-side in app/page.tsx.
  updatedMap?: Record<string, string>;
};

export function Bench({ updatedMap }: BenchProps) {
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());

  // Esc collapses all open project cards.
  useEscapeToClose(openProjects.size > 0, () => setOpenProjects(new Set()));

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
            { label: "§ 4", body: "BENCH", hideOnMobile: true },
            {
              label: "WHAT",
              body: "Tools I build end-to-end, solo, with agentic workflows.",
            },
            { dim: true, body: "click any row to expand" },
          ]}
        />
      }
    >
      <SectionHeader
        number="§ 4"
        label="BENCH"
        title="Bench"
        accent="amber"
        status={{ tone: "amber", label: `${PROJECTS.length} projects` }}
        lede="Personal projects, built independently of GTRI."
      />
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
