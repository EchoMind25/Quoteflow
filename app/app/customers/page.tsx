import { createClient } from "@/lib/supabase/server";
import { Users, Plus, Phone, Mail, FileText } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { CustomerListControls } from "@/components/customers/customer-list-controls";
import { formatCentsRounded as formatCents } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Customers",
};

type SortOption = "name" | "recent" | "value";

type Props = {
  searchParams: Promise<{
    sort?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 50;

export default async function CustomersPage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = (params.sort as SortOption) || "name";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Base query: fetch customers with last quote date + total quoted value
  // We join quotes to get aggregate data via a subquery approach
  let query = supabase
    .from("customers")
    .select(
      `id, first_name, last_name, email, phone, company_name, created_at,
       quotes:quotes(id, total_cents, created_at, status)`,
      { count: "exact" },
    )
    .range(offset, offset + PAGE_SIZE - 1);

  // Apply sort
  switch (sort) {
    case "recent":
      query = query.order("created_at", { ascending: false });
      break;
    case "value":
      // Sort by created_at desc as fallback — we'll sort by value client-side
      // since Supabase can't ORDER BY aggregate of relation
      query = query.order("created_at", { ascending: false });
      break;
    case "name":
    default:
      query = query
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });
      break;
  }

  const { data: customers, count } = await query;

  const hasCustomers = (count ?? 0) > 0;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Transform data: compute derived fields
  type CustomerWithQuotes = NonNullable<typeof customers>[number];
  type QuoteRow = {
    id: string;
    total_cents: number;
    created_at: string;
    status: string;
  };

  const customerCards = (customers ?? []).map((c: CustomerWithQuotes) => {
    const quotes = (c.quotes ?? []) as QuoteRow[];
    const totalQuotedCents = quotes.reduce(
      (sum, q) => sum + q.total_cents,
      0,
    );
    const lastQuoteDate = quotes.length > 0
      ? quotes.reduce((latest, q) =>
          q.created_at > latest ? q.created_at : latest,
        quotes[0]!.created_at)
      : null;
    const quoteCount = quotes.length;

    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone,
      company_name: c.company_name,
      quoteCount,
      totalQuotedCents,
      lastQuoteDate,
    };
  });

  // If sorting by value, sort client-side (Supabase can't sort by relation aggregate)
  if (sort === "value") {
    customerCards.sort((a, b) => b.totalQuotedCents - a.totalQuotedCents);
  }

  // If sorting by recent quotes, sort client-side by last quote date
  if (sort === "recent") {
    customerCards.sort((a, b) => {
      if (!a.lastQuoteDate && !b.lastQuoteDate) return 0;
      if (!a.lastQuoteDate) return 1;
      if (!b.lastQuoteDate) return -1;
      return b.lastQuoteDate.localeCompare(a.lastQuoteDate);
    });
  }

  return (
    <div className="p-4 sm:p-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Customers</h1>
        <Link
          href="/app/customers/new"
          className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden xs:inline">Add Customer</span>
        </Link>
      </div>

      {/* ---- Sort controls ---- */}
      {hasCustomers && (
        <CustomerListControls currentSort={sort} />
      )}

      {/* ---- Content ---- */}
      {hasCustomers && customerCards.length > 0 ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {customerCards.map((customer) => {
              const name = [customer.first_name, customer.last_name]
                .filter(Boolean)
                .join(" ");
              const initials = [customer.first_name, customer.last_name]
                .filter(Boolean)
                .map((n) => n!.charAt(0).toUpperCase())
                .join("");

              return (
                <Link
                  key={customer.id}
                  href={`/app/customers/${customer.id}`}
                  className="flex gap-3 rounded-xl border border-[hsl(var(--border))] p-4 transition-colors hover:bg-[hsl(var(--muted))]/50"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {initials || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {name || "Unnamed Customer"}
                    </p>
                    {customer.company_name && (
                      <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                        {customer.company_name}
                      </p>
                    )}

                    {/* Contact info */}
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {customer.phone && (
                        <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[140px]">
                            {customer.email}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Quote stats */}
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {customer.quoteCount} quote{customer.quoteCount !== 1 ? "s" : ""}
                      </span>
                      {customer.totalQuotedCents > 0 && (
                        <>
                          <span>&middot;</span>
                          <span className="font-medium tabular-nums">
                            {formatCents(customer.totalQuotedCents)}
                          </span>
                        </>
                      )}
                      {customer.lastQuoteDate && (
                        <>
                          <span>&middot;</span>
                          <span>{formatRelativeDate(customer.lastQuoteDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ---- Pagination ---- */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/app/customers?sort=${sort}&page=${page - 1}`}
                  className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-sm transition-colors hover:bg-[hsl(var(--muted))]"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/app/customers?sort=${sort}&page=${page + 1}`}
                  className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-sm transition-colors hover:bg-[hsl(var(--muted))]"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        /* ---- Empty state ---- */
        <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-[hsl(var(--border))] px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950">
            <Users className="h-7 w-7 text-brand-600 dark:text-brand-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold">
            No customers yet
          </h2>
          <p className="mt-1 max-w-xs text-sm text-[hsl(var(--muted-foreground))]">
            Customers are created automatically when you send your first
            quote, or you can add them manually.
          </p>
          <Link
            href="/app/customers/new"
            className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add First Customer
          </Link>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
