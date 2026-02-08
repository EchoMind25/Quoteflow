import { createClient } from "@/lib/supabase/server";
import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { QuotesList } from "@/components/quotes/quotes-list";

export const metadata: Metadata = {
  title: "Quotes",
};

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ cursor?: string }>;
};

export default async function QuotesPage({ searchParams }: Props) {
  const params = await searchParams;
  const cursor = params.cursor;

  const supabase = await createClient();

  let query = supabase
    .from("quotes")
    .select(
      "id, quote_number, title, status, total_cents, created_at, customer:customers(first_name, last_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1); // Fetch one extra to detect next page

  // Cursor-based pagination: fetch items older than cursor
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: quotes, count } = await query;

  const hasQuotes = (count ?? 0) > 0;
  const hasNextPage = (quotes?.length ?? 0) > PAGE_SIZE;
  const pageQuotes = hasNextPage ? quotes!.slice(0, PAGE_SIZE) : (quotes ?? []);
  const nextCursor = hasNextPage
    ? pageQuotes[pageQuotes.length - 1]?.created_at
    : undefined;

  const serverQuotes = pageQuotes.map((q) => ({
    id: q.id,
    quote_number: q.quote_number,
    title: q.title,
    status: q.status,
    total_cents: q.total_cents,
    created_at: q.created_at,
    customer: q.customer as {
      first_name: string | null;
      last_name: string | null;
    } | null,
  }));

  return (
    <div className="p-4 sm:p-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Quotes</h1>
        <Link
          href="/app/quotes/new"
          className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden xs:inline">New Quote</span>
        </Link>
      </div>

      {/* ---- Search (visible even when empty) ---- */}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <input
          type="search"
          placeholder="Search quotes..."
          disabled={!hasQuotes}
          className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20 disabled:opacity-50"
        />
      </div>

      {/* ---- Content ---- */}
      {hasQuotes || serverQuotes.length > 0 ? (
        <>
          <QuotesList serverQuotes={serverQuotes} />

          {/* Cursor-based pagination */}
          <div className="mt-4 flex items-center justify-center gap-3">
            {cursor && (
              <Link
                href="/app/quotes"
                className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-sm transition-colors hover:bg-[hsl(var(--muted))]"
              >
                Newest
              </Link>
            )}
            {nextCursor && (
              <Link
                href={`/app/quotes?cursor=${encodeURIComponent(nextCursor)}`}
                className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-sm transition-colors hover:bg-[hsl(var(--muted))]"
              >
                Older
              </Link>
            )}
          </div>
        </>
      ) : (
        /* ---- Empty state ---- */
        <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-[hsl(var(--border))] px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950">
            <FileText className="h-7 w-7 text-brand-600 dark:text-brand-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold">
            No quotes yet
          </h2>
          <p className="mt-1 max-w-xs text-sm text-[hsl(var(--muted-foreground))]">
            Create your first quote by capturing photos and recording a
            voice note about the job.
          </p>
          <Link
            href="/app/quotes/new"
            className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Create First Quote
          </Link>
        </div>
      )}
    </div>
  );
}
