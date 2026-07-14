import "katex/dist/katex.min.css";
import { CgTabNav } from "@/components/cellular-gaits/CgTabNav";
import { CgBreadcrumb } from "@/components/cellular-gaits/CgBreadcrumb";
import { bySlug } from "@/content/projects";

const GITHUB_URL = "https://github.com/vishal-h-pathak/cellular-gaits";
const CG_NUM = bySlug("cellular-gaits")!.num;

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
          <span>BENCH · {CG_NUM}</span>
        </span>
      </header>

      <CgTabNav />
      <CgBreadcrumb />

      <main className="cg-page">
        {children}

        <footer className="cg-footer">
          <span className="cg-footer-meta">
            {CG_NUM} · BUILD: SOLO · CLAUDE · CPU · 3 EVENINGS
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
