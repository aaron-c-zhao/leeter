import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  message: string;
  actionTo?: string;
  actionLabel?: string;
}

export function EmptyState({ message, actionTo, actionLabel }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {actionTo && actionLabel && (
        <p className="empty-action">
          <Link to={actionTo}>{actionLabel}</Link>
        </p>
      )}
    </div>
  );
}
