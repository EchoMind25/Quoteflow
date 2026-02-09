"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  Pencil,
} from "lucide-react";
import {
  captureError,
  classifyError,
  getUserMessage,
} from "@/lib/errors/handler";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [category] = useState(() => classifyError(error));
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    captureError(error, { boundary: "app", digest: error.digest });
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950">
        {category === "network" ? (
          isOnline ? (
            <Wifi className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          ) : (
            <WifiOff className="h-7 w-7 text-red-600 dark:text-red-400" />
          )
        ) : (
          <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
        )}
      </div>

      <h2 className="mt-4 text-lg font-semibold">
        {category === "network" && !isOnline
          ? "You're offline"
          : "Something went wrong"}
      </h2>

      <p className="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
        {getUserMessage(category)}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>

        <Link
          href="/app"
          className="flex h-10 items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
        >
          Go to Dashboard
        </Link>

        {/* AI failure: offer manual entry */}
        {category === "ai_processing" && (
          <Link
            href="/app/quotes/new"
            className="flex h-10 items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
          >
            <Pencil className="h-4 w-4" />
            Enter manually
          </Link>
        )}
      </div>
    </div>
  );
}
