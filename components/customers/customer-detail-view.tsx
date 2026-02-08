"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCentsRounded as formatCents } from "@/lib/utils";
import {
  ArrowLeft,
  DollarSign,
  FileText,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  TrendingUp,
} from "lucide-react";
import { CustomerForm } from "@/components/customers/customer-form";
import type { Customer } from "@/types/database";
import type { CustomerStats } from "@/lib/actions/customers";

// ============================================================================
// Types
// ============================================================================

type QuoteSummary = {
  id: string;
  quote_number: string;
  title: string;
  status: string;
  total_cents: number;
  created_at: string;
};

type CustomerDetailViewProps = {
  customer: Customer;
  quotes: QuoteSummary[];
  stats: CustomerStats;
};

// ============================================================================
// Component
// ============================================================================

export function CustomerDetailView({
  customer,
  quotes,
  stats,
}: CustomerDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);

  const customerName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    "Unnamed Customer";

  const initials = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .map((n) => n!.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="p-4 sm:p-6">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/customers"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--muted))]"
          aria-label="Back to customers"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          {initials || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{customerName}</h1>
          {customer.company_name && (
            <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
              {customer.company_name}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--muted))]"
          aria-label={isEditing ? "Cancel editing" : "Edit customer"}
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      {/* ---- Edit form ---- */}
      {isEditing && (
        <div className="mt-6 rounded-xl border border-[hsl(var(--border))] p-4">
          <CustomerForm
            mode="edit"
            customerId={customer.id}
            defaultValues={{
              first_name: customer.first_name,
              last_name: customer.last_name,
              email: customer.email,
              phone: customer.phone,
              company_name: customer.company_name,
              address_line1: customer.address_line1,
              address_line2: customer.address_line2,
              city: customer.city,
              state: customer.state,
              zip_code: customer.zip_code,
              notes: customer.notes,
            }}
          />
        </div>
      )}

      {/* ---- Contact info card ---- */}
      {!isEditing && (
        <div className="mt-6 rounded-xl border border-[hsl(var(--border))] p-4">
          <div className="flex flex-wrap gap-4">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="flex items-center gap-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:text-brand-600"
              >
                <Phone className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                {customer.phone}
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex items-center gap-2 text-sm text-[hsl(var(--foreground))] transition-colors hover:text-brand-600"
              >
                <Mail className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                {customer.email}
              </a>
            )}
          </div>
          {(customer.address_line1 || customer.city) && (
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              {[
                customer.address_line1,
                customer.address_line2,
                [customer.city, customer.state].filter(Boolean).join(", "),
                customer.zip_code,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          {customer.notes && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-[hsl(var(--muted-foreground))]">
              {customer.notes}
            </p>
          )}
        </div>
      )}

      {/* ---- Stats cards ---- */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Total Quotes"
          value={stats.total_quotes.toString()}
        />
        <StatCard
          icon={DollarSign}
          label="Total Quoted"
          value={formatCents(stats.total_quoted_cents)}
        />
        <StatCard
          icon={TrendingUp}
          label="Accepted"
          value={formatCents(stats.total_accepted_cents)}
          subtext={
            stats.total_quotes > 0
              ? `${stats.accepted_quotes}/${stats.total_quotes} quotes`
              : undefined
          }
        />
        <StatCard
          icon={FileText}
          label="Acceptance Rate"
          value={
            stats.total_quotes > 0
              ? `${Math.round((stats.accepted_quotes / stats.total_quotes) * 100)}%`
              : "N/A"
          }
        />
      </div>

      {/* ---- Quick actions ---- */}
      <div className="mt-4 flex gap-2">
        <Link
          href="/app/quotes/new"
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Create Quote
        </Link>
        {customer.email && (
          <a
            href={`mailto:${customer.email}`}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
          >
            <Mail className="h-4 w-4" />
          </a>
        )}
        {customer.phone && (
          <a
            href={`sms:${customer.phone}`}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
          >
            <MessageSquare className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* ---- Quote history ---- */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold">Quote History</h2>
        {quotes.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-[hsl(var(--border))]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                  <th className="px-3 py-2 text-left text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    Quote
                  </th>
                  <th className="hidden px-3 py-2 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] sm:table-cell">
                    Date
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {quotes.map((quote) => (
                  <tr key={quote.id}>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/app/quotes/${quote.id}`}
                        className="group"
                      >
                        <p className="truncate text-sm font-medium group-hover:text-brand-600">
                          {quote.title}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          #{quote.quote_number}
                        </p>
                      </Link>
                    </td>
                    <td className="hidden px-3 py-2.5 text-xs text-[hsl(var(--muted-foreground))] sm:table-cell">
                      {formatDate(quote.created_at)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums">
                      {formatCents(quote.total_cents)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <StatusBadge status={quote.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
            No quotes yet for this customer.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {label}
        </span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
      {subtext && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {subtext}
        </p>
      )}
    </div>
  );
}

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
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.draft}`}
    >
      {status}
    </span>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
