"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import * as Toast from "@radix-ui/react-toast";
import { CheckCircle, XCircle, X, Info } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type ToastType = "success" | "error" | "info";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration?: number;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
  toastWithAction: (
    message: string,
    action: ToastAction,
    duration?: number,
  ) => void;
};

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

// ============================================================================
// Provider
// ============================================================================

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const toastWithAction = useCallback(
    (message: string, action: ToastAction, duration = 5000) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type: "info", action, duration }]);
    },
    [],
  );

  const handleOpenChange = useCallback((id: string, open: boolean) => {
    if (!open) {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  return (
    <ToastContext.Provider value={{ toast, toastWithAction }}>
      <Toast.Provider swipeDirection="right" duration={3000}>
        {children}

        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            open
            duration={t.duration}
            onOpenChange={(open) => handleOpenChange(t.id, open)}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full ${
              t.type === "success"
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
                : t.type === "info"
                  ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : t.type === "info" ? (
              <Info className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <Toast.Description className="flex-1 text-sm font-medium">
              {t.message}
            </Toast.Description>
            {t.action && (
              <Toast.Action altText={t.action.label} asChild>
                <button
                  type="button"
                  onClick={() => {
                    t.action!.onClick();
                    handleOpenChange(t.id, false);
                  }}
                  className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                >
                  {t.action.label}
                </button>
              </Toast.Action>
            )}
            <Toast.Close aria-label="Dismiss">
              <X className="h-4 w-4 opacity-60 hover:opacity-100" />
            </Toast.Close>
          </Toast.Root>
        ))}

        <Toast.Viewport className="fixed bottom-20 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
