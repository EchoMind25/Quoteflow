import Link from "next/link";
import { PricingTiers } from "@/components/pricing/pricing-tiers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | QuoteFlow",
  description:
    "Simple, transparent pricing for service professionals. No hidden fees, no usage limits.",
};

export default function PricingPage() {
  return (
    <div className="min-h-dvh bg-[hsl(var(--background))]">
      {/* ---- Nav ---- */}
      <header className="border-b border-[hsl(var(--border))]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-brand-600"
          >
            QuoteFlow
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-4xl font-bold md:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-[hsl(var(--muted-foreground))]">
            No hidden fees. No usage limits. No surprises. Just professional
            quotes that help you close more jobs.
          </p>
        </div>
      </section>

      {/* ---- Tiers ---- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <PricingTiers />
      </section>

      {/* ---- FAQ ---- */}
      <section className="border-t border-[hsl(var(--border))]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            <FaqItem
              question="Can I cancel anytime?"
              answer="Yes. No contracts, no cancellation fees. Cancel with one click from your account settings."
            />
            <FaqItem
              question="What happens to my data if I cancel?"
              answer="You can export all your data (quotes, customers, photos) before canceling. We keep your data for 30 days after cancellation in case you change your mind."
            />
            <FaqItem
              question="Do you really mean unlimited quotes?"
              answer="Yes. Create as many quotes as you need, no caps, no extra charges. We built QuoteFlow to get out of your way, not nickel-and-dime you."
            />
            <FaqItem
              question="How does the Team plan work?"
              answer="Team plan includes 2 users. Need more? Add additional team members for $15/month each. Every team member gets full access to AI quote generation."
            />
            <FaqItem
              question="What's included in Enterprise?"
              answer="Enterprise is custom-tailored to your needs. Includes unlimited users, custom integrations (ServiceTitan, QuickBooks, etc.), dedicated support, and SLA guarantees. Contact us for pricing."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold">{question}</h3>
      <p className="mt-2 text-[hsl(var(--muted-foreground))]">{answer}</p>
    </div>
  );
}
