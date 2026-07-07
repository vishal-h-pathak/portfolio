import "./soliton.css";

const GITHUB_URL = "https://github.com/vishal-h-pathak/trading-agent";

/**
 * Shell for the SOLITON experiment page — same bench-topbar pattern as the
 * Cellular Gaits microsite (app/projects/cellular-gaits/layout.tsx), with
 * the page's scoped stylesheet imported here so none of it touches
 * globals.css.
 */
export default function SolitonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sol-topbar">
        <a href="/" className="sol-back" aria-label="Back to home">
          ← BACK
        </a>
        <span className="sol-topbar-brand">
          <span className="name">VISHAL PATHAK</span>
          <span aria-hidden="true"> · </span>
          <span>BENCH · B-01 SOLITON</span>
        </span>
      </header>

      <main className="sol-page">
        {children}

        <footer className="sol-footer">
          <span>B-01 · PAPER MONEY · EVIDENCE LABELED PER TRACK</span>
          <span>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              github
            </a>
            <span aria-hidden="true"> · </span>
            <a href="/#bench">back to projects</a>
          </span>
        </footer>
      </main>
    </>
  );
}
