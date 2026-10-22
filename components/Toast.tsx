"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastAction = { label: string; onClick: () => void };
type ToastInput = { message: string; tone?: "success" | "error"; actions?: ToastAction[] };
type ToastState = ToastInput & { key: number };

const ToastContext = createContext<{ show: (toast: ToastInput) => void }>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((input: ToastInput) => {
    setToast({ ...input, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
    return () => clearTimeout(timer.current);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-8">
        {toast && (
          <div
            key={toast.key}
            className="pointer-events-auto flex w-full max-w-[420px] items-center justify-between gap-3 rounded-[14px] bg-ink px-4 py-3.5 text-white shadow-lg [animation:toast-in_.2s_ease-out]"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {toast.tone === "error" ? (
                <CircleAlert size={18} className="shrink-0 text-[#ff6b66]" />
              ) : (
                <CircleCheck size={18} className="shrink-0 text-[#4ade80]" />
              )}
              {toast.message}
            </span>
            {toast.actions && (
              <span className="flex shrink-0 items-center gap-3.5">
                {toast.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      setToast(null);
                      action.onClick();
                    }}
                    className="text-[13px] font-semibold underline underline-offset-2 last:text-[#ff8a85]"
                  >
                    {action.label}
                  </button>
                ))}
              </span>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
