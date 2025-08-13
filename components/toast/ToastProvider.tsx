"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Toast = { id: string; text: string; type?: "info" | "success" | "error" };

type Ctx = {
  toasts: Toast[];
  push: (text: string, type?: Toast["type"]) => void;
  remove: (id: string) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((text: string, type: Toast["type"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, text, type }]);
    // Auto-remove after 2s
    setTimeout(() => remove(id), 2000);
  }, [remove]);

  const value = useMemo(() => ({ toasts, push, remove }), [toasts, push, remove]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
    </ToastCtx.Provider>
  );
}
