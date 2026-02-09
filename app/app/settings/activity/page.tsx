import { ActivityLog } from "@/components/settings/activity-log";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Log",
};

export default function ActivityPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/app/settings"
          className="rounded-lg p-1.5 transition-colors hover:bg-[hsl(var(--muted))]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Activity Log</h1>
      </div>

      <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
        A record of all actions taken within your business account.
      </p>

      <ActivityLog />
    </div>
  );
}
