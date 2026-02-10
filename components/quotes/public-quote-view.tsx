"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
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
import { applyBusinessTheme } from "@/lib/design-system/apply-theme";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PublicQuoteHeader } from "@/components/quotes/PublicQuoteHeader";
import { PublicLineItems } from "@/components/quotes/PublicLineItems";
import { AcceptDeclineActions } from "@/components/quotes/AcceptDeclineActions";
import { AcceptedConfirmation } from "@/components/quotes/AcceptedConfirmation";

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
  business: Pick<Business, "name" | "logo_url" | "primary_color" | "industry" | "phone" | "email"> & {
    review_count?: number;
    review_average?: number;
  };
  jobId?: string | null;
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
  jobId,
}: PublicQuoteViewProps) {
  const [acceptState, acceptAction, isAccepting] = useActionState(
    acceptQuote,
    initialAcceptState,
  );
  const [declineState, declineAction, isDeclining] = useActionState(
    declineQuote,
    initialDeclineState,
  );

  // Apply business theme on mount
  useEffect(() => {
    if (business.primary_color && business.industry) {
      applyBusinessTheme(business.primary_color, business.industry);
    }
  }, [business.primary_color, business.industry]);

  const isTerminal =
    quote.status === "accepted" ||
    quote.status === "declined" ||
    quote.status === "expired" ||
    !!acceptState.success ||
    !!declineState.success;

  const daysUntilExpiry = quote.expires_at
    ? Math.ceil(
        (new Date(quote.expires_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const isExpiringSoon =
    daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 3;

  const [showConfirmation, setShowConfirmation] = useState(false);

  // Show confirmation when quote is accepted/declined
  useEffect(() => {
    if (acceptState.success || declineState.success) {
      setShowConfirmation(true);
    }
  }, [acceptState.success, declineState.success]);

  const handleAccept = () => {
    const form = document.getElementById("accept-form") as HTMLFormElement;
    if (form) {
      const formData = new FormData(form);
      acceptAction(formData);
    }
  };

  const handleDecline = () => {
    const form = document.getElementById("decline-form") as HTMLFormElement;
    if (form) {
      const formData = new FormData(form);
      declineAction(formData);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Professional Document Header */}
      <PublicQuoteHeader business={business} quote={quote} customer={customer} />

      {/* Content Container */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Status Badges */}
        {(quote.status === "accepted" || acceptState.success) && (
          <div className="mb-6 flex justify-center">
            <StatusBadge status="accepted" />
          </div>
        )}
        {(quote.status === "declined" || declineState.success) && (
          <div className="mb-6 flex justify-center">
            <StatusBadge status="declined" />
          </div>
        )}
        {quote.status === "expired" && (
          <div className="mb-6 flex justify-center">
            <StatusBadge status="expired" />
          </div>
        )}

        {/* Expiry Warning */}
        {isExpiringSoon && !isTerminal && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">
              {daysUntilExpiry === 1
                ? "This quote expires tomorrow."
                : `This quote expires in ${daysUntilExpiry} days.`}
            </span>
          </div>
        )}

        {/* Quote Title Hero */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-white print:text-black">
            {quote.title}
          </h2>
        </div>

        {/* Line Items & Totals */}
        <PublicLineItems items={lineItems} quote={quote} />

        {/* Customer Notes */}
        {quote.customer_notes && (
          <div className="mt-6 rounded-lg border border-neutral-200 bg-white px-6 py-4 dark:border-neutral-700 dark:bg-neutral-900 print:border print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Notes
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300 print:text-black">
              {quote.customer_notes}
            </p>
          </div>
        )}

        {/* Confirmation Message */}
        {showConfirmation && (
          <div className="mt-8">
            <AcceptedConfirmation
              businessName={business.name}
              isDeclined={declineState.success}
            />
          </div>
        )}

        {/* Portal Link (after acceptance) */}
        {(quote.status === "accepted" || acceptState.success) && jobId && (
          <div className="mt-6 rounded-xl border border-[hsl(var(--primary-200,220_90%_85%))] bg-[hsl(var(--primary-50,220_90%_97%))] p-6 text-center dark:border-[hsl(var(--primary-800,220_90%_25%))] dark:bg-[hsl(var(--primary-900,220_90%_15%))]/20">
            <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">
              Track your job status, schedule, and more:
            </p>
            <a
              href={`/public/jobs/${jobId}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary-600))] px-6 font-medium text-white hover:bg-[hsl(var(--primary-700))]"
            >
              View Job Portal
            </a>
          </div>
        )}

        {/* Expiry Footer */}
        {quote.expires_at && (
          <p className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Valid until {formatDate(quote.expires_at)}
          </p>
        )}

        {/* Powered by */}
        <p className="mt-4 pb-20 text-center text-xs text-neutral-400 dark:text-neutral-600 print:pb-4 sm:pb-8">
          Powered by Quotestream
        </p>
      </div>

      {/* Hidden forms for server actions */}
      <form id="accept-form" action={acceptAction} className="hidden">
        <input type="hidden" name="quote_id" value={quote.id} />
      </form>
      <form id="decline-form" action={declineAction} className="hidden">
        <input type="hidden" name="quote_id" value={quote.id} />
      </form>

      {/* Accept/Decline Actions (Fixed/Sticky) */}
      <AcceptDeclineActions
        quoteId={quote.id}
        isAccepting={isAccepting}
        isDeclining={isDeclining}
        isTerminal={isTerminal}
        acceptError={acceptState.error}
        declineError={declineState.error}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
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
