import katex from "katex";

/**
 * Server-rendered KaTeX. Renders to an HTML string at build/request time so no
 * client JS or layout shift is needed. `display` controls block vs inline.
 *
 * The page imports `katex/dist/katex.min.css`; `.cg-math` styles in globals.css
 * override KaTeX's default color to --ink so the equations are legible on the
 * dark bench background.
 */
export function Math({ tex, display = true }: { tex: string; display?: boolean }) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    output: "html",
  });
  return (
    <span
      className={display ? "cg-math cg-math-block" : "cg-math cg-math-inline"}
      // KaTeX output is generated from a trusted literal, not user input.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
