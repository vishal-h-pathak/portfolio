import type { Metadata } from "next";
import { getVaneExport } from "@/app/lib/vane-export";
import { VaneView } from "@/components/vane/VaneView";

export const metadata: Metadata = {
  title: "VANE — a public paper-trading experiment",
  description:
    "A rules-based paper portfolio measured against SPY total return from a recorded Day 0. Positions, every trade, the weekly activity requirement and the research verdict, with data problems shown rather than hidden.",
};

// ISR: the engine exports once per session, so 5 minutes is far fresher than
// the data. The engine (or anything holding the secret) can also force a refresh
// via POST /api/revalidate/vane — see app/api/revalidate/vane/route.ts.
export const revalidate = 300;

export default async function VanePage() {
  const result = await getVaneExport();
  return <VaneView result={result} />;
}
