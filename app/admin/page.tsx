import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { RecentErrors } from "@/components/admin/RecentErrors";
import { SystemHealth } from "@/components/admin/SystemHealth";
import { ActiveIncidents } from "@/components/admin/ActiveIncidents";
import { TodayMetrics } from "@/components/admin/TodayMetrics";

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  await logAdminAction(admin.id, "viewed_dashboard", "system");

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0] as string;

  const [
    { count: totalUsers },
    { count: totalBusinesses },
    { count: quotesToday },
    { count: activeIncidents },
    { data: recentErrors },
    { data: healthChecks },
    { data: todayMetrics },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }),
    supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", `${today}T00:00:00Z`),
    supabase
      .from("incidents")
      .select("*", { count: "exact", head: true })
      .neq("status", "resolved"),
    supabase
      .from("error_logs")
      .select(
        "id, error_type, error_message, severity, occurrence_count, last_seen_at",
      )
      .eq("is_resolved", false)
      .order("last_seen_at", { ascending: false })
      .limit(5),
    supabase
      .from("health_checks")
      .select("service_name, is_healthy, response_time_ms, checked_at")
      .order("checked_at", { ascending: false })
      .limit(10),
    supabase
      .from("system_metrics")
      .select("metric_type, metric_value")
      .eq("metric_date", today),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Developer Hub</h1>

      {(activeIncidents ?? 0) > 0 && (
        <ActiveIncidents count={activeIncidents ?? 0} />
      )}

      <DashboardStats
        totalUsers={totalUsers ?? 0}
        totalBusinesses={totalBusinesses ?? 0}
        quotesToday={quotesToday ?? 0}
      />

      <TodayMetrics metrics={todayMetrics ?? []} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SystemHealth checks={healthChecks ?? []} />
        <RecentErrors errors={recentErrors ?? []} />
      </div>
    </div>
  );
}
