"use client";

import { useActionState } from "react";
import { toggleFeatureFlag } from "@/lib/actions/admin";
import type { FeatureFlag } from "@/types/database";

interface Props {
  flags: FeatureFlag[];
  adminId: string;
}

export function FeatureFlagList({ flags, adminId }: Props) {
  if (flags.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500">
        No feature flags configured
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {flags.map((flag) => (
        <FlagRow key={flag.id} flag={flag} adminId={adminId} />
      ))}
    </div>
  );
}

function FlagRow({ flag, adminId }: { flag: FeatureFlag; adminId: string }) {
  const [state, action, isPending] = useActionState(toggleFeatureFlag, {});

  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{flag.flag_name}</p>
          <code className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-400">
            {flag.flag_key}
          </code>
        </div>
        {flag.description && (
          <p className="mt-1 text-xs text-neutral-500">{flag.description}</p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
          <span>Rollout: {flag.rollout_percentage}%</span>
          {flag.target_industries && flag.target_industries.length > 0 && (
            <span>
              Industries: {flag.target_industries.join(", ")}
            </span>
          )}
        </div>
      </div>
      <form action={action}>
        <input type="hidden" name="admin_id" value={adminId} />
        <input type="hidden" name="flag_id" value={flag.id} />
        <input
          type="hidden"
          name="enabled"
          value={flag.is_enabled ? "false" : "true"}
        />
        <button
          type="submit"
          disabled={isPending}
          className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
            flag.is_enabled ? "bg-blue-600" : "bg-neutral-600"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              flag.is_enabled ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </form>
      {state.error && (
        <p className="ml-2 text-xs text-red-400">{state.error}</p>
      )}
    </div>
  );
}
