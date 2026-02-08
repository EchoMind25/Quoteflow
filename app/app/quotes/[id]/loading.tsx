export default function QuoteDetailLoading() {
  return (
    <div className="p-4 sm:p-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-[hsl(var(--muted))]" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-5 w-2/3 animate-pulse rounded bg-[hsl(var(--muted))]" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-[hsl(var(--muted))]" />
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
      </div>

      {/* Line items skeleton */}
      <div className="mt-6 overflow-hidden rounded-xl border border-[hsl(var(--border))]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 border-b border-[hsl(var(--border))] px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[hsl(var(--muted))]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[hsl(var(--muted))]" />
            </div>
            <div className="h-4 w-16 shrink-0 animate-pulse rounded bg-[hsl(var(--muted))]" />
          </div>
        ))}

        {/* Totals skeleton */}
        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-4 py-3 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-16 animate-pulse rounded bg-[hsl(var(--muted))]" />
            <div className="h-4 w-20 animate-pulse rounded bg-[hsl(var(--muted))]" />
          </div>
          <div className="flex justify-between border-t border-[hsl(var(--border))] pt-2">
            <div className="h-5 w-12 animate-pulse rounded bg-[hsl(var(--muted))]" />
            <div className="h-6 w-24 animate-pulse rounded bg-[hsl(var(--muted))]" />
          </div>
        </div>
      </div>

      {/* Send button skeleton */}
      <div className="mt-6 h-11 w-full animate-pulse rounded-lg bg-[hsl(var(--muted))]" />
    </div>
  );
}
