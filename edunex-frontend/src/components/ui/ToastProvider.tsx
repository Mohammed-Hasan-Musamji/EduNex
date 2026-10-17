"use client";

import { createContext, useCallback, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn, generateId } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  onRetry?: () => void;
  /** Defaults to true for errors/warnings, false otherwise. */
  persistent?: boolean;
}

export interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "border-success/30 text-success" },
  error: { icon: TriangleAlert, className: "border-error/30 text-error" },
  warning: { icon: TriangleAlert, className: "border-secondary/40 text-secondary" },
  info: { icon: Info, className: "border-primary/30 text-primary" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = generateId("toast");
      const persistent = toast.persistent ?? (toast.variant === "error" || toast.variant === "warning");
      setToasts((current) => [...current, { ...toast, id }]);
      if (!persistent) {
        setTimeout(() => dismissToast(id), 5000);
      }
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => {
          const { icon: Icon, className } = variantStyles[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-white p-3.5 shadow-md",
                className,
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-xs text-text-muted">{toast.description}</p>}
                {toast.onRetry && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onRetry?.();
                      dismissToast(toast.id);
                    }}
                    className="mt-1.5 text-xs font-medium text-primary underline"
                  >
                    Try again
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-text-muted hover:text-text"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
