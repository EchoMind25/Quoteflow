"use client";

import {
  ArrowRight,
  MessageSquare,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type TimelineUpdate = {
  id: string;
  update_type: string;
  old_status: string | null;
  new_status: string | null;
  message: string | null;
  sender_type: string | null;
  eta_minutes: number | null;
  created_at: string;
};

type Props = {
  updates: TimelineUpdate[];
};

// ============================================================================
// Helpers
// ============================================================================

const STATUS_LABELS: Record<string, string> = {
  pending_schedule: "Pending Schedule",
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// Component
// ============================================================================

export function JobTimeline({ updates }: Props) {
  // Sort updates newest first
  const sorted = [...updates].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-4">
      {sorted.map((update) => (
        <div key={update.id} className="flex gap-3">
          {/* Icon */}
          <div className="mt-0.5 flex-shrink-0">
            {update.update_type === "status_change" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <ArrowRight className="h-4 w-4 text-blue-600" />
              </div>
            )}
            {update.update_type === "message" && (
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  update.sender_type === "customer"
                    ? "bg-purple-100 dark:bg-purple-900/30"
                    : "bg-green-100 dark:bg-green-900/30",
                )}
              >
                <MessageSquare
                  className={cn(
                    "h-4 w-4",
                    update.sender_type === "customer"
                      ? "text-purple-600"
                      : "text-green-600",
                  )}
                />
              </div>
            )}
            {update.update_type === "eta_update" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-2">
            {update.update_type === "status_change" && (
              <p className="text-sm text-neutral-900 dark:text-white">
                Status changed to{" "}
                <span className="font-medium">
                  {STATUS_LABELS[update.new_status || ""] || update.new_status}
                </span>
              </p>
            )}
            {update.update_type === "message" && (
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {update.sender_type === "customer"
                    ? "You"
                    : update.sender_type === "system"
                      ? "System"
                      : "Business"}
                </p>
                <p className="text-sm text-neutral-900 dark:text-white">
                  {update.message}
                </p>
              </div>
            )}
            {update.update_type === "eta_update" && (
              <p className="text-sm text-neutral-900 dark:text-white">
                <CheckCircle2 className="mr-1 inline h-4 w-4 text-amber-500" />
                Technician arriving in{" "}
                <span className="font-medium">{update.eta_minutes} minutes</span>
              </p>
            )}
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {formatRelativeTime(update.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
