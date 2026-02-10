"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { createIncident } from "@/lib/actions/admin";

interface Props {
  adminId: string;
}

const COMPONENTS = ["api", "web", "ai", "email", "sms"];
const SEVERITIES = ["minor", "major", "critical"];

export function IncidentForm({ adminId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, isPending] = useActionState(createIncident, {});

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700"
      >
        <Plus className="h-4 w-4" />
        Report Incident
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-500/30 bg-neutral-900 p-6">
      <h2 className="mb-4 text-lg font-semibold">Report New Incident</h2>
      <form action={action} className="space-y-4">
        <input type="hidden" name="admin_id" value={adminId} />

        <div>
          <label className="mb-1 block text-sm text-neutral-400">Title</label>
          <input
            type="text"
            name="title"
            required
            placeholder="Brief description of the incident"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-400">
            Severity
          </label>
          <select
            name="severity"
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-400">
            Affected Components
          </label>
          <div className="flex flex-wrap gap-3">
            {COMPONENTS.map((c) => (
              <label
                key={c}
                className="flex items-center gap-1.5 text-sm text-neutral-400"
              >
                <input type="checkbox" name="components" value={c} />
                {c}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-400">
            Initial Status Message
          </label>
          <textarea
            name="message"
            required
            rows={3}
            placeholder="We are investigating..."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-sm"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create Incident"}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Cancel
          </button>
        </div>

        {state.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}
      </form>
    </div>
  );
}
