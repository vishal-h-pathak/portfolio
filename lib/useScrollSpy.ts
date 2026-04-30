"use client";

import { useEffect, useState } from "react";

/**
 * Tracks which `<section.nb id="...">` is currently in view and returns its id.
 *
 * Lifted thresholds match the reference HTML:
 *   rootMargin: "-30% 0px -60% 0px", threshold: 0
 */
export function useScrollSpy(
  ids: readonly string[],
  initial?: string
): string | null {
  const [active, setActive] = useState<string | null>(initial ?? ids[0] ?? null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
