-- Allow anonymous users to update quote status via public link
-- Restricted to valid state transitions only
CREATE POLICY "quotes_update_public"
  ON public.quotes FOR UPDATE
  TO anon
  USING (status IN ('sent', 'viewed'))
  WITH CHECK (status IN ('viewed', 'accepted', 'declined'));
