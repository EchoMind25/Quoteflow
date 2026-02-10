"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import type { AdminUser } from "@/lib/admin/auth";

interface Props {
  admin: AdminUser;
}

export function AdminHeader({ admin }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-blue-400" />
          <h1 className="text-sm font-semibold">Developer Hub</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400">
            {admin.firstName} {admin.lastName}
          </span>
          <Link
            href="/app"
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to App
          </Link>
        </div>
      </div>
    </header>
  );
}
