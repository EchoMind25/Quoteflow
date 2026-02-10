"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ApiCost } from "@/types/database";

interface Props {
  costs: ApiCost[];
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#8b5cf6",
  assemblyai: "#3b82f6",
  twilio: "#10b981",
  resend: "#f59e0b",
};

export function CostChart({ costs }: Props) {
  // Group by date, sum by provider
  const byDate = new Map<string, Record<string, number>>();
  for (const cost of costs) {
    const existing = byDate.get(cost.cost_date) ?? {};
    existing[cost.provider] =
      (existing[cost.provider] ?? 0) + cost.cost_cents;
    byDate.set(cost.cost_date, existing);
  }

  const providers = [...new Set(costs.map((c) => c.provider))];

  const chartData = Array.from(byDate.entries()).map(([date, providers_data]) => ({
    date,
    ...Object.fromEntries(
      Object.entries(providers_data).map(([k, v]) => [k, v / 100]),
    ),
  }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Cost Trend</h2>
        <p className="py-12 text-center text-neutral-500">No cost data yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-4 text-lg font-semibold">Cost Trend (30 days)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="date"
            stroke="#666"
            fontSize={12}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            stroke="#666"
            fontSize={12}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
            }}
            formatter={(value) => `$${Number(value).toFixed(2)}`}
          />
          <Legend />
          {providers.map((provider) => (
            <Area
              key={provider}
              type="monotone"
              dataKey={provider}
              stackId="1"
              stroke={PROVIDER_COLORS[provider] ?? "#666"}
              fill={PROVIDER_COLORS[provider] ?? "#666"}
              fillOpacity={0.3}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
