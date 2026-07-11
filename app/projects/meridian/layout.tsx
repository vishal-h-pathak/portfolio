import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MERIDIAN — archived predecessor of SOLITON",
  description:
    "The retired MERIDIAN trading-agent telemetry console, preserved as a post-mortem exhibit: five specialist LLMs, one trade in two months, no pre-registered edge — the lesson that built SOLITON.",
};

/**
 * Shell for the MERIDIAN archive. The page is a self-styled dark console
 * resurrected from git history (it carries its own tokens and chrome), so
 * this layout exists only to hang metadata on the route — no site shell,
 * exactly as the console originally rendered.
 */
export default function MeridianArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
