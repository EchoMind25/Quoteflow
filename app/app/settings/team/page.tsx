import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamManagementForm } from "@/components/settings/team-management-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Management",
};

export default async function TeamSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    redirect("/app/settings");
  }

  const isOwnerOrAdmin =
    profile.role === "owner" || profile.role === "admin";

  // Fetch team members (profiles belonging to this business)
  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, created_at")
    .eq("business_id", profile.business_id)
    .order("created_at", { ascending: true });

  // Fetch pending invitations
  const { data: invitations } = isOwnerOrAdmin
    ? await supabase
        .from("team_invitations")
        .select("id, email, role, expires_at, accepted_at, created_at")
        .eq("business_id", profile.business_id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="p-4 sm:p-6">
      <TeamManagementForm
        members={members ?? []}
        invitations={invitations ?? []}
        currentUserId={user.id}
        currentUserRole={profile.role}
        canManage={isOwnerOrAdmin}
      />
    </div>
  );
}
