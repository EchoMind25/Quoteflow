# QuoteFlow - Product Requirements Document Part 2A (2026)
**Version:** 2.0
**Last Updated:** February 8, 2026
**Continuation of:** QuoteFlow_PRD_2026_PART1.md

---

## Table of Contents (Part 2A)

4. [Team Management & Approval Workflows](#4-team-management--approval-workflows)
5. [White-Label Branding System](#5-white-label-branding-system)
6. [Templates & Service Catalogs](#6-templates--service-catalogs)
7. [Data Ownership & Export (GDPR/CCPA)](#7-data-ownership--export-gdprccpa)
8. [Integrations (Stripe, ServiceTitan, QuickBooks)](#8-integrations-stripe-servicetitan-quickbooks)
9. [Complete AI Pipeline (All Industries)](#9-complete-ai-pipeline-all-industries)
10. [Offline-First Architecture (Full Implementation)](#10-offline-first-architecture-full-implementation)

---

## 4. Team Management & Approval Workflows

### 4.1 Overview

QuoteFlow supports multi-user businesses where an owner invites team members with role-based access. The approval workflow ensures that quotes created by junior technicians are reviewed before reaching customers.

**Existing foundation:** The `profiles` table already has a `role` column (`owner | admin | technician | viewer`) and a `business_id` FK. The `get_my_business_id()` helper and RLS policies already scope data per-business. This section adds a dedicated invitation system and a quote approval state machine on top of that foundation.

### 4.2 Database Schema

#### Migration: `0008_team_invitations.sql`

```sql
-- Migration: 0008_team_invitations.sql
-- Purpose: Add team invitation system and quote approval workflow

-- ============================================================
-- 1. Team invitations table
-- ============================================================
CREATE TABLE IF NOT EXISTS team_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invited_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'technician',
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate pending invitations for the same email + business
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_unique_pending
  ON team_invitations (business_id, email)
  WHERE status = 'pending';

-- Fast lookup by token (used during accept flow)
CREATE INDEX IF NOT EXISTS idx_invitations_token
  ON team_invitations (token)
  WHERE status = 'pending';

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_team_invitations
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. Quote approval fields on quotes table
-- ============================================================
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS approval_status TEXT
    DEFAULT 'none'
    CHECK (approval_status IN (
      'none',              -- no approval required (owner/admin created)
      'pending_review',    -- technician submitted for review
      'changes_requested', -- reviewer sent back with notes
      'approved',          -- approved, ready to send
      'rejected'           -- rejected outright
    )),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Index for approval queue queries
CREATE INDEX IF NOT EXISTS idx_quotes_approval_status
  ON quotes (business_id, approval_status)
  WHERE approval_status IN ('pending_review', 'changes_requested');

-- ============================================================
-- 3. Approval activity tracking (uses existing quote_activities)
-- ============================================================
-- No schema change needed — quote_activities already has:
--   action TEXT, metadata JSONB
-- We use action values: 'approval_submitted', 'approval_approved',
--   'approval_rejected', 'approval_changes_requested'

-- ============================================================
-- 4. RLS policies for team_invitations
-- ============================================================
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Owners and admins can view invitations for their business
CREATE POLICY "team_invitations_select"
  ON team_invitations FOR SELECT
  USING (
    business_id = get_my_business_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

-- Only owners can create invitations
CREATE POLICY "team_invitations_insert"
  ON team_invitations FOR INSERT
  WITH CHECK (
    business_id = get_my_business_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'owner'
    )
  );

-- Only owners can update (revoke) invitations
CREATE POLICY "team_invitations_update"
  ON team_invitations FOR UPDATE
  USING (
    business_id = get_my_business_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'owner'
    )
  );

-- Anon users can read a single invitation by token (for accept flow)
CREATE POLICY "team_invitations_accept_by_token"
  ON team_invitations FOR SELECT
  USING (
    status = 'pending'
    AND expires_at > now()
  );
```

### 4.3 TypeScript Types

Add to `types/database.ts`:

```typescript
// ---- team_invitations ----
team_invitations: {
  Row: {
    id: string;
    business_id: string;
    invited_by: string;
    email: string;
    role: Database["public"]["Enums"]["user_role"];
    token: string;
    status: "pending" | "accepted" | "expired" | "revoked";
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    business_id: string;
    invited_by: string;
    email: string;
    role?: Database["public"]["Enums"]["user_role"];
    token?: string;
    status?: "pending" | "accepted" | "expired" | "revoked";
    expires_at?: string;
    accepted_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    business_id?: string;
    invited_by?: string;
    email?: string;
    role?: Database["public"]["Enums"]["user_role"];
    token?: string;
    status?: "pending" | "accepted" | "expired" | "revoked";
    expires_at?: string;
    accepted_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
};
```

Add approval fields to the existing `quotes` types:

```typescript
// Add to quotes.Row:
approval_status: "none" | "pending_review" | "changes_requested" | "approved" | "rejected";
approved_by: string | null;
approved_at: string | null;
approval_notes: string | null;

// Add to quotes.Insert:
approval_status?: "none" | "pending_review" | "changes_requested" | "approved" | "rejected";
approved_by?: string | null;
approved_at?: string | null;
approval_notes?: string | null;

// Add to quotes.Update:
approval_status?: "none" | "pending_review" | "changes_requested" | "approved" | "rejected";
approved_by?: string | null;
approved_at?: string | null;
approval_notes?: string | null;
```

### 4.4 Role-Based Permissions Matrix

| Action                    | Owner | Admin | Technician | Viewer |
|---------------------------|:-----:|:-----:|:----------:|:------:|
| View all quotes           |  Yes  |  Yes  |   Own only |  Yes   |
| Create quotes             |  Yes  |  Yes  |    Yes     |   No   |
| Edit any quote            |  Yes  |  Yes  |   Own only |   No   |
| Delete quotes             |  Yes  |  Yes  |     No     |   No   |
| Send quotes to customer   |  Yes  |  Yes  |     No*    |   No   |
| View customers            |  Yes  |  Yes  |    Yes     |  Yes   |
| Create/edit customers     |  Yes  |  Yes  |     No     |   No   |
| View approval queue       |  Yes  |  Yes  |     No     |   No   |
| Approve/reject quotes     |  Yes  |  Yes  |     No     |   No   |
| Manage team members       |  Yes  |   No  |     No     |   No   |
| Manage billing            |  Yes  |   No  |     No     |   No   |
| Update business settings  |  Yes  |  Yes  |     No     |   No   |
| Update branding           |  Yes  |  Yes  |     No     |   No   |
| Export data               |  Yes  |   No  |     No     |   No   |

*Technicians can submit quotes for approval; once approved, an admin or owner sends them.

### 4.5 Permission Helper

```typescript
// lib/permissions.ts
import type { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["user_role"];

const PERMISSIONS = {
  "quotes:create":    ["owner", "admin", "technician"],
  "quotes:read:all":  ["owner", "admin", "viewer"],
  "quotes:read:own":  ["technician"],
  "quotes:edit:all":  ["owner", "admin"],
  "quotes:edit:own":  ["technician"],
  "quotes:delete":    ["owner", "admin"],
  "quotes:send":      ["owner", "admin"],
  "quotes:approve":   ["owner", "admin"],
  "customers:read":   ["owner", "admin", "technician", "viewer"],
  "customers:write":  ["owner", "admin"],
  "team:manage":      ["owner"],
  "billing:manage":   ["owner"],
  "settings:write":   ["owner", "admin"],
  "branding:write":   ["owner", "admin"],
  "data:export":      ["owner"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Role "${role}" lacks permission "${permission}"`);
  }
}
```

### 4.6 Invitation Flow

#### Sequence

```
Owner clicks "Invite Member" → enters email + role
  → Server Action: inviteTeamMember()
    → Insert row into team_invitations (status: pending, 7-day expiry)
    → Send invitation email via Resend (contains accept URL with token)
  → Invitee clicks link in email
    → Lands on /invite/[token] page
    → If already has account → acceptInvite() links profile to business
    → If new user → signup form pre-filled with email → on signup, acceptInvite() runs
  → Invitation status → "accepted", invitee's profile.business_id set
```

#### Server Actions

```typescript
// lib/actions/team.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

// ---- Types ----

export type InviteTeamMemberState = {
  error?: string;
  success?: boolean;
};

export type AcceptInviteState = {
  error?: string;
  success?: boolean;
  businessId?: string;
};

export type UpdateMemberRoleState = {
  error?: string;
  success?: boolean;
};

export type RemoveTeamMemberState = {
  error?: string;
  success?: boolean;
};

// ---- inviteTeamMember ----

export async function inviteTeamMember(
  _prevState: InviteTeamMemberState,
  formData: FormData,
): Promise<InviteTeamMemberState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "team:manage");
  } catch {
    return { error: "Only owners can invite team members" };
  }

  const email = formData.get("email") as string;
  const role = formData.get("role") as string;

  if (!email || !role) return { error: "Email and role are required" };

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { error: "Invalid email address" };

  // Validate role (cannot invite someone as owner)
  if (role === "owner") return { error: "Cannot invite another owner" };
  if (!["admin", "technician", "viewer"].includes(role)) {
    return { error: "Invalid role" };
  }

  // Check if already a team member
  const { data: existingMember } = await supabase
    .from("profiles")
    .select("id")
    .eq("business_id", profile.business_id)
    .ilike("email", email)
    .maybeSingle();

  if (existingMember) return { error: "This person is already on your team" };

  // Insert invitation (unique constraint prevents duplicate pending invites)
  const { error: insertError } = await supabase
    .from("team_invitations")
    .insert({
      business_id: profile.business_id,
      invited_by: user.id,
      email: email.toLowerCase().trim(),
      role: role as "admin" | "technician" | "viewer",
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "An invitation is already pending for this email" };
    }
    return { error: "Failed to create invitation" };
  }

  // Fetch the generated token
  const { data: invitation } = await supabase
    .from("team_invitations")
    .select("token")
    .eq("business_id", profile.business_id)
    .eq("email", email.toLowerCase().trim())
    .eq("status", "pending")
    .single();

  if (!invitation) return { error: "Failed to retrieve invitation" };

  // Fetch business name for the email
  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", profile.business_id)
    .single();

  // Send invitation email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://quoteflow.app";
  const acceptUrl = `${appUrl}/invite/${invitation.token}`;

  const { sendTeamInviteEmail } = await import("@/lib/email/send-team-invite");
  await sendTeamInviteEmail({
    to: email,
    businessName: business?.name ?? "A QuoteFlow business",
    inviterName: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "A team member",
    role,
    acceptUrl,
  });

  revalidatePath("/app/settings/team");
  return { success: true };
}

// ---- acceptInvite ----

export async function acceptInvite(
  _prevState: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const token = formData.get("token") as string;
  if (!token) return { error: "Invalid invitation link" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign up or log in first" };

  // Fetch invitation by token
  const { data: invitation } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!invitation) {
    return { error: "Invitation not found, expired, or already used" };
  }

  // Check email matches
  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return {
      error: `This invitation was sent to ${invitation.email}. Please log in with that email.`,
    };
  }

  // Check user doesn't already belong to a business
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (existingProfile?.business_id) {
    return { error: "You already belong to a business. Leave it first to join another." };
  }

  // Update profile with business_id and role
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      business_id: invitation.business_id,
      role: invitation.role,
    })
    .eq("id", user.id);

  if (profileError) return { error: "Failed to join team" };

  // Mark invitation as accepted
  await supabase
    .from("team_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);

  return { success: true, businessId: invitation.business_id };
}

// ---- updateMemberRole ----

export async function updateMemberRole(
  _prevState: UpdateMemberRoleState,
  formData: FormData,
): Promise<UpdateMemberRoleState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "team:manage");
  } catch {
    return { error: "Only owners can change roles" };
  }

  const memberId = formData.get("member_id") as string;
  const newRole = formData.get("role") as string;

  if (!memberId || !newRole) return { error: "Member ID and role required" };
  if (memberId === user.id) return { error: "Cannot change your own role" };
  if (newRole === "owner") return { error: "Cannot promote to owner" };

  // Verify target member belongs to same business
  const { data: targetMember } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", memberId)
    .single();

  if (targetMember?.business_id !== profile.business_id) {
    return { error: "Member not found" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole as "admin" | "technician" | "viewer" })
    .eq("id", memberId);

  if (error) return { error: "Failed to update role" };

  revalidatePath("/app/settings/team");
  return { success: true };
}

// ---- removeTeamMember ----

export async function removeTeamMember(
  _prevState: RemoveTeamMemberState,
  formData: FormData,
): Promise<RemoveTeamMemberState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "team:manage");
  } catch {
    return { error: "Only owners can remove team members" };
  }

  const memberId = formData.get("member_id") as string;
  if (!memberId) return { error: "Member ID required" };
  if (memberId === user.id) return { error: "Cannot remove yourself" };

  // Verify target member belongs to same business
  const { data: targetMember } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", memberId)
    .single();

  if (targetMember?.business_id !== profile.business_id) {
    return { error: "Member not found" };
  }

  if (targetMember.role === "owner") {
    return { error: "Cannot remove the business owner" };
  }

  // Unlink from business (don't delete the auth user)
  const { error } = await supabase
    .from("profiles")
    .update({ business_id: null, role: "viewer" })
    .eq("id", memberId);

  if (error) return { error: "Failed to remove member" };

  revalidatePath("/app/settings/team");
  return { success: true };
}
```

### 4.7 Quote Approval Workflow

#### State Machine

```
                ┌──────────────┐
                │     none     │  ← Owner/Admin creates quote (no approval needed)
                └──────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  pending_review  │  ← Technician submits draft
              └──────────────────┘
                    │        │
           ┌───────┘        └────────┐
           ▼                         ▼
  ┌──────────────────┐     ┌────────────────┐
  │     approved     │     │    rejected    │
  └──────────────────┘     └────────────────┘
           │                         │
           ▼                         │
    (quote.status                    │
     can be set                      │
     to "sent")                      │
                                     │
           ┌─────────────────────────┘
           ▼
  ┌──────────────────────┐
  │  changes_requested   │  ← Reviewer sends back with notes
  └──────────────────────┘
           │
           ▼
  ┌──────────────────┐
  │  pending_review  │  ← Technician resubmits
  └──────────────────┘
```

#### Approval Server Actions

```typescript
// lib/actions/approval.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export type ApprovalActionState = {
  error?: string;
  success?: boolean;
};

export async function submitForApproval(
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const quoteId = formData.get("quote_id") as string;
  if (!quoteId) return { error: "Quote ID required" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  // Only technicians need to submit for approval
  // Owners and admins can skip directly to sending
  if (profile.role !== "technician") {
    return { error: "Only technicians submit for approval" };
  }

  // Verify quote belongs to this business and is a draft
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, status, approval_status, created_by")
    .eq("id", quoteId)
    .eq("business_id", profile.business_id)
    .single();

  if (!quote) return { error: "Quote not found" };
  if (quote.status !== "draft") return { error: "Only draft quotes can be submitted" };
  if (quote.created_by !== user.id) return { error: "You can only submit your own quotes" };

  const { error } = await supabase
    .from("quotes")
    .update({
      approval_status: "pending_review",
    })
    .eq("id", quoteId);

  if (error) return { error: "Failed to submit for approval" };

  // Log activity
  await supabase.from("quote_activities").insert({
    quote_id: quoteId,
    actor_id: user.id,
    action: "approval_submitted",
    metadata: {},
  });

  revalidatePath(`/app/quotes/${quoteId}`);
  revalidatePath("/app/quotes");
  return { success: true };
}

export async function approveQuote(
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "quotes:approve");
  } catch {
    return { error: "You do not have permission to approve quotes" };
  }

  const quoteId = formData.get("quote_id") as string;
  const notes = (formData.get("notes") as string) ?? "";

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, approval_status")
    .eq("id", quoteId)
    .eq("business_id", profile.business_id)
    .single();

  if (!quote) return { error: "Quote not found" };
  if (quote.approval_status !== "pending_review") {
    return { error: "Quote is not pending review" };
  }

  const { error } = await supabase
    .from("quotes")
    .update({
      approval_status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_notes: notes || null,
    })
    .eq("id", quoteId);

  if (error) return { error: "Failed to approve quote" };

  await supabase.from("quote_activities").insert({
    quote_id: quoteId,
    actor_id: user.id,
    action: "approval_approved",
    metadata: { notes },
  });

  revalidatePath(`/app/quotes/${quoteId}`);
  revalidatePath("/app/quotes");
  return { success: true };
}

export async function requestChanges(
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "quotes:approve");
  } catch {
    return { error: "You do not have permission to review quotes" };
  }

  const quoteId = formData.get("quote_id") as string;
  const notes = formData.get("notes") as string;

  if (!notes?.trim()) return { error: "Please provide feedback notes" };

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, approval_status")
    .eq("id", quoteId)
    .eq("business_id", profile.business_id)
    .single();

  if (!quote) return { error: "Quote not found" };
  if (quote.approval_status !== "pending_review") {
    return { error: "Quote is not pending review" };
  }

  const { error } = await supabase
    .from("quotes")
    .update({
      approval_status: "changes_requested",
      approval_notes: notes,
    })
    .eq("id", quoteId);

  if (error) return { error: "Failed to request changes" };

  await supabase.from("quote_activities").insert({
    quote_id: quoteId,
    actor_id: user.id,
    action: "approval_changes_requested",
    metadata: { notes },
  });

  revalidatePath(`/app/quotes/${quoteId}`);
  return { success: true };
}

export async function rejectQuote(
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "quotes:approve");
  } catch {
    return { error: "You do not have permission to reject quotes" };
  }

  const quoteId = formData.get("quote_id") as string;
  const notes = formData.get("notes") as string;

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, approval_status")
    .eq("id", quoteId)
    .eq("business_id", profile.business_id)
    .single();

  if (!quote) return { error: "Quote not found" };
  if (quote.approval_status !== "pending_review") {
    return { error: "Quote is not pending review" };
  }

  const { error } = await supabase
    .from("quotes")
    .update({
      approval_status: "rejected",
      approval_notes: notes || null,
    })
    .eq("id", quoteId);

  if (error) return { error: "Failed to reject quote" };

  await supabase.from("quote_activities").insert({
    quote_id: quoteId,
    actor_id: user.id,
    action: "approval_rejected",
    metadata: { notes: notes ?? "" },
  });

  revalidatePath(`/app/quotes/${quoteId}`);
  return { success: true };
}
```

### 4.8 UI Components

#### Team Settings Page

```typescript
// app/app/settings/team/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamSettingsView } from "@/components/settings/team-settings-view";

export default async function TeamSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect("/app/settings");

  // Fetch team members
  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role, avatar_url, created_at")
    .eq("business_id", profile.business_id)
    .order("created_at", { ascending: true });

  // Fetch pending invitations (owner only)
  let pendingInvitations: Array<{
    id: string;
    email: string;
    role: string;
    expires_at: string;
    created_at: string;
  }> = [];

  if (profile.role === "owner") {
    const { data: invitations } = await supabase
      .from("team_invitations")
      .select("id, email, role, expires_at, created_at")
      .eq("business_id", profile.business_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    pendingInvitations = invitations ?? [];
  }

  return (
    <TeamSettingsView
      currentUserId={user.id}
      currentRole={profile.role}
      members={members ?? []}
      pendingInvitations={pendingInvitations}
    />
  );
}
```

#### Approval Queue Component

```typescript
// components/quotes/approval-queue.tsx
"use client";

import { useActionState } from "react";
import { approveQuote, requestChanges, rejectQuote } from "@/lib/actions/approval";
import type { ApprovalActionState } from "@/lib/actions/approval";
import { CheckCircle, XCircle, MessageSquare, Clock } from "lucide-react";

type PendingQuote = {
  id: string;
  quote_number: string;
  title: string;
  total_cents: number;
  created_by_name: string;
  created_at: string;
};

export function ApprovalQueue({ quotes }: { quotes: PendingQuote[] }) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-lg border border-[hsl(var(--border))] p-8 text-center">
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
        <p className="text-[hsl(var(--muted-foreground))]">
          No quotes pending approval
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Clock className="h-5 w-5 text-amber-500" />
        Pending Approval ({quotes.length})
      </h2>
      {quotes.map((quote) => (
        <ApprovalCard key={quote.id} quote={quote} />
      ))}
    </div>
  );
}

function ApprovalCard({ quote }: { quote: PendingQuote }) {
  const [approveState, approveAction, approvePending] = useActionState<
    ApprovalActionState,
    FormData
  >(approveQuote, {});

  const [changesState, changesAction, changesPending] = useActionState<
    ApprovalActionState,
    FormData
  >(requestChanges, {});

  const [rejectState, rejectAction, rejectPending] = useActionState<
    ApprovalActionState,
    FormData
  >(rejectQuote, {});

  const isPending = approvePending || changesPending || rejectPending;
  const error = approveState.error ?? changesState.error ?? rejectState.error;

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-medium">{quote.title}</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {quote.quote_number} &middot; by {quote.created_by_name}
          </p>
        </div>
        <p className="text-lg font-semibold">
          ${(quote.total_cents / 100).toFixed(2)}
        </p>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <form action={approveAction}>
          <input type="hidden" name="quote_id" value={quote.id} />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </button>
        </form>

        <form action={changesAction}>
          <input type="hidden" name="quote_id" value={quote.id} />
          <input type="hidden" name="notes" value="Please review pricing" />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <MessageSquare className="h-4 w-4" />
            Request Changes
          </button>
        </form>

        <form action={rejectAction}>
          <input type="hidden" name="quote_id" value={quote.id} />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 4.9 Team Invitation Email Template

```typescript
// emails/team-invite-email.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type TeamInviteEmailProps = {
  businessName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
};

const roleDescriptions: Record<string, string> = {
  admin: "Admin — manage quotes, customers, and settings",
  technician: "Technician — create quotes and submit for approval",
  viewer: "Viewer — read-only access to quotes and customers",
};

export function TeamInviteEmail({
  businessName,
  inviterName,
  role,
  acceptUrl,
}: TeamInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} invited you to join {businessName} on QuoteFlow
      </Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            margin: "40px auto",
            padding: "40px",
            maxWidth: "480px",
          }}
        >
          <Heading style={{ fontSize: "24px", marginBottom: "8px" }}>
            You&apos;re invited to join {businessName}
          </Heading>
          <Text style={{ color: "#6b7280", fontSize: "16px" }}>
            {inviterName} has invited you to their team on QuoteFlow as:
          </Text>
          <Section
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: "6px",
              padding: "12px 16px",
              margin: "16px 0",
            }}
          >
            <Text style={{ fontWeight: 600, margin: 0 }}>
              {roleDescriptions[role] ?? role}
            </Text>
          </Section>
          <Button
            href={acceptUrl}
            style={{
              backgroundColor: "#2563eb",
              borderRadius: "6px",
              color: "#ffffff",
              display: "block",
              fontSize: "16px",
              fontWeight: 600,
              padding: "12px 24px",
              textAlign: "center" as const,
              textDecoration: "none",
              margin: "24px 0",
            }}
          >
            Accept Invitation
          </Button>
          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />
          <Text style={{ color: "#9ca3af", fontSize: "13px" }}>
            This invitation expires in 7 days. If you didn&apos;t expect this
            email, you can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### 4.10 Email Sending Helper

```typescript
// lib/email/send-team-invite.ts
import { Resend } from "resend";
import { TeamInviteEmail } from "@/emails/team-invite-email";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTeamInviteEmail(params: {
  to: string;
  businessName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}): Promise<void> {
  await resend.emails.send({
    from: "QuoteFlow <team@quoteflow.app>",
    to: params.to,
    subject: `Join ${params.businessName} on QuoteFlow`,
    react: TeamInviteEmail({
      businessName: params.businessName,
      inviterName: params.inviterName,
      role: params.role,
      acceptUrl: params.acceptUrl,
    }),
  });
}
```

---

## 5. White-Label Branding System

### 5.1 Overview

Every QuoteFlow business can customize the customer-facing experience: logo, colors, email templates, and the PWA home screen. The branding system uses CSS custom properties at runtime so no rebuild is required when colors change.

**Existing foundation:** The `businesses` table already has `logo_url` (Supabase Storage path) and `primary_color` (hex). The public quote page and email templates already reference these. This section extends branding to a full white-label system with secondary color, custom domain support, and dynamic PWA manifest generation.

### 5.2 Database Schema Updates

#### Migration: `0009_extended_branding.sql`

```sql
-- Migration: 0009_extended_branding.sql
-- Purpose: Extend business branding for full white-label support

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS secondary_color TEXT
    DEFAULT '#1e40af'
    CHECK (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  ADD COLUMN IF NOT EXISTS accent_color TEXT
    CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9a-fA-F]{6}$'),
  ADD COLUMN IF NOT EXISTS logo_dark_url TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_footer_text TEXT,
  ADD COLUMN IF NOT EXISTS brand_font TEXT
    DEFAULT 'Inter'
    CHECK (brand_font IN ('Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins'));

-- Index for custom domain lookups (used by proxy.ts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_custom_domain
  ON businesses (custom_domain)
  WHERE custom_domain IS NOT NULL AND custom_domain_verified = true;

COMMENT ON COLUMN businesses.secondary_color IS 'Used for secondary buttons, links, and accents';
COMMENT ON COLUMN businesses.logo_dark_url IS 'Logo variant for dark backgrounds (email headers, dark mode)';
COMMENT ON COLUMN businesses.favicon_url IS 'Small icon for browser tab, PWA home screen fallback';
COMMENT ON COLUMN businesses.custom_domain IS 'e.g. quotes.acmehvac.com — verified via CNAME to quoteflow.app';
COMMENT ON COLUMN businesses.brand_font IS 'Google Font used in public pages and emails';
```

### 5.3 TypeScript Type Updates

Add to the existing `businesses` types in `types/database.ts`:

```typescript
// Add to businesses.Row:
secondary_color: string;
accent_color: string | null;
logo_dark_url: string | null;
favicon_url: string | null;
custom_domain: string | null;
custom_domain_verified: boolean;
email_footer_text: string | null;
brand_font: "Inter" | "Roboto" | "Open Sans" | "Lato" | "Poppins";

// Add to businesses.Insert (all optional since they have defaults):
secondary_color?: string;
accent_color?: string | null;
logo_dark_url?: string | null;
favicon_url?: string | null;
custom_domain?: string | null;
custom_domain_verified?: boolean;
email_footer_text?: string | null;
brand_font?: "Inter" | "Roboto" | "Open Sans" | "Lato" | "Poppins";

// Add to businesses.Update:
secondary_color?: string;
accent_color?: string | null;
logo_dark_url?: string | null;
favicon_url?: string | null;
custom_domain?: string | null;
custom_domain_verified?: boolean;
email_footer_text?: string | null;
brand_font?: "Inter" | "Roboto" | "Open Sans" | "Lato" | "Poppins";
```

### 5.4 CSS Custom Properties for Dynamic Theming

```typescript
// lib/branding/theme.ts

export type BrandingConfig = {
  primaryColor: string;    // hex e.g. "#2563eb"
  secondaryColor: string;  // hex e.g. "#1e40af"
  accentColor?: string;    // hex, optional
  brandFont: string;       // Google Font name
};

/**
 * Convert hex color to HSL components for Tailwind CSS custom properties.
 * Returns "H S% L%" format (no commas, no hsl() wrapper) for use with
 * Tailwind's hsl(var(--...)) pattern.
 */
export function hexToHSL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Generate CSS custom property overrides for a business's branding.
 * Injected as an inline <style> tag in layouts that are customer-facing.
 */
export function generateBrandCSS(config: BrandingConfig): string {
  const primary = hexToHSL(config.primaryColor);
  const secondary = hexToHSL(config.secondaryColor);

  let css = `:root {
  --brand-primary: ${primary};
  --brand-secondary: ${secondary};
  --brand-font: '${config.brandFont}', sans-serif;
}`;

  if (config.accentColor) {
    const accent = hexToHSL(config.accentColor);
    css = css.replace("}", `  --brand-accent: ${accent};\n}`);
  }

  return css;
}

/**
 * Derive readable foreground color (white or black) based on luminance.
 */
export function contrastForeground(hex: string): "#ffffff" | "#000000" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance (ITU-R BT.709)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}
```

### 5.5 Dynamic PWA Manifest Generation

```typescript
// app/manifest.ts
import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Default manifest for unauthenticated users
  const defaults: MetadataRoute.Manifest = {
    name: "QuoteFlow",
    short_name: "QuoteFlow",
    description: "AI-powered quoting for service businesses",
    start_url: "/app",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  try {
    const cookieStore = await cookies();
    const hasSession = cookieStore.get("sb-access-token");
    if (!hasSession) return defaults;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return defaults;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) return defaults;

    const { data: business } = await supabase
      .from("businesses")
      .select("name, primary_color, favicon_url")
      .eq("id", profile.business_id)
      .single();

    if (!business) return defaults;

    return {
      ...defaults,
      name: business.name,
      short_name: business.name.length > 12
        ? business.name.slice(0, 12)
        : business.name,
      theme_color: business.primary_color ?? defaults.theme_color,
      icons: business.favicon_url
        ? [
            {
              src: business.favicon_url,
              sizes: "192x192",
              type: "image/png",
            },
            ...defaults.icons!,
          ]
        : defaults.icons,
    };
  } catch {
    return defaults;
  }
}
```

### 5.6 Branded Public Quote Layout

```typescript
// app/public/quotes/[id]/layout.tsx
import { createClient } from "@/lib/supabase/server";
import { generateBrandCSS } from "@/lib/branding/theme";
import { notFound } from "next/navigation";

export default async function PublicQuoteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("business_id")
    .eq("id", id)
    .single();

  if (!quote) notFound();

  const { data: business } = await supabase
    .from("businesses")
    .select("name, primary_color, secondary_color, accent_color, logo_url, logo_dark_url, brand_font")
    .eq("id", quote.business_id)
    .single();

  if (!business) notFound();

  const brandCSS = generateBrandCSS({
    primaryColor: business.primary_color ?? "#2563eb",
    secondaryColor: business.secondary_color ?? "#1e40af",
    accentColor: business.accent_color ?? undefined,
    brandFont: business.brand_font ?? "Inter",
  });

  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(business.brand_font ?? "Inter")}:wght@400;500;600;700&display=swap`;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl} />
      <style dangerouslySetInnerHTML={{ __html: brandCSS }} />
      <div style={{ fontFamily: `var(--brand-font)` }}>
        {children}
      </div>
    </>
  );
}
```

### 5.7 Branded Email Template Integration

```typescript
// lib/email/branded-email-config.ts
import { createClient } from "@/lib/supabase/server";
import { contrastForeground } from "@/lib/branding/theme";

export type EmailBrandingConfig = {
  businessName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  footerText: string | null;
  foregroundOnPrimary: "#ffffff" | "#000000";
};

export async function getEmailBranding(
  businessId: string,
): Promise<EmailBrandingConfig> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select(
      "name, primary_color, secondary_color, logo_url, logo_dark_url, email_footer_text",
    )
    .eq("id", businessId)
    .single();

  const primary = business?.primary_color ?? "#2563eb";

  return {
    businessName: business?.name ?? "QuoteFlow",
    primaryColor: primary,
    secondaryColor: business?.secondary_color ?? "#1e40af",
    logoUrl: business?.logo_url ?? null,
    logoDarkUrl: business?.logo_dark_url ?? null,
    footerText: business?.email_footer_text ?? null,
    foregroundOnPrimary: contrastForeground(primary),
  };
}
```

### 5.8 Server Action: updateBranding

```typescript
// lib/actions/branding.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export type UpdateBrandingState = {
  error?: string;
  success?: boolean;
};

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
const ALLOWED_FONTS = ["Inter", "Roboto", "Open Sans", "Lato", "Poppins"];
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

export async function updateBranding(
  _prevState: UpdateBrandingState,
  formData: FormData,
): Promise<UpdateBrandingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "branding:write");
  } catch {
    return { error: "You do not have permission to update branding" };
  }

  const primaryColor = formData.get("primary_color") as string | null;
  const secondaryColor = formData.get("secondary_color") as string | null;
  const accentColor = formData.get("accent_color") as string | null;
  const brandFont = formData.get("brand_font") as string | null;
  const emailFooterText = formData.get("email_footer_text") as string | null;
  const logoFile = formData.get("logo") as File | null;

  // Validate colors
  if (primaryColor && !HEX_REGEX.test(primaryColor)) {
    return { error: "Invalid primary color format (use #RRGGBB)" };
  }
  if (secondaryColor && !HEX_REGEX.test(secondaryColor)) {
    return { error: "Invalid secondary color format (use #RRGGBB)" };
  }
  if (accentColor && accentColor !== "" && !HEX_REGEX.test(accentColor)) {
    return { error: "Invalid accent color format (use #RRGGBB)" };
  }
  if (brandFont && !ALLOWED_FONTS.includes(brandFont)) {
    return { error: `Font must be one of: ${ALLOWED_FONTS.join(", ")}` };
  }

  const updates: Record<string, unknown> = {};
  if (primaryColor) updates.primary_color = primaryColor;
  if (secondaryColor) updates.secondary_color = secondaryColor;
  if (accentColor !== null) updates.accent_color = accentColor || null;
  if (brandFont) updates.brand_font = brandFont;
  if (emailFooterText !== null) updates.email_footer_text = emailFooterText || null;

  // Handle logo upload
  if (logoFile && logoFile.size > 0) {
    if (logoFile.size > MAX_LOGO_BYTES) {
      return { error: "Logo must be under 2 MB" };
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(logoFile.type)) {
      return { error: "Logo must be PNG, JPEG, WebP, or SVG" };
    }

    let uploadBlob: Blob = logoFile;
    if (logoFile.type !== "image/svg+xml") {
      const { compressImage } = await import("@/lib/media/compress-image");
      const arrayBuffer = await logoFile.arrayBuffer();
      uploadBlob = await compressImage(new Blob([arrayBuffer], { type: logoFile.type }), {
        maxWidth: 800,
        maxHeight: 200,
        quality: 0.9,
      });
    }

    const storagePath = `logos/${profile.business_id}/logo.${logoFile.type === "image/svg+xml" ? "svg" : "webp"}`;

    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(storagePath, uploadBlob, {
        contentType: uploadBlob.type,
        upsert: true,
      });

    if (uploadError) return { error: "Failed to upload logo" };

    const { data: publicUrl } = supabase.storage
      .from("business-logos")
      .getPublicUrl(storagePath);

    updates.logo_url = publicUrl.publicUrl;
  }

  if (Object.keys(updates).length === 0) {
    return { error: "No changes provided" };
  }

  const { error } = await supabase
    .from("businesses")
    .update(updates)
    .eq("id", profile.business_id);

  if (error) return { error: "Failed to update branding" };

  revalidatePath("/app/settings");
  revalidatePath("/app/settings/branding");
  return { success: true };
}
```

### 5.9 Branding Preview Component

```typescript
// components/settings/branding-preview.tsx
"use client";

import { useState } from "react";
import { generateBrandCSS, contrastForeground } from "@/lib/branding/theme";

type BrandingPreviewProps = {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  logoUrl: string | null;
  businessName: string;
};

export function BrandingPreview({
  primaryColor,
  secondaryColor,
  accentColor,
  logoUrl,
  businessName,
}: BrandingPreviewProps) {
  const [liveColors, setLiveColors] = useState({
    primary: primaryColor,
    secondary: secondaryColor,
    accent: accentColor ?? "",
  });

  const cssOverrides = generateBrandCSS({
    primaryColor: liveColors.primary,
    secondaryColor: liveColors.secondary,
    accentColor: liveColors.accent || undefined,
    brandFont: "Inter",
  });

  const fgOnPrimary = contrastForeground(liveColors.primary);

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <label className="space-y-1">
          <span className="text-sm font-medium">Primary</span>
          <input
            type="color"
            value={liveColors.primary}
            onChange={(e) =>
              setLiveColors((c) => ({ ...c, primary: e.target.value }))
            }
            className="block h-10 w-16 cursor-pointer rounded border"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Secondary</span>
          <input
            type="color"
            value={liveColors.secondary}
            onChange={(e) =>
              setLiveColors((c) => ({ ...c, secondary: e.target.value }))
            }
            className="block h-10 w-16 cursor-pointer rounded border"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Accent</span>
          <input
            type="color"
            value={liveColors.accent || "#f59e0b"}
            onChange={(e) =>
              setLiveColors((c) => ({ ...c, accent: e.target.value }))
            }
            className="block h-10 w-16 cursor-pointer rounded border"
          />
        </label>
      </div>

      {/* Preview card simulating customer-facing quote */}
      <style dangerouslySetInnerHTML={{ __html: cssOverrides }} />
      <div className="overflow-hidden rounded-xl border shadow-lg">
        <div
          className="flex items-center gap-3 p-4"
          style={{ backgroundColor: liveColors.primary, color: fgOnPrimary }}
        >
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-8 w-auto rounded" />
          )}
          <span className="text-lg font-semibold">{businessName}</span>
        </div>
        <div className="bg-white p-4">
          <p className="mb-2 font-medium">Quote #QF-00042</p>
          <p className="text-sm text-gray-600">3-Ton AC Replacement — Carrier 24ACC636</p>
          <div className="mt-4 flex gap-2">
            <button
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: liveColors.primary, color: fgOnPrimary }}
            >
              Accept Quote
            </button>
            <button
              className="rounded-md border px-4 py-2 text-sm font-medium"
              style={{ borderColor: liveColors.secondary, color: liveColors.secondary }}
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5.10 Custom Domain Configuration

Custom domains follow a CNAME-based verification flow:

1. Business owner enters their desired domain (e.g., `quotes.acmehvac.com`) in Settings > Branding.
2. QuoteFlow displays a CNAME record they must add: `quotes.acmehvac.com CNAME cname.quoteflow.app`.
3. A server-side verification check (on-demand) resolves DNS via `dns.resolveCname()`.
4. Once verified, `custom_domain_verified = true` and the proxy routes requests from that domain to the correct business's public pages.

```typescript
// lib/actions/domain.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import dns from "node:dns/promises";

export type VerifyDomainState = {
  error?: string;
  success?: boolean;
  verified?: boolean;
};

export async function setCustomDomain(
  _prevState: VerifyDomainState,
  formData: FormData,
): Promise<VerifyDomainState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };
  requirePermission(profile.role, "settings:write");

  const domain = (formData.get("domain") as string)?.trim().toLowerCase();
  if (!domain) return { error: "Domain is required" };

  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!domainRegex.test(domain)) {
    return { error: "Invalid domain format" };
  }

  const { error } = await supabase
    .from("businesses")
    .update({ custom_domain: domain, custom_domain_verified: false })
    .eq("id", profile.business_id);

  if (error) {
    if (error.code === "23505") {
      return { error: "This domain is already registered to another business" };
    }
    return { error: "Failed to save domain" };
  }

  return { success: true, verified: false };
}

export async function verifyCustomDomain(
  _prevState: VerifyDomainState,
  _formData: FormData,
): Promise<VerifyDomainState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  const { data: business } = await supabase
    .from("businesses")
    .select("custom_domain")
    .eq("id", profile.business_id)
    .single();

  if (!business?.custom_domain) return { error: "No domain configured" };

  try {
    const cnames = await dns.resolveCname(business.custom_domain);
    const isValid = cnames.some(
      (cname) => cname === "cname.quoteflow.app" || cname === "cname.quoteflow.app.",
    );

    if (!isValid) {
      return {
        error: `CNAME not found. Add a CNAME record: ${business.custom_domain} → cname.quoteflow.app`,
        verified: false,
      };
    }

    await supabase
      .from("businesses")
      .update({ custom_domain_verified: true })
      .eq("id", profile.business_id);

    return { success: true, verified: true };
  } catch {
    return {
      error: "DNS lookup failed. Ensure the CNAME record is configured and propagated.",
      verified: false,
    };
  }
}
```

---

## 6. Templates & Service Catalogs

### 6.1 Overview

Service catalogs allow businesses to pre-define their common services with standard pricing. Templates bundle multiple catalog items into reusable job configurations (e.g., "AC Replacement" includes equipment, labor, refrigerant, disposal, and permit line items). The existing `pricing_catalog` table stores individual items; this section adds a `quote_templates` table for multi-item bundles, a CSV import pipeline, and integration with the AI quote generation flow.

### 6.2 Database Schema

#### Migration: `0010_templates_and_catalog_enhancements.sql`

```sql
-- Migration: 0010_templates_and_catalog_enhancements.sql
-- Purpose: Add quote templates, enhance catalog with industry categories

-- ============================================================
-- 1. Enhance pricing_catalog with structured categories
-- ============================================================
-- Create industry-aware category enum
CREATE TYPE catalog_category AS ENUM (
  'hvac_equipment',
  'hvac_labor',
  'hvac_materials',
  'plumbing_fixtures',
  'plumbing_labor',
  'plumbing_materials',
  'electrical_equipment',
  'electrical_labor',
  'electrical_materials',
  'permits_fees',
  'disposal',
  'general_labor',
  'general_materials',
  'custom'
);

-- Add structured category + SKU + tags
ALTER TABLE pricing_catalog
  ADD COLUMN IF NOT EXISTS structured_category catalog_category DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS item_type line_item_type DEFAULT 'service',
  ADD COLUMN IF NOT EXISTS min_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS max_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMPTZ DEFAULT now();

-- Index for tag-based filtering
CREATE INDEX IF NOT EXISTS idx_catalog_tags
  ON pricing_catalog USING GIN (tags);

-- Index for structured category filtering
CREATE INDEX IF NOT EXISTS idx_catalog_structured_category
  ON pricing_catalog (business_id, structured_category)
  WHERE is_active = true;

-- Full-text search on catalog items
CREATE INDEX IF NOT EXISTS idx_catalog_search
  ON pricing_catalog USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  );

-- ============================================================
-- 2. Quote templates table
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  industry      industry_type NOT NULL DEFAULT 'general',
  category      catalog_category DEFAULT 'custom',
  is_published  BOOLEAN NOT NULL DEFAULT false,
  use_count     INTEGER NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_business
  ON quote_templates (business_id, industry)
  WHERE is_published = false;  -- drafts

CREATE TRIGGER set_updated_at_quote_templates
  BEFORE UPDATE ON quote_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3. Template line items (pre-configured items per template)
-- ============================================================
CREATE TABLE IF NOT EXISTS template_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID NOT NULL REFERENCES quote_templates(id) ON DELETE CASCADE,
  catalog_item_id   UUID REFERENCES pricing_catalog(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  quantity          NUMERIC(12,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit              TEXT NOT NULL DEFAULT 'ea',
  unit_price_cents  INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  item_type         line_item_type NOT NULL DEFAULT 'service',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_optional       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_items
  ON template_line_items (template_id, sort_order);

-- ============================================================
-- 4. RLS policies
-- ============================================================
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_line_items ENABLE ROW LEVEL SECURITY;

-- Templates: business members can read
CREATE POLICY "templates_select"
  ON quote_templates FOR SELECT
  USING (business_id = get_my_business_id());

-- Templates: owner/admin can manage
CREATE POLICY "templates_insert"
  ON quote_templates FOR INSERT
  WITH CHECK (
    business_id = get_my_business_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "templates_update"
  ON quote_templates FOR UPDATE
  USING (
    business_id = get_my_business_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "templates_delete"
  ON quote_templates FOR DELETE
  USING (
    business_id = get_my_business_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

-- Template items: inherit access from parent template
CREATE POLICY "template_items_select"
  ON template_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quote_templates
      WHERE quote_templates.id = template_line_items.template_id
        AND quote_templates.business_id = get_my_business_id()
    )
  );

CREATE POLICY "template_items_insert"
  ON template_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quote_templates
      WHERE quote_templates.id = template_line_items.template_id
        AND quote_templates.business_id = get_my_business_id()
    )
  );

CREATE POLICY "template_items_update"
  ON template_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quote_templates
      WHERE quote_templates.id = template_line_items.template_id
        AND quote_templates.business_id = get_my_business_id()
    )
  );

CREATE POLICY "template_items_delete"
  ON template_line_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quote_templates
      WHERE quote_templates.id = template_line_items.template_id
        AND quote_templates.business_id = get_my_business_id()
    )
  );
```

### 6.3 TypeScript Types

```typescript
// Add to types/database.ts

// ---- Enums ----
catalog_category:
  | "hvac_equipment" | "hvac_labor" | "hvac_materials"
  | "plumbing_fixtures" | "plumbing_labor" | "plumbing_materials"
  | "electrical_equipment" | "electrical_labor" | "electrical_materials"
  | "permits_fees" | "disposal"
  | "general_labor" | "general_materials"
  | "custom";

// ---- quote_templates ----
quote_templates: {
  Row: {
    id: string;
    business_id: string;
    title: string;
    description: string | null;
    industry: Database["public"]["Enums"]["industry_type"];
    category: Database["public"]["Enums"]["catalog_category"];
    is_published: boolean;
    use_count: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    business_id: string;
    title: string;
    description?: string | null;
    industry?: Database["public"]["Enums"]["industry_type"];
    category?: Database["public"]["Enums"]["catalog_category"];
    is_published?: boolean;
    use_count?: number;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    business_id?: string;
    title?: string;
    description?: string | null;
    industry?: Database["public"]["Enums"]["industry_type"];
    category?: Database["public"]["Enums"]["catalog_category"];
    is_published?: boolean;
    use_count?: number;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
  };
};

// ---- template_line_items ----
template_line_items: {
  Row: {
    id: string;
    template_id: string;
    catalog_item_id: string | null;
    title: string;
    description: string | null;
    quantity: number;
    unit: string;
    unit_price_cents: number;
    item_type: Database["public"]["Enums"]["line_item_type"];
    sort_order: number;
    is_optional: boolean;
    created_at: string;
  };
  Insert: {
    id?: string;
    template_id: string;
    catalog_item_id?: string | null;
    title: string;
    description?: string | null;
    quantity?: number;
    unit?: string;
    unit_price_cents?: number;
    item_type?: Database["public"]["Enums"]["line_item_type"];
    sort_order?: number;
    is_optional?: boolean;
    created_at?: string;
  };
  Update: {
    id?: string;
    template_id?: string;
    catalog_item_id?: string | null;
    title?: string;
    description?: string | null;
    quantity?: number;
    unit?: string;
    unit_price_cents?: number;
    item_type?: Database["public"]["Enums"]["line_item_type"];
    sort_order?: number;
    is_optional?: boolean;
    created_at?: string;
  };
};
```

### 6.4 Pre-Built Industry Templates

These templates ship with the system and are copied to a business when they first select their industry.

```typescript
// lib/templates/industry-defaults.ts

export type DefaultTemplateItem = {
  title: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  itemType: "service" | "material" | "labor" | "other";
  isOptional: boolean;
};

export type DefaultTemplate = {
  title: string;
  description: string;
  industry: "hvac" | "plumbing" | "electrical" | "general";
  items: DefaultTemplateItem[];
};

export const INDUSTRY_TEMPLATES: DefaultTemplate[] = [
  // ---- HVAC Templates ----
  {
    title: "AC Replacement (3-Ton Residential)",
    description:
      "Standard residential 3-ton air conditioning unit replacement including removal of old unit, new installation, refrigerant charge, and thermostat wiring.",
    industry: "hvac",
    items: [
      {
        title: "3-Ton AC Condenser Unit",
        description: "Carrier/Trane/Lennox 3-ton 16 SEER2 condenser. Price varies by brand.",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 350000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "Evaporator Coil",
        description: "Matching 3-ton A-coil or N-coil for indoor unit",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 85000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "Refrigerant Line Set",
        description: "3/8\" x 3/4\" copper line set, 25ft standard length",
        quantity: 1,
        unit: "set",
        unitPriceCents: 25000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "R-410A Refrigerant Charge",
        description: "Initial charge for new system (approx 6-8 lbs)",
        quantity: 8,
        unit: "lb",
        unitPriceCents: 5000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "Installation Labor",
        description: "2-person crew, full day (removal of old unit, mounting, brazing, evacuation, startup)",
        quantity: 8,
        unit: "hr",
        unitPriceCents: 12500,
        itemType: "labor",
        isOptional: false,
      },
      {
        title: "Old Unit Disposal",
        description: "Proper disposal of old condenser and refrigerant recovery (EPA-certified)",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 15000,
        itemType: "other",
        isOptional: false,
      },
      {
        title: "Permit Fee",
        description: "City/county HVAC mechanical permit",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 20000,
        itemType: "other",
        isOptional: false,
      },
      {
        title: "Smart Thermostat Upgrade",
        description: "Ecobee or Honeywell T6 Pro smart thermostat installation",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 35000,
        itemType: "material",
        isOptional: true,
      },
    ],
  },

  // ---- Plumbing Templates ----
  {
    title: "Tankless Water Heater Conversion",
    description:
      "Convert from traditional 40/50 gallon tank water heater to tankless on-demand unit. Includes gas line upgrade if needed.",
    industry: "plumbing",
    items: [
      {
        title: "Tankless Water Heater Unit",
        description: "Rinnai/Navien/Rheem tankless unit, 199,000 BTU, indoor or outdoor mount",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 180000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "Gas Line Upgrade",
        description: "Upgrade from 1/2\" to 3/4\" gas line for increased BTU demand (up to 30ft)",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 45000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "Stainless Steel Venting",
        description: "Category III stainless steel vent pipe, concentric termination kit",
        quantity: 1,
        unit: "set",
        unitPriceCents: 35000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "Water Line Connections",
        description: "3/4\" copper connections, isolation valves, expansion tank if required",
        quantity: 1,
        unit: "set",
        unitPriceCents: 15000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "Installation Labor",
        description: "Licensed plumber, full day. Disconnect old tank, mount unit, run gas/water/vent",
        quantity: 6,
        unit: "hr",
        unitPriceCents: 13000,
        itemType: "labor",
        isOptional: false,
      },
      {
        title: "Old Tank Removal & Disposal",
        description: "Drain, disconnect, and haul away old water heater",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 12000,
        itemType: "other",
        isOptional: false,
      },
      {
        title: "Plumbing Permit",
        description: "City plumbing permit for water heater replacement",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 15000,
        itemType: "other",
        isOptional: false,
      },
      {
        title: "Recirculation Pump",
        description: "Hot water recirculation pump for instant hot water at fixtures",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 45000,
        itemType: "material",
        isOptional: true,
      },
    ],
  },

  // ---- Electrical Templates ----
  {
    title: "200A Electrical Panel Upgrade",
    description:
      "Upgrade from 100A or 150A main panel to 200A for modern electrical demands. Includes new breakers, grounding, and inspection.",
    industry: "electrical",
    items: [
      {
        title: "200A Main Panel",
        description: "Square D Homeline or QO 200A 40-space 80-circuit indoor panel",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 45000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "200A Main Breaker",
        description: "200A main breaker with integrated disconnect",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 12000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "Circuit Breakers (transfer)",
        description: "New breakers to replace old ones transferred from existing panel (estimated 20 circuits)",
        quantity: 20,
        unit: "ea",
        unitPriceCents: 1500,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "Grounding & Bonding",
        description: "Ground rods (2), #4 copper ground wire, water pipe bond, intersystem bonding bridge",
        quantity: 1,
        unit: "set",
        unitPriceCents: 25000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "Meter Socket Upgrade",
        description: "New 200A meter socket if existing is undersized (utility coordination required)",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 35000,
        itemType: "material",
        isOptional: false,
      },
      {
        title: "Installation Labor",
        description: "Licensed electrician, 1.5 days. De-energize, transfer circuits, install new panel, test",
        quantity: 12,
        unit: "hr",
        unitPriceCents: 12000,
        itemType: "labor",
        isOptional: false,
      },
      {
        title: "Electrical Permit & Inspection",
        description: "City/county electrical permit with rough and final inspection",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 25000,
        itemType: "other",
        isOptional: false,
      },
      {
        title: "EV Charger Circuit (50A)",
        description: "Run dedicated 50A 240V circuit for Level 2 EV charger (up to 50ft from panel)",
        quantity: 1,
        unit: "ea",
        unitPriceCents: 85000,
        itemType: "service",
        isOptional: true,
      },
    ],
  },
];
```

### 6.5 CSV Import Parser

```typescript
// lib/catalog/csv-import.ts

import { z } from "zod";

const csvRowSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  category: z.string().optional().default("custom"),
  unit: z.string().optional().default("ea"),
  unit_price: z.string().transform((v) => {
    // Accept "$125.00", "125.00", "125", "12500" (cents)
    const cleaned = v.replace(/[$,]/g, "").trim();
    const num = parseFloat(cleaned);
    if (isNaN(num)) throw new Error(`Invalid price: ${v}`);
    // If price looks like dollars (has decimal or < 1000), convert to cents
    return num < 1000 && cleaned.includes(".") ? Math.round(num * 100) : Math.round(num);
  }),
  item_type: z
    .enum(["service", "material", "labor", "other"])
    .optional()
    .default("service"),
  sku: z.string().optional(),
  tags: z.string().optional().transform((v) =>
    v ? v.split(";").map((t) => t.trim()).filter(Boolean) : [],
  ),
});

export type CsvImportResult = {
  success: number;
  errors: Array<{ row: number; message: string }>;
  items: Array<z.infer<typeof csvRowSchema>>;
};

export function parseCatalogCsv(csvText: string): CsvImportResult {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return { success: 0, errors: [{ row: 0, message: "CSV must have a header and at least one data row" }], items: [] };
  }

  // Parse header (case-insensitive, trim whitespace)
  const headerLine = lines[0]!;
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const requiredHeaders = ["title"];

  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      return { success: 0, errors: [{ row: 0, message: `Missing required header: ${required}` }], items: [] };
    }
  }

  const result: CsvImportResult = { success: 0, errors: [], items: [] };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue; // skip empty lines

    const values = parseCSVLine(line);
    const rowObj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (header) {
        rowObj[header] = values[j]?.trim() ?? "";
      }
    }

    const parsed = csvRowSchema.safeParse(rowObj);
    if (parsed.success) {
      result.items.push(parsed.data);
      result.success++;
    } else {
      const messages = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
      result.errors.push({ row: i + 1, message: messages.join("; ") });
    }
  }

  return result;
}

/**
 * Parse a single CSV line handling quoted fields with commas.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
```

### 6.6 Server Actions for Catalog & Templates

```typescript
// lib/actions/catalog.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { parseCatalogCsv } from "@/lib/catalog/csv-import";

export type CatalogActionState = {
  error?: string;
  success?: boolean;
  data?: { imported?: number; errors?: Array<{ row: number; message: string }> };
};

export async function createCatalogItem(
  _prevState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "settings:write");
  } catch {
    return { error: "You do not have permission to manage the catalog" };
  }

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const category = (formData.get("category") as string) || "General";
  const unit = (formData.get("unit") as string) || "ea";
  const unitPriceCents = parseInt(formData.get("unit_price_cents") as string, 10);
  const itemType = (formData.get("item_type") as string) || "service";

  if (!title) return { error: "Title is required" };
  if (isNaN(unitPriceCents) || unitPriceCents < 0) {
    return { error: "Invalid price" };
  }

  const { error } = await supabase.from("pricing_catalog").insert({
    business_id: profile.business_id,
    title,
    description,
    category,
    unit,
    unit_price_cents: unitPriceCents,
    item_type: itemType as "service" | "material" | "labor" | "other",
    is_active: true,
  });

  if (error) return { error: "Failed to create catalog item" };

  revalidatePath("/app/settings/catalog");
  return { success: true };
}

export async function importCatalog(
  _prevState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "settings:write");
  } catch {
    return { error: "You do not have permission to import catalog data" };
  }

  const csvFile = formData.get("csv_file") as File | null;
  if (!csvFile || csvFile.size === 0) return { error: "Please upload a CSV file" };

  if (csvFile.size > 1024 * 1024) return { error: "CSV file must be under 1 MB" };

  const csvText = await csvFile.text();
  const result = parseCatalogCsv(csvText);

  if (result.items.length === 0) {
    return {
      error: "No valid items found in CSV",
      data: { imported: 0, errors: result.errors },
    };
  }

  // Batch insert valid items
  const rows = result.items.map((item) => ({
    business_id: profile.business_id!,
    title: item.title,
    description: item.description || null,
    category: item.category,
    unit: item.unit,
    unit_price_cents: item.unit_price,
    item_type: item.item_type as "service" | "material" | "labor" | "other",
    is_active: true,
    sku: item.sku || null,
    tags: item.tags,
  }));

  const { error } = await supabase.from("pricing_catalog").insert(rows);

  if (error) return { error: "Failed to import catalog items" };

  revalidatePath("/app/settings/catalog");
  return {
    success: true,
    data: { imported: result.success, errors: result.errors },
  };
}

export async function createTemplate(
  _prevState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "settings:write");
  } catch {
    return { error: "You do not have permission to create templates" };
  }

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const industry = (formData.get("industry") as string) || "general";
  const lineItemsJson = formData.get("line_items") as string;

  if (!title) return { error: "Template title is required" };

  let lineItems: Array<{
    title: string;
    description?: string;
    quantity: number;
    unit: string;
    unit_price_cents: number;
    item_type: string;
    is_optional: boolean;
    catalog_item_id?: string;
  }>;

  try {
    lineItems = JSON.parse(lineItemsJson);
  } catch {
    return { error: "Invalid line items data" };
  }

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return { error: "Template must have at least one line item" };
  }

  // Insert template
  const { data: template, error: templateError } = await supabase
    .from("quote_templates")
    .insert({
      business_id: profile.business_id,
      title,
      description,
      industry: industry as "hvac" | "plumbing" | "electrical" | "general",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (templateError || !template) return { error: "Failed to create template" };

  // Insert line items
  const itemRows = lineItems.map((item, index) => ({
    template_id: template.id,
    catalog_item_id: item.catalog_item_id ?? null,
    title: item.title,
    description: item.description ?? null,
    quantity: item.quantity,
    unit: item.unit,
    unit_price_cents: item.unit_price_cents,
    item_type: (item.item_type as "service" | "material" | "labor" | "other") ?? "service",
    sort_order: index,
    is_optional: item.is_optional ?? false,
  }));

  const { error: itemsError } = await supabase
    .from("template_line_items")
    .insert(itemRows);

  if (itemsError) {
    // Rollback: delete the template if items fail
    await supabase.from("quote_templates").delete().eq("id", template.id);
    return { error: "Failed to create template line items" };
  }

  revalidatePath("/app/settings/catalog");
  return { success: true };
}
```

### 6.7 Template Picker Component

```typescript
// components/quotes/template-picker.tsx
"use client";

import { useState } from "react";
import { FileText, ChevronRight, Tag } from "lucide-react";

type TemplateItem = {
  title: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  itemType: string;
  isOptional: boolean;
};

type Template = {
  id: string;
  title: string;
  description: string | null;
  industry: string;
  useCount: number;
  items: TemplateItem[];
};

type TemplatePickerProps = {
  templates: Template[];
  onSelect: (items: TemplateItem[]) => void;
  onCancel: () => void;
};

export function TemplatePicker({
  templates,
  onSelect,
  onCancel,
}: TemplatePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = templates.find((t) => t.id === selectedId);

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <h3 className="mb-4 text-lg font-semibold">Choose a Template</h3>

      {!selected ? (
        <div className="space-y-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedId(template.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-[hsl(var(--border))] p-3 text-left transition-colors hover:bg-[hsl(var(--accent))]"
            >
              <FileText className="h-5 w-5 shrink-0 text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{template.title}</p>
                <p className="truncate text-sm text-[hsl(var(--muted-foreground))]">
                  {template.items.length} items &middot; Used {template.useCount}x
                </p>
              </div>
              <Tag className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          ))}
          <button
            onClick={onCancel}
            className="mt-2 w-full rounded-md border px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <h4 className="mb-1 font-medium">{selected.title}</h4>
          {selected.description && (
            <p className="mb-3 text-sm text-[hsl(var(--muted-foreground))]">
              {selected.description}
            </p>
          )}

          <div className="mb-4 space-y-1">
            {selected.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span className={item.isOptional ? "text-[hsl(var(--muted-foreground))]" : ""}>
                  {item.isOptional && "(Optional) "}
                  {item.title}
                </span>
                <span className="font-medium">
                  ${(item.unitPriceCents / 100).toFixed(2)} / {item.unit}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onSelect(selected.items)}
              className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Use Template
            </button>
            <button
              onClick={() => setSelectedId(null)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 6.8 AI Integration: Suggest Catalog Items from Photos

When Claude Vision generates line items, the system cross-references them against the business's pricing catalog to use the business's own pricing instead of generic market rates:

```typescript
// lib/ai/catalog-matcher.ts

type CatalogItem = {
  id: string;
  title: string;
  description: string | null;
  unitPriceCents: number;
  unit: string;
  category: string;
  tags: string[];
};

type AILineItem = {
  title: string;
  description: string;
  unitPriceCents: number;
  unit: string;
  confidence: number;
};

type MatchedItem = AILineItem & {
  catalogItemId: string | null;
  catalogPrice: number | null;
  priceSource: "catalog" | "ai";
};

/**
 * Match AI-generated line items against the business's service catalog.
 * Uses simple keyword matching — not ML-based — for speed and predictability.
 *
 * Strategy:
 * 1. Tokenize AI item title + description into keywords
 * 2. Score each catalog item by keyword overlap
 * 3. If best match score >= threshold, use catalog pricing
 * 4. Otherwise keep AI-suggested pricing
 */
export function matchCatalogItems(
  aiItems: AILineItem[],
  catalog: CatalogItem[],
): MatchedItem[] {
  const MATCH_THRESHOLD = 0.4; // 40% keyword overlap required

  return aiItems.map((aiItem) => {
    const aiTokens = tokenize(`${aiItem.title} ${aiItem.description}`);

    let bestMatch: CatalogItem | null = null;
    let bestScore = 0;

    for (const catalogItem of catalog) {
      const catalogTokens = tokenize(
        `${catalogItem.title} ${catalogItem.description ?? ""} ${catalogItem.tags.join(" ")}`,
      );

      const intersection = aiTokens.filter((t) => catalogTokens.includes(t));
      const score =
        (2 * intersection.length) / (aiTokens.length + catalogTokens.length);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = catalogItem;
      }
    }

    if (bestMatch && bestScore >= MATCH_THRESHOLD) {
      return {
        ...aiItem,
        catalogItemId: bestMatch.id,
        catalogPrice: bestMatch.unitPriceCents,
        unitPriceCents: bestMatch.unitPriceCents, // Use catalog price
        unit: bestMatch.unit,
        priceSource: "catalog" as const,
      };
    }

    return {
      ...aiItem,
      catalogItemId: null,
      catalogPrice: null,
      priceSource: "ai" as const,
    };
  });
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2) // skip short words
    .filter((t) => !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "this", "that", "will", "has",
  "have", "are", "was", "were", "been", "being", "each", "per", "all",
  "new", "old", "standard", "includes", "including", "based",
]);
```

---

## 7. Data Ownership & Export (GDPR/CCPA)

### 7.1 Data Ownership Model

QuoteFlow enforces a strict data ownership model:

| Principle | Implementation |
|-----------|---------------|
| Businesses own 100% of their data | All tables have `business_id` FK; RLS policies scope every query |
| QuoteFlow cannot read business data | RLS is enforced even for `service_role` operations; the only exceptions are aggregate analytics (count-only, no PII) |
| No data is shared between businesses | `get_my_business_id()` helper used in every RLS policy |
| Customer data belongs to the business | Customer PII is never used for QuoteFlow marketing or analytics |
| Photos and audio stay in business scope | Supabase Storage policies restrict access to `business_id` path prefix |

### 7.2 Audit Log Schema

#### Migration: `0011_audit_log.sql`

```sql
-- Migration: 0011_audit_log.sql
-- Purpose: Track data access and modifications for compliance

CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email   TEXT,  -- denormalized for when actor is deleted
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,  -- 'quote', 'customer', 'business', 'team_member', etc.
  resource_id   TEXT,           -- UUID of affected resource
  metadata      JSONB DEFAULT '{}',
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partition-friendly index: recent logs first
CREATE INDEX IF NOT EXISTS idx_audit_log_business_time
  ON audit_log (business_id, created_at DESC);

-- Search by action type
CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON audit_log (business_id, action, created_at DESC);

-- Search by resource
CREATE INDEX IF NOT EXISTS idx_audit_log_resource
  ON audit_log (business_id, resource_type, resource_id);

-- Auto-expire old logs (90 days default, configurable per business)
-- Implemented via pg_cron or application-level cleanup

-- RLS: only owners can view audit logs
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select"
  ON audit_log FOR SELECT
  USING (
    business_id = get_my_business_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'owner'
    )
  );

-- Insert: any authenticated user in the business (logged automatically)
CREATE POLICY "audit_log_insert"
  ON audit_log FOR INSERT
  WITH CHECK (business_id = get_my_business_id());
```

### 7.3 Audit Logging Helper

```typescript
// lib/audit/log.ts
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

type AuditAction =
  | "data_export"
  | "data_delete"
  | "quote_viewed"
  | "quote_sent"
  | "quote_accepted"
  | "quote_declined"
  | "customer_created"
  | "customer_updated"
  | "customer_deleted"
  | "team_member_invited"
  | "team_member_removed"
  | "team_member_role_changed"
  | "settings_updated"
  | "branding_updated"
  | "login"
  | "logout";

export async function logAuditEvent(params: {
  businessId: string;
  actorId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = headerStore.get("user-agent") ?? null;

    // Fetch actor email for denormalization
    const { data: actor } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", params.actorId)
      .single();

    await supabase.from("audit_log").insert({
      business_id: params.businessId,
      actor_id: params.actorId,
      actor_email: actor
        ? `${actor.first_name ?? ""} ${actor.last_name ?? ""}`.trim()
        : null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      metadata: params.metadata ?? {},
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch {
    // Audit logging should never block the main operation
    // eslint-disable-next-line no-console
    console.error("Failed to write audit log");
  }
}
```

### 7.4 Data Export Implementation

```typescript
// lib/actions/data-export.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit/log";

export type ExportDataState = {
  error?: string;
  success?: boolean;
  data?: {
    downloadUrl?: string;
    format?: string;
  };
};

/**
 * Export all business data as JSON.
 * GDPR Article 20: Right to data portability.
 */
export async function exportAllData(
  _prevState: ExportDataState,
  formData: FormData,
): Promise<ExportDataState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "data:export");
  } catch {
    return { error: "Only business owners can export data" };
  }

  const format = (formData.get("format") as string) ?? "json";
  const businessId = profile.business_id;

  // Fetch all business data in parallel
  const [
    businessResult,
    customersResult,
    quotesResult,
    lineItemsResult,
    photosResult,
    activitiesResult,
    catalogResult,
    templatesResult,
    teamResult,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single(),
    supabase
      .from("customers")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at"),
    supabase
      .from("quotes")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at"),
    supabase
      .from("quote_line_items")
      .select("*, quotes!inner(business_id)")
      .eq("quotes.business_id", businessId),
    supabase
      .from("quote_photos")
      .select("*, quotes!inner(business_id)")
      .eq("quotes.business_id", businessId),
    supabase
      .from("quote_activities")
      .select("*, quotes!inner(business_id)")
      .eq("quotes.business_id", businessId),
    supabase
      .from("pricing_catalog")
      .select("*")
      .eq("business_id", businessId),
    supabase
      .from("quote_templates")
      .select("*, template_line_items(*)")
      .eq("business_id", businessId),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, created_at")
      .eq("business_id", businessId),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    format_version: "1.0",
    business: businessResult.data,
    team_members: teamResult.data ?? [],
    customers: customersResult.data ?? [],
    quotes: quotesResult.data ?? [],
    quote_line_items: lineItemsResult.data ?? [],
    quote_photos: photosResult.data ?? [],
    quote_activities: activitiesResult.data ?? [],
    pricing_catalog: catalogResult.data ?? [],
    quote_templates: templatesResult.data ?? [],
  };

  if (format === "csv") {
    // For CSV, we export quotes and customers as separate CSV strings
    const csvData = {
      customers_csv: toCsv(exportData.customers),
      quotes_csv: toCsv(exportData.quotes),
    };

    // Upload CSV bundle to temporary storage
    const csvBundle = JSON.stringify(csvData);
    const path = `exports/${businessId}/${Date.now()}_export.json`;

    const { error: uploadError } = await supabase.storage
      .from("business-exports")
      .upload(path, csvBundle, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) return { error: "Failed to generate export file" };

    const { data: signedUrl } = await supabase.storage
      .from("business-exports")
      .createSignedUrl(path, 3600); // 1-hour expiry

    await logAuditEvent({
      businessId,
      actorId: user.id,
      action: "data_export",
      resourceType: "business",
      resourceId: businessId,
      metadata: { format: "csv" },
    });

    return {
      success: true,
      data: { downloadUrl: signedUrl?.signedUrl, format: "csv" },
    };
  }

  // JSON export (default)
  const jsonString = JSON.stringify(exportData, null, 2);
  const path = `exports/${businessId}/${Date.now()}_full_export.json`;

  const { error: uploadError } = await supabase.storage
    .from("business-exports")
    .upload(path, jsonString, {
      contentType: "application/json",
      upsert: true,
    });

  if (uploadError) return { error: "Failed to generate export file" };

  const { data: signedUrl } = await supabase.storage
    .from("business-exports")
    .createSignedUrl(path, 3600);

  await logAuditEvent({
    businessId,
    actorId: user.id,
    action: "data_export",
    resourceType: "business",
    resourceId: businessId,
    metadata: { format: "json", tables: Object.keys(exportData).length },
  });

  return {
    success: true,
    data: { downloadUrl: signedUrl?.signedUrl, format: "json" },
  };
}

/**
 * Convert an array of objects to CSV string.
 */
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]!);
  const csvLines = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      // Escape CSV: wrap in quotes if contains comma, newline, or quote
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvLines.push(values.join(","));
  }

  return csvLines.join("\n");
}
```

### 7.5 Data Deletion (Right to Erasure)

```typescript
// lib/actions/data-delete.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";

export type DeleteDataState = {
  error?: string;
  success?: boolean;
  confirmationRequired?: boolean;
};

/**
 * Delete all business data. GDPR Article 17: Right to erasure.
 *
 * Requires double confirmation:
 * 1. First call returns confirmationRequired: true
 * 2. Second call with confirmation_code="DELETE-{business_slug}" performs deletion
 *
 * Cascading delete order (respects foreign keys):
 * 1. template_line_items (via quote_templates CASCADE)
 * 2. quote_templates
 * 3. quote_activities (via quotes CASCADE)
 * 4. quote_line_items (via quotes CASCADE)
 * 5. quote_photos (via quotes CASCADE)
 * 6. quotes
 * 7. customers
 * 8. pricing_catalog
 * 9. team_invitations
 * 10. audit_log
 * 11. profiles (unlink from business, don't delete auth users)
 * 12. businesses
 * 13. Storage: quote-photos, quote-audio, business-logos buckets
 */
export async function deleteAllData(
  _prevState: DeleteDataState,
  formData: FormData,
): Promise<DeleteDataState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No business found" };

  try {
    requirePermission(profile.role, "data:export"); // Only owners
  } catch {
    return { error: "Only business owners can delete data" };
  }

  const confirmationCode = formData.get("confirmation_code") as string;

  // Fetch business slug for confirmation
  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", profile.business_id)
    .single();

  if (!business) return { error: "Business not found" };

  const expectedCode = `DELETE-${business.slug}`;

  if (!confirmationCode) {
    return {
      confirmationRequired: true,
      error: `To permanently delete all data, type "${expectedCode}" to confirm.`,
    };
  }

  if (confirmationCode !== expectedCode) {
    return { error: `Confirmation code does not match. Expected: "${expectedCode}"` };
  }

  const businessId = profile.business_id;

  // Step 1: Delete storage files
  const buckets = ["quote-photos", "quote-audio", "business-logos"];
  for (const bucket of buckets) {
    const { data: files } = await supabase.storage
      .from(bucket)
      .list(businessId, { limit: 1000 });

    if (files && files.length > 0) {
      const paths = files.map((f) => `${businessId}/${f.name}`);
      await supabase.storage.from(bucket).remove(paths);
    }
  }

  // Step 2: Unlink all team members (don't delete their auth accounts)
  await supabase
    .from("profiles")
    .update({ business_id: null, role: "viewer" })
    .eq("business_id", businessId)
    .neq("id", user.id); // Handle current user last

  // Step 3: Delete business (cascades to all related tables)
  const { error: deleteError } = await supabase
    .from("businesses")
    .delete()
    .eq("id", businessId);

  if (deleteError) {
    return { error: "Failed to delete business data. Please contact support." };
  }

  // Step 4: Unlink current user
  await supabase
    .from("profiles")
    .update({ business_id: null, role: "viewer" })
    .eq("id", user.id);

  return { success: true };
}
```

### 7.6 Data Retention Policy

```sql
-- Add to migration: 0011_audit_log.sql

-- Add retention config to businesses table
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 90
    CHECK (data_retention_days >= 30 AND data_retention_days <= 3650);

COMMENT ON COLUMN businesses.data_retention_days IS
  'Auto-expire declined/expired quotes after this many days. Min 30, max 3650 (10 years).';

-- Function to clean up expired data (run via pg_cron daily)
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
  biz RECORD;
BEGIN
  FOR biz IN
    SELECT id, data_retention_days
    FROM businesses
    WHERE data_retention_days IS NOT NULL
  LOOP
    -- Delete declined/expired quotes beyond retention period
    WITH deleted AS (
      DELETE FROM quotes
      WHERE business_id = biz.id
        AND status IN ('declined', 'expired')
        AND updated_at < now() - (biz.data_retention_days || ' days')::INTERVAL
      RETURNING id
    )
    SELECT count(*) INTO deleted_count FROM deleted;
  END LOOP;

  -- Clean up old audit logs (always 365 days max)
  DELETE FROM audit_log
  WHERE created_at < now() - INTERVAL '365 days';

  -- Clean up expired invitations
  DELETE FROM team_invitations
  WHERE status = 'expired'
    AND expires_at < now() - INTERVAL '30 days';

  UPDATE team_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();

  RETURN deleted_count;
END;
$$;
```

### 7.7 Data & Privacy Settings UI

```typescript
// app/app/settings/privacy/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DataPrivacyView } from "@/components/settings/data-privacy-view";

export default async function PrivacySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect("/app/settings");

  // Fetch data stats for the overview
  const [quotesCount, customersCount, photosCount] = await Promise.all([
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("business_id", profile.business_id),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", profile.business_id),
    supabase
      .from("quote_photos")
      .select("id, quotes!inner(business_id)", { count: "exact", head: true })
      .eq("quotes.business_id", profile.business_id),
  ]);

  const { data: business } = await supabase
    .from("businesses")
    .select("slug, data_retention_days")
    .eq("id", profile.business_id)
    .single();

  return (
    <DataPrivacyView
      isOwner={profile.role === "owner"}
      businessSlug={business?.slug ?? ""}
      retentionDays={business?.data_retention_days ?? 90}
      stats={{
        quotes: quotesCount.count ?? 0,
        customers: customersCount.count ?? 0,
        photos: photosCount.count ?? 0,
      }}
    />
  );
}
```

### 7.8 GDPR/CCPA Compliance Summary

| Requirement | GDPR Article | Implementation |
|------------|-------------|---------------|
| Right to access | Art. 15 | `exportAllData()` — JSON/CSV export of all business data |
| Right to rectification | Art. 16 | Standard edit UI for quotes, customers, profile |
| Right to erasure | Art. 17 | `deleteAllData()` — cascading delete with confirmation |
| Right to portability | Art. 20 | Machine-readable JSON export with `format_version` |
| Data minimization | Art. 5(1)(c) | Only collect necessary fields; no analytics PII |
| Storage limitation | Art. 5(1)(e) | `data_retention_days` config; `cleanup_expired_data()` cron |
| Consent | Art. 7 | Terms accepted at signup; no implicit consent |
| Breach notification | Art. 33 | Audit log tracks all access; alert owner on suspicious activity |

| Requirement | CCPA Section | Implementation |
|------------|-------------|---------------|
| Right to know | 1798.100 | Same as GDPR export |
| Right to delete | 1798.105 | Same as GDPR erasure |
| Right to opt-out of sale | 1798.120 | No data sold — ever. Privacy policy states this explicitly |
| Non-discrimination | 1798.125 | No pricing differences based on privacy choices |

---

## 8. Integrations (Stripe, ServiceTitan, QuickBooks)

### 8.1 Overview

QuoteFlow integrates with three external services:

1. **Stripe** (Phase 1) — Accept payments when a customer accepts a quote
2. **ServiceTitan** (Phase 2) — Sync quotes as jobs for large HVAC/plumbing shops
3. **QuickBooks** (Phase 2) — Push accepted quotes as invoices for accounting

### 8.2 Database Schema

#### Migration: `0012_integrations_and_payments.sql`

```sql
-- Migration: 0012_integrations_and_payments.sql
-- Purpose: Payment tracking and third-party integration credentials

-- ============================================================
-- 1. Payments table (Stripe)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id                UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  amount_cents            INTEGER NOT NULL CHECK (amount_cents > 0),
  currency                TEXT NOT NULL DEFAULT 'usd',
  status                  TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),
  payment_method_type     TEXT,  -- 'card', 'us_bank_account', etc.
  receipt_url             TEXT,
  failure_reason          TEXT,
  refunded_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_quote
  ON payments (quote_id);

CREATE INDEX IF NOT EXISTS idx_payments_business_status
  ON payments (business_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_stripe_session
  ON payments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE TRIGGER set_updated_at_payments
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. Integrations table (OAuth credentials for 3rd parties)
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider                TEXT NOT NULL
    CHECK (provider IN ('stripe', 'servicetitan', 'quickbooks')),
  is_active               BOOLEAN NOT NULL DEFAULT true,
  -- Encrypted credentials (AES-256-GCM)
  access_token_encrypted  BYTEA,
  refresh_token_encrypted BYTEA,
  token_expires_at        TIMESTAMPTZ,
  -- Provider-specific metadata
  external_account_id     TEXT,  -- e.g. Stripe Connect account ID
  metadata                JSONB DEFAULT '{}',
  last_sync_at            TIMESTAMPTZ,
  last_sync_error         TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One integration per provider per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_unique
  ON integrations (business_id, provider);

CREATE TRIGGER set_updated_at_integrations
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3. Stripe fields on businesses table
-- ============================================================
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payments_enabled BOOLEAN DEFAULT false;

-- ============================================================
-- 4. RLS policies
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Payments: business members can view
CREATE POLICY "payments_select"
  ON payments FOR SELECT
  USING (business_id = get_my_business_id());

-- Payments: insert only via server (service role) — no direct client inserts
-- The webhook handler uses service_role to insert payments

-- Integrations: only owners can view/manage
CREATE POLICY "integrations_select"
  ON integrations FOR SELECT
  USING (
    business_id = get_my_business_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'owner'
    )
  );

CREATE POLICY "integrations_insert"
  ON integrations FOR INSERT
  WITH CHECK (
    business_id = get_my_business_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'owner'
    )
  );

CREATE POLICY "integrations_update"
  ON integrations FOR UPDATE
  USING (
    business_id = get_my_business_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'owner'
    )
  );
```

### 8.3 Stripe Payment Flow

#### Sequence Diagram

```
Customer accepts quote (public page)
    │
    ▼
acceptQuote() server action
    │
    ├─ Update quote.status = 'accepted'
    ├─ Check business.payments_enabled
    │
    ├─ If payments enabled:
    │     │
    │     ▼
    │  createPaymentLink() server action
    │     │
    │     ├─ Create Stripe Checkout Session
    │     │   - line_items from quote_line_items
    │     │   - success_url: /public/quotes/{id}?payment=success
    │     │   - cancel_url: /public/quotes/{id}?payment=cancelled
    │     │   - metadata: { quote_id, business_id }
    │     │
    │     ├─ Insert payments row (status: 'pending')
    │     │
    │     └─ Return checkout URL → redirect customer
    │
    ▼
Customer completes Stripe Checkout
    │
    ▼
Stripe fires webhook: checkout.session.completed
    │
    ▼
/api/webhooks/stripe route handler
    │
    ├─ Verify webhook signature
    ├─ Extract payment_intent from session
    ├─ Update payments row (status: 'succeeded')
    ├─ Update quote (add payment metadata to quote_activities)
    └─ Send payment confirmation email to business owner
```

#### Server Action: createPaymentLink

```typescript
// lib/actions/payments.ts
"use server";

import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export type PaymentLinkState = {
  error?: string;
  checkoutUrl?: string;
};

export async function createPaymentLink(
  _prevState: PaymentLinkState,
  formData: FormData,
): Promise<PaymentLinkState> {
  const quoteId = formData.get("quote_id") as string;
  if (!quoteId) return { error: "Quote ID required" };

  const supabase = await createClient();

  // Fetch quote with line items
  const { data: quote } = await supabase
    .from("quotes")
    .select(`
      id, business_id, quote_number, title, total_cents, tax_cents,
      customer_id, customers(email, first_name, last_name),
      quote_line_items(title, quantity, unit_price_cents)
    `)
    .eq("id", quoteId)
    .eq("status", "accepted")
    .single();

  if (!quote) return { error: "Quote not found or not accepted" };

  // Verify business has Stripe enabled
  const { data: business } = await supabase
    .from("businesses")
    .select("stripe_account_id, payments_enabled, name")
    .eq("id", quote.business_id)
    .single();

  if (!business?.payments_enabled || !business.stripe_account_id) {
    return { error: "Payments are not enabled for this business" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://quoteflow.app";

  try {
    // Build line items for Stripe Checkout
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      (quote.quote_line_items ?? []).map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.title,
          },
          unit_amount: item.unit_price_cents,
        },
        quantity: Math.ceil(item.quantity),
      }));

    // Add tax as a separate line item if present
    if (quote.tax_cents && quote.tax_cents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Tax" },
          unit_amount: quote.tax_cents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: lineItems,
        customer_email:
          (quote.customers as { email: string } | null)?.email ?? undefined,
        success_url: `${appUrl}/public/quotes/${quote.id}?payment=success`,
        cancel_url: `${appUrl}/public/quotes/${quote.id}?payment=cancelled`,
        metadata: {
          quote_id: quote.id,
          business_id: quote.business_id,
          quote_number: quote.quote_number ?? "",
        },
        payment_intent_data: {
          metadata: {
            quote_id: quote.id,
            business_id: quote.business_id,
          },
        },
      },
      {
        stripeAccount: business.stripe_account_id,
      },
    );

    // Record pending payment
    await supabase.from("payments").insert({
      quote_id: quote.id,
      business_id: quote.business_id,
      stripe_checkout_session_id: session.id,
      amount_cents: quote.total_cents ?? 0,
      status: "pending",
    });

    return { checkoutUrl: session.url ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return { error: `Payment failed: ${message}` };
  }
}
```

### 8.4 Stripe Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Use service_role for webhook processing (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    // eslint-disable-next-line no-console
    console.error(`Stripe webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const quoteId = session.metadata?.quote_id;

      if (!quoteId) break;

      // Update payment record
      await supabase
        .from("payments")
        .update({
          status: "succeeded",
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
          payment_method_type: session.payment_method_types?.[0] ?? null,
        })
        .eq("stripe_checkout_session_id", session.id);

      // Log activity on quote
      await supabase.from("quote_activities").insert({
        quote_id: quoteId,
        actor_id: null, // system action
        action: "payment_received",
        metadata: {
          amount_cents: session.amount_total,
          payment_intent: session.payment_intent,
        },
      });

      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const quoteId = intent.metadata?.quote_id;

      if (!quoteId) break;

      await supabase
        .from("payments")
        .update({
          status: "failed",
          failure_reason:
            intent.last_payment_error?.message ?? "Payment failed",
        })
        .eq("stripe_payment_intent_id", intent.id);

      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const intentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

      if (!intentId) break;

      await supabase
        .from("payments")
        .update({
          status: "refunded",
          refunded_at: new Date().toISOString(),
        })
        .eq("stripe_payment_intent_id", intentId);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

### 8.5 Encrypted Credentials Storage Pattern

For ServiceTitan and QuickBooks OAuth tokens, we encrypt at rest using AES-256-GCM:

```typescript
// lib/integrations/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16;

/**
 * Encryption key derived from INTEGRATION_ENCRYPTION_KEY env var.
 * In production, use AWS KMS or Vault for key management.
 */
function getKey(): Buffer {
  const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must be 64 hex chars (32 bytes). " +
      "Generate with: openssl rand -hex 32",
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a plaintext string. Returns a Buffer containing:
 * [12-byte IV][16-byte auth tag][ciphertext]
 */
export function encrypt(plaintext: string): Buffer {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Pack: IV + authTag + ciphertext
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt a buffer produced by encrypt().
 */
export function decrypt(packed: Buffer): string {
  const key = getKey();

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
```

### 8.6 ServiceTitan Integration (Phase 2)

```typescript
// lib/integrations/servicetitan.ts
import { encrypt, decrypt } from "./crypto";
import { createClient } from "@/lib/supabase/server";

const ST_API_BASE = "https://api.servicetitan.io";
const ST_AUTH_BASE = "https://auth.servicetitan.io";

type ServiceTitanJob = {
  customerId: number;
  locationId: number;
  businessUnitId: number;
  jobTypeId: number;
  summary: string;
  invoiceItems: Array<{
    skuId?: number;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};

/**
 * Exchange authorization code for access + refresh tokens.
 * Called after OAuth callback from ServiceTitan.
 */
export async function exchangeServiceTitanCode(
  businessId: string,
  code: string,
): Promise<void> {
  const response = await fetch(`${ST_AUTH_BASE}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.SERVICETITAN_CLIENT_ID!,
      client_secret: process.env.SERVICETITAN_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/servicetitan/callback`,
    }),
  });

  if (!response.ok) {
    throw new Error(`ServiceTitan token exchange failed: ${response.status}`);
  }

  const tokens = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const supabase = await createClient();

  await supabase.from("integrations").upsert(
    {
      business_id: businessId,
      provider: "servicetitan",
      access_token_encrypted: encrypt(tokens.access_token),
      refresh_token_encrypted: encrypt(tokens.refresh_token),
      token_expires_at: new Date(
        Date.now() + tokens.expires_in * 1000,
      ).toISOString(),
      is_active: true,
    },
    { onConflict: "business_id,provider" },
  );
}

/**
 * Push a QuoteFlow quote to ServiceTitan as a new job.
 */
export async function syncToServiceTitan(
  businessId: string,
  quoteId: string,
): Promise<{ jobId: number }> {
  const supabase = await createClient();

  // Get integration credentials
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("business_id", businessId)
    .eq("provider", "servicetitan")
    .eq("is_active", true)
    .single();

  if (!integration) {
    throw new Error("ServiceTitan integration not configured");
  }

  let accessToken = decrypt(Buffer.from(integration.access_token_encrypted));

  // Check if token is expired and refresh
  if (
    integration.token_expires_at &&
    new Date(integration.token_expires_at) < new Date()
  ) {
    accessToken = await refreshServiceTitanToken(
      businessId,
      decrypt(Buffer.from(integration.refresh_token_encrypted)),
    );
  }

  // Fetch quote data
  const { data: quote } = await supabase
    .from("quotes")
    .select(`
      *, customers(*),
      quote_line_items(*)
    `)
    .eq("id", quoteId)
    .single();

  if (!quote) throw new Error("Quote not found");

  const tenantId = (integration.metadata as { tenant_id?: string })?.tenant_id;

  // Create job in ServiceTitan
  const jobResponse = await fetch(
    `${ST_API_BASE}/jpm/v2/tenant/${tenantId}/jobs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "ST-App-Key": process.env.SERVICETITAN_APP_KEY!,
      },
      body: JSON.stringify({
        summary: quote.title ?? `Quote ${quote.quote_number}`,
        jobTypeId: (integration.metadata as { default_job_type_id?: number })
          ?.default_job_type_id,
        invoiceItems: (quote.quote_line_items ?? []).map((item) => ({
          description: item.title,
          quantity: item.quantity,
          unitPrice: item.unit_price_cents / 100,
        })),
      } satisfies Partial<ServiceTitanJob>),
    },
  );

  if (!jobResponse.ok) {
    const errorText = await jobResponse.text();
    throw new Error(`ServiceTitan API error: ${jobResponse.status} ${errorText}`);
  }

  const job = (await jobResponse.json()) as { id: number };

  // Update integration sync status
  await supabase
    .from("integrations")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_error: null,
    })
    .eq("id", integration.id);

  return { jobId: job.id };
}

async function refreshServiceTitanToken(
  businessId: string,
  refreshToken: string,
): Promise<string> {
  const response = await fetch(`${ST_AUTH_BASE}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.SERVICETITAN_CLIENT_ID!,
      client_secret: process.env.SERVICETITAN_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh ServiceTitan token");
  }

  const tokens = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const supabase = await createClient();

  await supabase
    .from("integrations")
    .update({
      access_token_encrypted: encrypt(tokens.access_token),
      refresh_token_encrypted: encrypt(tokens.refresh_token),
      token_expires_at: new Date(
        Date.now() + tokens.expires_in * 1000,
      ).toISOString(),
    })
    .eq("business_id", businessId)
    .eq("provider", "servicetitan");

  return tokens.access_token;
}
```

### 8.7 QuickBooks Integration (Phase 2)

```typescript
// lib/integrations/quickbooks.ts
import { encrypt, decrypt } from "./crypto";
import { createClient } from "@/lib/supabase/server";

const QB_API_BASE = "https://quickbooks.api.intuit.com/v3";
const QB_AUTH_BASE = "https://oauth.platform.intuit.com/oauth2/v1";

/**
 * Push an accepted QuoteFlow quote to QuickBooks as an Invoice.
 */
export async function syncToQuickBooks(
  businessId: string,
  quoteId: string,
): Promise<{ invoiceId: string }> {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("business_id", businessId)
    .eq("provider", "quickbooks")
    .eq("is_active", true)
    .single();

  if (!integration) {
    throw new Error("QuickBooks integration not configured");
  }

  let accessToken = decrypt(Buffer.from(integration.access_token_encrypted));

  // Refresh if expired
  if (
    integration.token_expires_at &&
    new Date(integration.token_expires_at) < new Date()
  ) {
    accessToken = await refreshQuickBooksToken(
      businessId,
      decrypt(Buffer.from(integration.refresh_token_encrypted)),
    );
  }

  const realmId = integration.external_account_id;

  // Fetch quote + customer
  const { data: quote } = await supabase
    .from("quotes")
    .select(`
      *, customers(first_name, last_name, email, company_name),
      quote_line_items(title, description, quantity, unit_price_cents)
    `)
    .eq("id", quoteId)
    .single();

  if (!quote) throw new Error("Quote not found");

  const customer = quote.customers as {
    first_name: string;
    last_name: string;
    email: string | null;
    company_name: string | null;
  } | null;

  // Build QuickBooks Invoice
  const invoice = {
    Line: (quote.quote_line_items ?? []).map((item, index) => ({
      LineNum: index + 1,
      Amount: (item.quantity * item.unit_price_cents) / 100,
      DetailType: "SalesItemLineDetail",
      Description: `${item.title}${item.description ? ` — ${item.description}` : ""}`,
      SalesItemLineDetail: {
        Qty: item.quantity,
        UnitPrice: item.unit_price_cents / 100,
      },
    })),
    CustomerRef: {
      name: customer?.company_name ??
        `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim(),
    },
    CustomerMemo: {
      value: `QuoteFlow Quote #${quote.quote_number}`,
    },
    PrivateNote: `Synced from QuoteFlow quote ${quote.id}`,
  };

  const response = await fetch(
    `${QB_API_BASE}/company/${realmId}/invoice`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(invoice),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    await supabase
      .from("integrations")
      .update({ last_sync_error: errorText })
      .eq("id", integration.id);
    throw new Error(`QuickBooks API error: ${response.status}`);
  }

  const result = (await response.json()) as {
    Invoice: { Id: string; DocNumber: string };
  };

  await supabase
    .from("integrations")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_error: null,
    })
    .eq("id", integration.id);

  // Log activity
  await supabase.from("quote_activities").insert({
    quote_id: quoteId,
    actor_id: null,
    action: "synced_to_quickbooks",
    metadata: {
      invoice_id: result.Invoice.Id,
      doc_number: result.Invoice.DocNumber,
    },
  });

  return { invoiceId: result.Invoice.Id };
}

async function refreshQuickBooksToken(
  businessId: string,
  refreshToken: string,
): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`,
  ).toString("base64");

  const response = await fetch(`${QB_AUTH_BASE}/tokens/bearer`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) throw new Error("Failed to refresh QuickBooks token");

  const tokens = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const supabase = await createClient();

  await supabase
    .from("integrations")
    .update({
      access_token_encrypted: encrypt(tokens.access_token),
      refresh_token_encrypted: encrypt(tokens.refresh_token),
      token_expires_at: new Date(
        Date.now() + tokens.expires_in * 1000,
      ).toISOString(),
    })
    .eq("business_id", businessId)
    .eq("provider", "quickbooks");

  return tokens.access_token;
}
```

### 8.8 Environment Variables for Integrations

```bash
# .env.example additions

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Note: Each connected business has its own stripe_account_id stored in DB

# ServiceTitan (Phase 2)
SERVICETITAN_CLIENT_ID=
SERVICETITAN_CLIENT_SECRET=
SERVICETITAN_APP_KEY=

# QuickBooks (Phase 2)
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=

# Integration token encryption (generate: openssl rand -hex 32)
INTEGRATION_ENCRYPTION_KEY=
```

---

## 9. Complete AI Pipeline (All Industries)

### 9.1 Overview

The AI pipeline combines two models:
1. **AssemblyAI** — Transcribes voice notes to extract job context (address, customer notes, observations)
2. **Claude Sonnet 4.5** — Analyzes job site photos via Vision to identify equipment, materials, and conditions, then generates structured line items with pricing

The existing implementation (see `lib/ai/vision.ts` and `lib/ai/prompts/quote-analysis.ts`) supports HVAC, plumbing, electrical, and general industries. This section extends coverage to **roofing** and **landscaping**, adds retry logic with exponential backoff, documents cost optimization strategies, and provides the complete prompt engineering reference.

### 9.2 Industry-Specific System Prompts

Each prompt is structured as:
1. **Role definition** — "You are a [industry] expert with 20+ years experience"
2. **Equipment/material recognition** — Specific brands, models, sizes the AI should identify
3. **Pricing guidance** — Regional market rate ranges for common services
4. **Output format** — Strict JSON schema with Zod validation

#### HVAC System Prompt

```typescript
// lib/ai/prompts/hvac.ts
export const HVAC_SYSTEM_PROMPT = `You are an expert HVAC estimator with 20+ years of residential and commercial experience across the United States.

## Equipment Recognition

When analyzing photos, identify:
- **Condensers**: Brand (Carrier, Trane, Lennox, Goodman, Rheem, Daikin, York, Amana), model number (on data plate), tonnage (1.5-5 ton residential, 5-25 ton commercial), SEER/SEER2 rating, age (from manufacture date on data plate or serial number)
- **Air handlers / Furnaces**: Brand, BTU input, AFUE rating, single/two-stage/variable speed, orientation (upflow, downflow, horizontal)
- **Ductwork**: Material (sheet metal, flex, fiberglass board), condition (tears, disconnections, condensation), insulation quality (R-value visible on flex), sizing adequacy
- **Thermostats**: Brand (Honeywell, Ecobee, Nest, Emerson), model, wiring (2-wire heat only, 5-wire conventional, communicating)
- **Refrigerant lines**: Line set condition, insulation, size (3/8" liquid, 3/4" suction for 3-ton)
- **Mini-splits**: Indoor head count, outdoor condenser capacity, brand/model
- **RTUs (Rooftop Units)**: Tonnage, gas/electric, economizer present, curb adapter type

## Condition Assessment

Rate each piece of equipment:
- **Good**: Clean, recently maintained, < 8 years old, no visible issues
- **Fair**: Some wear, 8-12 years old, minor cosmetic issues, still functional
- **Poor**: Significant wear, > 12 years old, visible damage/rust, likely needs replacement
- **Failed**: Not operational, major damage, safety concern

## Pricing Guidance (2025-2026 US Market)

| Service | Low | Average | High |
|---------|-----|---------|------|
| AC replacement (3-ton) | $4,500 | $6,500 | $9,000 |
| Furnace replacement (80K BTU) | $3,000 | $4,500 | $6,500 |
| Mini-split (single zone) | $3,000 | $4,500 | $6,000 |
| Ductwork replacement (whole home) | $5,000 | $8,000 | $12,000 |
| Refrigerant recharge (R-410A) | $200 | $400 | $700 |
| Coil cleaning | $150 | $250 | $400 |
| Capacitor/contactor replacement | $150 | $250 | $400 |

Labor rate: $100-$150/hr depending on region.

## Output Requirements

1. Analyze ALL photos. Cross-reference with the voice transcript.
2. Generate line items: separate equipment, materials, labor, permits, and disposal.
3. Each item must have a confidence score (0.0-1.0):
   - 0.9-1.0: Visible data plate, clear identification, standard pricing
   - 0.7-0.89: Partially visible, reasonable assumption based on context
   - 0.5-0.69: Educated guess, needs field verification
   - < 0.5: Very uncertain, flag for manual review
4. Include reasoning for each price (e.g., "Carrier 24ACC636 3-ton 16 SEER2 at current distributor pricing")
5. Always include: permits, disposal of old equipment, startup/commissioning
6. Output ONLY valid JSON matching the schema. No markdown, no explanations outside JSON.`;
```

#### Plumbing System Prompt

```typescript
// lib/ai/prompts/plumbing.ts
export const PLUMBING_SYSTEM_PROMPT = `You are an expert plumbing estimator with 20+ years of residential and commercial experience.

## Equipment & Material Recognition

When analyzing photos, identify:
- **Water heaters**: Type (tank/tankless/heat pump/hybrid), brand (Rheem, AO Smith, Bradford White, Rinnai, Navien), capacity (gallons or BTU), fuel (gas/electric/propane), age, condition of anode rod area
- **Pipe materials**: Copper (type M/L/K), PEX (A/B), CPVC, PVC (SCH 40/80), galvanized, cast iron, lead (old service lines). Note any visible corrosion, green patina (copper), or white buildup (galvanized)
- **Fixtures**: Brand (Kohler, Moen, Delta, American Standard, Grohe), type (faucet, toilet, shower valve, garbage disposal), model if visible
- **Drains**: Material, diameter (1.5"-6"), cleanout locations, condition, evidence of backups (water marks, staining)
- **Water lines**: Size (1/2" to 2"), material, pressure (if gauge visible), evidence of leaks (mineral deposits, water stains)
- **Gas lines**: Size (1/2" to 1.5"), material (black iron, CSST/flex), manifold locations
- **Sump pumps**: HP rating, brand, float type, discharge size, backup battery present
- **Water treatment**: Softener (grain capacity), filter type, RO system, UV sterilizer

## Pricing Guidance (2025-2026 US Market)

| Service | Low | Average | High |
|---------|-----|---------|------|
| Tankless water heater install | $3,000 | $4,500 | $6,500 |
| Tank water heater replacement (50 gal) | $1,200 | $1,800 | $2,500 |
| Sewer line replacement (per ft) | $80 | $150 | $250 |
| Drain cleaning (main line) | $200 | $350 | $600 |
| Toilet replacement | $300 | $500 | $800 |
| Faucet replacement | $200 | $350 | $550 |
| Water softener install | $1,500 | $2,500 | $4,000 |
| Gas line installation (per ft) | $20 | $35 | $55 |
| Sump pump replacement | $500 | $800 | $1,200 |

Labor rate: $110-$160/hr depending on region.

## Output Requirements

Same as general requirements. Additionally:
- Flag any visible code violations (S-traps, missing cleanouts, improper venting)
- Note pipe material transitions (galvanized-to-copper requires dielectric union)
- If water heater is > 10 years old, recommend proactive replacement
- Include shutoff valve replacement if old gate valves are visible
- Output ONLY valid JSON matching the schema.`;
```

#### Electrical System Prompt

```typescript
// lib/ai/prompts/electrical.ts
export const ELECTRICAL_SYSTEM_PROMPT = `You are an expert electrical estimator with 20+ years of residential and commercial experience, fully versed in NEC 2023.

## Equipment Recognition

When analyzing photos, identify:
- **Panels**: Brand (Square D, Eaton/Cutler-Hammer, Siemens, GE, Murray), amperage (60A-400A), spaces/circuits, bus material (copper/aluminum), generation (Federal Pacific Stab-Lok and Zinsco are SAFETY HAZARDS — always recommend replacement)
- **Breakers**: Type (standard, GFCI, AFCI, dual-function, tandem), amperage, brand compatibility
- **Wiring**: Gauge (14 AWG-4/0), type (NM-B "Romex", MC cable, THHN in conduit, UF-B, SER), color coding, condition of insulation
- **Outlets/switches**: Type (standard, GFCI, USB, smart), condition, ground presence, box fill
- **EV chargers**: Level (1/2), amperage (20A-80A), hardwired vs plug-in, brand (ChargePoint, Tesla Wall Connector, JuiceBox, Wallbox)
- **Generators**: Type (portable/standby), fuel, kW rating, brand (Generac, Kohler, Briggs), transfer switch type (manual/automatic)
- **Lighting**: Type (recessed, surface, track, landscape), fixture count, dimmer compatibility, LED vs legacy

## Safety Flags (ALWAYS flag these)

- Federal Pacific Stab-Lok panels → immediate replacement recommended
- Zinsco/GTE-Sylvania panels → immediate replacement recommended
- Aluminum branch wiring (1960s-70s) → needs anti-oxidant compound and CO/ALR devices
- Cloth-insulated wiring → deteriorating insulation, rewire recommended
- Double-tapped breakers → code violation
- Missing GFCI protection (kitchen, bath, garage, outdoor, basement)
- Missing AFCI protection (bedrooms per NEC 2023)
- Overfused circuits (30A breaker on 14 AWG wire)

## Pricing Guidance (2025-2026 US Market)

| Service | Low | Average | High |
|---------|-----|---------|------|
| 200A panel upgrade | $2,500 | $4,000 | $6,000 |
| 400A service upgrade | $5,000 | $8,000 | $12,000 |
| EV charger circuit (50A) | $500 | $1,200 | $2,500 |
| Whole-house generator (22kW) | $8,000 | $12,000 | $18,000 |
| GFCI outlet install | $150 | $250 | $400 |
| Recessed light install (per can) | $150 | $250 | $400 |
| Whole-house rewire (1,500 sq ft) | $8,000 | $15,000 | $25,000 |
| Surge protector (whole-house) | $300 | $500 | $800 |

Labor rate: $90-$140/hr depending on region.

## Output Requirements

Same as general requirements. Additionally:
- ALWAYS flag safety hazards (Federal Pacific, Zinsco, aluminum wiring, cloth insulation)
- Include permit and inspection costs (rough + final inspection)
- Separate labor by journeyman vs apprentice rates where appropriate
- Note if utility coordination is needed (meter upgrade, service drop)
- Output ONLY valid JSON matching the schema.`;
```

#### Roofing System Prompt (New)

```typescript
// lib/ai/prompts/roofing.ts
export const ROOFING_SYSTEM_PROMPT = `You are an expert roofing estimator with 20+ years of residential and commercial experience.

## Photo Analysis

When analyzing photos, identify:
- **Roof type**: Asphalt shingle (3-tab, architectural/dimensional, designer), metal (standing seam, corrugated, stone-coated steel), tile (clay, concrete), flat/low-slope (TPO, EPDM, modified bitumen, built-up), slate, wood shake
- **Condition**: Missing/cracked/curling shingles, granule loss, moss/algae growth, flashing condition, valley condition, ridge cap, nail pops, ponding (flat roofs)
- **Damage**: Hail (circular dents in shingles/gutters), wind (lifted/missing shingles), tree damage, ice dam evidence (staining at eaves)
- **Ventilation**: Ridge vent, box vents, soffit vents, turbine vents, powered vents
- **Flashing**: Chimney, pipe boots, wall-to-roof transitions, step flashing, valley flashing
- **Gutters**: Material, size (5"/6"), condition, guards/screens present
- **Decking**: Plywood vs OSB (if visible), condition, sagging

## Square Footage Estimation

- Estimate roof area from aerial/drone photos using visible dimensions
- Account for pitch factor: Roof Area = Footprint × Pitch Factor
  - 4/12 pitch: factor 1.054
  - 6/12 pitch: factor 1.118
  - 8/12 pitch: factor 1.202
  - 10/12 pitch: factor 1.302
  - 12/12 pitch: factor 1.414
- 1 roofing square = 100 sq ft
- Include waste factor: 10% for simple roof, 15% for cut-up roof

## Pricing Guidance (2025-2026 US Market)

| Service | Low | Average | High |
|---------|-----|---------|------|
| Asphalt reshingle (per sq) | $350 | $500 | $750 |
| Metal roof (per sq) | $700 | $1,000 | $1,500 |
| Flat roof TPO (per sq) | $600 | $900 | $1,200 |
| Tear-off (per sq) | $100 | $175 | $250 |
| Decking replacement (per sheet) | $75 | $100 | $150 |
| Ridge vent (per LF) | $8 | $12 | $18 |
| Gutter install (per LF) | $8 | $15 | $25 |
| Chimney flashing | $300 | $500 | $800 |

Labor rate: $60-$100/hr (roofing crews priced per square).

## Output Requirements

Same as general requirements. Additionally:
- Always include tear-off if re-roofing (max 2 layers per code)
- Include ice & water shield at eaves, valleys, and penetrations
- Include drip edge and starter strip
- Note if decking replacement is likely (sagging, visible damage)
- Include dump/disposal fees for old roofing material
- Output ONLY valid JSON matching the schema.`;
```

#### Landscaping System Prompt (New)

```typescript
// lib/ai/prompts/landscaping.ts
export const LANDSCAPING_SYSTEM_PROMPT = `You are an expert landscaping estimator with 20+ years of residential and commercial experience.

## Photo Analysis

When analyzing photos, identify:
- **Lawn**: Grass type if identifiable (Bermuda, Fescue, Bluegrass, Zoysia, St. Augustine), condition (bare spots, weeds, thatch), estimated square footage
- **Trees**: Species if identifiable, height estimate, canopy spread, health (dead branches, disease, leaning), proximity to structures
- **Shrubs & Beds**: Plant types, bed edging material, mulch condition, irrigation visible
- **Hardscape**: Patio material (pavers, concrete, flagstone, stamped), walkways, retaining walls (block, stone, timber), fencing
- **Irrigation**: Sprinkler heads visible (pop-up, rotor, drip), controller brand, zone count, condition
- **Drainage**: French drain, channel drain, dry creek bed, grading issues, standing water
- **Structures**: Pergola, gazebo, fire pit, outdoor kitchen, lighting

## Area Estimation

- Estimate lawn area from photos (overhead or ground-level perspective)
- For irregular shapes: break into rectangles/triangles
- Standard lot assumptions if not visible: front yard ~1,500 sq ft, back yard ~2,500 sq ft for typical suburban home

## Pricing Guidance (2025-2026 US Market)

| Service | Low | Average | High |
|---------|-----|---------|------|
| Lawn mowing (per visit, 5K sq ft) | $35 | $55 | $80 |
| Sod installation (per sq ft) | $1.00 | $1.75 | $2.50 |
| Paver patio (per sq ft) | $12 | $20 | $35 |
| Retaining wall (per face ft) | $25 | $50 | $100 |
| Tree removal (medium, 30-60 ft) | $500 | $1,000 | $2,000 |
| Tree trimming (per tree) | $200 | $400 | $800 |
| French drain (per LF) | $25 | $50 | $80 |
| Irrigation install (per zone) | $500 | $800 | $1,200 |
| Mulch (per cubic yard, installed) | $50 | $75 | $100 |

Labor rate: $40-$75/hr (crew-based, 2-4 workers).

## Output Requirements

Same as general requirements. Additionally:
- Break down plants by species and size (1-gallon, 3-gallon, 5-gallon, 15-gallon)
- Include soil amendment and grading if new planting beds
- Include irrigation adjustments for new plantings
- Note seasonal considerations (best planting time, dormant season work)
- Output ONLY valid JSON matching the schema.`;
```

### 9.3 Combined Voice + Vision Workflow

```typescript
// lib/ai/pipeline.ts

import { analyzePhotosAndTranscript, VisionAnalysisError } from "./vision";
import type { QuoteAnalysisResult } from "./prompts/quote-analysis";
import { matchCatalogItems } from "./catalog-matcher";
import { createClient } from "@/lib/supabase/server";

type PipelineInput = {
  photoUrls: string[];
  transcript: string;
  industry: "hvac" | "plumbing" | "electrical" | "roofing" | "landscaping" | "general";
  businessId: string;
};

type PipelineResult = {
  analysis: QuoteAnalysisResult;
  catalogMatches: number;  // how many items matched catalog
  totalConfidence: number;
  processingTimeMs: number;
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Full AI quote generation pipeline:
 * 1. Resolve photo URLs to public Supabase URLs
 * 2. Call Claude Vision with transcript + photos + industry prompt
 * 3. Retry on transient failures (rate limits, timeouts)
 * 4. Cross-reference results against business service catalog
 * 5. Return enriched results
 */
export async function runQuotePipeline(
  input: PipelineInput,
): Promise<PipelineResult> {
  const startTime = Date.now();

  // Step 1: Resolve Supabase Storage paths to public URLs
  const supabase = await createClient();
  const resolvedUrls = input.photoUrls.map((url) => {
    if (url.startsWith("http")) return url;
    // Supabase Storage path → public URL
    const { data } = supabase.storage
      .from("quote-photos")
      .getPublicUrl(url);
    return data.publicUrl;
  });

  // Step 2: Call Claude Vision with retry logic
  let analysis: QuoteAnalysisResult | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      analysis = await analyzePhotosAndTranscript(
        resolvedUrls,
        input.transcript,
        input.industry,
      );
      break; // Success
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on validation errors (bad input, not transient)
      if (
        err instanceof VisionAnalysisError &&
        (err.code === "VALIDATION_ERROR" || err.code === "NO_INPUT")
      ) {
        throw err;
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (!analysis) {
    throw lastError ?? new Error("AI pipeline failed after retries");
  }

  // Step 3: Cross-reference with business catalog
  const { data: catalogItems } = await supabase
    .from("pricing_catalog")
    .select("id, title, description, unit_price_cents, unit, category, tags")
    .eq("business_id", input.businessId)
    .eq("is_active", true);

  let catalogMatches = 0;

  if (catalogItems && catalogItems.length > 0) {
    const matched = matchCatalogItems(
      analysis.lineItems.map((item) => ({
        title: item.title,
        description: item.description,
        unitPriceCents: item.unitPriceCents,
        unit: item.unit,
        confidence: item.confidence,
      })),
      catalogItems.map((ci) => ({
        id: ci.id,
        title: ci.title,
        description: ci.description,
        unitPriceCents: ci.unit_price_cents,
        unit: ci.unit,
        category: ci.category,
        tags: ci.tags ?? [],
      })),
    );

    // Update line items with catalog pricing where matched
    analysis.lineItems = analysis.lineItems.map((item, i) => {
      const match = matched[i];
      if (match?.priceSource === "catalog") {
        catalogMatches++;
        return {
          ...item,
          unitPriceCents: match.catalogPrice ?? item.unitPriceCents,
          confidence: Math.max(item.confidence, 0.9), // Catalog prices are high confidence
          reasoning: `${item.reasoning} [Price matched from business catalog]`,
        };
      }
      return item;
    });
  }

  // Calculate overall confidence
  const totalConfidence =
    analysis.lineItems.reduce((sum, item) => sum + item.confidence, 0) /
    analysis.lineItems.length;

  return {
    analysis,
    catalogMatches,
    totalConfidence,
    processingTimeMs: Date.now() - startTime,
  };
}
```

### 9.4 Few-Shot Examples

Each industry includes 3-5 few-shot examples embedded in the Claude message. Here is one per industry:

#### HVAC Few-Shot Example

```json
{
  "role": "user",
  "content": "Transcript: \"We're at 1234 Elm St. The homeowner's AC stopped cooling yesterday, it's a Carrier unit looks like it's from 2008. The condenser fan isn't spinning and I can see the capacitor is bulging. The indoor unit is a matching Carrier air handler in the attic, looks like a 3-ton system. Ductwork in the attic is flex, mostly intact but there's one section that's completely disconnected near the master bedroom. They also want a quote for a new thermostat, their old Honeywell is cracked.\"\n\nPhotos show:\n1. Outdoor Carrier condenser, model 24ACC636A003, data plate visible showing 3-ton, R-410A, manufactured 2008\n2. Close-up of bulging capacitor (45/5 MFD dual run capacitor)\n3. Attic air handler, Carrier model FX4DNF037, flex ductwork visible\n4. Disconnected flex duct section, 10\" diameter, near bedroom register\n5. Cracked Honeywell T6 Pro thermostat on wall"
}
```

**Expected Output:**

```json
{
  "lineItems": [
    {
      "title": "Dual Run Capacitor Replacement",
      "description": "Replace failed 45/5 MFD 440V dual run capacitor on Carrier 24ACC636 condenser. Capacitor visibly bulging (photo 2).",
      "quantity": 1,
      "unit": "ea",
      "unitPriceCents": 25000,
      "itemType": "service",
      "confidence": 0.95,
      "reasoning": "Clearly visible bulging capacitor. Standard 45/5 MFD capacitor is $15-25 for part, $150-250 total with labor. Priced at market average."
    },
    {
      "title": "Flex Duct Reconnection",
      "description": "Reconnect 10\" flex duct section near master bedroom register. Includes new duct strap, mastic sealant, and insulation tape.",
      "quantity": 1,
      "unit": "ea",
      "unitPriceCents": 35000,
      "itemType": "labor",
      "confidence": 0.88,
      "reasoning": "Disconnected flex duct visible in photo 4. Standard repair: cut back damaged section, reconnect to boot, seal and strap. 1-2 hours attic work."
    },
    {
      "title": "Honeywell T6 Pro Thermostat Replacement",
      "description": "Replace cracked Honeywell T6 Pro with new Honeywell Home T6 Pro TH6220U2000 programmable thermostat. Includes wiring verification.",
      "quantity": 1,
      "unit": "ea",
      "unitPriceCents": 28000,
      "itemType": "material",
      "confidence": 0.92,
      "reasoning": "Cracked thermostat visible in photo 5, model identified as T6 Pro. Direct replacement with same model. Part ~$120, install ~$160."
    },
    {
      "title": "System Diagnostic & Testing",
      "description": "Full system diagnostic after capacitor replacement: check compressor amps, superheat/subcooling, airflow, temperature split across coil.",
      "quantity": 1,
      "unit": "ea",
      "unitPriceCents": 12500,
      "itemType": "labor",
      "confidence": 0.90,
      "reasoning": "Standard post-repair diagnostic to verify system operation. System is 16 years old (2008 manufacture), worth checking overall health."
    }
  ],
  "suggestedTitle": "AC Repair & Duct Reconnection — 1234 Elm St",
  "scopeOfWork": "Repair non-functioning Carrier 3-ton AC system (2008 24ACC636). Replace failed dual run capacitor, reconnect disconnected 10\" flex duct in attic near master bedroom, and replace cracked Honeywell T6 Pro thermostat. Full system diagnostic after repair to verify proper operation."
}
```

### 9.5 Error Handling & Edge Cases

| Scenario | Handling |
|----------|---------|
| Blurry photo (AI confidence < 0.5 on all items) | Return results but flag with warning: "Photos may be too blurry for accurate analysis. Consider retaking." |
| No photos provided, only transcript | Analyze transcript only; set confidence to 0.6 max on all items; flag for manual review |
| No transcript, only photos | Analyze photos only; set suggestedTitle based on visible equipment; note "No voice description available" |
| AssemblyAI transcription fails | Catch error, proceed with photos-only analysis; surface warning to user |
| Claude rate-limited (429) | Retry with exponential backoff (1s, 2s, 4s); max 3 attempts |
| Claude timeout (> 30s) | Retry once; if still fails, return error suggesting fewer/smaller photos |
| Invalid JSON from Claude | Strip markdown fences, attempt re-parse; if still invalid, retry with explicit "output ONLY JSON" reminder |
| Empty transcript ("um... uh... yeah") | Detect low-content transcript (< 10 meaningful words); proceed with photos-only; warn user |
| Photos in wrong format | Resize to max 1920px, convert to JPEG before sending (already handled by `compressImage`) |

```typescript
// lib/ai/error-handling.ts

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "RATE_LIMIT"
      | "TIMEOUT"
      | "PARSE_ERROR"
      | "VALIDATION_ERROR"
      | "NO_INPUT"
      | "LOW_QUALITY"
      | "API_ERROR",
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AIError";
  }
}

/**
 * Detect if a transcript has meaningful content.
 * Returns false for empty, silence, or filler-only transcripts.
 */
export function isTranscriptMeaningful(transcript: string): boolean {
  const fillerWords = new Set([
    "um", "uh", "like", "yeah", "ok", "okay", "so", "well", "hmm",
    "ah", "er", "you know", "i mean",
  ]);

  const words = transcript
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !fillerWords.has(w));

  return words.length >= 10;
}
```

### 9.6 Cost Analysis

#### Claude Vision Costs (Sonnet 4.5)

| Component | Token Estimate | Cost per Quote |
|-----------|---------------|----------------|
| System prompt (industry-specific) | ~800 tokens | $0.0024 |
| Few-shot example (1 per industry) | ~1,200 tokens | $0.0036 |
| Photo analysis (3 photos avg) | ~2,400 tokens (800/photo) | $0.0072 |
| Voice transcript (avg 200 words) | ~300 tokens | $0.0009 |
| **Total input** | **~4,700 tokens** | **$0.014** |
| **Output** (line items JSON) | ~1,500 tokens | **$0.023** |
| **Total per quote** | | **~$0.037** |

*Based on Claude Sonnet 4.5 pricing: $3/M input, $15/M output.*

#### AssemblyAI Transcription Costs

| Component | Cost |
|-----------|------|
| Per minute of audio | $0.0062 |
| Average voice note (2 minutes) | $0.012 |

#### Monthly Cost Projection (Solo Plan — 50 quotes/month)

| Service | Monthly Cost |
|---------|-------------|
| Claude Vision (50 quotes × $0.037) | $1.85 |
| AssemblyAI (50 quotes × $0.012) | $0.60 |
| **Total AI cost** | **$2.45/month** |

#### Monthly Cost Projection (Team Plan — 200 quotes/month)

| Service | Monthly Cost |
|---------|-------------|
| Claude Vision (200 quotes × $0.037) | $7.40 |
| AssemblyAI (200 quotes × $0.012) | $2.40 |
| **Total AI cost** | **$9.80/month** |

#### Cost Optimization Strategies

1. **Image compression**: Resize to max 1920px before sending (already implemented in `lib/media/compress-image.ts`). Saves ~40% on image token costs.
2. **Batch multiple photos**: Send all photos in a single Claude request rather than one per photo. Amortizes system prompt + few-shot overhead.
3. **Cache catalog matches**: If the same equipment model appears frequently, cache the Claude analysis and use catalog pricing. Reduces repeat API calls.
4. **Transcript pre-filtering**: Skip transcription if audio is < 3 seconds or below -40 dB (silence detection). Saves AssemblyAI costs on accidental recordings.

---

## 10. Offline-First Architecture (Full Implementation)

### 10.1 Overview

QuoteFlow operates in environments with poor connectivity: crawl spaces, attics, basements, rooftops, rural properties. The offline-first architecture ensures technicians can create quotes, take photos, and record voice notes with zero connectivity, then sync seamlessly when back online.

**Existing foundation:** The codebase already has a complete offline system (see `lib/db/indexed-db.ts`, `lib/sync/offline-sync.ts`, `lib/sync/optimistic-quote.ts`, `app/sw.ts`). This section serves as the comprehensive reference for the full architecture, documenting every store, sync strategy, conflict resolution rule, and testing procedure.

### 10.2 IndexedDB Schema (Version 3)

The client-side database uses the `idb` library with incremental version migrations:

```typescript
// lib/db/indexed-db.ts — Complete schema reference

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "quoteflow";
const DB_VERSION = 3;

export interface QuoteFlowDB {
  offline_queue: {
    key: string;
    value: OfflineQueueItem;
    indexes: {
      "by-timestamp": number;
      "by-action": string;
    };
  };
  quotes_cache: {
    key: string;
    value: CachedQuote;
    indexes: {
      "by-last-synced": number;
    };
  };
  photos_cache: {
    key: string;
    value: CachedPhoto;
    indexes: {
      "by-quote": string;
      "by-uploaded": number; // 0 = not uploaded, 1 = uploaded
    };
  };
  audio_cache: {
    key: string;
    value: CachedAudio;
    indexes: {
      "by-quote": string;
      "by-uploaded": number;
    };
  };
  customers_cache: {
    key: string;
    value: CachedCustomer;
    indexes: {
      "by-last-synced": number;
    };
  };
}

// ---- Store types ----

export type OfflineQueueItem = {
  id: string;
  action:
    | "create_quote"
    | "update_quote"
    | "create_customer"
    | "upload_photo"
    | "upload_audio"
    | "update_quote_status"
    | "send_quote";
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
};

export type CachedQuote = {
  id: string;
  quote_data: Record<string, unknown> & {
    _pending?: boolean;
    _temp_id?: string;
    _cached_updated_at?: string;
  };
  last_synced: number;
};

export type CachedPhoto = {
  id: string;
  blob: Blob;
  quote_id: string;
  uploaded: boolean;
  original_filename?: string;
  mime_type?: string;
};

export type CachedAudio = {
  id: string;
  blob: Blob;
  quote_id: string;
  duration_seconds: number;
  mime_type: string;
  uploaded: boolean;
};

export type CachedCustomer = {
  id: string;
  customer_data: Record<string, unknown>;
  last_synced: number;
};

// ---- Database initialization ----

let dbInstance: IDBPDatabase<QuoteFlowDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<QuoteFlowDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<QuoteFlowDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Version 1: offline_queue + quotes_cache + photos_cache
      if (oldVersion < 1) {
        const queueStore = db.createObjectStore("offline_queue", {
          keyPath: "id",
        });
        queueStore.createIndex("by-timestamp", "timestamp");
        queueStore.createIndex("by-action", "action");

        const quotesStore = db.createObjectStore("quotes_cache", {
          keyPath: "id",
        });
        quotesStore.createIndex("by-last-synced", "last_synced");

        const photosStore = db.createObjectStore("photos_cache", {
          keyPath: "id",
        });
        photosStore.createIndex("by-quote", "quote_id");
        photosStore.createIndex("by-uploaded", "uploaded");
      }

      // Version 2: customers_cache
      if (oldVersion < 2) {
        const customersStore = db.createObjectStore("customers_cache", {
          keyPath: "id",
        });
        customersStore.createIndex("by-last-synced", "last_synced");
      }

      // Version 3: audio_cache
      if (oldVersion < 3) {
        const audioStore = db.createObjectStore("audio_cache", {
          keyPath: "id",
        });
        audioStore.createIndex("by-quote", "quote_id");
        audioStore.createIndex("by-uploaded", "uploaded");
      }
    },
  });

  return dbInstance;
}
```

### 10.3 Offline Queue Operations

```typescript
// lib/db/indexed-db.ts — Queue CRUD operations

export async function enqueueAction(item: Omit<OfflineQueueItem, "id" | "timestamp" | "retries">): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.put("offline_queue", {
    ...item,
    id,
    timestamp: Date.now(),
    retries: 0,
  });
  return id;
}

export async function getQueueItems(): Promise<OfflineQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("offline_queue", "by-timestamp");
}

export async function getQueueCount(): Promise<number> {
  const db = await getDB();
  return db.count("offline_queue");
}

export async function removeQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("offline_queue", id);
}

export async function incrementRetry(id: string): Promise<number> {
  const db = await getDB();
  const item = await db.get("offline_queue", id);
  if (!item) return 0;
  item.retries += 1;
  await db.put("offline_queue", item);
  return item.retries;
}

export async function clearQueue(): Promise<void> {
  const db = await getDB();
  await db.clear("offline_queue");
}
```

### 10.4 Optimistic Quote Creation

```typescript
// lib/sync/optimistic-quote.ts — Complete implementation

import { enqueueAction, getDB } from "@/lib/db/indexed-db";

type OptimisticQuoteInput = {
  businessId: string;
  userId: string;
  title: string;
  description?: string;
  customerId?: string;
  lineItems: Array<{
    title: string;
    description?: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    itemType: string;
  }>;
  voiceTranscript?: string;
  voiceConfidence?: number;
  taxRate?: number;
  expiresAt?: string;
};

type OptimisticQuoteResult = {
  tempId: string;
  quoteData: Record<string, unknown>;
};

export async function createQuoteOptimistic(
  input: OptimisticQuoteInput,
): Promise<OptimisticQuoteResult> {
  const tempId = crypto.randomUUID();
  const shortId = tempId.slice(0, 8).toUpperCase();

  // Calculate totals
  const subtotalCents = input.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
  const taxRate = input.taxRate ?? 0;
  const taxCents = Math.round(subtotalCents * (taxRate / 100));
  const totalCents = subtotalCents + taxCents;

  const quoteData = {
    id: tempId,
    business_id: input.businessId,
    created_by: input.userId,
    customer_id: input.customerId ?? null,
    quote_number: `PENDING-${shortId}`,
    title: input.title,
    description: input.description ?? null,
    status: "draft",
    subtotal_cents: subtotalCents,
    tax_rate: taxRate,
    tax_cents: taxCents,
    discount_cents: 0,
    total_cents: totalCents,
    notes: null,
    customer_notes: null,
    voice_transcript: input.voiceTranscript ?? null,
    voice_confidence: input.voiceConfidence ?? null,
    expires_at: input.expiresAt ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _pending: true,
    _temp_id: tempId,
  };

  // Store in quotes_cache
  const db = await getDB();
  await db.put("quotes_cache", {
    id: tempId,
    quote_data: quoteData,
    last_synced: 0, // never synced
  });

  // Enqueue sync action
  await enqueueAction({
    action: "create_quote",
    payload: {
      ...quoteData,
      line_items: input.lineItems.map((item, i) => ({
        ...item,
        sort_order: i,
        id: crypto.randomUUID(),
      })),
    },
  });

  return { tempId, quoteData };
}

/**
 * After sync, replace temp UUID with server-assigned real ID
 * in all caches: quotes, photos, audio.
 */
export async function replaceTempQuoteId(
  tempId: string,
  realId: string,
): Promise<void> {
  const db = await getDB();

  // 1. Update quotes_cache
  const cachedQuote = await db.get("quotes_cache", tempId);
  if (cachedQuote) {
    cachedQuote.id = realId;
    cachedQuote.quote_data.id = realId;
    cachedQuote.quote_data._pending = false;
    delete cachedQuote.quote_data._temp_id;
    cachedQuote.last_synced = Date.now();

    await db.delete("quotes_cache", tempId);
    await db.put("quotes_cache", cachedQuote);
  }

  // 2. Update photos_cache
  const photos = await db.getAllFromIndex("photos_cache", "by-quote", tempId);
  for (const photo of photos) {
    photo.quote_id = realId;
    await db.put("photos_cache", photo);
  }

  // 3. Update audio_cache
  const audioFiles = await db.getAllFromIndex("audio_cache", "by-quote", tempId);
  for (const audio of audioFiles) {
    audio.quote_id = realId;
    await db.put("audio_cache", audio);
  }
}
```

### 10.5 Sync Orchestrator

```typescript
// lib/sync/offline-sync.ts — Complete sync flow

import {
  getDB,
  getQueueItems,
  removeQueueItem,
  incrementRetry,
  type OfflineQueueItem,
} from "@/lib/db/indexed-db";
import { replaceTempQuoteId } from "./optimistic-quote";

const MAX_RETRIES = 5;
const PHOTO_BATCH_SIZE = 3;

type SyncResult = {
  processedIds: string[];
  failedIds: string[];
  idMappings: Array<{ tempId: string; realId: string }>;
  conflicts: Array<{
    itemId: string;
    quoteId: string;
    serverUpdatedAt: string;
  }>;
};

/**
 * Full sync orchestration. Called when:
 * 1. Browser comes back online (navigator.onLine event)
 * 2. Service Worker Background Sync fires
 * 3. User taps "Sync Now" button
 *
 * Order of operations:
 * 1. Upload cached photos (batched, 3 concurrent)
 * 2. Upload cached audio files
 * 3. Process offline action queue
 * 4. Replace temp IDs with real server IDs
 * 5. Refresh local caches from server
 */
export async function syncOfflineData(): Promise<SyncResult> {
  const result: SyncResult = {
    processedIds: [],
    failedIds: [],
    idMappings: [],
    conflicts: [],
  };

  // Dispatch start event
  dispatchSyncEvent("SYNC_START");

  try {
    // Phase 1: Upload photos
    await uploadCachedPhotos();

    // Phase 2: Upload audio
    await uploadCachedAudio();

    // Phase 3: Process queue
    const queueItems = await getQueueItems();
    const total = queueItems.length;
    let processed = 0;

    for (const item of queueItems) {
      try {
        const itemResult = await processQueueItem(item);

        if (itemResult.idMapping) {
          result.idMappings.push(itemResult.idMapping);
          // Replace temp ID immediately
          await replaceTempQuoteId(
            itemResult.idMapping.tempId,
            itemResult.idMapping.realId,
          );
        }

        if (itemResult.conflict) {
          result.conflicts.push(itemResult.conflict);
        }

        await removeQueueItem(item.id);
        result.processedIds.push(item.id);
      } catch {
        const retries = await incrementRetry(item.id);
        if (retries >= MAX_RETRIES) {
          // Remove permanently failed items
          await removeQueueItem(item.id);
          result.failedIds.push(item.id);
        }
      }

      processed++;
      dispatchSyncEvent("SYNC_PROGRESS", { processed, total });
    }

    // Phase 4: Refresh caches
    await refreshLocalCaches();

    dispatchSyncEvent("SYNC_COMPLETE", {
      idMappings: result.idMappings,
      conflicts: result.conflicts,
    });
  } catch (err) {
    dispatchSyncEvent("SYNC_ERROR", {
      error: err instanceof Error ? err.message : "Sync failed",
    });
  }

  return result;
}

/**
 * Upload all un-uploaded photos from IndexedDB.
 * Batched: max 3 concurrent uploads to avoid saturating connection.
 */
async function uploadCachedPhotos(): Promise<void> {
  const db = await getDB();
  const photos = await db.getAllFromIndex("photos_cache", "by-uploaded", 0);

  // Process in batches
  for (let i = 0; i < photos.length; i += PHOTO_BATCH_SIZE) {
    const batch = photos.slice(i, i + PHOTO_BATCH_SIZE);
    await Promise.all(
      batch.map(async (photo) => {
        try {
          const formData = new FormData();
          formData.append("file", photo.blob, photo.original_filename ?? "photo.jpg");
          formData.append("quote_id", photo.quote_id);

          const response = await fetch("/api/sync/upload-photo", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            // Mark as uploaded
            photo.uploaded = true;
            await db.put("photos_cache", photo);

            // Optionally: remove blob to free space
            // photo.blob = new Blob();
            // await db.put("photos_cache", photo);
          }
        } catch {
          // Photo upload failure is non-fatal; will retry on next sync
        }
      }),
    );
  }
}

/**
 * Upload all un-uploaded audio recordings from IndexedDB.
 */
async function uploadCachedAudio(): Promise<void> {
  const db = await getDB();
  const audioFiles = await db.getAllFromIndex("audio_cache", "by-uploaded", 0);

  for (const audio of audioFiles) {
    try {
      const formData = new FormData();
      formData.append("file", audio.blob, `voice.${audio.mime_type.includes("webm") ? "webm" : "m4a"}`);
      formData.append("quote_id", audio.quote_id);
      formData.append("duration_seconds", String(audio.duration_seconds));

      const response = await fetch("/api/sync/upload-audio", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        audio.uploaded = true;
        await db.put("audio_cache", audio);
      }
    } catch {
      // Audio upload failure is non-fatal
    }
  }
}

type ProcessResult = {
  idMapping?: { tempId: string; realId: string };
  conflict?: { itemId: string; quoteId: string; serverUpdatedAt: string };
};

/**
 * Process a single queue item by POSTing to the sync API.
 */
async function processQueueItem(
  item: OfflineQueueItem,
): Promise<ProcessResult> {
  const response = await fetch("/api/sync/offline-queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ id: item.id, action: item.action, payload: item.payload }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Sync API returned ${response.status}`);
  }

  const data = (await response.json()) as {
    processed_ids: string[];
    id_mappings: Array<{ temp_id: string; real_id: string }>;
    conflicts: Array<{
      item_id: string;
      quote_id: string;
      server_updated_at: string;
    }>;
  };

  const mapping = data.id_mappings.find((m) => m.temp_id === item.payload._temp_id);
  const conflict = data.conflicts.find((c) => c.item_id === item.id);

  return {
    idMapping: mapping
      ? { tempId: mapping.temp_id, realId: mapping.real_id }
      : undefined,
    conflict: conflict
      ? {
          itemId: conflict.item_id,
          quoteId: conflict.quote_id,
          serverUpdatedAt: conflict.server_updated_at,
        }
      : undefined,
  };
}

/**
 * Pull latest data from server into local caches.
 */
async function refreshLocalCaches(): Promise<void> {
  const db = await getDB();

  try {
    const response = await fetch("/api/sync/refresh-caches");
    if (!response.ok) return;

    const data = (await response.json()) as {
      quotes: Array<Record<string, unknown>>;
      customers: Array<Record<string, unknown>>;
    };

    // Update quotes cache
    for (const quote of data.quotes) {
      const id = quote.id as string;
      const existing = await db.get("quotes_cache", id);
      // Don't overwrite pending (unsynced) quotes
      if (existing?.quote_data._pending) continue;

      await db.put("quotes_cache", {
        id,
        quote_data: quote,
        last_synced: Date.now(),
      });
    }

    // Update customers cache
    for (const customer of data.customers) {
      await db.put("customers_cache", {
        id: customer.id as string,
        customer_data: customer,
        last_synced: Date.now(),
      });
    }
  } catch {
    // Cache refresh failure is non-fatal
  }
}

// ---- Event dispatch ----

type SyncEventType = "SYNC_START" | "SYNC_PROGRESS" | "SYNC_COMPLETE" | "SYNC_ERROR";

function dispatchSyncEvent(
  type: SyncEventType,
  detail?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("quoteflow-sync", {
        detail: { type, ...detail },
      }),
    );
  }
}
```

### 10.6 Service Worker (Background Sync)

```typescript
// app/sw.ts — Background Sync handler (excerpt)

import { defaultCache } from "@serwist/next/worker";
import { Serwist, type PrecacheEntry } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

// ---- Background Sync ----

self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag === "quoteflow-offline-sync") {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync(): Promise<void> {
  // Open IndexedDB directly (same DB_NAME and version as client)
  const db = await openIndexedDB();

  // Get pending queue items
  const tx = db.transaction("offline_queue", "readonly");
  const store = tx.objectStore("offline_queue");
  const index = store.index("by-timestamp");
  const items: Array<{ id: string; action: string; payload: unknown }> = [];

  let cursor = await index.openCursor();
  while (cursor) {
    items.push({
      id: cursor.value.id,
      action: cursor.value.action,
      payload: cursor.value.payload,
    });
    cursor = await cursor.continue();
  }

  if (items.length === 0) return;

  // POST to sync API
  const response = await fetch("/api/sync/offline-queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) return;

  const result = (await response.json()) as {
    processed_ids: string[];
    id_mappings: Array<{ temp_id: string; real_id: string }>;
  };

  // Remove processed items from queue
  const deleteTx = db.transaction("offline_queue", "readwrite");
  const deleteStore = deleteTx.objectStore("offline_queue");
  for (const processedId of result.processed_ids) {
    await deleteStore.delete(processedId);
  }

  // Handle ID mappings (replace temp IDs in caches)
  if (result.id_mappings.length > 0) {
    const quotesTx = db.transaction("quotes_cache", "readwrite");
    const quotesStore = quotesTx.objectStore("quotes_cache");

    for (const mapping of result.id_mappings) {
      const tempQuote = await quotesStore.get(mapping.temp_id);
      if (tempQuote) {
        tempQuote.id = mapping.real_id;
        tempQuote.quote_data.id = mapping.real_id;
        tempQuote.quote_data._pending = false;
        delete tempQuote.quote_data._temp_id;
        tempQuote.last_synced = Date.now();

        await quotesStore.delete(mapping.temp_id);
        await quotesStore.put(tempQuote);
      }
    }
  }

  // Notify all clients
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({
      type: "BACKGROUND_SYNC_COMPLETE",
      processedCount: result.processed_ids.length,
      idMappings: result.id_mappings,
    });
  }

  // Show notification if app is in background
  if (clients.length === 0 && result.processed_ids.length > 0) {
    await self.registration.showNotification("QuoteFlow Sync Complete", {
      body: `${result.processed_ids.length} item(s) synced successfully.`,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: "sync-complete",
    });
  }
}

/**
 * Open IndexedDB from service worker context.
 * Must match the same DB name, version, and store structure as the client.
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("quoteflow", 3);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    // If upgrade is needed, the client-side code handles it on next open
    request.onupgradeneeded = () => {
      // Don't handle upgrades in SW — close and let client handle
      request.result.close();
      reject(new Error("DB upgrade needed — deferring to client"));
    };
  });
}

serwist.addEventListeners();
```

### 10.7 Conflict Resolution

```typescript
// lib/sync/conflict-resolution.ts

export type ConflictInfo = {
  quoteId: string;
  localUpdatedAt: string;
  serverUpdatedAt: string;
  localChanges: Record<string, unknown>;
  serverData: Record<string, unknown>;
};

export type ConflictResolution = "keep_local" | "keep_server";

/**
 * Detect conflicts during update_quote sync.
 *
 * Strategy: compare _cached_updated_at (local) with server's updated_at.
 * If server is newer, there's a conflict.
 *
 * Resolution: Last-write-wins by default (local overwrites server).
 * But we record the conflict for the user to review.
 */
export function detectConflict(
  localItem: { _cached_updated_at?: string; [key: string]: unknown },
  serverUpdatedAt: string,
): boolean {
  if (!localItem._cached_updated_at) return false;

  const localTime = new Date(localItem._cached_updated_at).getTime();
  const serverTime = new Date(serverUpdatedAt).getTime();

  // Server was updated after our local cache timestamp → conflict
  return serverTime > localTime;
}

/**
 * Apply conflict resolution to a quote.
 */
export async function resolveConflict(
  quoteId: string,
  resolution: ConflictResolution,
): Promise<void> {
  if (resolution === "keep_server") {
    // Re-fetch server data and overwrite local cache
    const response = await fetch(`/api/quotes/${quoteId}`);
    if (!response.ok) throw new Error("Failed to fetch server data");

    const serverQuote = await response.json();

    const { getDB } = await import("@/lib/db/indexed-db");
    const db = await getDB();
    await db.put("quotes_cache", {
      id: quoteId,
      quote_data: serverQuote,
      last_synced: Date.now(),
    });
  }
  // "keep_local" — no action needed; local changes were already applied
  // by last-write-wins during sync
}
```

### 10.8 Sync Status Component

```typescript
// components/sync-status.tsx — Complete implementation

"use client";

import { useEffect, useState, useCallback } from "react";
import { Cloud, CloudOff, Loader2, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { syncOfflineData } from "@/lib/sync/offline-sync";
import { getQueueCount } from "@/lib/db/indexed-db";

type SyncState = "online" | "offline" | "syncing" | "synced" | "error" | "pending";

export function SyncStatus() {
  const [state, setState] = useState<SyncState>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setState(navigator.onLine ? "online" : "offline");
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Poll pending queue count
  useEffect(() => {
    const checkQueue = async () => {
      const count = await getQueueCount();
      setPendingCount(count);
      if (count > 0 && navigator.onLine && state !== "syncing") {
        setState("pending");
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 5000);
    return () => clearInterval(interval);
  }, [state]);

  // Listen for sync events
  useEffect(() => {
    const handleSyncEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        type: string;
        processed?: number;
        total?: number;
        error?: string;
      };

      switch (detail.type) {
        case "SYNC_START":
          setState("syncing");
          setSyncMessage("Syncing...");
          break;
        case "SYNC_PROGRESS":
          setSyncMessage(`Syncing ${detail.processed}/${detail.total}...`);
          break;
        case "SYNC_COMPLETE":
          setState("synced");
          setSyncMessage("All changes synced");
          setPendingCount(0);
          // Reset to "online" after 3 seconds
          setTimeout(() => setState("online"), 3000);
          break;
        case "SYNC_ERROR":
          setState("error");
          setSyncMessage(detail.error ?? "Sync failed");
          break;
      }
    };

    window.addEventListener("quoteflow-sync", handleSyncEvent);
    return () => window.removeEventListener("quoteflow-sync", handleSyncEvent);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      const count = await getQueueCount();
      if (count > 0) {
        setState("syncing");
        await syncOfflineData();
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const handleManualSync = useCallback(async () => {
    if (state === "syncing") return;
    setState("syncing");
    await syncOfflineData();
  }, [state]);

  // Don't show anything when online with nothing to sync
  if (state === "online" && pendingCount === 0) return null;

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 z-40 flex items-center justify-between rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${stateStyles[state]}`}
    >
      <div className="flex items-center gap-2">
        {stateIcons[state]}
        <span>{stateLabels[state](pendingCount, syncMessage)}</span>
      </div>

      {(state === "pending" || state === "error") && (
        <button
          onClick={handleManualSync}
          className="ml-2 rounded-md bg-white/20 px-3 py-1 text-xs font-medium hover:bg-white/30"
        >
          <RefreshCw className="mr-1 inline h-3 w-3" />
          Sync Now
        </button>
      )}
    </div>
  );
}

const stateStyles: Record<SyncState, string> = {
  online: "bg-green-600 text-white",
  offline: "bg-gray-700 text-white",
  syncing: "bg-blue-600 text-white",
  synced: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  pending: "bg-amber-600 text-white",
};

const stateIcons: Record<SyncState, React.ReactNode> = {
  online: <Cloud className="h-4 w-4" />,
  offline: <CloudOff className="h-4 w-4" />,
  syncing: <Loader2 className="h-4 w-4 animate-spin" />,
  synced: <CheckCircle className="h-4 w-4" />,
  error: <AlertTriangle className="h-4 w-4" />,
  pending: <Cloud className="h-4 w-4" />,
};

const stateLabels: Record<SyncState, (count: number, msg: string) => string> = {
  online: () => "Connected",
  offline: (count) => `Offline${count > 0 ? ` — ${count} pending` : ""}`,
  syncing: (_count, msg) => msg || "Syncing...",
  synced: (_count, msg) => msg || "Synced",
  error: (_count, msg) => msg || "Sync error",
  pending: (count) => `${count} change${count !== 1 ? "s" : ""} pending sync`,
};
```

### 10.9 Photo Compression Utility

```typescript
// lib/media/compress-image.ts — Complete implementation

type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1920;
const DEFAULT_QUALITY = 0.85;

/**
 * Compress an image Blob to JPEG at specified quality and max dimensions.
 * Uses OffscreenCanvas (SW-compatible) with HTMLCanvasElement fallback.
 */
export async function compressImage(
  blob: Blob,
  options?: CompressOptions,
): Promise<Blob> {
  const maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options?.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  // Create bitmap from blob
  const bitmap = await createImageBitmap(blob);
  const { width: origWidth, height: origHeight } = bitmap;

  // Calculate scaled dimensions
  let width = origWidth;
  let height = origHeight;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Skip compression if already small enough and JPEG
  if (
    width === origWidth &&
    height === origHeight &&
    blob.type === "image/jpeg" &&
    blob.size < 500_000 // 500 KB
  ) {
    bitmap.close();
    return blob;
  }

  let result: Blob;

  // Prefer OffscreenCanvas (works in Service Worker)
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(bitmap, 0, 0, width, height);
    result = await canvas.convertToBlob({
      type: "image/jpeg",
      quality,
    });
  } else {
    // Fallback to HTMLCanvasElement (main thread only)
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(bitmap, 0, 0, width, height);
    result = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        quality,
      );
    });
  }

  bitmap.close();
  return result;
}
```

### 10.10 Testing Offline Mode

#### Manual Testing Checklist

```markdown
## Offline-First Testing Procedure

### Setup
1. Open Chrome DevTools → Application → Service Workers → verify SW is registered
2. Open DevTools → Application → IndexedDB → verify "quoteflow" DB with all 5 stores
3. Ensure you're logged in and have at least 1 customer in the system

### Test 1: Create Quote Offline
1. DevTools → Network → Offline (check box)
2. Navigate to /app/quotes/new
3. Select a customer (should load from customers_cache)
4. Take 2 photos (stored in photos_cache)
5. Record a voice note (stored in audio_cache)
6. Complete wizard → quote appears in list with amber "Pending sync" badge
7. Verify: IndexedDB offline_queue has "create_quote" action
8. Verify: IndexedDB quotes_cache has new entry with _pending: true

### Test 2: Sync on Reconnect
1. DevTools → Network → uncheck Offline
2. Watch SyncStatus component → should show "Syncing..."
3. After sync: amber badge disappears, quote_number changes from PENDING-xxx to real number
4. Verify: IndexedDB offline_queue is empty
5. Verify: quotes_cache entry has _pending: false and real server ID

### Test 3: Multiple Quotes Offline
1. Go offline
2. Create 5 quotes in succession (different customers, photos)
3. Go online
4. All 5 should sync in order (by timestamp)
5. Verify each gets a unique real quote_number

### Test 4: Conflict Resolution
1. Device A: Edit quote #42 (change title) while online → saves
2. Device B: Go offline → edit quote #42 (change description) → creates "update_quote" in queue
3. Device B: Go online → sync fires
4. Expected: SyncConflictDialog appears (server title is newer than B's cache)
5. Choose "Keep My Changes" → description change applied
6. Choose "Reload Server Data" → server version replaces local

### Test 5: Photo Upload Resilience
1. Go offline → take 5 photos for a quote
2. Go online → photos upload in batches of 3
3. Kill network mid-upload (after batch 1 completes)
4. Go online again → remaining 2 photos upload
5. Verify: all 5 photos visible in quote detail

### Test 6: Manual Sync Fallback
1. In a browser without Background Sync support (older Safari)
2. Go offline → create a quote
3. Go online → SyncStatus shows "1 change pending sync" with "Sync Now" button
4. Tap "Sync Now" → quote syncs

### Test 7: Service Worker Update
1. Deploy a new version of the app
2. Old SW is still running → new SW installs, waits
3. Close all tabs → reopen → new SW activates
4. Verify: IndexedDB data preserved (no data loss on SW update)
```

### 10.11 Browser Compatibility

| Feature | Chrome | Safari (iOS) | Firefox | Edge |
|---------|--------|-------------|---------|------|
| IndexedDB | Yes | Yes (iOS 10+) | Yes | Yes |
| Service Worker | Yes | Yes (iOS 11.3+) | Yes | Yes |
| Background Sync | Yes (49+) | Yes (iOS 15.4+ PWA) | No* | Yes |
| OffscreenCanvas | Yes (69+) | Yes (16.4+) | Yes (105+) | Yes |
| Cache API | Yes | Yes | Yes | Yes |
| Push Notifications | Yes | Yes (iOS 16.4+ PWA) | Yes | Yes |

*Firefox does not support Background Sync. The manual "Sync Now" fallback handles this.

---

## Cross-Reference to Part 2B

For implementation details on:
- **Mobile UI patterns** (bottom navigation, gesture support, haptic feedback) → Part 2B, Section 11
- **Security & RLS deep-dive** (complete policy specifications, encryption at rest) → Part 2B, Section 12
- **Pricing model** ($60/mo solo, $100/mo team, feature comparison) → Part 2B, Section 13
- **10-week development roadmap** (week-by-week breakdown) → Part 2B, Section 14
- **Testing strategy** (unit, integration, E2E, accessibility) → Part 2B, Section 15
- **Deployment guide** (Vercel, Supabase, environment setup) → Part 2B, Section 16

---

*End of Part 2A*
