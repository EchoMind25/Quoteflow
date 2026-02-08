"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, RefreshCw, WifiOff, X } from "lucide-react";
import { getQueueCount } from "@/lib/db/indexed-db";
import {
  isOnline,
  onOnline,
  onOffline,
  processOfflineSync,
  requestBackgroundSync,
} from "@/lib/sync/offline-sync";

// ============================================================================
// Types
// ============================================================================

type SyncState = "idle" | "offline" | "syncing" | "done" | "error";

type ConflictInfo = {
  item_id: string;
  quote_id: string;
  server_updated_at: string;
};

// ============================================================================
// Component
// ============================================================================

export function SyncStatus({
  onConflicts,
}: {
  onConflicts?: (conflicts: ConflictInfo[]) => void;
}) {
  const [state, setState] = useState<SyncState>("idle");
  const [queueCount, setQueueCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [syncingCount, setSyncingCount] = useState(0);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // ---- Refresh queue count ----
  const refreshCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setQueueCount(count);
      return count;
    } catch {
      return 0;
    }
  }, []);

  // ---- Trigger sync ----
  const triggerSync = useCallback(async () => {
    const count = await refreshCount();
    if (count === 0) return;

    setState("syncing");
    setSyncingCount(count);

    try {
      const bgSyncRegistered = await requestBackgroundSync();
      if (!bgSyncRegistered) {
        // Fallback to client-side sync
        const result = await processOfflineSync();
        await refreshCount();

        if (result.conflicts && result.conflicts.length > 0) {
          onConflicts?.(result.conflicts);
        }

        if (result.failed > 0 && result.processed === 0) {
          setState("error");
          setErrorMessage(
            result.errors[0]?.error ?? "Sync failed",
          );
        } else {
          setState("done");
        }
      }
      // If background sync was registered, the SW will notify us via postMessage
    } catch {
      setState("error");
      setErrorMessage("Sync failed. Tap retry.");
      await refreshCount();
    }
  }, [refreshCount, onConflicts]);

  // ---- Initialize ----
  useEffect(() => {
    if (!isOnline()) {
      setState("offline");
    }
    refreshCount();

    // Online/offline listeners
    const removeOnline = onOnline(() => {
      setState((prev) => (prev === "offline" ? "idle" : prev));
      // Auto-sync on reconnect
      triggerSync();
    });

    const removeOffline = onOffline(() => {
      setState("offline");
    });

    return () => {
      removeOnline();
      removeOffline();
    };
  }, [refreshCount, triggerSync]);

  // ---- Listen to quoteflow-sync CustomEvents ----
  useEffect(() => {
    function handleSyncEvent(e: Event) {
      const detail = (e as CustomEvent).detail as {
        type: string;
        processed?: number;
        total?: number;
        error?: string;
        conflicts?: ConflictInfo[];
      };

      switch (detail.type) {
        case "SYNC_START":
          setState("syncing");
          break;
        case "SYNC_PROGRESS":
          if (detail.total) setSyncingCount(detail.total);
          break;
        case "SYNC_COMPLETE":
          setState("done");
          refreshCount();
          if (detail.conflicts && detail.conflicts.length > 0) {
            onConflicts?.(detail.conflicts);
          }
          break;
        case "SYNC_ERROR":
          setState("error");
          setErrorMessage(detail.error ?? "Sync failed");
          refreshCount();
          break;
      }
    }

    window.addEventListener("quoteflow-sync", handleSyncEvent);
    return () =>
      window.removeEventListener("quoteflow-sync", handleSyncEvent);
  }, [refreshCount, onConflicts]);

  // ---- Listen to SW postMessage ----
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "SYNC_COMPLETE") {
        setState("done");
        refreshCount();
        if (e.data.conflicts && e.data.conflicts.length > 0) {
          onConflicts?.(e.data.conflicts);
        }
      }
    }

    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [refreshCount, onConflicts]);

  // ---- Auto-hide "done" state after 3s ----
  useEffect(() => {
    if (state === "done") {
      doneTimerRef.current = setTimeout(() => {
        setState(isOnline() ? "idle" : "offline");
      }, 3000);
    }

    return () => {
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, [state]);

  // ---- Poll queue count when offline or queue > 0 ----
  useEffect(() => {
    if (state === "offline" || queueCount > 0) {
      pollTimerRef.current = setInterval(() => {
        refreshCount();
      }, 5000);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [state, queueCount, refreshCount]);

  // ---- Render nothing when online with empty queue ----
  if (state === "idle" && queueCount === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 z-50 px-4"
      style={{
        bottom: "calc(4rem + env(safe-area-inset-bottom, 0px) + 0.5rem)",
      }}
    >
      <div className="mx-auto max-w-lg">
        {/* Offline */}
        {state === "offline" && (
          <StatusBar className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-sm font-medium">
              You&apos;re offline
              {queueCount > 0 && (
                <span className="font-normal">
                  {" "}
                  &middot; {queueCount} pending
                </span>
              )}
            </span>
          </StatusBar>
        )}

        {/* Online with pending items */}
        {state === "idle" && queueCount > 0 && (
          <StatusBar className="border-[hsl(var(--border))] bg-[hsl(var(--background))]">
            <span className="flex-1 text-sm text-[hsl(var(--muted-foreground))]">
              {queueCount} pending change{queueCount !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={triggerSync}
              className="flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-700"
            >
              <RefreshCw className="h-3 w-3" />
              Sync Now
            </button>
          </StatusBar>
        )}

        {/* Syncing */}
        {state === "syncing" && (
          <StatusBar className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span className="flex-1 text-sm font-medium">
              Syncing {syncingCount > 0 ? `${syncingCount} items` : ""}...
            </span>
          </StatusBar>
        )}

        {/* Done */}
        {state === "done" && (
          <StatusBar className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            <Check className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-sm font-medium">Synced!</span>
          </StatusBar>
        )}

        {/* Error */}
        {state === "error" && (
          <StatusBar className="border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <X className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate text-sm">
              {errorMessage}
            </span>
            <button
              type="button"
              onClick={triggerSync}
              className="shrink-0 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500"
            >
              Retry
            </button>
          </StatusBar>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
