"use client";

import { useState, useActionState } from "react";
import { AlertTriangle, Power } from "lucide-react";
import { toggleMaintenanceMode } from "@/lib/actions/admin";

interface Props {
  isEnabled: boolean;
  message: string;
  adminId: string;
}

export function MaintenanceControls({ isEnabled, message, adminId }: Props) {
  const [customMessage, setCustomMessage] = useState(message);
  const [state, action, isPending] = useActionState(toggleMaintenanceMode, {});

  return (
    <div className="space-y-4">
      <div
        className={`flex items-center gap-3 rounded-lg border p-4 ${
          isEnabled
            ? "border-red-500/50 bg-red-500/20"
            : "border-green-500/50 bg-green-500/20"
        }`}
      >
        <div
          className={`h-3 w-3 animate-pulse rounded-full ${
            isEnabled ? "bg-red-500" : "bg-green-500"
          }`}
        />
        <span className="font-medium">
          {isEnabled ? "Maintenance Mode ACTIVE" : "Site is Live"}
        </span>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="admin_id" value={adminId} />
        <input
          type="hidden"
          name="enable"
          value={isEnabled ? "false" : "true"}
        />

        <div>
          <label className="mb-2 block text-sm text-neutral-400">
            Maintenance Message
          </label>
          <textarea
            name="message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm"
            placeholder="We are performing scheduled maintenance..."
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium disabled:opacity-50 ${
            isEnabled
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          <Power className="h-4 w-4" />
          {isPending
            ? "Updating..."
            : isEnabled
              ? "Disable Maintenance Mode"
              : "Enable Maintenance Mode"}
        </button>

        {state.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}
      </form>

      {!isEnabled && (
        <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Enabling maintenance mode will immediately block all user access.
            Only admins will be able to access the site.
          </p>
        </div>
      )}
    </div>
  );
}
