/**
 * Shared footer for every project micro-site. One CSS block (tokenized
 * spacing/hover) instead of the drifted `.cg-footer` / `.sol-footer` forks,
 * and gives the Meridian archive the exit it previously had none of (W5/#28).
 */
export type ProjectFooterItem = {
  label: string;
  href?: string;
  external?: boolean;
};

export function ProjectFooter({
  meta,
  items,
}: {
  meta: string;
  items: ProjectFooterItem[];
}) {
  return (
    <footer className="proj-footer">
      <span className="proj-footer-meta">{meta}</span>
      <span className="proj-footer-links">
        {items.map((item, i) => (
          <span key={item.label} style={{ display: "contents" }}>
            {i > 0 && (
              <span className="proj-footer-sep" aria-hidden="true">
                ·
              </span>
            )}
            {item.href ? (
              <a
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
              >
                {item.label}
              </a>
            ) : (
              <span>{item.label}</span>
            )}
          </span>
        ))}
      </span>
    </footer>
  );
}

export default ProjectFooter;
