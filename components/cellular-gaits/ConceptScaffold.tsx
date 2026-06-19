import type { ReactNode } from "react";
import { CG_BASE } from "./tabs";

/**
 * Shared layout for a concept tab. Wave-3 prompts (E1–E7) drop content into the
 * four slots; until then each tab renders this scaffold with a placeholder
 * interactive region and a four-part explainer stub. Keep the dark cg-* tokens.
 *
 * The four explainer parts are fixed by the build plan:
 *   what we chose · why · alternatives · the biological / frontier version
 */

export type ConceptExplainer = Record<string, ReactNode>;

export type ExplainerPart = { key: string; label: string };

const PLACEHOLDER = <span className="cg-tab-todo">{`// TODO: wave 3`}</span>;

// Default four-part framing (the wave-3 concept tabs). The Behaviors tabs pass
// their own `explainerParts` (sense · reward · expectation · connectome link).
const EXPLAINER_PARTS: ExplainerPart[] = [
  { key: "chose", label: "What we chose" },
  { key: "why", label: "Why" },
  { key: "alternatives", label: "Alternatives" },
  { key: "frontier", label: "The biological / frontier version" },
];

export function ConceptScaffold({
  name,
  lead,
  module,
  explainer,
  explainerParts,
}: {
  /** Section name, rendered as the § eyebrow. */
  name: string;
  /** One-line lead under the eyebrow. */
  lead: ReactNode;
  /** The interactive module. Defaults to a wave-3 placeholder. */
  module?: ReactNode;
  /** The explainer parts, keyed by `explainerParts` (defaults to the four-part
   * concept framing). Each missing part falls back to a TODO marker. */
  explainer?: ConceptExplainer;
  /** Override the explainer part labels/keys (e.g. the Behaviors framing). */
  explainerParts?: ExplainerPart[];
}) {
  const parts = explainerParts ?? EXPLAINER_PARTS;
  return (
    <section className="cg-section">
      <p className="cg-section-eyebrow">§ {name.toUpperCase()}</p>
      <p className="cg-section-lead">{lead}</p>

      <div className="cg-tab-module" role="region" aria-label={`${name} module`}>
        {module ?? (
          <div className="cg-tab-module-stub">
            <span className="cg-tab-todo">{`// TODO: wave 3 — interactive module`}</span>
          </div>
        )}
      </div>

      <div className="cg-explainer">
        {parts.map((part) => (
          <div className="cg-explainer-part" key={part.key}>
            <p className="cg-explainer-h">{part.label}</p>
            <div className="cg-explainer-body">
              {explainer?.[part.key] ?? PLACEHOLDER}
            </div>
          </div>
        ))}
      </div>

      <p className="cg-section-appendix">
        The math behind this — equations, constants, and the build-plan DAG — is
        in the{" "}
        <a className="cg-inline-link" href={`${CG_BASE}/appendix`}>
          appendix
        </a>
        .
      </p>
    </section>
  );
}
