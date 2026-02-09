import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteAcceptForm } from "./invite-accept-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accept Invitation | QuoteFlow",
};

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Use service role to read invitation (user may not be in business yet)
  const serviceClient = createServiceClient();
  const { data: invitation } = await serviceClient
    .from("team_invitations")
    .select(
      "id, business_id, email, role, expires_at, accepted_at",
    )
    .eq("invitation_token", token)
    .single();

  if (!invitation) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold tracking-tight text-brand-600">
            QuoteFlow
          </h1>
          <div className="mt-6 rounded-lg border border-[hsl(var(--border))] p-6">
            <p className="font-medium">Invalid Invitation</p>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              This invitation link is not valid. Please ask for a new invitation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (invitation.accepted_at) {
    redirect("/app");
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold tracking-tight text-brand-600">
            QuoteFlow
          </h1>
          <div className="mt-6 rounded-lg border border-[hsl(var(--border))] p-6">
            <p className="font-medium">Invitation Expired</p>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              This invitation has expired. Please ask for a new one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get business name for display
  const { data: business } = await serviceClient
    .from("businesses")
    .select("name")
    .eq("id", invitation.business_id)
    .single();

  // Check if user is logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold tracking-tight text-brand-600">
          QuoteFlow
        </h1>
        <div className="mt-6 rounded-lg border border-[hsl(var(--border))] p-6">
          <p className="text-lg font-semibold">Team Invitation</p>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            You&apos;ve been invited to join{" "}
            <strong>{business?.name ?? "a business"}</strong> as a{" "}
            <strong className="capitalize">{invitation.role}</strong>.
          </p>

          {user ? (
            <InviteAcceptForm token={token} />
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Sign in or create an account to accept this invitation.
              </p>
              <a
                href={`/login?redirect=/invite/${token}`}
                className="block w-full rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Sign In
              </a>
              <a
                href={`/signup?redirect=/invite/${token}`}
                className="block w-full rounded-lg border border-[hsl(var(--border))] px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
              >
                Create Account
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
