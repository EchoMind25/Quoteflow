"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, XCircle, AlertCircle, ArrowRight } from "lucide-react";

interface ErrorEntry {
  id: string;
  error_type: string;
  error_message: string;
  severity: string;
  occurrence_count: number;
  last_seen_at: string;
}

interface Props {
  errors: ErrorEntry[];
}

const SEVERITY_ICON: Record<string, typeof XCircle> = {
  critical: XCircle,
  error: AlertTriangle,
  warning: AlertCircle,
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-red-400",
  error: "text-orange-400",
  warning: "text-yellow-400",
};

export function RecentErrors({ errors }: Props) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Errors</h2>
        <Link
          href="/admin/errors"
          className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {errors.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          No unresolved errors
        </p>
      ) : (
        <div className="space-y-3">
          {errors.map((error) => {
            const Icon = SEVERITY_ICON[error.severity] ?? AlertCircle;
            const color = SEVERITY_COLOR[error.severity] ?? "text-neutral-400";
            return (
              <div
                key={error.id}
                className="flex items-start gap-3 rounded-lg bg-neutral-800/50 p-3"
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {error.error_message}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
                    <span>{error.error_type}</span>
                    <span>{error.occurrence_count}x</span>
                    <span>
                      {formatDistanceToNow(new Date(error.last_seen_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
