"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight } from "lucide-react";

interface HealthEntry {
  service_name: string;
  is_healthy: boolean;
  response_time_ms: number | null;
  checked_at: string;
}

interface Props {
  checks: HealthEntry[];
}

export function SystemHealth({ checks }: Props) {
  // Deduplicate to latest check per service
  const latestByService = new Map<string, HealthEntry>();
  for (const check of checks) {
    if (!latestByService.has(check.service_name)) {
      latestByService.set(check.service_name, check);
    }
  }
  const services = Array.from(latestByService.values());

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">System Health</h2>
        <Link
          href="/admin/health"
          className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
        >
          Details <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {services.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          No health checks recorded
        </p>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => (
            <div
              key={svc.service_name}
              className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    svc.is_healthy
                      ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
                      : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                  }`}
                />
                <span className="text-sm font-medium capitalize">
                  {svc.service_name}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                {svc.response_time_ms != null && (
                  <span>{svc.response_time_ms}ms</span>
                )}
                <span>
                  {formatDistanceToNow(new Date(svc.checked_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
