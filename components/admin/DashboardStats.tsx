"use client";

import { Users, Building2, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  totalUsers: number;
  totalBusinesses: number;
  quotesToday: number;
}

const STATS_CONFIG = [
  { key: "users", label: "Total Users", icon: Users, color: "blue" },
  {
    key: "businesses",
    label: "Businesses",
    icon: Building2,
    color: "green",
  },
  {
    key: "quotes",
    label: "Quotes Today",
    icon: FileText,
    color: "purple",
  },
] as const;

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500/20", text: "text-blue-400" },
  green: { bg: "bg-green-500/20", text: "text-green-400" },
  purple: { bg: "bg-purple-500/20", text: "text-purple-400" },
};

export function DashboardStats({
  totalUsers,
  totalBusinesses,
  quotesToday,
}: Props) {
  const values: Record<string, number> = {
    users: totalUsers,
    businesses: totalBusinesses,
    quotes: quotesToday,
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STATS_CONFIG.map((stat, i) => {
        const colors = COLOR_MAP[stat.color] ?? { bg: "bg-neutral-500/20", text: "text-neutral-400" };
        return (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold">
                  {(values[stat.key] ?? 0).toLocaleString()}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${colors.bg}`}
              >
                <stat.icon className={`h-6 w-6 ${colors.text}`} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
