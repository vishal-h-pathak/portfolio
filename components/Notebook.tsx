import type { ReactNode } from "react";

export function Notebook({ children }: { children: ReactNode }) {
  return <div className="notebook">{children}</div>;
}
