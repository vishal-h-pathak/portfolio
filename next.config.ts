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
    ];
  },
};

export default nextConfig;
