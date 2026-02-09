-- ============================================================================
-- Migration 0014: Team Invitations + Approval Workflows
-- ============================================================================
-- Uses `profiles` table for team membership (1:1 with auth.users).
-- This table tracks invitations only — once accepted, the user's profile
-- is updated with business_id + role.
-- ============================================================================

-- ============================================================================
-- 1. team_invitations — tracks pending team invitations
-- ============================================================================

CREATE TABLE public.team_invitations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email           text        NOT NULL,
  role            public.user_role NOT NULL DEFAULT 'technician',
  invited_by      uuid        NOT NULL REFERENCES public.profiles(id),
  invitation_token text       UNIQUE NOT NULL,
  expires_at      timestamptz NOT NULL,
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE(business_id, email)
);

-- Indexes
CREATE INDEX idx_team_invitations_business ON public.team_invitations(business_id);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(invitation_token) WHERE accepted_at IS NULL;
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);

-- RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Business members can view their own business's invitations
CREATE POLICY "team_invitations_select_own"
  ON public.team_invitations
  FOR SELECT
  USING (business_id = public.get_my_business_id());

-- Owners and admins can insert invitations for their business
CREATE POLICY "team_invitations_insert_own"
  ON public.team_invitations
  FOR INSERT
  WITH CHECK (business_id = public.get_my_business_id());

-- Owners and admins can update invitations for their business
CREATE POLICY "team_invitations_update_own"
  ON public.team_invitations
  FOR UPDATE
  USING (business_id = public.get_my_business_id());

-- Owners and admins can delete invitations for their business
CREATE POLICY "team_invitations_delete_own"
  ON public.team_invitations
  FOR DELETE
  USING (business_id = public.get_my_business_id());


-- ============================================================================
-- 2. approval_workflows — configurable quote approval requirements
-- ============================================================================

CREATE TABLE public.approval_workflows (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id                 uuid        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  -- Workflow type: 'none' = no approvals, 'threshold' = above $ amount, 'all' = every quote
  workflow_type               text        NOT NULL DEFAULT 'none'
                              CHECK (workflow_type IN ('none', 'threshold', 'all')),

  -- Threshold (cents) — only applies if workflow_type = 'threshold'
  approval_threshold_cents    bigint      DEFAULT 50000, -- $500.00

  -- Which roles need to approve
  requires_admin_approval     boolean     NOT NULL DEFAULT false,
  requires_owner_approval     boolean     NOT NULL DEFAULT true,

  is_active                   boolean     NOT NULL DEFAULT true,

  UNIQUE(business_id)
);

-- updated_at trigger
CREATE TRIGGER set_approval_workflows_updated_at
  BEFORE UPDATE ON public.approval_workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_workflows_select_own"
  ON public.approval_workflows
  FOR SELECT
  USING (business_id = public.get_my_business_id());

CREATE POLICY "approval_workflows_insert_own"
  ON public.approval_workflows
  FOR INSERT
  WITH CHECK (business_id = public.get_my_business_id());

CREATE POLICY "approval_workflows_update_own"
  ON public.approval_workflows
  FOR UPDATE
  USING (business_id = public.get_my_business_id());

CREATE POLICY "approval_workflows_delete_own"
  ON public.approval_workflows
  FOR DELETE
  USING (business_id = public.get_my_business_id());
