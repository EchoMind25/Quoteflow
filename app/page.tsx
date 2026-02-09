import Link from "next/link";
import {
  Camera,
  Mic,
  Zap,
  Send,
  Wifi,
  WifiOff,
  Shield,
  Clock,
} from "lucide-react";

export default function HomePage() {
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
              href="/pricing"
              className="text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              Pricing
            </Link>
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
      <section className="border-b border-[hsl(var(--border))]">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Professional quotes in
            <span className="text-brand-600"> seconds</span>,
            <br className="hidden sm:block" /> not hours
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[hsl(var(--muted-foreground))] sm:text-xl">
            Snap photos, describe the job, and let AI generate accurate quotes
            for HVAC, plumbing, and electrical work. Send to customers instantly.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-brand-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-700 sm:w-auto"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="w-full rounded-lg border border-[hsl(var(--border))] px-8 py-3.5 text-base font-semibold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))] sm:w-auto"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="border-b border-[hsl(var(--border))]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold">
            From job site to quote in 3 steps
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[hsl(var(--muted-foreground))]">
            No more scribbling on clipboards or building quotes at the kitchen
            table after a long day.
          </p>

          <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-3">
            <Step
              step="1"
              icon={<Camera className="h-6 w-6" />}
              title="Capture the job"
              description="Take photos of the work site and record a voice note describing the scope. Works offline."
            />
            <Step
              step="2"
              icon={<Zap className="h-6 w-6" />}
              title="AI generates your quote"
              description="Our AI analyzes photos and transcription to produce itemized line items with industry pricing."
            />
            <Step
              step="3"
              icon={<Send className="h-6 w-6" />}
              title="Send to customer"
              description="Review, edit if needed, and deliver a branded quote via email or SMS in one tap."
            />
          </div>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section className="border-b border-[hsl(var(--border))]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold">
            Built for the field, not the office
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={<Mic className="h-5 w-5" />}
              title="Voice-to-quote"
              description="Describe the job out loud. AI transcribes and extracts line items automatically."
            />
            <Feature
              icon={<Camera className="h-5 w-5" />}
              title="Photo analysis"
              description="AI inspects job site photos to identify equipment, materials, and scope of work."
            />
            <Feature
              icon={<WifiOff className="h-5 w-5" />}
              title="Works offline"
              description="Create quotes in basements, crawlspaces, anywhere. Syncs when you're back online."
            />
            <Feature
              icon={<Shield className="h-5 w-5" />}
              title="Privacy-first"
              description="Your data stays yours. Encrypted storage, no data selling, no third-party training."
            />
            <Feature
              icon={<Clock className="h-5 w-5" />}
              title="Instant delivery"
              description="Send branded quotes via email or SMS. Customers accept or decline right from the link."
            />
            <Feature
              icon={<Zap className="h-5 w-5" />}
              title="Industry pricing"
              description="AI-calibrated rates for HVAC, plumbing, and electrical. Edit any line item before sending."
            />
            <Feature
              icon={<Wifi className="h-5 w-5" />}
              title="Real-time sync"
              description="Team members see the same customers, catalog, and quotes. Changes sync instantly."
            />
            <Feature
              icon={<Send className="h-5 w-5" />}
              title="Customer tracking"
              description="Know when quotes are viewed, accepted, or declined. Follow up at the right time."
            />
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold">
            Stop losing jobs to slow quotes
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[hsl(var(--muted-foreground))]">
            The first contractor to send a professional quote wins the job.
            QuoteFlow gets you there first.
          </p>
          <div className="mt-10">
            <Link
              href="/signup"
              className="rounded-lg bg-brand-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Start Free Trial
            </Link>
          </div>
          <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-[hsl(var(--border))]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            &copy; {new Date().getFullYear()} QuoteFlow. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/pricing"
              className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({
  step,
  icon,
  title,
  description,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
        {icon}
      </div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        Step {step}
      </div>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
        {description}
      </p>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
        {description}
      </p>
    </div>
  );
}
