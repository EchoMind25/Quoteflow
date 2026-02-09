"use client";

import { useActionState } from "react";
import { formatCents } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  acceptQuote,
  declineQuote,
  type AcceptQuoteState,
  type DeclineQuoteState,
} from "@/lib/actions/quotes";
import type {
  Quote,
  QuoteLineItem,
  Customer,
  Business,
} from "@/types/database";

// ============================================================================
// Types
// ============================================================================

type PublicQuoteViewProps = {
  quote: Pick<
    Quote,
    | "id"
    | "status"
    | "title"
    | "quote_number"
    | "subtotal_cents"
    | "tax_rate"
    | "tax_cents"
    | "discount_cents"
    | "total_cents"
    | "customer_notes"
    | "expires_at"
  >;
  lineItems: Pick<
    QuoteLineItem,
    "id" | "title" | "description" | "quantity" | "unit" | "line_total_cents"
  >[];
  customer: Pick<Customer, "first_name" | "last_name"> | null;
  business: Pick<Business, "name" | "logo_url" | "primary_color">;
};

// ============================================================================
// Component
// ============================================================================

const initialAcceptState: AcceptQuoteState = {};
const initialDeclineState: DeclineQuoteState = {};

export function PublicQuoteView({
  quote,
  lineItems,
  customer,
  business,
}: PublicQuoteViewProps) {
  const [acceptState, acceptAction, isAccepting] = useActionState(
    acceptQuote,
    initialAcceptState,
  );
  const [declineState, declineAction, isDeclining] = useActionState(
    declineQuote,
    initialDeclineState,
  );

  const isTerminal =
    quote.status === "accepted" ||
    quote.status === "declined" ||
    quote.status === "expired" ||
    acceptState.success ||
    declineState.success;

  const daysUntilExpiry = quote.expires_at
    ? Math.ceil(
        (new Date(quote.expires_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const isExpiringSoon =
    daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 3;

  const customerName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : null;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#f4f4f5" }}
    >
      {/* Branded header */}
      <div
        className="px-4 py-8 text-center text-white"
        style={{ backgroundColor: business.primary_color }}
      >
        {business.logo_url && (
          <img
            src={business.logo_url}
            alt={business.name}
            className="mx-auto mb-3 h-10 w-auto"
          />
        )}
        <h1 className="text-xl font-bold">{business.name}</h1>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Status banner */}
        {quote.status === "accepted" || acceptState.success ? (
          <StatusBanner
            icon={CheckCircle}
            label="Quote Accepted"
            className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
          />
        ) : quote.status === "declined" || declineState.success ? (
          <StatusBanner
            icon={XCircle}
            label="Quote Declined"
            className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
          />
        ) : quote.status === "expired" ? (
          <StatusBanner
            icon={Clock}
            label="Quote Expired"
            className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          />
        ) : null}

        {/* Expiry warning */}
        {isExpiringSoon && !isTerminal && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {daysUntilExpiry === 1
              ? "This quote expires tomorrow."
              : `This quote expires in ${daysUntilExpiry} days.`}
          </div>
        )}

        {/* Quote card */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {/* Quote header */}
          <div className="border-b border-gray-100 px-4 py-4">
            {customerName && (
              <p className="text-sm text-gray-500">Hi {customerName},</p>
            )}
            <h2 className="mt-1 text-lg font-semibold text-gray-900">
              {quote.title}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Quote #{quote.quote_number}
            </p>
          </div>

          {/* Line items */}
          <div className="divide-y divide-gray-50 px-4">
            {lineItems.map((item) => (
              <div key={item.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-gray-900">
                    {formatCents(item.line_total_cents)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 px-4 py-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="tabular-nums">
                {formatCents(quote.subtotal_cents)}
              </span>
            </div>
            {quote.tax_cents > 0 && (
              <div className="mt-1 flex justify-between text-sm text-gray-500">
                <span>Tax ({(quote.tax_rate * 100).toFixed(1)}%)</span>
                <span className="tabular-nums">
                  {formatCents(quote.tax_cents)}
                </span>
              </div>
            )}
            {quote.discount_cents > 0 && (
              <div className="mt-1 flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span className="tabular-nums">
                  -{formatCents(quote.discount_cents)}
                </span>
              </div>
            )}
            <div className="mt-3 flex justify-between border-t border-gray-200 pt-3">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold tabular-nums text-gray-900">
                {formatCents(quote.total_cents)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {quote.customer_notes && (
            <div className="border-t border-gray-100 px-4 py-4">
              <p className="text-xs font-medium text-gray-400">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                {quote.customer_notes}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isTerminal && (
          <div className="mt-6 space-y-3">
            {acceptState.error && (
              <p className="text-center text-sm text-red-600">
                {acceptState.error}
              </p>
            )}
            {declineState.error && (
              <p className="text-center text-sm text-red-600">
                {declineState.error}
              </p>
            )}

            <form action={acceptAction}>
              <input type="hidden" name="quote_id" value={quote.id} />
              <button
                type="submit"
                disabled={isAccepting || isDeclining}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
                style={{ backgroundColor: business.primary_color }}
              >
                {isAccepting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Accept Quote
                  </>
                )}
              </button>
            </form>

            <form action={declineAction}>
              <input type="hidden" name="quote_id" value={quote.id} />
              <button
                type="submit"
                disabled={isAccepting || isDeclining}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {isDeclining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    Decline Quote
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Expiry footer */}
        {quote.expires_at && (
          <p className="mt-6 text-center text-xs text-gray-400">
            Valid until {formatDate(quote.expires_at)}
          </p>
        )}

        {/* Powered by */}
        <p className="mt-4 pb-8 text-center text-xs text-gray-300">
          Powered by Quotestream
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusBanner({
  icon: Icon,
  label,
  className,
}: {
  icon: typeof CheckCircle;
  label: string;
  className: string;
}) {
  return (
    <div
      className={`mb-4 flex items-center justify-center gap-2 rounded-lg p-3 text-sm font-medium ${className}`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
