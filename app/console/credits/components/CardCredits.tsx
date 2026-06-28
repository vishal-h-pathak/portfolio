/**
 * Per-card credit grid — one block per card (Amex Platinum, Amex Gold,
 * Chase Sapphire Preferred), each credit shown as a progress ring for the
 * current open period, tinted by the card's `colorHex`. At-risk rings
 * switch to the cockpit `--red`.
 *
 * Server component — the rings are static SVG, no client JS needed.
 * Comp/subscription credits (perPeriodCents === 0) render as enroll-once
 * badges so they don't distort the captured/remaining math.
 */

import { dollarsCompact } from "../lib/format";
import type { Card, CreditProgress } from "../lib/types";

const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(1, pct));
  const offset = RING_C * (1 - clamped);
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 56 56"
      className="shrink-0"
      role="img"
      aria-label={`${Math.round(clamped * 100)}% captured`}
    >
      <circle
        cx="28"
        cy="28"
        r={RING_R}
        fill="none"
        stroke="var(--rule)"
        strokeWidth="5"
      />
      <circle
        cx="28"
        cy="28"
        r={RING_R}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={RING_C}
        strokeDashoffset={offset}
        transform="rotate(-90 28 28)"
        className="motion-safe:[transition:stroke-dashoffset_700ms_ease-out]"
      />
      <text
        x="28"
        y="32"
        textAnchor="middle"
        className="fill-ink text-[11px] tabular-nums"
        style={{ fontFamily: "var(--mono)" }}
      >
        {Math.round(clamped * 100)}%
      </text>
    </svg>
  );
}

function CreditItem({ p, cardColor }: { p: CreditProgress; cardColor: string }) {
  return (
    <div className="flex items-center gap-3 border border-rule bg-bg p-3">
      {p.enrollOnce ? (
        <span
          className="grid h-[52px] w-[52px] shrink-0 place-items-center border border-rule text-[9px] uppercase tracking-[0.14em] text-ink-faint"
          aria-hidden="true"
        >
          comp
        </span>
      ) : (
        <ProgressRing
          pct={p.maxCents > 0 ? p.capturedCents / p.maxCents : 0}
          color={p.atRisk ? "var(--red)" : cardColor}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] text-ink" title={p.credit.name}>
          {p.credit.name}
        </div>
        {p.enrollOnce ? (
          <div className="mt-0.5 text-[11px] text-ink-faint">
            Membership · enroll once
          </div>
        ) : (
          <div className="mt-0.5 text-[11px] tabular-nums text-ink-dim">
            {dollarsCompact(p.capturedCents)} / {dollarsCompact(p.maxCents)} ·{" "}
            {p.windowLabel}
          </div>
        )}
        <div className="mt-1.5">
          {p.enrollOnce ? (
            <Badge tone="muted">enroll-once</Badge>
          ) : p.atRisk ? (
            <Badge tone="red">{p.daysUntilPeriodEnd}d left</Badge>
          ) : p.status === "captured" ? (
            <Badge tone="green">captured</Badge>
          ) : (
            <Badge tone="muted">{p.daysUntilPeriodEnd}d left</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "green" | "red" | "muted";
  children: React.ReactNode;
}) {
  const cls =
    tone === "green"
      ? "border-green-dim text-green"
      : tone === "red"
        ? "border-red-dim text-red"
        : "border-rule text-ink-faint";
  return (
    <span
      className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${cls}`}
    >
      {children}
    </span>
  );
}

export function CardCredits({
  card,
  items,
}: {
  card: Card;
  items: CreditProgress[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="border border-rule bg-bg-raised p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ background: card.colorHex }}
          />
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
            {card.name}
          </h3>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-ink-faint">
          {dollarsCompact(card.annualFeeCents)}/yr fee
        </span>
      </header>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <CreditItem key={p.credit.creditId} p={p} cardColor={card.colorHex} />
        ))}
      </div>
    </section>
  );
}
