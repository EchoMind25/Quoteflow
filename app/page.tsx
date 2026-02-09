import type { Metadata } from "next";
import { Header } from "@/components/marketing/header";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemStatement } from "@/components/marketing/problem-statement";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { IndustryBenefits } from "@/components/marketing/industry-benefits";
import { PrivacyCallout } from "@/components/marketing/privacy-callout";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title:
    "QuoteFlow | AI-Powered Quoting for HVAC, Plumbing & Electrical Businesses",
  description:
    "Generate professional quotes in 90 seconds with AI. QuoteFlow helps service businesses quote faster, more accurately, and with complete data privacy. Start your free trial today.",
  openGraph: {
    title:
      "QuoteFlow | AI-Powered Quoting for HVAC, Plumbing & Electrical Businesses",
    description:
      "Generate professional quotes in 90 seconds with AI. QuoteFlow helps service businesses quote faster, more accurately, and with complete data privacy.",
    url: "https://quoteflow.app",
    siteName: "QuoteFlow",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "QuoteFlow | AI-Powered Quoting for HVAC, Plumbing & Electrical Businesses",
    description:
      "Generate professional quotes in 90 seconds with AI. Start your free trial today.",
  },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "QuoteFlow",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android (PWA)",
    description:
      "AI-powered quoting platform for HVAC, plumbing, and electrical service businesses.",
    offers: [
      {
        "@type": "Offer",
        name: "Solo",
        price: "60.00",
        priceCurrency: "USD",
        billingIncrement: "P1M",
      },
      {
        "@type": "Offer",
        name: "Team",
        price: "100.00",
        priceCurrency: "USD",
        billingIncrement: "P1M",
      },
    ],
    creator: {
      "@type": "Organization",
      name: "Bedrock AI",
      url: "https://bedrockutah.com",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Salt Lake City",
        addressRegion: "UT",
        addressCountry: "US",
      },
    },
  };

  return (
    <div className="min-h-dvh">
      <Header />
      <main id="main">
        <HeroSection />
        <ProblemStatement />
        <HowItWorks />
        <FeaturesGrid />
        <IndustryBenefits />
        <PrivacyCallout />
        <PricingPreview />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
