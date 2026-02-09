"use server";

import { randomBytes } from "crypto";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logActivity } from "@/lib/audit/log";
import { getTransport } from "@/lib/email/smtp";
import type { UserRole } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

export type TeamActionState = {
  error?: string;
  success?: boolean;
};

// ============================================================================
// Helpers
// ============================================================================

async function getTeamContext(): Promise<{
  userId: string;
  businessId: string;
  role: UserRole;
  error?: string;
} | { userId?: undefined; businessId?: undefined; role?: undefined; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    return { error: "No business associated with account." };
  }

  return { userId: user.id, businessId: profile.business_id, role: profile.role };
}

// ============================================================================
// Invite Team Member
// ============================================================================

export async function inviteTeamMember(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const ctx = await getTeamContext();
    if (ctx.error) return { error: ctx.error };
    const { userId, businessId, role: currentRole } = ctx;

    // Only owners and admins can invite
    if (currentRole !== "owner" && currentRole !== "admin") {
      return { error: "Only owners and admins can invite team members." };
    }

    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const role = formData.get("role") as string;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Valid email address is required." };
    }

    const validRoles = ["admin", "technician", "viewer"];
    if (!validRoles.includes(role)) {
      return { error: "Invalid role selected." };
    }

    // Prevent non-owners from inviting admins
    if (role === "admin" && currentRole !== "owner") {
      return { error: "Only owners can invite admins." };
    }

    const supabase = await createClient();

    // Check if user already belongs to this business
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("business_id", businessId);

    // Check by looking up auth user by email using service client
    const serviceClient = createServiceClient();
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email,
    );

    if (existingUser && existingProfile?.some((p) => p.id === existingUser.id)) {
      return { error: "This user is already a member of your business." };
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("team_invitations")
      .select("id, accepted_at")
      .eq("business_id", businessId)
      .eq("email", email)
      .single();

    if (existingInvite && !existingInvite.accepted_at) {
      return { error: "An invitation has already been sent to this email." };
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Get business name for email
    const { data: business } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .single();

    // Upsert invitation (handles re-inviting after previous acceptance)
    if (existingInvite) {
      const { error: updateError } = await supabase
        .from("team_invitations")
        .update({
          role: role as UserRole,
          invited_by: userId,
          invitation_token: token,
          expires_at: expiresAt.toISOString(),
          accepted_at: null,
        })
        .eq("id", existingInvite.id);

      if (updateError) {
        return { error: "Failed to create invitation." };
      }
    } else {
      const { error: insertError } = await supabase
        .from("team_invitations")
        .insert({
          business_id: businessId,
          email,
          role: role as UserRole,
          invited_by: userId,
          invitation_token: token,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        return { error: "Failed to create invitation." };
      }
    }

    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

    try {
      const transport = getTransport();
      const fromAddress = process.env.SMTP_FROM ?? "Quotestream <noreply@quotestream.app>";
      await transport.sendMail({
        from: fromAddress,
        to: email,
        subject: `You've been invited to join ${business?.name ?? "a business"} on Quotestream`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Team Invitation</h2>
            <p>You've been invited to join <strong>${business?.name ?? "a business"}</strong> as a <strong>${role}</strong> on Quotestream.</p>
            <p style="margin: 24px 0;">
              <a href="${inviteUrl}" style="background-color: #3b82f6; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Accept Invitation
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">This invitation expires in 7 days.</p>
          </div>
        `,
      });
    } catch {
      // Email failure should not block invitation creation
      console.error("[team] Failed to send invitation email to:", email);
    }

    logActivity({
      action_type: "team.invited",
      resource_type: "team_invitation",
      resource_id: email,
      description: `Invited ${email} as ${role}`,
      metadata: { email, role },
    }).catch(() => {});

    revalidateTag(`team-${businessId}`, { expire: 300 });
    return { success: true };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Accept Invitation (uses service role — user may not belong to business yet)
// ============================================================================

export async function acceptInvitation(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const token = formData.get("token") as string;
    if (!token) {
      return { error: "Invalid invitation link." };
    }

    // Get the authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be logged in to accept an invitation." };
    }

    // Service role to read invitation (RLS won't work — user has no business yet)
    const serviceClient = createServiceClient();

    const { data: invitation, error: invError } = await serviceClient
      .from("team_invitations")
      .select("id, business_id, email, role, expires_at, accepted_at")
      .eq("invitation_token", token)
      .single();

    if (invError || !invitation) {
      return { error: "Invalid or expired invitation." };
    }

    if (invitation.accepted_at) {
      return { error: "This invitation has already been accepted." };
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return { error: "This invitation has expired. Ask for a new one." };
    }

    // Check email matches
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return {
        error: `This invitation was sent to ${invitation.email}. Please log in with that email.`,
      };
    }

    // Check if user already belongs to a business
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (profile?.business_id) {
      return { error: "You are already a member of a business." };
    }

    // Update profile with business membership
    const { error: profileError } = await serviceClient
      .from("profiles")
      .update({
        business_id: invitation.business_id,
        role: invitation.role,
      })
      .eq("id", user.id);

    if (profileError) {
      return { error: "Failed to join business." };
    }

    // Mark invitation as accepted
    await serviceClient
      .from("team_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return { success: true };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Update Team Member Role
// ============================================================================

export async function updateTeamMemberRole(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const ctx = await getTeamContext();
    if (ctx.error) return { error: ctx.error };
    const { businessId, role: currentRole } = ctx;

    if (currentRole !== "owner") {
      return { error: "Only the business owner can change roles." };
    }

    const memberId = formData.get("member_id") as string;
    const newRole = formData.get("role") as string;

    if (!memberId) {
      return { error: "Member ID is required." };
    }

    const validRoles: UserRole[] = ["admin", "technician", "viewer"];
    if (!validRoles.includes(newRole as UserRole)) {
      return { error: "Invalid role." };
    }

    const supabase = await createClient();

    // Verify target member belongs to same business
    const { data: target } = await supabase
      .from("profiles")
      .select("id, role, business_id")
      .eq("id", memberId)
      .eq("business_id", businessId)
      .single();

    if (!target) {
      return { error: "Team member not found." };
    }

    if (target.role === "owner") {
      return { error: "Cannot change the owner's role." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole as UserRole })
      .eq("id", memberId)
      .eq("business_id", businessId);

    if (error) {
      return { error: "Failed to update role." };
    }

    logActivity({
      action_type: "team.role_updated",
      resource_type: "profile",
      resource_id: memberId,
      description: `Changed role to ${newRole}`,
      metadata: { member_id: memberId, new_role: newRole },
    }).catch(() => {});

    revalidateTag(`team-${businessId}`, { expire: 300 });
    return { success: true };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Remove Team Member
// ============================================================================

export async function removeTeamMember(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const ctx = await getTeamContext();
    if (ctx.error) return { error: ctx.error };
    const { businessId, role: currentRole } = ctx;

    if (currentRole !== "owner") {
      return { error: "Only the business owner can remove team members." };
    }

    const memberId = formData.get("member_id") as string;
    if (!memberId) {
      return { error: "Member ID is required." };
    }

    const supabase = await createClient();

    // Verify target member belongs to same business and isn't the owner
    const { data: target } = await supabase
      .from("profiles")
      .select("id, role, business_id")
      .eq("id", memberId)
      .eq("business_id", businessId)
      .single();

    if (!target) {
      return { error: "Team member not found." };
    }

    if (target.role === "owner") {
      return { error: "Cannot remove the business owner." };
    }

    // Detach from business (set business_id to null, role to viewer)
    const { error } = await supabase
      .from("profiles")
      .update({ business_id: null, role: "viewer" as UserRole })
      .eq("id", memberId)
      .eq("business_id", businessId);

    if (error) {
      return { error: "Failed to remove team member." };
    }

    logActivity({
      action_type: "team.member_removed",
      resource_type: "profile",
      resource_id: memberId,
      description: "Removed team member",
      metadata: { member_id: memberId },
    }).catch(() => {});

    revalidateTag(`team-${businessId}`, { expire: 300 });
    return { success: true };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Revoke Pending Invitation
// ============================================================================

export async function revokeInvitation(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  try {
    const ctx = await getTeamContext();
    if (ctx.error) return { error: ctx.error };
    const { businessId, role: currentRole } = ctx;

    if (currentRole !== "owner" && currentRole !== "admin") {
      return { error: "Only owners and admins can revoke invitations." };
    }

    const invitationId = formData.get("invitation_id") as string;
    if (!invitationId) {
      return { error: "Invitation ID is required." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("team_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("business_id", businessId);

    if (error) {
      return { error: "Failed to revoke invitation." };
    }

    revalidateTag(`team-${businessId}`, { expire: 300 });
    return { success: true };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}
