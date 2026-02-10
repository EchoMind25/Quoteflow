"use client";

import { useActionState } from "react";
import { updateIncident } from "@/lib/actions/admin";

interface Props {
  incidentId: string;
  currentStatus: string;
  adminId: string;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  investigating: ["identified", "monitoring", "resolved"],
  identified: ["monitoring", "resolved"],
  monitoring: ["resolved"],
};

export function IncidentUpdateForm({
  incidentId,
  currentStatus,
  adminId,
}: Props) {
  const [state, action, isPending] = useActionState(updateIncident, {});
  const nextStatuses = STATUS_TRANSITIONS[currentStatus] ?? ["resolved"];

  return (
    <form action={action} className="space-y-3 rounded-lg border border-neutral-700 p-3">
      <h4 className="text-sm font-medium">Post Update</h4>
      <input type="hidden" name="admin_id" value={adminId} />
      <input type="hidden" name="incident_id" value={incidentId} />

      <select
        name="status"
        className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
      >
        {nextStatuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <textarea
        name="message"
        required
        rows={2}
        placeholder="Status update message..."
        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-sm"
      />

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Posting..." : "Post Update"}
      </button>

      {state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
    </form>
  );
}
