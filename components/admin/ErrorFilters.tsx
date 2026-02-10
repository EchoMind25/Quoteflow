"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const ERROR_TYPES = ["runtime", "api", "database", "validation"];
const SEVERITIES = ["critical", "error", "warning"];

export function ErrorFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/admin/errors?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap gap-3">
      <select
        className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200"
        value={searchParams.get("type") ?? ""}
        onChange={(e) => updateFilter("type", e.target.value)}
      >
        <option value="">All Types</option>
        {ERROR_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200"
        value={searchParams.get("severity") ?? ""}
        onChange={(e) => updateFilter("severity", e.target.value)}
      >
        <option value="">All Severities</option>
        {SEVERITIES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200"
        value={searchParams.get("resolved") ?? ""}
        onChange={(e) => updateFilter("resolved", e.target.value)}
      >
        <option value="">All Status</option>
        <option value="false">Unresolved</option>
        <option value="true">Resolved</option>
      </select>
    </div>
  );
}
