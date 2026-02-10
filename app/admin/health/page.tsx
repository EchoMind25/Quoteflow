import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { HealthGrid } from "@/components/admin/HealthGrid";

export default async function HealthPage() {
  const admin = await requireAdmin();
  await logAdminAction(admin.id, "viewed_health", "system");

  const supabase = createServiceClient();

  const { data: checks } = await supabase
    .from("health_checks")
    .select("*")
    .order("checked_at", { ascending: false })
    .limit(100);

  // Deduplicate to latest check per service
  const latestByService = new Map<
    string,
    NonNullable<typeof checks>[number]
  >();
  for (const check of checks ?? []) {
    if (!latestByService.has(check.service_name)) {
      latestByService.set(check.service_name, check);
    }
  }

  // Also get history per service (last 10 checks each)
  const historyByService = new Map<
    string,
    NonNullable<typeof checks>
  >();
  for (const check of checks ?? []) {
    const existing = historyByService.get(check.service_name) ?? [];
    if (existing.length < 10) {
      existing.push(check);
      historyByService.set(check.service_name, existing);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Health</h1>
      <HealthGrid
        services={Array.from(latestByService.values())}
        history={Object.fromEntries(historyByService)}
      />
    </div>
  );
}
