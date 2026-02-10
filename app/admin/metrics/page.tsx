import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { MetricsChart } from "@/components/admin/MetricsChart";
import { UserGrowthChart } from "@/components/admin/UserGrowthChart";

export default async function MetricsPage() {
  const admin = await requireAdmin();
  await logAdminAction(admin.id, "viewed_metrics", "system");

  const supabase = createServiceClient();

  const [
    { data: userGrowth },
    { data: avgProductionTime },
    { data: dailyActive },
    { data: aiUsage },
  ] = await Promise.all([
    supabase.rpc("get_user_growth_by_month"),
    supabase.rpc("get_avg_quote_production_time"),
    supabase.rpc("get_daily_active_businesses"),
    supabase.rpc("get_ai_usage_stats"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usage Metrics</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard
          title="Avg Quote Time"
          value={`${avgProductionTime?.[0]?.avg_seconds ?? 0}s`}
          subtitle="From voice to send"
        />
        <MetricCard
          title="AI Adoption"
          value={`${aiUsage?.[0]?.ai_percentage ?? 0}%`}
          subtitle="Quotes using AI"
        />
        <MetricCard
          title="Users This Month"
          value={
            userGrowth?.[userGrowth.length - 1]?.new_users ?? 0
          }
          subtitle="New signups"
        />
        <MetricCard
          title="Daily Active"
          value={dailyActive?.[0]?.avg_daily ?? 0}
          subtitle="Avg businesses/day"
        />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">User Growth</h2>
        <UserGrowthChart data={userGrowth ?? []} />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Daily Active Businesses</h2>
        <MetricsChart data={dailyActive ?? []} />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <p className="text-sm text-neutral-400">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
    </div>
  );
}
