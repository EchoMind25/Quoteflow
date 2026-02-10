"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Database,
  Cloud,
  Brain,
  Mic,
  MessageSquare,
  Mail,
} from "lucide-react";
import type { HealthCheck } from "@/types/database";

interface Props {
  services: HealthCheck[];
  history: Record<string, HealthCheck[]>;
}

const SERVICE_ICONS: Record<string, typeof Database> = {
  database: Database,
  supabase: Cloud,
  anthropic: Brain,
  assemblyai: Mic,
  twilio: MessageSquare,
  smtp: Mail,
};

export function HealthGrid({ services, history }: Props) {
  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
        <p className="text-neutral-500">
          No health checks recorded. Run a health check to see service status.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((svc) => {
        const Icon = SERVICE_ICONS[svc.service_name] ?? Cloud;
        const svcHistory = history[svc.service_name] ?? [];
        const uptime =
          svcHistory.length > 0
            ? Math.round(
                (svcHistory.filter((h) => h.is_healthy).length /
                  svcHistory.length) *
                  100,
              )
            : 0;

        return (
          <div
            key={svc.id}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    svc.is_healthy ? "bg-green-500/20" : "bg-red-500/20"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      svc.is_healthy ? "text-green-400" : "text-red-400"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">
                    {svc.service_name}
                  </p>
                  <p className="text-xs text-neutral-500">{svc.check_type}</p>
                </div>
              </div>
              <div
                className={`h-3 w-3 rounded-full ${
                  svc.is_healthy
                    ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                    : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                }`}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold">
                  {svc.response_time_ms ?? "-"}
                </p>
                <p className="text-xs text-neutral-500">ms</p>
              </div>
              <div>
                <p className="text-lg font-bold">{uptime}%</p>
                <p className="text-xs text-neutral-500">uptime</p>
              </div>
              <div>
                <p className="text-lg font-bold">{svcHistory.length}</p>
                <p className="text-xs text-neutral-500">checks</p>
              </div>
            </div>

            {svc.error_message && (
              <p className="mt-3 rounded bg-red-500/10 p-2 text-xs text-red-400">
                {svc.error_message}
              </p>
            )}

            <p className="mt-3 text-xs text-neutral-500">
              Last checked{" "}
              {formatDistanceToNow(new Date(svc.checked_at), {
                addSuffix: true,
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
