"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { acceptInvitation, type TeamActionState } from "@/lib/actions/team";

const initialState: TeamActionState = {};

export function InviteAcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(
    acceptInvitation,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.push("/app");
    }
  }, [state.success, router]);

  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Accept Invitation"
        )}
      </button>
    </form>
  );
}
