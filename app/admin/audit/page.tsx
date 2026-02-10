import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { AuditLogTable } from "@/components/admin/AuditLogTable";

export default async function AuditLogPage() {
  const admin = await requireAdmin();
  await logAdminAction(admin.id, "viewed_audit_log", "system");

  const supabase = createServiceClient();

  const { data: logs } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Audit Log</h1>
      <AuditLogTable logs={logs ?? []} />
    </div>
  );
}
