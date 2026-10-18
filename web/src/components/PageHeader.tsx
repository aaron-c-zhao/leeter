import type { ReactNode } from "react";

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      {actions && <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}
