"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { listContainer, listItem, duration, ease, hoverScale } from "@/lib/design-system/motion";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type PricingTier = {
  name: string;
  price: number | "Custom";
  period?: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  popular?: boolean;
};

const tiers: PricingTier[] = [
  {
    name: "Starter",
    price: 29,
    period: "month",
    description: "Perfect for solo contractors just getting started",
    features: [
      "50 quotes per month",
      "1 user",
      "Voice & photo quotes",
      "AI quote generation",
      "Email & SMS delivery",
      "Basic support",
      "Mobile app",
    ],
    cta: "Start Free Trial",
    ctaHref: "/signup?plan=starter",
  },
  {
    name: "Professional",
    price: 79,
    period: "month",
    description: "For growing teams that need more power",
    features: [
      "Unlimited quotes",
      "5 users",
      "Everything in Starter",
      "Custom branding",
      "Priority support",
      "Activity logs",
      "Advanced analytics",
      "API access",
    ],
    cta: "Start Free Trial",
    ctaHref: "/signup?plan=professional",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with custom needs",
    features: [
      "Unlimited everything",
      "Unlimited users",
      "Everything in Professional",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "Training & onboarding",
      "Custom contract",
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
  },
];

// ============================================================================
// Page Component
// ============================================================================

export default function PricingPage() {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <section className="bg-white px-4 py-20 text-center dark:bg-neutral-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.h1
            className="mb-4 text-5xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.normal, ease: ease.enter }}
          >
            Simple, Transparent{" "}
            <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              Pricing
            </span>
          </motion.h1>
          <motion.p
            className="mx-auto max-w-2xl text-xl text-neutral-600 dark:text-neutral-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: duration.normal, ease: ease.enter }}
          >
            Start free, upgrade when you need more. All plans include 14-day free trial.
          </motion.p>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3"
          variants={listContainer}
          initial="hidden"
          animate="visible"
        >
          {tiers.map((tier, index) => (
            <PricingCard key={tier.name} tier={tier} index={index} />
          ))}
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="border-t border-neutral-200 bg-white px-4 py-20 dark:border-neutral-800 dark:bg-neutral-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-neutral-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <FAQItem
              question="Can I change plans at any time?"
              answer="Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges."
            />
            <FAQItem
              question="What happens after the free trial?"
              answer="After your 14-day free trial, you'll be charged for your selected plan. You can cancel anytime during the trial with no charges."
            />
            <FAQItem
              question="Do you offer refunds?"
              answer="Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund."
            />
            <FAQItem
              question="Can I use Quotestream offline?"
              answer="Absolutely! Quotestream works offline. You can create quotes, take photos, and record voice notes without internet. Everything syncs automatically when you're back online."
            />
            <FAQItem
              question="How does billing work?"
              answer="We bill monthly or annually. Annual plans get a 20% discount. All plans are billed in advance."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-500 px-4 py-16 text-center text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Still have questions?
          </h2>
          <p className="mb-8 text-lg opacity-90">
            Our team is here to help. Get in touch and we'll answer any questions.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white bg-white px-8 py-4 text-base font-semibold text-primary-600 shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            Contact Sales
          </a>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function PricingCard({ tier, index }: { tier: PricingTier; index: number }) {
  return (
    <motion.div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-lg dark:bg-neutral-900",
        tier.popular
          ? "border-primary-500 ring-2 ring-primary-500 dark:border-primary-600"
          : "border-neutral-200 dark:border-neutral-800",
      )}
      variants={listItem}
      transition={{
        delay: index * 0.1,
        duration: duration.normal,
        ease: ease.enter,
      }}
    >
      {/* Popular Badge */}
      {tier.popular && (
        <div className="absolute right-6 top-6 rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">
          Most Popular
        </div>
      )}

      {/* Header */}
      <div className="border-b border-neutral-200 p-8 dark:border-neutral-800">
        <h3 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-white">
          {tier.name}
        </h3>
        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          {tier.description}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          {typeof tier.price === "number" && (
            <span className="text-5xl font-bold text-neutral-900 dark:text-white">
              ${tier.price}
            </span>
          )}
          {typeof tier.price === "string" && (
            <span className="text-5xl font-bold text-neutral-900 dark:text-white">
              {tier.price}
            </span>
          )}
          {tier.period && (
            <span className="text-neutral-600 dark:text-neutral-400">
              /{tier.period}
            </span>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 p-8">
        <ul className="space-y-4">
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="h-5 w-5 shrink-0 text-green-600" />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="p-8 pt-0">
        <motion.a
          href={tier.ctaHref}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-semibold shadow-lg transition-all",
            tier.popular
              ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-700 hover:to-primary-600"
              : "border-2 border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700",
          )}
          whileHover={hoverScale}
          whileTap={{ scale: 0.95 }}
        >
          {tier.cta}
        </motion.a>
      </div>
    </motion.div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-800/50">
      <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
        {question}
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400">{answer}</p>
    </div>
  );
}
