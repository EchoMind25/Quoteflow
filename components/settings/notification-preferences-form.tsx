"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Bell } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/toast-provider";

// ============================================================================
// Types
// ============================================================================

type NotificationPrefs = {
  emailQuoteAccepted: boolean;
  emailQuoteExpiring: boolean;
  emailWeeklySummary: boolean;
  pushEnabled: boolean;
  pushQuoteAccepted: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  emailQuoteAccepted: true,
  emailQuoteExpiring: true,
  emailWeeklySummary: false,
  pushEnabled: false,
  pushQuoteAccepted: false,
};

// ============================================================================
// Component
// ============================================================================

export function NotificationPreferencesForm({
  businessId,
}: {
  businessId: string;
}) {
  const { toast } = useToast();
  const storageKey = `notification-prefs-${businessId}`;

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [pushPermission, setPushPermission] = useState<
    "default" | "granted" | "denied"
  >("default");

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
      }
    } catch {
      // ignore
    }
    if (typeof Notification !== "undefined") {
      setPushPermission(Notification.permission);
    }
  }, [storageKey]);

  const save = useCallback(
    (updated: NotificationPrefs) => {
      setPrefs(updated);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      toast("Preferences saved");
    },
    [storageKey, toast],
  );

  const togglePref = useCallback(
    (key: keyof NotificationPrefs) => {
      save({ ...prefs, [key]: !prefs[key] });
    },
    [prefs, save],
  );

  const handleEnablePush = useCallback(async () => {
    if (typeof Notification === "undefined") {
      toast("Push notifications are not supported in this browser", "error");
      return;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);

    if (permission === "granted") {
      save({ ...prefs, pushEnabled: true });
    } else {
      toast("Push notification permission denied", "error");
    }
  }, [prefs, save, toast]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[hsl(var(--muted))]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Notifications</h1>
      </div>

      {/* ---- Email notifications ---- */}
      <div className="rounded-xl border border-[hsl(var(--border))] p-4">
        <p className="mb-4 text-sm font-medium">Email Notifications</p>
        <div className="space-y-4">
          <ToggleRow
            label="New quote accepted"
            description="Get notified when a customer accepts a quote"
            checked={prefs.emailQuoteAccepted}
            onChange={() => togglePref("emailQuoteAccepted")}
          />
          <ToggleRow
            label="Quote expiring soon"
            description="Reminder 3 days before a quote expires"
            checked={prefs.emailQuoteExpiring}
            onChange={() => togglePref("emailQuoteExpiring")}
          />
          <ToggleRow
            label="Weekly summary"
            description="Digest of quotes sent, accepted, and revenue"
            checked={prefs.emailWeeklySummary}
            onChange={() => togglePref("emailWeeklySummary")}
          />
        </div>
      </div>

      {/* ---- Push notifications ---- */}
      <div className="rounded-xl border border-[hsl(var(--border))] p-4">
        <p className="mb-4 text-sm font-medium">Push Notifications</p>

        {pushPermission !== "granted" ? (
          <button
            type="button"
            onClick={handleEnablePush}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
          >
            <Bell className="h-4 w-4" />
            Enable Push Notifications
          </button>
        ) : (
          <div className="space-y-4">
            <ToggleRow
              label="Real-time quote alerts"
              description="Instant notification when a quote is accepted"
              checked={prefs.pushQuoteAccepted}
              onChange={() => togglePref("pushQuoteAccepted")}
            />
          </div>
        )}

        {pushPermission === "denied" && (
          <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
            Push notifications are blocked. Please enable them in your browser
            settings.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked
            ? "bg-brand-600"
            : "bg-[hsl(var(--muted))]"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
