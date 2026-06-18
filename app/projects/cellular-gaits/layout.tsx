import "katex/dist/katex.min.css";
import { CgTabNav } from "@/components/cellular-gaits/CgTabNav";

const GITHUB_URL = "https://github.com/vishal-h-pathak/cellular-gaits";

/**
 * Shared shell for every Cellular Gaits sub-route: the bench topbar, the
 * concept tab nav, and the footer. Each route fills in <main className="cg-page">
 * with its own sections. Per-route <title> handling lives in each page's
 * metadata export.
 */
export default function CellularGaitsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="cg-topbar">
        <a href="/" className="cg-back" aria-label="Back to home">
          ← BACK
        </a>
        <span className="cg-topbar-brand">
          <span className="cg-topbar-brand-name">VISHAL PATHAK</span>
          <span className="cg-topbar-sep" aria-hidden="true">·</span>
          <span>BENCH · CG-01</span>
        </span>
      </header>

      <CgTabNav />

      <main className="cg-page">
        {children}

        <footer className="cg-footer">
          <span className="cg-footer-meta">
            CG-01 · BUILD: SOLO · CLAUDE · CPU · 3 EVENINGS
          </span>
          <span className="cg-footer-links">
            <a
              href={GITHUB_URL}
              target={GITHUB_URL.startsWith("http") ? "_blank" : undefined}
              rel={
                GITHUB_URL.startsWith("http") ? "noopener noreferrer" : undefined
              }
            >
              github
            </a>
            <span className="cg-topbar-sep" aria-hidden="true">·</span>
            <a href="/#bench">back to projects</a>
          </span>
        </footer>
      </main>
    </>
  );
}
