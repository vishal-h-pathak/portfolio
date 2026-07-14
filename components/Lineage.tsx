"use client";

import { useEffect, useState } from "react";
import { LINEAGE, type LineageYear } from "@/content/lineage";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { Margin } from "./Margin";
import { Section } from "./Section";

export function Lineage() {
  const [openPin, setOpenPin] = useState<LineageYear | null>(null);
  // After-close render delay so the slide-out completes before the body unmounts.
  const [renderedPin, setRenderedPin] = useState<LineageYear | null>(null);

  useEffect(() => {
    if (openPin !== null) {
      setRenderedPin(openPin);
      return;
    }
    const t = window.setTimeout(() => setRenderedPin(null), 280);
    return () => window.clearTimeout(t);
  }, [openPin]);

  // Esc closes whatever is open.
  useEscapeToClose(openPin !== null, () => setOpenPin(null));

  const open = renderedPin
    ? LINEAGE.find((p) => p.year === renderedPin)
    : null;

  return (
    <Section
      id="lineage"
      margin={
        <Margin
          blocks={[
            { label: "§ 2", body: "LINEAGE", hideOnMobile: true },
            {
              label: "NOTE",
              body: "The arc is neuromorphic hardware, then embedded ML, then agents. Same instinct — let the substrate do the work — on different stacks.",
            },
            { dim: true, body: "click any year →" },
          ]}
        />
      }
    >
      <div className="eyebrow dim">§ 2 &nbsp;·&nbsp; LINEAGE</div>
      <h2>Same instinct, different substrates.</h2>
      <p
        className="dim"
        style={{ margin: "6px 0 28px", fontSize: "14.5px" }}
      >
        Click a year for the long version.
      </p>
      <div className="lineage" id="lineage-grid">
        {LINEAGE.map((pin) => {
          const isActive = openPin === pin.year;
          return (
            <button
              key={pin.year}
              type="button"
              className={`lineage-pin${isActive ? " active" : ""}`}
              aria-expanded={isActive}
              aria-controls="lineage-detail"
              onClick={() =>
                setOpenPin((current) =>
                  current === pin.year ? null : pin.year
                )
              }
            >
              <div className="dot" aria-hidden="true" />
              <div className="yr">{pin.year}</div>
              <div className="ttl">{pin.title}</div>
              <div className="sum">{pin.summary}</div>
            </button>
          );
        })}
        <div
          id="lineage-detail"
          className={`lineage-detail${openPin !== null ? " open" : ""}`}
          role="region"
          aria-live="polite"
          inert={openPin === null}
        >
          {open && (
            <>
              <span className="label">{open.detailLabel}</span>
              <span dangerouslySetInnerHTML={{ __html: open.body }} />
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
