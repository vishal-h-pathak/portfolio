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
 * role="none" strips the implicit complementary landmark: six identical unnamed
 * asides nested in <main> clutter the landmark rotor and aren't valid ARIA
 * structure there anyway — the visible §-labels already identify each one.
 */
export function Margin({ blocks }: MarginProps) {
  return (
    <aside className="margin" role="none">
      {blocks.map((block, i) => (
        <div key={i} className={block.dim ? "block dim" : "block"}>
          {block.label && <span className="label">{block.label}</span>}
          {block.body}
        </div>
      ))}
    </aside>
  );
}
