import Link from "next/link";
import { getSolitonExport } from "@/app/lib/soliton-export";
import {
  fmtDateTime,
  fmtMoney,
  latestRecord,
} from "@/components/soliton/derive";

export const metadata = { title: "Console — Soliton" };

// Always render fresh — this is the owner checking whether the engine is
// actually alive, so a cached "armed" would defeat the purpose.
export const dynamic = "force-dynamic";

/**
 * Soliton engine status — the owner-side view of the public experiment
 * page (/projects/soliton). Read-only by design: halt and re-arm are
 * engine-side operations (`python -m soliton.engine …` per the
 * trading-agent RUNBOOK); the site holds no capability to drive the
 * engine, it only reports what the last export said.
 */
export default async function ConsoleSolitonPage() {
  const { bundle, source } = await getSolitonExport();

  return (
    <main className="internal-surface min-h-screen px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            <span
              aria-hidden="true"
              className={
                "h-1.5 w-1.5 rounded-full " +
                (source === "live" ? "bg-green" : "bg-amber")
              }
            />
            Soliton — engine status
          </div>
          <h1 className="mt-3 font-serif text-2xl tracking-tight text-ink">
            Track arm/halt state
          </h1>
          <p className="mt-2 max-w-prose text-sm text-ink-dim">
            What the last export bundle reported. Halt and re-arm happen at
            the engine (see the trading-agent RUNBOOK) — this view is
            deliberately read-only; the site holds no control capability.
          </p>
        </header>

        <dl className="mb-8 grid grid-cols-2 gap-x-6 gap-y-2 border border-rule p-4 font-mono text-[12px] sm:grid-cols-4">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              source
            </dt>
            <dd className={source === "live" ? "text-green" : "text-amber"}>
              {source === "live" ? "live export" : "sample fixture"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              as of
            </dt>
            <dd className="text-ink">{bundle.as_of}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              exported
            </dt>
            <dd className="text-ink">{fmtDateTime(bundle.generated_at)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              schema
            </dt>
            <dd className="text-ink">v{bundle.schema_version}</dd>
          </div>
        </dl>

        <ul className="grid gap-3">
          {bundle.tracks.map((t) => {
            const lastKill = latestRecord(t, "kill");
            const equity = t.equity_curve[t.equity_curve.length - 1];
            const armed = t.status === "armed";
            return (
              <li key={t.id} className="border border-rule p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-sm uppercase tracking-[0.14em] text-ink">
                    {t.id}
                  </span>
                  <span
                    className={
                      "font-mono text-[11px] uppercase tracking-[0.14em] " +
                      (armed ? "text-green" : "text-red")
                    }
                  >
                    {t.status}
                  </span>
                  {t.signals_only && (
                    <span className="font-mono text-[11px] text-ink-faint">
                      signals only
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[11px] text-ink-faint">
                    updated {fmtDateTime(t.last_updated)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-dim">{t.name}</p>
                {!t.signals_only && equity && (
                  <p className="mt-1 font-mono text-[12px] text-ink-dim">
                    paper equity {fmtMoney(equity[1])} · {t.open_positions.length}{" "}
                    open · {t.trade_log.length} closed
                  </p>
                )}
                {t.halt_reason && (
                  <p className="mt-2 border-l-2 border-red pl-3 font-mono text-[12px] text-red">
                    {t.halt_reason}
                  </p>
                )}
                {!t.halt_reason && lastKill?.reason && (
                  <p className="mt-2 font-mono text-[11px] text-ink-faint">
                    last kill ({lastKill.as_of}): {lastKill.reason}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-8 font-mono text-[11px] tracking-[0.1em] text-ink-faint">
          Public page:{" "}
          <Link href="/projects/soliton" className="text-ink-dim underline hover:text-ink">
            /projects/soliton
          </Link>{" "}
          — renders this same bundle.
        </p>
      </div>
    </main>
  );
}
