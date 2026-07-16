import type { ReactNode } from "react";

type Status = {
  /** green = research / live · amber = bench / build (the legend the rail teaches). */
  tone: "green" | "amber";
  label: ReactNode;
  /** The live-pulse dot. Only true when the status is actually live right now. */
  pulse?: boolean;
};

type SectionHeaderProps = {
  /** The section number, e.g. "§ 2". Rendered with the label as the mono kicker. */
  number: string;
  /** The kicker label, e.g. "LINEAGE". */
  label: string;
  /** The serif heading. */
  title: ReactNode;
  /** Eyebrow accent. Defaults to "dim" — reserve the accents for what the legend means. */
  accent?: "green" | "amber" | "dim";
  status?: Status;
  /** The optional one-line dim lede under the heading. */
  lede?: ReactNode;
  /** The hero renders the page's h1; every other section is an h2. */
  as?: "h1" | "h2";
  children?: ReactNode;
};

/**
 * The one section header on the landing page.
 *
 * Before this, the same design element — mono eyebrow, serif heading, optional
 * dim lede, optional status chip — was implemented four different ways: a shared
 * .sec-head block in Bench and Experience, and hand-rolled eyebrow + h2 + inline
 * magic values in Lineage and Contact. That drifted into three lede margins
 * (20/28/18px), two lede sizes (14.5/15px) and a bespoke 22px h2 margin, and the
 * inline styles blocked token extraction entirely (W6/#22).
 *
 * Every value now comes from the token layer. The visual delta is the
 * normalization the audit called for: Contact's 22px h2 margin becomes the
 * standard 24px, and the two lede sizes converge on one ramp step.
 */
export function SectionHeader({
  number,
  label,
  title,
  accent = "dim",
  status,
  lede,
  as = "h2",
  children,
}: SectionHeaderProps) {
  const Heading = as;
  const eyebrowClass = accent === "dim" ? "eyebrow dim" : `eyebrow ${accent}`;

  return (
    <>
      <div className="sec-head">
        <div>
          <div className={eyebrowClass}>
            {number} &nbsp;·&nbsp; {label}
          </div>
          <Heading>{title}</Heading>
        </div>
        {status ? (
          <div className={`status ${status.tone}`}>
            {status.pulse ? <span className="pulse" aria-hidden="true" /> : null}
            {status.label}
          </div>
        ) : null}
      </div>
      {lede ? <p className="section-lede">{lede}</p> : null}
      {children}
    </>
  );
}
