"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clock, FileText } from "lucide-react";
import { getCachedPendingQuotes } from "@/lib/db/indexed-db";

// ============================================================================
// Types
// ============================================================================

type ServerQuote = {
  id: string;
  quote_number: string;
  title: string;
  status: string;
  total_cents: number;
  created_at: string;
  customer: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

type PendingQuote = {
  id: string;
  quote_data: Record<string, unknown>;
};

type QuotesListProps = {
  serverQuotes: ServerQuote[];
};

// ============================================================================
// Component
// ============================================================================

export function QuotesList({ serverQuotes }: QuotesListProps) {
  const [pendingQuotes, setPendingQuotes] = useState<PendingQuote[]>([]);

  const refreshPending = useCallback(async () => {
    try {
      const cached = await getCachedPendingQuotes();
      // Exclude any that already appear in server results
      const serverIds = new Set(serverQuotes.map((q) => q.id));
      setPendingQuotes(cached.filter((q) => !serverIds.has(q.id)));
    } catch {
      // IndexedDB not available (SSR or error)
    }
  }, [serverQuotes]);

  // Load pending quotes on mount
  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  // Listen for sync events to refresh pending state
  useEffect(() => {
    function handleSyncEvent() {
      refreshPending();
    }

    function handleSWMessage(e: MessageEvent) {
      if (e.data?.type === "SYNC_COMPLETE") {
        refreshPending();
      }
    }

    window.addEventListener("quoteflow-sync", handleSyncEvent);
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      window.removeEventListener("quoteflow-sync", handleSyncEvent);
      navigator.serviceWorker?.removeEventListener(
        "message",
        handleSWMessage,
      );
    };
  }, [refreshPending]);

  return (
    <ul className="mt-4 divide-y divide-[hsl(var(--border))]">
      {/* Pending quotes from IndexedDB */}
      {pendingQuotes.map((pq) => {
        const data = pq.quote_data;
        return (
          <li key={pq.id}>
            <div className="flex items-center gap-3 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {(data.title as string) ?? "Untitled Quote"}
                </p>
                <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                  {(data.quote_number as string) ?? "PENDING"}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Pending sync
              </span>
            </div>
          </li>
        );
      })}

      {/* Server quotes */}
      {serverQuotes.map((quote) => {
        const customer = quote.customer;
        const customerName = customer
          ? [customer.first_name, customer.last_name]
              .filter(Boolean)
              .join(" ")
          : "No customer";

        return (
          <li key={quote.id}>
            <Link
              href={`/app/quotes/${quote.id}`}
              className="flex items-center gap-3 py-3 transition-colors hover:bg-[hsl(var(--muted))]/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
                <FileText className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {quote.title}
                </p>
                <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                  {quote.quote_number} &middot; {customerName}
                </p>
              </div>
              <StatusBadge status={quote.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    viewed:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    accepted:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    declined:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    expired:
      "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.draft}`}
    >
      {status}
    </span>
  );
}
