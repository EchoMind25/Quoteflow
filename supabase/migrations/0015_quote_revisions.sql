-- Migration: 0015_quote_revisions.sql
-- Add quote revision workflow: revision tracking, messages, and new status

-- Add revision tracking to quotes
ALTER TABLE public.quotes
  ADD COLUMN parent_quote_id uuid REFERENCES public.quotes(id),
  ADD COLUMN revision_number integer DEFAULT 1,
  ADD COLUMN revision_notes text;

-- Quote messages table (for back-and-forth between business and customer)
CREATE TABLE public.quote_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('business', 'customer')),
  sender_id uuid, -- NULL for customer (anonymous), profile.id for business
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quote_messages ENABLE ROW LEVEL SECURITY;

-- Business can see messages for their quotes
CREATE POLICY "messages_select_business" ON public.quote_messages
  FOR SELECT USING (
    quote_id IN (SELECT id FROM quotes WHERE business_id = get_my_business_id())
  );

-- Business can insert messages
CREATE POLICY "messages_insert_business" ON public.quote_messages
  FOR INSERT WITH CHECK (
    sender_type = 'business' AND
    quote_id IN (SELECT id FROM quotes WHERE business_id = get_my_business_id())
  );

-- Update quotes status check constraint to include 'revision_requested'
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('draft', 'sent', 'viewed', 'revision_requested', 'accepted', 'declined', 'expired'));

-- Indexes
CREATE INDEX idx_quote_messages_quote_id ON public.quote_messages(quote_id);
CREATE INDEX idx_quotes_parent_quote_id ON public.quotes(parent_quote_id);
