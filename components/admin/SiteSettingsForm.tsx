"use client";

import { useActionState } from "react";
import { updateSiteSetting } from "@/lib/actions/admin";

interface Props {
  settings: Record<string, unknown>;
  adminId: string;
}

const SETTING_FIELDS = [
  {
    key: "registration_enabled",
    label: "Registration Enabled",
    type: "toggle" as const,
  },
  {
    key: "ai_generation_enabled",
    label: "AI Generation Enabled",
    type: "toggle" as const,
  },
  {
    key: "max_photos_per_quote",
    label: "Max Photos per Quote",
    type: "number" as const,
  },
  {
    key: "max_voice_duration_seconds",
    label: "Max Voice Duration (seconds)",
    type: "number" as const,
  },
];

export function SiteSettingsForm({ settings, adminId }: Props) {
  return (
    <div className="space-y-4">
      {SETTING_FIELDS.map((field) => (
        <SettingRow
          key={field.key}
          settingKey={field.key}
          label={field.label}
          type={field.type}
          value={settings[field.key]}
          adminId={adminId}
        />
      ))}
    </div>
  );
}

function SettingRow({
  settingKey,
  label,
  type,
  value,
  adminId,
}: {
  settingKey: string;
  label: string;
  type: "toggle" | "number";
  value: unknown;
  adminId: string;
}) {
  const [state, action, isPending] = useActionState(updateSiteSetting, {});
  const strValue = String(value ?? "");

  if (type === "toggle") {
    const isEnabled = strValue === "true";
    return (
      <div className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-4">
        <span className="text-sm">{label}</span>
        <form action={action}>
          <input type="hidden" name="admin_id" value={adminId} />
          <input type="hidden" name="key" value={settingKey} />
          <input
            type="hidden"
            name="value"
            value={isEnabled ? "false" : "true"}
          />
          <button
            type="submit"
            disabled={isPending}
            className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
              isEnabled ? "bg-blue-600" : "bg-neutral-600"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                isEnabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </form>
        {state.error && (
          <span className="ml-2 text-xs text-red-400">{state.error}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg bg-neutral-800/50 p-4">
      <span className="text-sm">{label}</span>
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="admin_id" value={adminId} />
        <input type="hidden" name="key" value={settingKey} />
        <input
          type="number"
          name="value"
          defaultValue={strValue}
          className="w-20 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-right text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "..." : "Save"}
        </button>
      </form>
      {state.error && (
        <span className="ml-2 text-xs text-red-400">{state.error}</span>
      )}
    </div>
  );
}
