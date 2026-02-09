-- Migration: 0009_fix_anon_rls.sql
-- Purpose: Remove anon SELECT policies that allow enumeration of quotes,
--          customers, and line items. Public quote view will use server-side
--          service role queries instead.
-- Security: Eliminates P0 vulnerability where anonymous users could scan
--           all non-draft quotes via the anon SELECT policy.

-- ============================================================================
-- 1. Drop vulnerable anon SELECT policies
-- ============================================================================

-- quotes: anon could SELECT all non-draft quotes (enumeration risk)
DROP POLICY IF EXISTS "quotes_select_public" ON public.quotes;

-- customers: anon could SELECT customers linked to non-draft quotes
DROP POLICY IF EXISTS "customers_select_public" ON public.customers;

-- quote_line_items: anon could SELECT line items of non-draft quotes
DROP POLICY IF EXISTS "line_items_select_public" ON public.quote_line_items;

-- ============================================================================
-- 2. Keep businesses anon SELECT (needed for public branding, low risk)
-- ============================================================================
-- "businesses_select_public" remains: it only exposes business name/logo/color
-- which is already public information shown on the shared quote page.

-- ============================================================================
-- 3. Tighten anon UPDATE policy
-- ============================================================================
-- The quotes_update_public policy (migration 0006) is still needed for
-- accept/decline from public pages. It is further guarded by the column
-- guard trigger in migration 0010.

-- Add comment for audit trail
COMMENT ON POLICY "businesses_select_public" ON public.businesses IS
  'Retained: anon needs business name/logo/color for branded public quote pages. '
  'Low risk: only exposes marketing-level information.';
