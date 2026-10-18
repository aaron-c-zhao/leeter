import { useEffect, useState } from "react";
import { toast, type ToastItem } from "./toastBus";

/** Rendered once in the app shell; shows everything emitted via toast.success/error. */
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => toast.subscribe(setToasts), []);

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.kind}`}
          onClick={() => toast.dismiss(t.id)}
          title="Dismiss"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
