"use client";

import { useEffect, useRef } from "react";

/**
 * Fixed bottom-left keyboard hint: "1 2 3 4 5 jump · esc collapse"
 * Hidden on narrow screens via CSS (.kbd-hint @ max-width: 900px).
 * Fades out while the footer is in view so the two never overlap.
 */
export function KbdHint() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const footer = document.querySelector("footer");
    if (!el || !footer || typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          el.classList.toggle("is-hidden", entry.isIntersecting);
        }
      },
      { threshold: 0 }
    );
    obs.observe(footer);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="kbd-hint" aria-hidden="true">
      <kbd>1</kbd>
      <kbd>2</kbd>
      <kbd>3</kbd>
      <kbd>4</kbd>
      <kbd>5</kbd> jump · <kbd>esc</kbd> collapse
    </div>
  );
}
