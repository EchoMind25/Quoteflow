import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <Features />

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-500 px-4 py-20 text-center text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Ready to Quote Faster?
          </h2>
          <p className="mb-8 text-xl opacity-90">
            Join thousands of contractors who've transformed their quoting process.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <a
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white bg-white px-8 py-4 text-base font-semibold text-primary-600 shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              Start Free Trial
            </a>
            <a
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              View Pricing
            </a>
          </div>
          <p className="mt-6 text-sm opacity-80">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>
    </>
  );
}
