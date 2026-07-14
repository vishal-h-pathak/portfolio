import "../project-shell.css";
import "./soliton.css";
import { ProjectTopbar } from "@/components/ProjectTopbar";
import { ProjectFooter } from "@/components/ProjectFooter";

/**
 * Shell for the SOLITON experiment page — the shared bench topbar/footer
 * (app/projects/project-shell.css), with the page's own scoped stylesheet
 * imported here so none of it touches globals.css.
 */
export default function SolitonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ProjectTopbar num="B-01" />

      <main className="sol-page">
        {children}

        <ProjectFooter
          meta="B-01 · PAPER MONEY · EVIDENCE LABELED PER TRACK"
          items={[
            { label: "source: private (live trading system)" },
            { label: "design story", href: "/projects/soliton/design" },
            { label: "back to projects", href: "/#bench" },
          ]}
        />
      </main>
    </>
  );
}
