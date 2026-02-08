export default function CustomersLoading() {
  return (
    <div className="p-4 sm:p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 animate-pulse rounded bg-[hsl(var(--muted))]" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-[hsl(var(--muted))]" />
      </div>

      {/* Sort controls skeleton */}
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded-lg bg-[hsl(var(--muted))]"
          />
        ))}
      </div>

      {/* Customer cards skeleton */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <CustomerCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function CustomerCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-[hsl(var(--border))] p-4">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[hsl(var(--muted))]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[hsl(var(--muted))]" />
        <div className="flex gap-3">
          <div className="h-3 w-20 animate-pulse rounded bg-[hsl(var(--muted))]" />
          <div className="h-3 w-16 animate-pulse rounded bg-[hsl(var(--muted))]" />
        </div>
      </div>
    </div>
  );
}
