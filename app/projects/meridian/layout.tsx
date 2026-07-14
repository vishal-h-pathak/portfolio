import type { Metadata } from "next";
import "../project-shell.css";
import { ProjectTopbar } from "@/components/ProjectTopbar";
import { ProjectFooter } from "@/components/ProjectFooter";

export const metadata: Metadata = {
  title: "MERIDIAN — archived predecessor of SOLITON",
  description:
    "The retired MERIDIAN trading-agent telemetry console, preserved as a post-mortem exhibit: five specialist LLMs, one trade in two months, no pre-registered edge — the lesson that built SOLITON.",
};

/**
 * Shell for the MERIDIAN archive. The page itself is a self-styled dark
 * console resurrected from git history (it carries its own tokens and
 * chrome) — its C.bg (#0a0a0a) matches the site's --bg closely enough that
 * the shared topbar/footer sit on it without clashing. Previously this
 * layout rendered no shell at all, so the archive's only exit was a 10px
 * inline link buried in the console's view switcher — the deepest page on
 * the site was its only dead end (W5/#23, W5/#28).
 */
export default function MeridianArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ProjectTopbar num="B-01" />
      {children}
      <ProjectFooter
        meta="ARCHIVE · MERIDIAN · FROZEN JUL 2026"
        items={[
          { label: "soliton — the rebuild", href: "/projects/soliton" },
          { label: "design story", href: "/projects/soliton/design" },
          { label: "back to projects", href: "/#bench" },
        ]}
      />
    </>
  );
}
