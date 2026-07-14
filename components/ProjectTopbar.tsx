/**
 * Shared topbar for every project micro-site (Soliton, Cellular Gaits,
 * Meridian archive). One back affordance, one destination (`/#bench`), one
 * CSS block — see app/projects/project-shell.css. Replaces the three
 * copy-paste `.sol-topbar` / `.cg-topbar` forks that had drifted on padding,
 * z-index, alignment, and breakpoint (W5/#23).
 */
export function ProjectTopbar({ num }: { num: string }) {
  return (
    <header className="proj-topbar">
      <a href="/#bench" className="proj-back" aria-label="Back to projects">
        ← BACK
      </a>
      <span className="proj-topbar-brand">
        <span className="proj-topbar-brand-name">VISHAL PATHAK</span>
        <span className="proj-topbar-sep" aria-hidden="true">·</span>
        <span>BENCH · {num}</span>
      </span>
    </header>
  );
}

export default ProjectTopbar;
