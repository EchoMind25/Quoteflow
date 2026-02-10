"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { resolveError } from "@/lib/actions/admin";
import type { ErrorLog } from "@/types/database";

interface Props {
  errors: ErrorLog[];
  adminId: string;
}

const SEVERITY_CONFIG = {
  critical: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20" },
  error: {
    icon: AlertTriangle,
    color: "text-orange-400",
    bg: "bg-orange-500/20",
  },
  warning: {
    icon: AlertCircle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
};

export function ErrorLogTable({ errors, adminId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (errors.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
        <p className="text-neutral-500">No errors found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <table className="w-full">
        <thead className="bg-neutral-800/50">
          <tr>
            <th className="p-4 text-left text-sm font-medium text-neutral-400">
              Severity
            </th>
            <th className="p-4 text-left text-sm font-medium text-neutral-400">
              Error
            </th>
            <th className="p-4 text-left text-sm font-medium text-neutral-400">
              Route
            </th>
            <th className="p-4 text-left text-sm font-medium text-neutral-400">
              Count
            </th>
            <th className="p-4 text-left text-sm font-medium text-neutral-400">
              Last Seen
            </th>
            <th className="p-4 text-left text-sm font-medium text-neutral-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {errors.map((error) => {
            const config =
              SEVERITY_CONFIG[
                error.severity as keyof typeof SEVERITY_CONFIG
              ] ?? SEVERITY_CONFIG.error;
            const Icon = config.icon;
            const isExpanded = expanded === error.id;

            return (
              <ErrorRow
                key={error.id}
                error={error}
                config={config}
                Icon={Icon}
                isExpanded={isExpanded}
                onToggle={() =>
                  setExpanded(isExpanded ? null : error.id)
                }
                adminId={adminId}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ErrorRow({
  error,
  config,
  Icon,
  isExpanded,
  onToggle,
  adminId,
}: {
  error: ErrorLog;
  config: { icon: typeof XCircle; color: string; bg: string };
  Icon: typeof XCircle;
  isExpanded: boolean;
  onToggle: () => void;
  adminId: string;
}) {
  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-neutral-800/50 ${
          error.is_resolved ? "opacity-50" : ""
        }`}
        onClick={onToggle}
      >
        <td className="p-4">
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${config.bg} ${config.color}`}
          >
            <Icon className="h-3 w-3" />
            {error.severity}
          </span>
        </td>
        <td className="p-4">
          <p className="max-w-md truncate text-sm font-medium">
            {error.error_message}
          </p>
          <p className="text-xs text-neutral-500">{error.error_type}</p>
        </td>
        <td className="p-4 font-mono text-sm text-neutral-400">
          {error.route ?? "-"}
        </td>
        <td className="p-4 text-sm">{error.occurrence_count}</td>
        <td className="p-4 text-sm text-neutral-400">
          {formatDistanceToNow(new Date(error.last_seen_at), {
            addSuffix: true,
          })}
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            {!error.is_resolved && (
              <form action={resolveError}>
                <input type="hidden" name="error_id" value={error.id} />
                <input type="hidden" name="admin_id" value={adminId} />
                <button
                  type="submit"
                  className="rounded p-1.5 text-green-400 hover:bg-green-500/20"
                  title="Mark resolved"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Check className="h-4 w-4" />
                </button>
              </form>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-neutral-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-neutral-500" />
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-neutral-800/30 p-4">
            <div className="space-y-2">
              <div className="flex gap-4 text-sm">
                <span className="text-neutral-500">First seen:</span>
                <span>
                  {new Date(error.first_seen_at).toLocaleString()}
                </span>
              </div>
              {error.stack_trace && (
                <div>
                  <p className="mb-1 text-sm text-neutral-500">
                    Stack trace:
                  </p>
                  <pre className="overflow-x-auto rounded bg-neutral-900 p-3 font-mono text-xs text-neutral-300">
                    {error.stack_trace}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
