"use client";

import { useActionState } from "react";
import { Calendar, Clock } from "lucide-react";
import { scheduleMaintenance } from "@/lib/actions/admin";
import type { ScheduledMaintenance } from "@/types/database";

interface Props {
  maintenances: ScheduledMaintenance[];
  adminId: string;
}

const COMPONENTS = ["api", "web", "ai", "email", "sms", "database"];

export function ScheduledMaintenanceList({ maintenances, adminId }: Props) {
  const [state, action, isPending] = useActionState(scheduleMaintenance, {});

  return (
    <div className="space-y-6">
      {maintenances.length > 0 && (
        <div className="space-y-3">
          {maintenances.map((m) => (
            <div
              key={m.id}
              className="flex items-start justify-between rounded-lg bg-neutral-800/50 p-4"
            >
              <div>
                <p className="text-sm font-medium">{m.title}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(m.scheduled_start).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(m.scheduled_start).toLocaleTimeString()} -{" "}
                    {new Date(m.scheduled_end).toLocaleTimeString()}
                  </span>
                </div>
                {m.affected_components.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.affected_components.map((c) => (
                      <span
                        key={c}
                        className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span
                className={`rounded px-2 py-1 text-xs ${
                  m.status === "scheduled"
                    ? "bg-blue-500/20 text-blue-400"
                    : m.status === "in_progress"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : m.status === "completed"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-neutral-500/20 text-neutral-400"
                }`}
              >
                {m.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-neutral-700 p-4">
        <h3 className="mb-3 text-sm font-medium">Schedule New Maintenance</h3>
        <form action={action} className="space-y-3">
          <input type="hidden" name="admin_id" value={adminId} />
          <input
            type="text"
            name="title"
            placeholder="Maintenance title"
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-sm"
          />
          <textarea
            name="description"
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                Start
              </label>
              <input
                type="datetime-local"
                name="start_time"
                required
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">End</label>
              <input
                type="datetime-local"
                name="end_time"
                required
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              Affected Components
            </label>
            <div className="flex flex-wrap gap-2">
              {COMPONENTS.map((c) => (
                <label
                  key={c}
                  className="flex items-center gap-1.5 text-xs text-neutral-400"
                >
                  <input type="checkbox" name="components" value={c} />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Scheduling..." : "Schedule Maintenance"}
          </button>
          {state.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
