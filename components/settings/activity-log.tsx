"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock, User, FileText, Settings, Package } from "lucide-react";

type ActivityLogRow = {
  id: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

const RESOURCE_ICONS: Record<string, typeof FileText> = {
  quote: FileText,
  customer: User,
  business: Settings,
  catalog_item: Package,
};

export function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      const supabase = createClient();

      const { data } = await supabase
        .from("activity_logs")
        .select(
          "id, action_type, resource_type, resource_id, description, metadata, created_at, profiles(first_name, last_name)",
        )
        .order("created_at", { ascending: false })
        .limit(100);

      setLogs((data as unknown as ActivityLogRow[]) ?? []);
      setLoading(false);
    }

    loadLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-[hsl(var(--border))] p-8 text-center">
        <Clock className="mx-auto h-8 w-8 text-[hsl(var(--muted-foreground))]" />
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          No activity recorded yet. Actions like sending quotes and updating
          settings will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const Icon = RESOURCE_ICONS[log.resource_type] ?? Clock;
        const actorName = log.profiles
          ? [log.profiles.first_name, log.profiles.last_name]
              .filter(Boolean)
              .join(" ") || "Unknown"
          : "System";

        return (
          <div
            key={log.id}
            className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] p-3"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
              <Icon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{log.description}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                <span>{actorName}</span>
                <span>&middot;</span>
                <time dateTime={log.created_at}>
                  {new Date(log.created_at).toLocaleString()}
                </time>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
