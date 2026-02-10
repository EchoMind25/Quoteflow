import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { IncidentList } from "@/components/admin/IncidentList";
import { IncidentForm } from "@/components/admin/IncidentForm";

export default async function IncidentsPage() {
  const admin = await requireAdmin();
  await logAdminAction(admin.id, "viewed_incidents", "system");

  const supabase = createServiceClient();

  const { data: incidents } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: incidentUpdates } = await supabase
    .from("incident_updates")
    .select("*")
    .order("created_at", { ascending: false });

  // Group updates by incident_id
  const updatesByIncident = new Map<
    string,
    NonNullable<typeof incidentUpdates>
  >();
  for (const update of incidentUpdates ?? []) {
    const existing = updatesByIncident.get(update.incident_id) ?? [];
    existing.push(update);
    updatesByIncident.set(update.incident_id, existing);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Incidents</h1>

      <IncidentForm adminId={admin.id} />

      <IncidentList
        incidents={incidents ?? []}
        updatesByIncident={Object.fromEntries(updatesByIncident)}
        adminId={admin.id}
      />
    </div>
  );
}
