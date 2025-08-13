"use client";

import { useToast } from "./ToastProvider";

export default function ToastContainer() {
  const { toasts, remove } = useToast();

  return (
    <div className="toast-root" role="status" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type ?? "info"}`}
          onClick={() => remove(t.id)}
          role="alert"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
