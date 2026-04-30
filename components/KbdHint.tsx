/**
 * Fixed bottom-left keyboard hint: "1 2 3 4 5 jump · esc collapse"
 * Hidden on narrow screens via CSS (.kbd-hint @ max-width: 900px).
 */
export function KbdHint() {
  return (
    <div className="kbd-hint" aria-hidden="true">
      <kbd>1</kbd>
      <kbd>2</kbd>
      <kbd>3</kbd>
      <kbd>4</kbd>
      <kbd>5</kbd> jump · <kbd>esc</kbd> collapse
    </div>
  );
}
