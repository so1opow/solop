import { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-panel p-4 shadow">{children}</div>;
}
