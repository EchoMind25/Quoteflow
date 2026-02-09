"use client";

import { Check } from "lucide-react";
import Link from "next/link";

// ============================================================================
// Tier data
// ============================================================================

const tiers = [
  {
    name: "Solo",
    price: "$60",
    period: "/month",
    description: "The quote system that gets out of your way",
    tagline:
      "For solo operators who work hard to keep their customers happy, always have a full schedule, or are overwhelmed with quotes and keeping accounts up to date.",
    features: [
      "Unlimited quotes",
      "Unlimited customers",
      "AI-powered quote generation (photo + voice)",
      "Email & SMS delivery to customers",
      "Industry-specific pricing intelligence",
      "Basic reporting & analytics",
      "Offline mode (quotes sync when online)",
      "1 user",
    ],
    cta: "Start Free Trial",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Team",
    price: "$100",
    period: "/month",
    description: "Built for teams that need consistency and control",
    tagline:
      "Everything your team needs to quote faster, stay aligned, and look professional\u2014without the enterprise price tag.",
    features: [
      "Everything in Solo, plus:",
      "2 team members included",
      "$15/month per additional team member",
      "Shared service catalog (consistent pricing)",
      "White-label branding (logo + custom colors)",
      "Template library (pre-built quote templates)",
      "Approval workflows (quote review + sign-off)",
      "Team performance dashboard",
      "Role-based permissions (Owner / Admin / Technician)",
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
    description: "Tailored solutions for growing service companies",
    tagline:
      "Built specifically for your workflows, integrated with your tools, supported by our team.",
    features: [
      "Everything in Team, plus:",
      "Unlimited users",
      "Custom integrations (ServiceTitan, QuickBooks, Stripe, etc.)",
      "White-label API access",
      "Dedicated success manager",
      "99.99% uptime SLA",
      "Custom onboarding & training",
      "Advanced reporting & analytics",
      "Multi-location support",
      "Custom workflows",
    ],
    cta: "Contact Sales",
    href: "mailto:braxton@bedrockai.systems",
    highlighted: false,
  },
] as const;

// ============================================================================
// Component
// ============================================================================

export function PricingTiers() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {tiers.map((tier) => (
        <div
          key={tier.name}
          className={`relative rounded-2xl border-2 bg-[hsl(var(--background))] p-8 ${
            tier.highlighted
              ? "border-brand-600 shadow-xl lg:scale-105"
              : "border-[hsl(var(--border))]"
          }`}
        >
          {tier.highlighted && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-sm font-semibold text-white">
              Most Popular
            </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold">{tier.name}</h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              {tier.description}
            </p>
            <div className="mt-4 flex items-baseline">
              <span className="text-5xl font-bold">{tier.price}</span>
              {tier.period && (
                <span className="ml-2 text-[hsl(var(--muted-foreground))]">
                  {tier.period}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              {tier.tagline}
            </p>
          </div>

          {/* CTA */}
          <Link
            href={tier.href}
            className={`mb-6 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
              tier.highlighted
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/80"
            }`}
          >
            {tier.cta}
          </Link>

          {/* Features */}
          <div className="space-y-3">
            {tier.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <span
                  className={`text-sm ${
                    feature.startsWith("Everything") ? "font-semibold" : ""
                  }`}
                >
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
