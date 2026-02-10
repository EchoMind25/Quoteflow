"use client";

/**
 * Quote Review Footer - Animated running totals
 * Shows subtotal, tax, discount, and total with smooth count animations
 */

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { duration, ease } from "@/lib/design-system/motion";

// ============================================================================
// Types
// ============================================================================

interface QuoteReviewFooterProps {
  subtotalCents: number;
  taxRateBasisPoints: number; // e.g., 850 = 8.5%
  discountCents: number;
  className?: string;
}

// ============================================================================
// Animated Number Component
// ============================================================================

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

// ============================================================================
// Component
// ============================================================================

export function QuoteReviewFooter({
  subtotalCents,
  taxRateBasisPoints,
  discountCents,
  className = "",
}: QuoteReviewFooterProps) {
  // Calculate values
  const taxCents = Math.round((subtotalCents * taxRateBasisPoints) / 10000);
  const totalCents = subtotalCents + taxCents - discountCents;

  // Convert to dollars for display
  const subtotal = subtotalCents / 100;
  const tax = taxCents / 100;
  const discount = discountCents / 100;
  const total = totalCents / 100;

  const taxRate = taxRateBasisPoints / 100;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`sticky bottom-0 left-0 right-0 border-t border-[hsl(var(--border))] bg-white/80 backdrop-blur-md dark:bg-gray-900/80 ${className}`}
    >
      <div className="mx-auto max-w-4xl space-y-3 p-4">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Subtotal</span>
          <span className="tabular-nums text-[hsl(var(--foreground))]">
            $<AnimatedNumber value={subtotal} />
          </span>
        </div>

        {/* Tax */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">
            Tax ({taxRate.toFixed(2)}%)
          </span>
          <span className="tabular-nums text-[hsl(var(--foreground))]">
            $<AnimatedNumber value={tax} />
          </span>
        </div>

        {/* Discount (if applicable) */}
        {discountCents > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[hsl(var(--muted-foreground))]">Discount</span>
            <span className="tabular-nums text-green-600 dark:text-green-400">
              -$<AnimatedNumber value={discount} />
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[hsl(var(--border))]" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-[hsl(var(--foreground))]">
            Total
          </span>
          <motion.span
            className="bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-2xl font-bold tabular-nums text-transparent dark:from-primary-400 dark:to-primary-300"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: duration.normal,
              ease: ease.default,
            }}
            key={totalCents} // Re-trigger animation when total changes
          >
            $<AnimatedNumber value={total} />
          </motion.span>
        </div>

        {/* Visual indicator for large quotes */}
        {totalCents > 100000 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg bg-primary-50 p-3 text-center text-sm text-primary-800 dark:bg-primary-900/20 dark:text-primary-300"
          >
            💰 High-value quote — double-check all details
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
