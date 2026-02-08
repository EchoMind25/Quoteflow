"use client";

import { signOut } from "@/app/actions/auth";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[hsl(var(--destructive))]/30 text-sm font-medium text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive))]/10"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </form>
  );
}
