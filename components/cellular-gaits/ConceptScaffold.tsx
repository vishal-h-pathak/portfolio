import type { ReactNode } from "react";

/**
 * Shared layout for a concept tab. Wave-3 prompts (E1–E7) drop content into the
 * four slots; until then each tab renders this scaffold with a placeholder
 * interactive region and a four-part explainer stub. Keep the dark cg-* tokens.
 *
 * The four explainer parts are fixed by the build plan:
 *   what we chose · why · alternatives · the biological / frontier version
 */

export type ConceptExplainer = {
  chose?: ReactNode;
  why?: ReactNode;
  alternatives?: ReactNode;
  frontier?: ReactNode;
};

const PLACEHOLDER = <span className="cg-tab-todo">{`// TODO: wave 3`}</span>;

const EXPLAINER_PARTS: { key: keyof ConceptExplainer; label: string }[] = [
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
}: {
  /** Section name, rendered as the § eyebrow. */
  name: string;
  /** One-line lead under the eyebrow. */
  lead: ReactNode;
  /** The interactive module. Defaults to a wave-3 placeholder. */
  module?: ReactNode;
  /** The four-part explainer. Each missing part falls back to a TODO marker. */
  explainer?: ConceptExplainer;
}) {
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
        {EXPLAINER_PARTS.map((part) => (
          <div className="cg-explainer-part" key={part.key}>
            <p className="cg-explainer-h">{part.label}</p>
            <div className="cg-explainer-body">
              {explainer?.[part.key] ?? PLACEHOLDER}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
