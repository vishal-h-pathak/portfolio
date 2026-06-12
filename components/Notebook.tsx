import type { ReactNode } from "react";

export function Notebook({ children }: { children: ReactNode }) {
  return <main className="notebook">{children}</main>;
}
