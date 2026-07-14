"use client";

import { useEffect } from "react";
import { useLiveClock } from "@/lib/useLiveClock";
import { useScrollSpy } from "@/lib/useScrollSpy";

const NAV_ITEMS = [
  { id: "about", label: "§1 ABOUT", amber: false },
  { id: "lineage", label: "§2 LINEAGE", amber: false },
  { id: "experience", label: "§3 EXPERIENCE", amber: false },
  { id: "bench", label: "§4 BENCH", amber: true },
  { id: "contact", label: "§5 CONTACT", amber: false },
] as const;

const SECTION_IDS = NAV_ITEMS.map((n) => n.id);

export function Nav() {
  const active = useScrollSpy(SECTION_IDS, "about");
  const clock = useLiveClock();

  // Keyboard shortcuts 1–5 jump to the corresponding section.
  // (Esc collapse is owned by Lineage and Bench themselves.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= "1" && e.key <= "5") {
        const id = SECTION_IDS[parseInt(e.key, 10) - 1];
        const el = id ? document.getElementById(id) : null;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="nav">
      <div className="nav-inner">
        <div className="nav-brand">
          <span className="pulse-dot" aria-hidden="true" />
          <span className="name">VISHAL PATHAK</span>
          <span className="dot">·</span>
          <span>NOTEBOOK &amp; BENCH</span>
        </div>
        <nav className="nav-links" id="nav-links" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.id;
            const className = `${isActive ? "active" : ""}${
              isActive && item.amber ? " amber" : ""
            }`.trim();
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={className || undefined}
                {...(item.amber ? { "data-amber": "" } : {})}
              >
                <span className="nav-link-text">{item.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="nav-clock" aria-hidden="true">
          {clock}
        </div>
      </div>
    </header>
  );
}
