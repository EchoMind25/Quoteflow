import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { ErrorLogTable } from "@/components/admin/ErrorLogTable";
import { ErrorFilters } from "@/components/admin/ErrorFilters";

interface Props {
  searchParams: Promise<{
    type?: string;
    severity?: string;
    resolved?: string;
  }>;
}

export default async function ErrorLogsPage({ searchParams }: Props) {
  const admin = await requireAdmin();
  await logAdminAction(admin.id, "viewed_errors", "system");

  const params = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("error_logs")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(100);

  if (params.type) query = query.eq("error_type", params.type);
  if (params.severity) query = query.eq("severity", params.severity);
  if (params.resolved === "true") query = query.eq("is_resolved", true);
  if (params.resolved === "false") query = query.eq("is_resolved", false);

  const { data: errors } = await query;

  const { data: stats } = await supabase
    .from("error_logs")
    .select("severity, is_resolved")
    .eq("is_resolved", false);

  const errorStats = {
    critical: stats?.filter((e) => e.severity === "critical").length ?? 0,
    error: stats?.filter((e) => e.severity === "error").length ?? 0,
    warning: stats?.filter((e) => e.severity === "warning").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Error Logs</h1>
        <div className="flex gap-2 text-sm">
          <span className="rounded bg-red-500/20 px-2 py-1 text-red-400">
            {errorStats.critical} critical
          </span>
          <span className="rounded bg-orange-500/20 px-2 py-1 text-orange-400">
            {errorStats.error} errors
          </span>
          <span className="rounded bg-yellow-500/20 px-2 py-1 text-yellow-400">
            {errorStats.warning} warnings
          </span>
        </div>
      </div>

      <ErrorFilters />
      <ErrorLogTable errors={errors ?? []} adminId={admin.id} />
    </div>
  );
}
