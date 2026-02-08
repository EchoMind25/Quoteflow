"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

type SortOption = "name" | "recent" | "value";

const SORT_LABELS: Record<SortOption, string> = {
  name: "Name (A-Z)",
  recent: "Recent Quotes",
  value: "Total Value",
};

export function CustomerListControls({
  currentSort,
}: {
  currentSort: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSortChange(sort: SortOption) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    params.delete("page"); // Reset to page 1 on sort change
    router.push(`/app/customers?${params.toString()}`);
  }

  return (
    <div className="mt-4 flex items-center gap-2">
      <ArrowUpDown className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
      <div className="flex gap-1">
        {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(
          ([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSortChange(key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                currentSort === key
                  ? "bg-brand-600 text-white"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/80"
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
