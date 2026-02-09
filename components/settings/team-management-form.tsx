"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  UserPlus,
  Loader2,
  Trash2,
  Mail,
  Shield,
  Clock,
} from "lucide-react";
import Link from "next/link";
import {
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  revokeInvitation,
  type TeamActionState,
} from "@/lib/actions/team";
import { useToast } from "@/components/toast-provider";
import type { UserRole } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

type TeamMember = {
  id: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  created_at: string;
};

type PendingInvitation = {
  id: string;
  email: string;
  role: UserRole;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

type Props = {
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserId: string;
  currentUserRole: UserRole;
  canManage: boolean;
};

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  technician: "Technician",
  viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: "Full access including billing and team management",
  admin: "Full access except billing",
  technician: "Create and edit quotes, view customers",
  viewer: "Read-only access to quotes and customers",
};

const initialState: TeamActionState = {};

// ============================================================================
// Component
// ============================================================================

export function TeamManagementForm({
  members: initialMembers,
  invitations: initialInvitations,
  currentUserId,
  currentUserRole,
  canManage,
}: Props) {
  const { toast } = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [showInvite, setShowInvite] = useState(false);

  // ---- Invite action ----
  const [inviteState, inviteAction, isInviting] = useActionState(
    inviteTeamMember,
    initialState,
  );

  useEffect(() => {
    if (inviteState.success) {
      toast("Invitation sent");
      setShowInvite(false);
    }
    if (inviteState.error) toast(inviteState.error, "error");
  }, [inviteState, toast]);

  // ---- Role update action ----
  const [roleState, roleAction, isUpdatingRole] = useActionState(
    updateTeamMemberRole,
    initialState,
  );

  useEffect(() => {
    if (roleState.success) toast("Role updated");
    if (roleState.error) toast(roleState.error, "error");
  }, [roleState, toast]);

  // ---- Remove member action ----
  const [removeState, removeAction, isRemoving] = useActionState(
    removeTeamMember,
    initialState,
  );

  useEffect(() => {
    if (removeState.success) {
      toast("Team member removed");
    }
    if (removeState.error) toast(removeState.error, "error");
  }, [removeState, toast]);

  // ---- Revoke invitation action ----
  const [revokeState, revokeAction, isRevoking] = useActionState(
    revokeInvitation,
    initialState,
  );

  useEffect(() => {
    if (revokeState.success) {
      toast("Invitation revoked");
    }
    if (revokeState.error) toast(revokeState.error, "error");
  }, [revokeState, toast]);

  const handleRemove = useCallback(
    (memberId: string) => {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      const fd = new FormData();
      fd.append("member_id", memberId);
      removeAction(fd);
    },
    [removeAction],
  );

  const handleRevoke = useCallback(
    (invId: string) => {
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
      const fd = new FormData();
      fd.append("invitation_id", invId);
      revokeAction(fd);
    },
    [revokeAction],
  );

  const handleRoleChange = useCallback(
    (memberId: string, newRole: string) => {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, role: newRole as UserRole } : m,
        ),
      );
      const fd = new FormData();
      fd.append("member_id", memberId);
      fd.append("role", newRole);
      roleAction(fd);
    },
    [roleAction],
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/app/settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[hsl(var(--muted))]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold">Team Management</h1>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowInvite(!showInvite)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </button>
        )}
      </div>

      {/* ---- Invite form ---- */}
      {showInvite && (
        <form
          action={inviteAction}
          className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/30"
        >
          <p className="text-sm font-medium">Invite Team Member</p>

          <input
            name="email"
            type="email"
            placeholder="Email address"
            required
            className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          />

          <select
            name="role"
            defaultValue="technician"
            className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 text-sm outline-none focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          >
            {currentUserRole === "owner" && (
              <option value="admin">Admin</option>
            )}
            <option value="technician">Technician</option>
            <option value="viewer">Viewer</option>
          </select>

          <div className="rounded-lg bg-[hsl(var(--muted))]/50 p-3 text-xs text-[hsl(var(--muted-foreground))]">
            <p className="mb-1 font-medium">Role permissions:</p>
            <ul className="space-y-0.5">
              <li>
                <strong>Admin:</strong> {ROLE_DESCRIPTIONS.admin}
              </li>
              <li>
                <strong>Technician:</strong> {ROLE_DESCRIPTIONS.technician}
              </li>
              <li>
                <strong>Viewer:</strong> {ROLE_DESCRIPTIONS.viewer}
              </li>
            </ul>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isInviting}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {isInviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Invite
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="flex h-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] px-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ---- Pending invitations ---- */}
      {invitations.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Pending Invitations
          </h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/30"
              >
                <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {ROLE_LABELS[inv.role]} &middot; Expires{" "}
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(inv.id)}
                    disabled={isRevoking}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--destructive))]"
                    aria-label="Revoke invitation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Team members list ---- */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Team Members ({members.length})
        </h2>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                {(member.first_name?.charAt(0) ?? "").toUpperCase()}
                {(member.last_name?.charAt(0) ?? "").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {[member.first_name, member.last_name]
                    .filter(Boolean)
                    .join(" ") || "Unnamed User"}
                  {member.id === currentUserId && (
                    <span className="ml-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                      (you)
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                  <Shield className="h-3 w-3" />
                  {canManage &&
                  currentUserRole === "owner" &&
                  member.role !== "owner" &&
                  member.id !== currentUserId ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.id, e.target.value)
                      }
                      disabled={isUpdatingRole}
                      className="rounded border border-[hsl(var(--border))] bg-transparent px-1 py-0.5 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="technician">Technician</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span>{ROLE_LABELS[member.role]}</span>
                  )}
                </div>
              </div>
              {canManage &&
                currentUserRole === "owner" &&
                member.role !== "owner" &&
                member.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => handleRemove(member.id)}
                    disabled={isRemoving}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--destructive))]"
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
