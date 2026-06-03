// src/components/ui/toast.tsx
"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}

const icons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const toastStyles: Record<ToastType, React.CSSProperties> = {
  success: {
    borderColor: "var(--status-green)",
    backgroundColor: "rgba(0,212,160,0.1)",
    color: "var(--status-green)",
  },
  error: {
    borderColor: "var(--status-red)",
    backgroundColor: "var(--color-primary-10)",
    color: "var(--status-red)",
  },
  warning: {
    borderColor: "var(--status-yellow)",
    backgroundColor: "rgba(212,167,44,0.1)",
    color: "var(--status-yellow)",
  },
  info: {
    borderColor: "var(--text-tertiary)",
    backgroundColor: "rgba(154,154,166,0.1)",
    color: "var(--text-secondary)",
  },
};

function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-[380px] rounded-xl border px-4 py-3 shadow-2xl animate-[slideInRight_0.25s_ease-out]"
          style={toastStyles[t.type]}
        >
          <span className="text-lg font-bold flex-shrink-0 mt-0.5">
            {icons[t.type]}
          </span>
          <p
            className="flex-1 text-sm font-medium leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            {t.message}
          </p>
          <button
            onClick={() => dismiss(t.id)}
            className="flex-shrink-0 transition-colors ml-2 mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-tertiary)")
            }
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
