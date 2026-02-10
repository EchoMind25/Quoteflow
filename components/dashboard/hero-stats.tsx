"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";
import { listContainer, listItem, scaleIn } from "@/lib/design-system/motion";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: "number" | "currency" | "percent";
  trend?: number; // Percentage change (e.g., 15 = +15%)
  href?: string;
  emphasis?: boolean;
  delay?: number;
};

type HeroMessage = {
  message: string;
  value?: number;
  format?: "number" | "currency";
};

type HeroStatsProps = {
  highlight: HeroMessage;
  quotesCount: number;
  pendingCount: number;
  revenueTotal: number;
  quotesTrend?: number;
};

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  format = "number",
  trend,
  href,
  emphasis = false,
  delay = 0,
}: StatCardProps) {
  const content = (
    <motion.div
      variants={listItem}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex flex-col rounded-2xl border p-4 transition-colors",
        emphasis
          ? "border-brand-600/30 bg-brand-50/50 dark:border-brand-400/30 dark:bg-brand-950/30"
          : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]/50",
      )}
    >
      {/* Icon */}
      <Icon
        className={cn(
          "mb-3 h-5 w-5",
          emphasis
            ? "text-brand-600 dark:text-brand-400"
            : "text-[hsl(var(--muted-foreground))]",
        )}
      />

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <AnimatedNumber
          value={value}
          format={format}
          className="text-2xl font-bold tabular-nums"
        />

        {/* Trend indicator */}
        {trend !== undefined && trend !== 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.2 }}
            className={cn(
              "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
              trend > 0
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                : trend < 0
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
            )}
          >
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </motion.span>
        )}
      </div>

      {/* Label */}
      <span className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
    </motion.div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// ============================================================================
// HIGHLIGHT CARD
// ============================================================================

function HighlightCard({ message, value, format }: HeroMessage) {
  return (
    <motion.div
      variants={scaleIn}
      className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white shadow-lg shadow-brand-600/20"
    >
      <p className="mb-2 text-sm font-medium opacity-90">{message}</p>

      {value !== undefined && (
        <AnimatedNumber
          value={value}
          format={format}
          className="text-4xl font-bold tabular-nums"
        />
      )}

      {/* Decorative gradient overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent" />
    </motion.div>
  );
}

// ============================================================================
// HERO STATS
// ============================================================================

export function HeroStats({
  highlight,
  quotesCount,
  pendingCount,
  revenueTotal,
  quotesTrend,
}: HeroStatsProps) {
  return (
    <div className="space-y-4">
      {/* Highlight card */}
      <motion.div initial="initial" animate="animate" variants={scaleIn}>
        <HighlightCard {...highlight} />
      </motion.div>

      {/* Stats grid */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        variants={listContainer}
        initial="hidden"
        animate="visible"
      >
        <StatCard
          icon={FileText}
          label="Quotes"
          value={quotesCount}
          trend={quotesTrend}
          href="/app/quotes"
          delay={0.1}
        />

        <StatCard
          icon={Clock}
          label="Pending"
          value={pendingCount}
          emphasis={pendingCount > 0}
          href="/app/quotes?status=sent"
          delay={0.2}
        />

        <StatCard
          icon={TrendingUp}
          label="Revenue"
          value={revenueTotal / 100} // Convert cents to dollars
          format="currency"
          href="/app/quotes?status=accepted"
          delay={0.3}
        />
      </motion.div>
    </div>
  );
}
