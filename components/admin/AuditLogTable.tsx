"use client";

import { formatDistanceToNow } from "date-fns";
import { truncateId } from "@/lib/admin/auth";
import type { AdminAuditLog } from "@/types/database";

interface Props {
  logs: AdminAuditLog[];
}

export function AuditLogTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
        <p className="text-neutral-500">No audit log entries</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <table className="w-full">
        <thead className="bg-neutral-800/50">
          <tr>
            <th className="p-4 text-left text-sm font-medium text-neutral-400">
              Admin
            </th>
            <th className="p-4 text-left text-sm font-medium text-neutral-400">
              Action
            </th>
            <th className="p-4 text-left text-sm font-medium text-neutral-400">
              Resource
            </th>
            <th className="p-4 text-left text-sm font-medium text-neutral-400">
              IP
            </th>
            <th className="p-4 text-left text-sm font-medium text-neutral-400">
              When
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-neutral-800/50">
              <td className="p-4 font-mono text-sm text-neutral-400">
                {truncateId(log.admin_id)}
              </td>
              <td className="p-4">
                <span className="rounded bg-neutral-700 px-2 py-1 text-xs font-medium">
                  {log.action}
                </span>
              </td>
              <td className="p-4 text-sm text-neutral-400">
                {log.resource_type && (
                  <span>
                    {log.resource_type}
                    {log.resource_id ? ` / ${truncateId(log.resource_id)}` : ""}
                  </span>
                )}
              </td>
              <td className="p-4 font-mono text-xs text-neutral-500">
                {log.ip_address ?? "-"}
              </td>
              <td className="p-4 text-sm text-neutral-400">
                {formatDistanceToNow(new Date(log.created_at), {
                  addSuffix: true,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
