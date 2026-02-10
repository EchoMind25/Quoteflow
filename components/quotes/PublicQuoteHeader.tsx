"use client";

import Image from "next/image";
import { Phone, Mail, Star } from "lucide-react";
import { motion } from "framer-motion";
import { slideDown, duration, ease } from "@/lib/design-system/motion";
import type { Business, Quote, Customer } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

type PublicQuoteHeaderProps = {
  business: Pick<Business, "name" | "logo_url" | "primary_color"> & {
    phone?: string | null;
    email?: string | null;
    review_count?: number;
    review_average?: number;
  };
  quote: Pick<Quote, "quote_number" | "title" | "expires_at">;
  customer: Pick<Customer, "first_name" | "last_name"> | null;
};

// ============================================================================
// Helpers
// ============================================================================

function formatPhoneNumber(phone: string): string {
  // Format 10-digit US numbers as (xxx) xxx-xxxx
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Professional document-style header for public quotes
 * Branded with business logo and primary color
 */
export function PublicQuoteHeader({
  business,
  quote,
  customer,
}: PublicQuoteHeaderProps) {
  const customerName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : null;

  const formattedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const expiryDate = quote.expires_at
    ? new Date(quote.expires_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <motion.header
      className="quote-header print:border-t-4"
      style={
        {
          "--header-accent": business.primary_color || "var(--primary-500)",
        } as React.CSSProperties
      }
      variants={slideDown}
      initial="initial"
      animate="animate"
      transition={{ duration: duration.normal, ease: ease.enter }}
    >
      {/* Top Band - Business Info */}
      <div className="border-b border-neutral-200 bg-white px-6 py-6 dark:border-neutral-700 dark:bg-neutral-900 print:bg-white">
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-6">
          {/* Business Identity */}
          <div className="flex-1">
            {business.logo_url && (
              <motion.div
                className="mb-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: duration.normal }}
              >
                <Image
                  src={business.logo_url}
                  alt={business.name}
                  width={180}
                  height={48}
                  priority
                  className="h-12 w-auto object-contain object-left"
                  style={{ width: "auto", height: "48px" }}
                />
              </motion.div>
            )}
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white print:text-black">
              {business.name}
            </h1>

            {/* Review Stars */}
            {business.review_count != null && business.review_count > 0 && (
              <div className="mt-1 flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-neutral-900 dark:text-white">
                  {business.review_average}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  ({business.review_count} review{business.review_count !== 1 ? "s" : ""})
                </span>
              </div>
            )}

            {/* Business Contact Info */}
            {(business.phone || business.email) && (
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400 print:text-neutral-600">
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="flex items-center gap-1.5 transition-colors hover:text-[hsl(var(--primary-600))]"
                  >
                    <Phone className="h-4 w-4" />
                    <span>{formatPhoneNumber(business.phone)}</span>
                  </a>
                )}
                {business.email && (
                  <a
                    href={`mailto:${business.email}`}
                    className="flex items-center gap-1.5 transition-colors hover:text-[hsl(var(--primary-600))]"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{business.email}</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quote Number */}
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 print:text-neutral-600">
              Quote
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-neutral-900 dark:text-white print:text-black">
              #{quote.quote_number}
            </p>
          </div>
        </div>
      </div>

      {/* Quote Details */}
      <div className="bg-neutral-50 px-6 py-5 dark:bg-neutral-800 print:bg-neutral-50">
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {/* Quote For */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Quote For
            </p>
            {customerName ? (
              <p className="mt-2 text-base font-medium text-neutral-900 dark:text-white print:text-black">
                {customerName}
              </p>
            ) : (
              <p className="mt-2 text-base italic text-neutral-400 dark:text-neutral-500">
                Customer
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Date: {formattedDate}
            </p>
            {expiryDate && (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Expires: {expiryDate}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
