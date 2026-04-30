"use client";

import { useEffect, useRef, type ReactNode } from "react";

type SectionProps = {
  id: string;
  amber?: boolean;
  margin: ReactNode;
  children: ReactNode;
  hero?: boolean;
  rowStyle?: React.CSSProperties;
};

/**
 * Notebook section shell.
 *
 * Renders <section.nb id="..." [data-amber]> with the 2-col (margin / main) row inside.
 * IntersectionObserver fade-in: rootMargin "0px 0px -10% 0px", threshold 0.05.
 * First section ('about') is marked visible immediately so the hero is not blank on load.
 */
export function Section({
  id,
  amber,
  margin,
  children,
  hero,
  rowStyle,
}: SectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    if (id === "about") {
      el.classList.add("visible");
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("visible");
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [id]);

  return (
    <section
      ref={sectionRef}
      id={id}
      className="nb"
      {...(amber ? { "data-amber": "" } : {})}
    >
      <div className={hero ? "row hero" : "row"} style={rowStyle}>
        {margin}
        <div>{children}</div>
      </div>
    </section>
  );
}
