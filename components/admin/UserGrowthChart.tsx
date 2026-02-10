"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  month: string;
  new_users: number;
  total_users: number;
}

interface Props {
  data: DataPoint[];
}

export function UserGrowthChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-neutral-500">
        No growth data yet
      </p>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    month: d.month.slice(0, 7),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="month" stroke="#666" fontSize={12} />
        <YAxis stroke="#666" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
          }}
        />
        <Line
          type="monotone"
          dataKey="total_users"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6", r: 3 }}
          name="Total Users"
        />
        <Line
          type="monotone"
          dataKey="new_users"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: "#10b981", r: 3 }}
          name="New Users"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
