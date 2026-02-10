"use client";

import { useState, useActionState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import {
  assignTicket,
  updateTicketStatus,
  addSupportMessage,
} from "@/lib/actions/admin";
import type { SupportTicket } from "@/types/database";

interface Props {
  tickets: SupportTicket[];
  adminId: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  waiting: "bg-purple-500/20 text-purple-400",
  resolved: "bg-green-500/20 text-green-400",
  closed: "bg-neutral-500/20 text-neutral-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-neutral-400",
  normal: "text-blue-400",
  high: "text-orange-400",
  urgent: "text-red-400",
};

export function SupportTicketList({ tickets, adminId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
        <p className="text-neutral-500">No support tickets</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => {
        const isExpanded = expanded === ticket.id;
        return (
          <div
            key={ticket.id}
            className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900"
          >
            <div
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-neutral-800/50"
              onClick={() => setExpanded(isExpanded ? null : ticket.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">
                    TKT-{String(ticket.ticket_number).padStart(3, "0")}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      STATUS_COLORS[ticket.status] ?? ""
                    }`}
                  >
                    {ticket.status}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      PRIORITY_COLORS[ticket.priority] ?? ""
                    }`}
                  >
                    {ticket.priority}
                  </span>
                  <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-400">
                    {ticket.category}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium">{ticket.subject}</p>
                <span className="text-xs text-neutral-500">
                  {formatDistanceToNow(new Date(ticket.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-neutral-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-neutral-500" />
              )}
            </div>

            {isExpanded && (
              <div className="space-y-3 border-t border-neutral-800 p-4">
                <TicketActions ticketId={ticket.id} adminId={adminId} ticket={ticket} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TicketActions({
  ticketId,
  adminId,
  ticket,
}: {
  ticketId: string;
  adminId: string;
  ticket: SupportTicket;
}) {
  const [assignState, assignAction, assignPending] = useActionState(
    assignTicket,
    {},
  );
  const [statusState, statusAction, statusPending] = useActionState(
    updateTicketStatus,
    {},
  );
  const [msgState, msgAction, msgPending] = useActionState(
    addSupportMessage,
    {},
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {!ticket.assigned_to && (
          <form action={assignAction}>
            <input type="hidden" name="admin_id" value={adminId} />
            <input type="hidden" name="ticket_id" value={ticketId} />
            <button
              type="submit"
              disabled={assignPending}
              className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <UserPlus className="h-3 w-3" />
              {assignPending ? "..." : "Assign to me"}
            </button>
          </form>
        )}

        <form action={statusAction} className="flex items-center gap-2">
          <input type="hidden" name="admin_id" value={adminId} />
          <input type="hidden" name="ticket_id" value={ticketId} />
          <select
            name="status"
            defaultValue={ticket.status}
            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs"
          >
            {["open", "in_progress", "waiting", "resolved", "closed"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={statusPending}
            className="rounded bg-neutral-700 px-2 py-1 text-xs hover:bg-neutral-600 disabled:opacity-50"
          >
            {statusPending ? "..." : "Update"}
          </button>
        </form>
      </div>

      {assignState.error && <p className="text-xs text-red-400">{assignState.error}</p>}
      {statusState.error && <p className="text-xs text-red-400">{statusState.error}</p>}

      <form action={msgAction} className="flex gap-2">
        <input type="hidden" name="admin_id" value={adminId} />
        <input type="hidden" name="ticket_id" value={ticketId} />
        <input
          type="text"
          name="message"
          placeholder="Reply..."
          className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={msgPending}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {msgPending ? "..." : "Send"}
        </button>
      </form>
      {msgState.error && <p className="text-xs text-red-400">{msgState.error}</p>}
    </>
  );
}
