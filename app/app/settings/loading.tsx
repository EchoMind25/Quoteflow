export default function SettingsLoading() {
  return (
    <div className="p-4 sm:p-6">
      <div className="h-6 w-20 animate-pulse rounded bg-[hsl(var(--muted))]" />

      {/* Profile card skeleton */}
      <div className="mt-4 rounded-xl border border-[hsl(var(--border))] p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 animate-pulse rounded bg-[hsl(var(--muted))]" />
            <div className="h-3 w-48 animate-pulse rounded bg-[hsl(var(--muted))]" />
            <div className="h-3 w-24 animate-pulse rounded bg-[hsl(var(--muted))]" />
          </div>
        </div>
      </div>

      {/* Settings links skeleton */}
      <div className="mt-6 space-y-1">
        <div className="h-3 w-20 animate-pulse rounded bg-[hsl(var(--muted))] pt-5" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-3">
            <div className="h-5 w-5 animate-pulse rounded bg-[hsl(var(--muted))]" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 animate-pulse rounded bg-[hsl(var(--muted))]" />
              <div className="h-3 w-48 animate-pulse rounded bg-[hsl(var(--muted))]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
