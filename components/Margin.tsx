import type { ReactNode } from "react";

type MarginBlock = {
  label?: string;
  body: ReactNode;
  dim?: boolean;
};

type MarginProps = {
  blocks: MarginBlock[];
};

/**
 * Mono marginalia — the left-column metadata that lives next to each section.
 * Each block has an optional small-caps label and body content. `dim` italicizes for asides.
 */
export function Margin({ blocks }: MarginProps) {
  return (
    <aside className="margin">
      {blocks.map((block, i) => (
        <div key={i} className={block.dim ? "block dim" : "block"}>
          {block.label && <span className="label">{block.label}</span>}
          {block.body}
        </div>
      ))}
    </aside>
  );
}
