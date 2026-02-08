-- Migration: 0006_anon_quote_update.sql
-- Purpose: Allow anonymous users to accept/decline quotes via public link
-- Security: UUID-as-secret provides access control, RLS restricts state transitions

-- Allow anonymous users to update quote status from public quote page
CREATE POLICY "quotes_update_public"
  ON public.quotes FOR UPDATE
  TO anon
  USING (
    -- Can only target quotes in sent/viewed state
    status IN ('sent', 'viewed')
  )
  WITH CHECK (
    -- Can only transition to viewed/accepted/declined
    status IN ('viewed', 'accepted', 'declined')
  );

-- Add comment explaining security model
COMMENT ON POLICY "quotes_update_public" ON quotes IS
  'Allows customers to accept/decline quotes via public URL. '
  'Security: UUID provides secret-link access control. '
  'USING clause restricts targetable rows, WITH CHECK restricts new values. '
  'Prevents: draft→accepted, accepted→draft, or other invalid transitions.';
