"use client";

import { formatDistanceToNow } from "date-fns";
import type { IncidentUpdate } from "@/types/database";

interface Props {
  updates: IncidentUpdate[];
}

const STATUS_COLORS: Record<string, string> = {
  investigating: "bg-red-500",
  identified: "bg-orange-500",
  monitoring: "bg-yellow-500",
  resolved: "bg-green-500",
};

export function IncidentTimeline({ updates }: Props) {
  if (updates.length === 0) {
    return (
      <p className="text-sm text-neutral-500">No updates yet</p>
    );
  }

  return (
    <div className="space-y-3">
      {updates.map((update) => (
        <div key={update.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full ${
                STATUS_COLORS[update.status] ?? "bg-neutral-500"
              }`}
            />
            <div className="h-full w-px bg-neutral-700" />
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium capitalize text-neutral-300">
                {update.status}
              </span>
              <span className="text-xs text-neutral-500">
                {formatDistanceToNow(new Date(update.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-400">{update.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
