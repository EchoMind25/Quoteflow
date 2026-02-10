"use client";

interface MetricEntry {
  metric_type: string;
  metric_value: number;
}

interface Props {
  metrics: MetricEntry[];
}

const METRIC_LABELS: Record<string, string> = {
  quotes_sent: "Quotes Sent",
  users_active: "Active Users",
  ai_calls: "AI Calls",
  emails_sent: "Emails Sent",
  sms_sent: "SMS Sent",
  photos_uploaded: "Photos Uploaded",
};

export function TodayMetrics({ metrics }: Props) {
  if (metrics.length === 0) return null;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-4 text-lg font-semibold">Today&apos;s Activity</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.metric_type} className="text-center">
            <p className="text-2xl font-bold">{m.metric_value}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {METRIC_LABELS[m.metric_type] ?? m.metric_type}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
