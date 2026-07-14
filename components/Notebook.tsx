import type { ReactNode } from "react";

export function Notebook({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="notebook">
      {children}
    </main>
  );
}
