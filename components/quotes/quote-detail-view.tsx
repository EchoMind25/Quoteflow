"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  Mail,
  MessageSquare,
  Loader2,
  CheckCircle,
  ExternalLink,
  Copy,
  ImageIcon,
} from "lucide-react";
import {
  sendQuote,
  type SendQuoteState,
  type DeliveryMethod,
} from "@/lib/actions/quotes";
import { enqueueOfflineAction } from "@/lib/db/indexed-db";
import {
  isOnline,
  requestBackgroundSync,
} from "@/lib/sync/offline-sync";
import type { Quote, QuoteLineItem, Customer } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

type QuoteDetailViewProps = {
  quote: Quote;
  lineItems: QuoteLineItem[];
  customer: Customer | null;
  photoUrls?: string[];
};

// ============================================================================
// Component
// ============================================================================

const initialSendState: SendQuoteState = {};

export function QuoteDetailView({
  quote,
  lineItems,
  customer,
  photoUrls = [],
}: QuoteDetailViewProps) {
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("email");
  const [copied, setCopied] = useState(false);
  const [offlineQueued, setOfflineQueued] = useState(false);

  const [sendState, sendAction, isSending] = useActionState(
    async (prev: SendQuoteState, formData: FormData) => {
      // If offline, enqueue and return optimistic state
      if (!isOnline()) {
        const quoteId = formData.get("quote_id") as string;
        const method = formData.get("delivery_method") as string;
        await enqueueOfflineAction("send_quote", {
          quote_id: quoteId,
          delivery_method: method,
        });
        await requestBackgroundSync();
        setOfflineQueued(true);
        return { success: true, publicUrl: undefined };
      }
      return sendQuote(prev, formData);
    },
    initialSendState,
  );

  const customerName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
      "Unknown"
    : "No customer";

  const handleCopyLink = async () => {
    if (sendState.publicUrl) {
      await navigator.clipboard.writeText(sendState.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/quotes"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--muted))]"
          aria-label="Back to quotes"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{quote.title}</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            #{quote.quote_number} &middot; {customerName}
          </p>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      {/* Line items */}
      <div className="mt-6 overflow-hidden rounded-xl border border-[hsl(var(--border))]">
        <div className="divide-y divide-[hsl(var(--border))]">
          {lineItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                    {item.description}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {item.quantity} {item.unit}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatCents(item.line_total_cents)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-4 py-3">
          <div className="flex justify-between text-sm text-[hsl(var(--muted-foreground))]">
            <span>Subtotal</span>
            <span className="tabular-nums">
              {formatCents(quote.subtotal_cents)}
            </span>
          </div>
          {quote.tax_cents > 0 && (
            <div className="mt-1 flex justify-between text-sm text-[hsl(var(--muted-foreground))]">
              <span>Tax</span>
              <span className="tabular-nums">
                {formatCents(quote.tax_cents)}
              </span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-[hsl(var(--border))] pt-2">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold tabular-nums">
              {formatCents(quote.total_cents)}
            </span>
          </div>
        </div>
      </div>

      {/* Photo gallery */}
      {photoUrls.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ImageIcon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            Job Site Photos ({photoUrls.length})
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photoUrls.map((url, index) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden rounded-lg border border-[hsl(var(--border))] transition-colors hover:border-brand-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Job photo ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Send button / panel */}
      {quote.status === "draft" && !sendState.success && (
        <div className="mt-6">
          {!showSendPanel ? (
            <button
              type="button"
              onClick={() => setShowSendPanel(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <Send className="h-4 w-4" />
              Send Quote
            </button>
          ) : (
            <div className="space-y-4 rounded-xl border border-[hsl(var(--border))] p-4">
              <p className="text-sm font-semibold">Send to {customerName}</p>

              {/* Delivery method selector */}
              <div className="flex gap-2">
                <DeliveryMethodButton
                  method="email"
                  icon={Mail}
                  label="Email"
                  detail={customer?.email ?? "No email"}
                  selected={deliveryMethod === "email"}
                  disabled={!customer?.email}
                  onSelect={() => setDeliveryMethod("email")}
                />
                <DeliveryMethodButton
                  method="sms"
                  icon={MessageSquare}
                  label="SMS"
                  detail={customer?.phone ?? "No phone"}
                  selected={deliveryMethod === "sms"}
                  disabled={!customer?.phone}
                  onSelect={() => setDeliveryMethod("sms")}
                />
              </div>

              {customer?.email && customer?.phone && (
                <label className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <input
                    type="checkbox"
                    checked={deliveryMethod === "both"}
                    onChange={(e) =>
                      setDeliveryMethod(
                        e.target.checked ? "both" : "email",
                      )
                    }
                    className="rounded border-[hsl(var(--border))]"
                  />
                  Send via both email and SMS
                </label>
              )}

              {sendState.error && (
                <p className="text-sm text-[hsl(var(--destructive))]">
                  {sendState.error}
                </p>
              )}

              <form action={sendAction} className="flex gap-2">
                <input type="hidden" name="quote_id" value={quote.id} />
                <input
                  type="hidden"
                  name="delivery_method"
                  value={deliveryMethod}
                />
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Now
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSendPanel(false)}
                  disabled={isSending}
                  className="flex h-10 items-center justify-center rounded-lg border border-[hsl(var(--border))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))] disabled:opacity-50"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Success confirmation */}
      {sendState.success && (
        <div className="mt-6 space-y-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300">
            <CheckCircle className="h-5 w-5" />
            {offlineQueued
              ? "Queued for send — will deliver when online"
              : "Quote sent successfully!"}
          </div>
          {sendState.publicUrl && (
            <div className="flex items-center gap-2">
              <a
                href={sendState.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View public link
              </a>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Already sent info */}
      {quote.status !== "draft" && !sendState.success && (
        <div className="mt-6 rounded-xl border border-[hsl(var(--border))] p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {quote.status === "sent" && quote.sent_at && (
              <>Sent on {formatDate(quote.sent_at)}</>
            )}
            {quote.status === "viewed" && quote.viewed_at && (
              <>Viewed on {formatDate(quote.viewed_at)}</>
            )}
            {quote.status === "accepted" && quote.accepted_at && (
              <>Accepted on {formatDate(quote.accepted_at)}</>
            )}
            {quote.status === "declined" && quote.declined_at && (
              <>Declined on {formatDate(quote.declined_at)}</>
            )}
            {quote.status === "expired" && <>This quote has expired</>}
          </p>
        </div>
      )}

      {/* Notes */}
      {quote.notes && (
        <div className="mt-4 rounded-xl border border-[hsl(var(--border))] p-4">
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
            Internal Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{quote.notes}</p>
        </div>
      )}
    </div>
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
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.draft}`}
    >
      {status}
    </span>
  );
}

function DeliveryMethodButton({
  method: _method,
  icon: Icon,
  label,
  detail,
  selected,
  disabled,
  onSelect,
}: {
  method: DeliveryMethod;
  icon: typeof Mail;
  label: string;
  detail: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex flex-1 flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
        selected
          ? "border-brand-600 bg-brand-50 dark:bg-brand-950"
          : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <Icon
        className={`h-5 w-5 ${selected ? "text-brand-600" : "text-[hsl(var(--muted-foreground))]"}`}
      />
      <span className="text-xs font-medium">{label}</span>
      <span className="truncate text-[10px] text-[hsl(var(--muted-foreground))]">
        {detail}
      </span>
    </button>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
