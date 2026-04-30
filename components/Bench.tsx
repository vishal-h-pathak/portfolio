"use client";

import { useEffect, useState } from "react";
import { PROJECTS } from "@/content/projects";
import { Margin } from "./Margin";
import { Project } from "./Project";
import { Section } from "./Section";

export function Bench() {
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
              body: "Personal projects. Built in evenings + weekends, mostly with an LLM as a pair-programmer.",
            },
            {
              label: "VELOCITY",
              body: "1 weekend → in production. Boring infra, just less of it.",
            },
            {
              label: "WHY HERE",
              body: "To make the seam between paid work and side work visible — not blurred.",
            },
            { dim: true, body: "click any row to expand" },
          ]}
        />
      }
    >
      <div className="sec-head">
        <div>
          <div className="eyebrow amber">§ 4 &nbsp;·&nbsp; BENCH</div>
          <h2>The bench, off-hours.</h2>
        </div>
        <div className="status amber">
          <span className="pulse" aria-hidden="true" />2 LIVE · 1 SHIPPED · 1
          WIP
        </div>
      </div>
      <p className="bench-intro">
        These are mine, on my time. They&rsquo;re where I learn agentic systems
        from the inside — not from a podcast. Nothing here was built at GTRI or
        with GTRI resources.
      </p>
      {PROJECTS.map((project) => (
        <Project
          key={project.num}
          project={project}
          isOpen={openProjects.has(project.num)}
          onToggle={() => toggle(project.num)}
        />
      ))}
    </Section>
  );
}
