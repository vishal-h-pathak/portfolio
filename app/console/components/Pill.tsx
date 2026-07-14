/**
 * Pill — the console's single status-marker primitive (mono, 10px,
 * tracked, square, hairline border in the tone's dim color). Every
 * status/tag marker on the console (job pipeline, credits, soliton,
 * agent runbooks) renders through this. Per-status ad-hoc styling
 * anywhere else is a bug.
 *
 * No hooks — safe to import from Server Components (e.g. the credits
 * card grid) as well as client surfaces.
 */

export type Tone = "live" | "attention" | "failed" | "dim";

const TONE_CLASS: Record<Tone, string> = {
  live: "text-green border-green-dim",
  attention: "text-amber border-amber-dim",
  failed: "text-red border-red-dim",
  dim: "text-ink-dim border-rule",
};

export function Pill({
  tone = "dim",
  dashed,
  pulse,
  title,
  className,
  children,
}: {
  tone?: Tone;
  dashed?: boolean;
  pulse?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-1.5 border px-2 py-0.5",
        "font-mono text-[10px] uppercase tracking-[0.16em] whitespace-nowrap",
        TONE_CLASS[tone],
        dashed ? "border-dashed" : "",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {pulse && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse"
        />
      )}
      {children}
    </span>
  );
}
