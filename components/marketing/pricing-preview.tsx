import { Check } from "lucide-react";
import Link from "next/link";

const tiers = [
  {
    name: "Solo",
    price: "$60",
    period: "/month",
    features: [
      "Unlimited quotes",
      "1 user",
      "AI quote generation",
      "Email & SMS delivery",
      "Offline mode",
    ],
    cta: "Start Free Trial",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Team",
    price: "$100",
    period: "/month",
    features: [
      "Everything in Solo",
      "2 users included (+$15/ea)",
      "White-label branding",
      "Approval workflows",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/signup",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Everything in Team",
      "Unlimited users",
      "Custom integrations",
      "Dedicated account manager",
      "99.99% uptime SLA",
    ],
    cta: "Contact Sales",
    href: "mailto:braxton@bedrockai.systems",
    highlighted: false,
  },
];

export function PricingPreview() {
  return (
    <section id="pricing" className="bg-navy py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
          Simple Pricing, No Surprises
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border-2 p-8 transition-all hover:scale-[1.02] ${
                tier.highlighted
                  ? "border-accent bg-white/5 shadow-xl shadow-accent/10 lg:scale-105"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-sm font-semibold text-navy">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-bold text-white">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="ml-2 text-gray-400">{tier.period}</span>
                )}
              </div>

              <ul className="mt-8 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span className="text-sm text-gray-300">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                  tier.highlighted
                    ? "bg-accent text-navy hover:bg-accent-dark"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          All plans include a 3-day free trial. No credit card required.{" "}
          <Link
            href="/pricing"
            className="text-accent underline underline-offset-2 hover:text-accent-dark"
          >
            View full pricing details
          </Link>
        </p>
      </div>
    </section>
  );
}
