import { ReactNode } from "react";

export function Button({ children, onClick, type = "button" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-black shadow"
    >
      {children}
    </button>
  );
}
