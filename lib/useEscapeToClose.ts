"use client";

import { useEffect, useRef } from "react";

// Esc closes whatever is open; ignores presses while typing in a form field
// or chorded with a modifier (so browser/OS shortcuts still pass through).
// Only (re)subscribes when `isActive` flips, not on every state change while
// active.
export function useEscapeToClose(isActive: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isActive]);
}
