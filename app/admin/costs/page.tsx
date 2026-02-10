import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { CostChart } from "@/components/admin/CostChart";
import { CostBreakdown } from "@/components/admin/CostBreakdown";

export default async function APICostsPage() {
  const admin = await requireAdmin();
  await logAdminAction(admin.id, "viewed_costs", "system");

  const supabase = createServiceClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: costs } = await supabase
    .from("api_costs")
    .select("*")
    .gte("cost_date", thirtyDaysAgo.toISOString().split("T")[0]!)
    .order("cost_date", { ascending: true });

  const totals = (costs ?? []).reduce(
    (acc, cost) => {
      acc[cost.provider] = (acc[cost.provider] ?? 0) + cost.cost_cents;
      acc.total = (acc.total ?? 0) + cost.cost_cents;
      return acc;
    },
    {} as Record<string, number>,
  );

  const today = new Date();
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1,
  );

  const thisMonth = (costs ?? [])
    .filter((c) => new Date(c.cost_date) >= thisMonthStart)
    .reduce((sum, c) => sum + c.cost_cents, 0);

  const lastMonth = (costs ?? [])
    .filter(
      (c) =>
        new Date(c.cost_date) >= lastMonthStart &&
        new Date(c.cost_date) < thisMonthStart,
    )
    .reduce((sum, c) => sum + c.cost_cents, 0);

  const monthChange =
    lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">API Costs</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <CostCard title="This Month" value={thisMonth} change={monthChange} />
        <CostCard title="Anthropic" value={totals.anthropic ?? 0} />
        <CostCard title="AssemblyAI" value={totals.assemblyai ?? 0} />
        <CostCard title="Twilio" value={totals.twilio ?? 0} />
      </div>

      <CostChart costs={costs ?? []} />
      <CostBreakdown costs={costs ?? []} />
    </div>
  );
}

function CostCard({
  title,
  value,
  change,
}: {
  title: string;
  value: number;
  change?: number;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <p className="text-sm text-neutral-400">{title}</p>
      <p className="mt-1 text-2xl font-bold">${(value / 100).toFixed(2)}</p>
      {change !== undefined && (
        <p
          className={`mt-1 text-sm ${change >= 0 ? "text-red-400" : "text-green-400"}`}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}% vs last month
        </p>
      )}
    </div>
  );
}
