export default function QuotesLoading() {
  return (
    <div className="p-4 sm:p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-16 animate-pulse rounded bg-[hsl(var(--muted))]" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-[hsl(var(--muted))]" />
      </div>

      {/* Search skeleton */}
      <div className="mt-4 h-10 w-full animate-pulse rounded-lg bg-[hsl(var(--muted))]" />

      {/* Quote list skeletons */}
      <div className="mt-4 divide-y divide-[hsl(var(--border))]">
        {Array.from({ length: 6 }).map((_, i) => (
          <QuoteRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function QuoteRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-[hsl(var(--muted))]" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[hsl(var(--muted))]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[hsl(var(--muted))]" />
      </div>
      <div className="h-5 w-16 shrink-0 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
    </div>
  );
}
