import { createClient } from "@/lib/supabase/server";
import {
  FileText,
  Users,
  Clock,
  TrendingUp,
  Plus,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch summary counts — RLS ensures only this business's data
  const [quotesResult, customersResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true }),
  ]);

  const quoteCount = quotesResult.count ?? 0;
  const customerCount = customersResult.count ?? 0;

  return (
    <div className="p-4 sm:p-6">
      {/* ---- Stats grid ---- */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={FileText}
          label="Quotes"
          value={quoteCount}
          href="/app/quotes"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={customerCount}
          href="/app/customers"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={0}
          href="/app/quotes"
          sub="quotes"
        />
        <StatCard
          icon={TrendingUp}
          label="Accepted"
          value={0}
          href="/app/quotes"
          sub="this month"
        />
      </div>

      {/* ---- Quick action ---- */}
      <div className="mt-6">
        <Link
          href="/app/quotes/new"
          className="flex h-14 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800"
        >
          <Plus className="h-5 w-5" />
          New Quote
        </Link>
      </div>

      {/* ---- Empty activity feed ---- */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
          Recent Activity
        </h2>
        <div className="flex flex-col items-center rounded-xl border border-dashed border-[hsl(var(--border))] px-6 py-10 text-center">
          <Clock className="mb-3 h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
          <p className="text-sm font-medium">No activity yet</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Create your first quote to see activity here.
          </p>
        </div>
      </section>
    </div>
  );
}

// ---- Stat card sub-component ----

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  sub,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  href: string;
  sub?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-xl border border-[hsl(var(--border))] p-4 transition-colors hover:bg-[hsl(var(--muted))]/50"
    >
      <Icon className="mb-2 h-5 w-5 text-[hsl(var(--muted-foreground))]" />
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
        {label}
        {sub ? ` · ${sub}` : ""}
      </span>
    </Link>
  );
}
