import { createClient } from "@/lib/supabase/server";
import { HeroStats } from "@/components/dashboard/hero-stats";
import { ActivityStream } from "@/components/dashboard/activity-stream";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch summary data — RLS ensures only this business's data
  const [quotesResult, pendingResult, acceptedResult] =
    await Promise.all([
      supabase
        .from("quotes")
        .select("id, total_cents", { count: "exact" }),
      supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .in("status", ["sent", "viewed"]),
      supabase
        .from("quotes")
        .select("id, total_cents")
        .eq("status", "accepted")
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ),
    ]);

  const quoteCount = quotesResult.count ?? 0;
  const pendingCount = pendingResult.count ?? 0;

  // Calculate accepted revenue (this month)
  const acceptedRevenue =
    acceptedResult.data?.reduce(
      (sum, quote) => sum + (quote.total_cents ?? 0),
      0,
    ) ?? 0;

  // Fetch recent activity logs
  const { data: activityLogs } = await supabase
    .from("activity_logs")
    .select("id, action_type, description, created_at, resource_type, resource_id")
    .order("created_at", { ascending: false })
    .limit(20);

  // Transform activity logs to activity stream format
  const activities = (activityLogs ?? []).map((log) => ({
    id: log.id,
    type: log.action_type as any,
    description: log.description ?? "",
    timestamp: log.created_at,
    resourceId: log.resource_id ?? undefined,
    resourceHref:
      log.resource_type === "quote" && log.resource_id
        ? `/app/quotes/${log.resource_id}`
        : log.resource_type === "customer" && log.resource_id
          ? `/app/customers/${log.resource_id}`
          : undefined,
  }));

  // Generate contextual highlight message
  const highlight = getHighlightMessage(quoteCount, pendingCount);

  return (
    <div className="p-4 sm:p-6">
      {/* ---- Hero stats ---- */}
      <HeroStats
        highlight={highlight}
        quotesCount={quoteCount}
        pendingCount={pendingCount}
        revenueTotal={acceptedRevenue}
      />

      {/* ---- Recent activity ---- */}
      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
          Recent Activity
        </h2>
        <ActivityStream
          activities={activities}
          emptyMessage="Create your first quote to see activity here."
        />
      </section>
    </div>
  );
}

// ============================================================================
// HELPER: CONTEXTUAL HIGHLIGHT MESSAGE
// ============================================================================

function getHighlightMessage(
  quotesCount: number,
  pendingCount: number,
): {
  message: string;
  value?: number;
  format?: "number" | "currency";
} {
  const hour = new Date().getHours();

  // Morning greeting
  if (hour < 12 && quotesCount === 0) {
    return {
      message: "Good morning! Ready to create quotes?",
    };
  }

  // Pending quotes emphasis
  if (pendingCount > 0) {
    return {
      message: "Quotes pending acceptance",
      value: pendingCount,
      format: "number",
    };
  }

  // Total quotes count
  if (quotesCount > 0) {
    return {
      message: "Quotes created",
      value: quotesCount,
      format: "number",
    };
  }

  // Default
  return {
    message: "Welcome to Quotestream",
  };
}
