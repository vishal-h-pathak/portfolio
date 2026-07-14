import "katex/dist/katex.min.css";
import "../project-shell.css";
import { CgTabNav } from "@/components/cellular-gaits/CgTabNav";
import { CgBreadcrumb } from "@/components/cellular-gaits/CgBreadcrumb";
import { ProjectTopbar } from "@/components/ProjectTopbar";
import { ProjectFooter } from "@/components/ProjectFooter";
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
      <ProjectTopbar num={CG_NUM} />

      <CgTabNav />
      <CgBreadcrumb />

      <main className="cg-page">
        {children}

        <ProjectFooter
          meta={`${CG_NUM} · BUILD: SOLO · CLAUDE · CPU · 3 EVENINGS`}
          items={[
            { label: "github", href: GITHUB_URL, external: true },
            { label: "back to projects", href: "/#bench" },
          ]}
        />
      </main>
    </>
  );
}
