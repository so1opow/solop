import { ReactNode } from "react";

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">{children}</span>;
}
