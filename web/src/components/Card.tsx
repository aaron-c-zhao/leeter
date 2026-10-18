import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={className ? `card ${className}` : "card"}>{children}</section>;
}
