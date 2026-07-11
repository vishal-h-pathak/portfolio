import type { NextConfig } from "next";

// Fleet Mission Control lives at its own origin. We redirect (not rewrite) so
// the Fleet app serves its own absolute /_next asset paths correctly.
const FLEET_URL =
  process.env.NEXT_PUBLIC_FLEET_URL ?? "https://fleet.vishal.pa.thak.io";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/fleet",
        destination: FLEET_URL,
        statusCode: 302,
      },
      {
        // Objective merged into the optimizer route as "Search & Objective".
        // Deep-links to the old tab exist, so redirect rather than 404.
        source: "/projects/cellular-gaits/objective",
        destination: "/projects/cellular-gaits/optimizer",
        permanent: true,
      },
      // MERIDIAN retired: its console is preserved as a public archive at
      // /projects/meridian (which links forward to /projects/soliton, the
      // rebuild). Both the ancient public path and the consolidated console
      // path land on the archive; the owner-side successor is
      // /console/soliton, linked from the console home.
      {
        source: "/meridian",
        destination: "/projects/meridian",
        permanent: true,
      },
      {
        source: "/console/meridian",
        destination: "/projects/meridian",
        permanent: true,
      },
      // Private tooling moved under the gated /console umbrella. Keep the
      // old paths working for any stale links. The specific /dashboard/login
      // rule must precede the /dashboard/:path* catch-all (login now lives
      // at /console/login, not /console/jobs/login).
      {
        source: "/dashboard/login",
        destination: "/console/login",
        permanent: true,
      },
      {
        source: "/dashboard",
        destination: "/console/jobs",
        permanent: true,
      },
      {
        source: "/dashboard/:path*",
        destination: "/console/jobs/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
