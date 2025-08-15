"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; text: string; kind: ToastKind; ttl: number };

type ToastCtx = {
  push: (text: string, kind?: ToastKind, ttlMs?: number) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, kind: ToastKind = "success", ttlMs = 2500) => {
    const id = Math.random().toString(36).slice(2);
    const t: Toast = { id, text, kind, ttl: Date.now() + ttlMs };
    setToasts((prev) => [...prev, t]);
    // auto-remove after ttl
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, ttlMs + 50);
  }, []);

  const ctx = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {/* Top-center viewport, above BottomNav */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "grid",
          gap: 8,
          width: "min(92vw, 520px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            style={{
              pointerEvents: "auto",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 14,
              lineHeight: 1.3,
              color: t.kind === "error" ? "#fff" : "#1f2d22",
              background:
                t.kind === "error"
                  ? "#d33"
                  : t.kind === "info"
                  ? "#e9f1ea"
                  : "#dfeee3",
              border:
                t.kind === "error"
                  ? "1px solid #a22"
                  : "1px solid #c9d7cb",
              boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fail-safe: still show something if provider missing
    return {
      push: (text: string) => {
        if (typeof window !== "undefined") alert(text);
      },
    } as ToastCtx;
  }
  return ctx;
}
