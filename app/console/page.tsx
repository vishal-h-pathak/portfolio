import Link from "next/link";

export const metadata = { title: "Console" };

// Fleet is a separate deployed app, not a /console/* route, so it links out.
const FLEET_URL =
  process.env.NEXT_PUBLIC_FLEET_URL ?? "https://fleet.vishal.pa.thak.io";

const TOOLS = [
  {
    href: "/console/jobs",
    name: "Job pipeline",
    blurb:
      "Hunt → tailor → review queue, with run controls and cost insights.",
  },
  {
    href: "/console/soliton",
    name: "Soliton",
    blurb:
      "Engine status for the public trading experiment — track arm/halt state, kill events, export freshness.",
  },
  {
    href: "/console/credits",
    name: "Card-tracker",
    blurb:
      "Statement-credit recovery across Amex + Chase — captured, remaining, and what's about to expire.",
  },
  {
    href: FLEET_URL,
    name: "Fleet",
    blurb:
      "Realtime telemetry over every machine — heartbeats, running jobs, and dispatch.",
    external: true,
  },
];

/**
 * Console home — the authenticated landing once past the gate. Lists the
 * tools so the owner has one consolidated entry point. Agent runbooks
 * (/console/agents/[token]) are reached directly via their token URLs.
 */
export default function ConsoleHome() {
  return (
    <main className="internal-surface min-h-screen px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-green"
            />
            Console — owner only
          </div>
          <h1 className="mt-3 font-serif text-2xl tracking-tight text-ink">
            Private tooling
          </h1>
          <p className="mt-2 max-w-prose text-sm text-ink-dim">
            The live machinery behind the public write-ups. Everything here
            sits behind the auth gate.
          </p>
        </header>

        <ul className="grid gap-3">
          {TOOLS.map((tool) => {
            const cardClassName =
              "block border border-rule p-4 transition-colors duration-150 hover:border-amber";
            const inner = (
              <>
                <div className="font-mono text-sm uppercase tracking-[0.14em] text-ink">
                  {tool.name}
                </div>
                <p className="mt-1 text-sm text-ink-dim">{tool.blurb}</p>
              </>
            );
            return (
              <li key={tool.href}>
                {tool.external ? (
                  <a href={tool.href} className={cardClassName}>
                    {inner}
                  </a>
                ) : (
                  <Link href={tool.href} className={cardClassName}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-8 font-mono text-[11px] tracking-[0.1em] text-ink-faint">
          Agent runbooks are reachable directly via their token URLs.
        </p>
      </div>
    </main>
  );
}
