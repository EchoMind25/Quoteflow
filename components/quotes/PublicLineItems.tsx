"use client";

import { motion } from "framer-motion";
import { formatCents } from "@/lib/utils";
import { listContainer, listItem, duration, ease } from "@/lib/design-system/motion";
import type { QuoteLineItem, Quote } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

type PublicLineItemsProps = {
  items: Pick<
    QuoteLineItem,
    "id" | "title" | "description" | "quantity" | "unit" | "line_total_cents"
  >[];
  quote: Pick<
    Quote,
    "subtotal_cents" | "tax_rate" | "tax_cents" | "discount_cents" | "total_cents"
  >;
};

// ============================================================================
// Component
// ============================================================================

/**
 * Professional line items table with staggered animations
 * Clean, scannable layout optimized for mobile and print
 */
export function PublicLineItems({ items, quote }: PublicLineItemsProps) {
  return (
    <div className="line-items-section">
      {/* Line Items Table */}
      <motion.div
        className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 print:border print:border-neutral-300"
        variants={listContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Desktop Table */}
        <table className="hidden w-full sm:table">
          <thead className="bg-neutral-50 dark:bg-neutral-800 print:bg-neutral-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300 print:text-black">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300 print:text-black">
                Qty
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300 print:text-black">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 print:divide-neutral-200">
            {items.map((item, index) => (
              <motion.tr
                key={item.id}
                variants={listItem}
                transition={{
                  delay: index * 0.05,
                  duration: duration.normal,
                  ease: ease.enter,
                }}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 print:hover:bg-transparent"
              >
                <td className="px-6 py-4">
                  <p className="font-medium text-neutral-900 dark:text-white print:text-black">
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 print:text-neutral-700">
                      {item.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-4 text-right text-sm text-neutral-600 dark:text-neutral-400 print:text-black">
                  {item.quantity} {item.unit}
                </td>
                <td className="px-6 py-4 text-right font-semibold tabular-nums text-neutral-900 dark:text-white print:text-black">
                  {formatCents(item.line_total_cents)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Cards */}
        <motion.div
          className="divide-y divide-neutral-100 dark:divide-neutral-800 sm:hidden"
          variants={listContainer}
        >
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              className="px-4 py-4"
              variants={listItem}
              transition={{
                delay: index * 0.05,
                duration: duration.normal,
                ease: ease.enter,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {item.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                    {item.quantity} {item.unit}
                  </p>
                </div>
                <span className="shrink-0 text-base font-semibold tabular-nums text-neutral-900 dark:text-white">
                  {formatCents(item.line_total_cents)}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Totals Section */}
      <motion.div
        className="mt-6 rounded-lg border border-neutral-200 bg-white px-6 py-5 dark:border-neutral-700 dark:bg-neutral-900 print:border print:border-neutral-300 print:bg-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: items.length * 0.05 + 0.2,
          duration: duration.normal,
          ease: ease.enter,
        }}
      >
        <div className="space-y-3">
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400 print:text-neutral-700">
              Subtotal
            </span>
            <span className="font-medium tabular-nums text-neutral-900 dark:text-white print:text-black">
              {formatCents(quote.subtotal_cents)}
            </span>
          </div>

          {/* Tax */}
          {quote.tax_cents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400 print:text-neutral-700">
                Tax ({(quote.tax_rate * 100).toFixed(1)}%)
              </span>
              <span className="font-medium tabular-nums text-neutral-900 dark:text-white print:text-black">
                {formatCents(quote.tax_cents)}
              </span>
            </div>
          )}

          {/* Discount */}
          {quote.discount_cents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 dark:text-green-400 print:text-green-700">
                Discount
              </span>
              <span className="font-medium tabular-nums text-green-600 dark:text-green-400 print:text-green-700">
                -{formatCents(quote.discount_cents)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex items-baseline justify-between border-t border-neutral-300 pt-3 dark:border-neutral-600 print:border-neutral-400">
            <span className="text-lg font-bold text-neutral-900 dark:text-white print:text-black">
              Total Due
            </span>
            <motion.span
              className="text-2xl font-bold tabular-nums"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-600), var(--primary-500))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: items.length * 0.05 + 0.4,
                ...ease.bounce,
              }}
            >
              {formatCents(quote.total_cents)}
            </motion.span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
