import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { SupportTicketList } from "@/components/admin/SupportTicketList";

interface Props {
  searchParams: Promise<{
    status?: string;
    category?: string;
  }>;
}

export default async function SupportPage({ searchParams }: Props) {
  const admin = await requireAdmin();
  await logAdminAction(admin.id, "viewed_support", "system");

  const params = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (params.status) query = query.eq("status", params.status);
  if (params.category) query = query.eq("category", params.category);

  const { data: tickets } = await query;

  // Get counts by status
  const { data: statusCounts } = await supabase
    .from("support_tickets")
    .select("status");

  const counts = (statusCounts ?? []).reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Support Queue</h1>

      <div className="flex gap-2 text-sm">
        {["open", "in_progress", "waiting", "resolved", "closed"].map((s) => (
          <span
            key={s}
            className="rounded bg-neutral-800 px-2 py-1 text-neutral-400"
          >
            {s}: {counts[s] ?? 0}
          </span>
        ))}
      </div>

      <SupportTicketList tickets={tickets ?? []} adminId={admin.id} />
    </div>
  );
}
