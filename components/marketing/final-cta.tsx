import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-navy py-20 sm:py-28">
      {/* Background glow */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Ready to Quote Faster Than Ever?
        </h2>
        <p className="mt-4 text-lg text-gray-300">
          Join service businesses saving 10+ hours per week with AI-powered
          quoting.
        </p>
        <div className="mt-10">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-10 py-4 text-lg font-semibold text-navy transition-all hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/25"
          >
            Start Your Free Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          No credit card required &bull; 3-day free trial &bull; Cancel anytime
        </p>
      </div>
    </section>
  );
}
