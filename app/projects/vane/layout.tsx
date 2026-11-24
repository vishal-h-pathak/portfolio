import "../project-shell.css";
import "./vane.css";
import { ProjectTopbar } from "@/components/ProjectTopbar";
import { ProjectFooter } from "@/components/ProjectFooter";
import { bySlug } from "@/content/projects";

const NUM = bySlug("vane")!.num;

/** Shared bench shell (project-shell.css) + this page's scoped stylesheet. */
export default function VaneLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProjectTopbar num={NUM} />
      <main id="main-content" className="vane-page">
        {children}
        <ProjectFooter
          meta={`${NUM} · PAPER MONEY · EVIDENCE LABELED`}
          items={[
            { label: "source: private (live trading system)" },
            { label: "back to projects", href: "/#bench" },
          ]}
        />
      </main>
    </>
  );
}
