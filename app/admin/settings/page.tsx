import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { MaintenanceControls } from "@/components/admin/MaintenanceControls";
import { FeatureFlagList } from "@/components/admin/FeatureFlagList";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { ScheduledMaintenanceList } from "@/components/admin/ScheduledMaintenanceList";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  await logAdminAction(admin.id, "viewed_settings", "system");

  const supabase = createServiceClient();

  const [{ data: settings }, { data: featureFlags }, { data: maintenance }] =
    await Promise.all([
      supabase.from("site_settings").select("*"),
      supabase.from("feature_flags").select("*").order("flag_key"),
      supabase
        .from("scheduled_maintenance")
        .select("*")
        .gte("scheduled_end", new Date().toISOString())
        .order("scheduled_start"),
    ]);

  const settingsMap = (settings ?? []).reduce(
    (acc, s) => {
      acc[s.key] = s.value;
      return acc;
    },
    {} as Record<string, unknown>,
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Site Settings</h1>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Maintenance Mode</h2>
        <MaintenanceControls
          isEnabled={settingsMap.maintenance_mode === "true"}
          message={String(settingsMap.maintenance_message ?? "").replace(
            /"/g,
            "",
          )}
          adminId={admin.id}
        />
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Scheduled Maintenance</h2>
        <ScheduledMaintenanceList
          maintenances={maintenance ?? []}
          adminId={admin.id}
        />
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Feature Flags</h2>
        <FeatureFlagList flags={featureFlags ?? []} adminId={admin.id} />
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">System Settings</h2>
        <SiteSettingsForm settings={settingsMap} adminId={admin.id} />
      </section>
    </div>
  );
}
