"use client";

import type { ApiCost } from "@/types/database";

interface Props {
  costs: ApiCost[];
}

export function CostBreakdown({ costs }: Props) {
  // Aggregate by provider + operation
  const breakdown = new Map<
    string,
    { provider: string; operation: string; requests: number; cost: number }
  >();

  for (const cost of costs) {
    const key = `${cost.provider}:${cost.operation}`;
    const existing = breakdown.get(key) ?? {
      provider: cost.provider,
      operation: cost.operation,
      requests: 0,
      cost: 0,
    };
    existing.requests += cost.request_count;
    existing.cost += cost.cost_cents;
    breakdown.set(key, existing);
  }

  const rows = Array.from(breakdown.values()).sort(
    (a, b) => b.cost - a.cost,
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="p-6 pb-0">
        <h2 className="text-lg font-semibold">Breakdown by Operation</h2>
      </div>
      <div className="mt-4">
        <table className="w-full">
          <thead className="bg-neutral-800/50">
            <tr>
              <th className="p-4 text-left text-sm font-medium text-neutral-400">
                Provider
              </th>
              <th className="p-4 text-left text-sm font-medium text-neutral-400">
                Operation
              </th>
              <th className="p-4 text-right text-sm font-medium text-neutral-400">
                Requests
              </th>
              <th className="p-4 text-right text-sm font-medium text-neutral-400">
                Cost
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {rows.map((row) => (
              <tr
                key={`${row.provider}:${row.operation}`}
                className="hover:bg-neutral-800/50"
              >
                <td className="p-4 text-sm font-medium capitalize">
                  {row.provider}
                </td>
                <td className="p-4 font-mono text-sm text-neutral-400">
                  {row.operation}
                </td>
                <td className="p-4 text-right text-sm">
                  {row.requests.toLocaleString()}
                </td>
                <td className="p-4 text-right text-sm font-medium">
                  ${(row.cost / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
