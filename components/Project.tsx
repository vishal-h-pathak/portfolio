"use client";

import { useState } from "react";
import type { Project as ProjectData } from "@/content/projects";

type ProjectProps = {
  project: ProjectData;
  updatedLabel?: string;
  isOpen: boolean;
  onToggle: () => void;
};

export function Project({
  project,
  updatedLabel,
  isOpen,
  onToggle,
}: ProjectProps) {
  const infoMeta = project.meta.filter((m) => !m.build);
  const buildMeta = project.meta.find((m) => m.build);

  return (
    <article className={`project${isOpen ? " open" : ""}`}>
      <button
        type="button"
        className="project-head"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="num">{project.num}</span>
        <span className="ttl">
          <span className="name">{project.title}</span>
          <span className="one-liner">{project.oneLiner}</span>
        </span>
        <span className="right">
          <span className={`pill ${project.status}`}>
            {project.statusLabel}
          </span>
          {updatedLabel ? (
            <span className="updated">{updatedLabel}</span>
          ) : null}
          <span className="chev" aria-hidden="true">
            ›
          </span>
        </span>
      </button>
      <div className="project-body">
        <div className="project-body-inner">
          <div className="project-body-content">
            {project.paragraphs.map((p) => (
              <p key={p.text} className={p.dim ? "dim" : undefined}>
                {p.text}
              </p>
            ))}
            <div className="project-meta">
              {infoMeta.map((m) => (
                <div key={m.key}>
                  <div className="k">{m.key}</div>
                  <div className="v">{m.value}</div>
                </div>
              ))}
            </div>
            {buildMeta && (
              <div className="project-build">
                <div className="k">{buildMeta.key}</div>
                <div className="v">{buildMeta.value}</div>
              </div>
            )}
            {project.actions.length > 0 && (
              <div className="project-actions">
                {project.actions.map((a) => (
                  <ActionBtn key={a.href} action={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ActionBtn({
  action,
}: {
  action: { label: string; href: string; primary?: boolean };
}) {
  const [feedback, setFeedback] = useState(false);
  const isReal =
    action.href !== "#" &&
    !action.href.startsWith("#") &&
    action.href.length > 0;

  return (
    <a
      className={`btn${action.primary ? " primary" : ""}`}
      href={action.href}
      target={action.href.startsWith("http") ? "_blank" : undefined}
      rel={action.href.startsWith("http") ? "noopener noreferrer" : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (!isReal) {
          e.preventDefault();
          setFeedback(true);
          window.setTimeout(() => setFeedback(false), 900);
        }
      }}
      style={
        feedback
          ? {
              borderColor: "var(--green)",
              color: "var(--green)",
              background: "transparent",
            }
          : undefined
      }
    >
      {feedback ? "✓ noted" : action.label}
    </a>
  );
}
