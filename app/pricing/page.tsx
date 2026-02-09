import type { Metadata } from "next";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { PricingTiers } from "@/components/pricing/pricing-tiers";

export const metadata: Metadata = {
  title: "Pricing | QuoteFlow",
  description:
    "Simple, transparent pricing for service professionals. No hidden fees, no usage limits.",
};

const faqs = [
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. No contracts, no cancellation fees. Cancel with one click from your account settings.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "You can export all your data (quotes, customers, photos) before canceling. We keep your data for 30 days after cancellation in case you change your mind.",
  },
  {
    question: "Do you really mean unlimited quotes?",
    answer:
      "Yes. Create as many quotes as you need, no caps, no extra charges. We built QuoteFlow to get out of your way, not nickel-and-dime you.",
  },
  {
    question: "How does the Team plan work?",
    answer:
      "Team plan includes 2 users. Need more? Add additional team members for $15/month each. Every team member gets full access to AI quote generation.",
  },
  {
    question: "What\u2019s included in Enterprise?",
    answer:
      "Enterprise is custom-tailored to your needs. Includes unlimited users, custom integrations (ServiceTitan, QuickBooks, etc.), dedicated support, and SLA guarantees. Contact us for pricing.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-dvh">
      <Header />

      {/* Hero */}
      <section className="bg-navy pb-16 pt-32 sm:pt-40">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold text-white md:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-300">
            No hidden fees. No usage limits. No surprises. Just professional
            quotes that help you close more jobs.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="bg-[#f8f9fa] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <PricingTiers />
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="text-lg font-semibold text-white">
                  {faq.question}
                </h3>
                <p className="mt-2 text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
