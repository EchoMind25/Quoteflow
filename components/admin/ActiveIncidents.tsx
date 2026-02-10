"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

interface Props {
  count: number;
}

export function ActiveIncidents({ count }: Props) {
  return (
    <Link
      href="/admin/incidents"
      className="flex items-center gap-3 rounded-xl border border-red-500/50 bg-red-500/10 p-4 transition-colors hover:bg-red-500/20"
    >
      <AlertCircle className="h-5 w-5 text-red-400" />
      <div>
        <p className="text-sm font-medium text-red-400">
          {count} Active Incident{count !== 1 ? "s" : ""}
        </p>
        <p className="text-xs text-red-400/70">Click to view details</p>
      </div>
    </Link>
  );
}
