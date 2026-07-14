import "./soliton.css";

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

      <main id="main-content" className="sol-page">
        {children}

        <footer className="sol-footer">
          <span>B-01 · PAPER MONEY · EVIDENCE LABELED PER TRACK</span>
          <span>
            <span>source: private (live trading system)</span>
            <span aria-hidden="true"> · </span>
            <a href="/projects/soliton/design">design story</a>
            <span aria-hidden="true"> · </span>
            <a href="/#bench">back to projects</a>
          </span>
        </footer>
      </main>
    </>
  );
}
