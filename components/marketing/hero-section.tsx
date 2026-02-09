import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-navy pb-20 pt-32 sm:pb-28 sm:pt-40">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-5 lg:gap-16">
          {/* Left column — 60% */}
          <div className="lg:col-span-3">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
              Generate Professional Quotes in{" "}
              <span className="text-accent">90 Seconds</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-300 sm:text-xl">
              AI-powered quoting for HVAC, plumbing, and electrical businesses.
              Capture photos, record details, send accurate quotes—all from your
              phone.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-8 py-4 text-base font-semibold text-navy transition-all hover:bg-accent-dark hover:shadow-lg hover:shadow-accent/25"
              >
                Start Your Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent/30 px-8 py-4 text-base font-semibold text-accent transition-colors hover:border-accent hover:bg-accent/10"
              >
                <Play className="h-4 w-4" />
                See How It Works
              </a>
            </div>
            <p className="mt-6 text-sm text-gray-400">
              No credit card required &bull; 3-day free trial &bull; Cancel
              anytime
            </p>
          </div>

          {/* Right column — 40% — Phone mockup */}
          <div className="lg:col-span-2" aria-hidden="true">
            <div className="relative mx-auto w-64 sm:w-72">
              {/* Phone frame */}
              <div className="rounded-[2.5rem] border-[8px] border-gray-700 bg-navy-light p-2 shadow-2xl">
                <div className="rounded-[2rem] bg-white/5 p-4">
                  {/* Status bar */}
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>9:41</span>
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-gray-500" />
                      <div className="h-2 w-4 rounded-sm bg-gray-500" />
                    </div>
                  </div>

                  {/* App header */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-accent/20" />
                    <span className="text-xs font-semibold text-accent">
                      Quotestream
                    </span>
                  </div>

                  {/* Quote card */}
                  <div className="mt-4 rounded-xl bg-white/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-white">
                        HVAC Replacement
                      </span>
                      <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[9px] text-green-400">
                        Ready
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">Equipment</span>
                        <span className="text-gray-200">$4,200</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">Labor (6hrs)</span>
                        <span className="text-gray-200">$780</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">Materials</span>
                        <span className="text-gray-200">$340</span>
                      </div>
                      <div className="mt-1 flex justify-between border-t border-white/10 pt-1 text-[10px] font-semibold">
                        <span className="text-white">Total</span>
                        <span className="text-accent">$5,320</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 flex gap-2">
                    <div className="flex-1 rounded-lg bg-accent/20 py-2 text-center text-[10px] font-medium text-accent">
                      Edit
                    </div>
                    <div className="flex-1 rounded-lg bg-accent py-2 text-center text-[10px] font-semibold text-navy">
                      Send Quote
                    </div>
                  </div>

                  {/* Placeholder lines */}
                  <div className="mt-3 space-y-2">
                    <div className="h-8 rounded-lg bg-white/5" />
                    <div className="h-8 rounded-lg bg-white/5" />
                  </div>
                </div>
              </div>

              {/* Decorative glow */}
              <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-accent/10 blur-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
