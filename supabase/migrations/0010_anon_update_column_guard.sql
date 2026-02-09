-- Migration: 0010_anon_update_column_guard.sql
-- Purpose: Prevent anonymous users from modifying any column except status
--          and related timestamps when updating quotes via the public page.
-- Security: Closes P0 vulnerability where anon UPDATE policy allowed
--           modification of ANY column (title, total_cents, business_id, etc.)

-- ============================================================================
-- 1. Guard trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_anon_quote_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only restrict anonymous (non-authenticated) users.
  -- Authenticated users are already guarded by their own RLS policies.
  IF auth.role() = 'authenticated' THEN
    RETURN NEW;
  END IF;

  -- For anon role: lock ALL columns except status and timestamp fields.
  -- Any attempt to change a locked column is silently reverted to OLD value.
  NEW.id              := OLD.id;
  NEW.business_id     := OLD.business_id;
  NEW.customer_id     := OLD.customer_id;
  NEW.created_by      := OLD.created_by;
  NEW.quote_number    := OLD.quote_number;
  NEW.title           := OLD.title;
  NEW.description     := OLD.description;
  NEW.subtotal_cents  := OLD.subtotal_cents;
  NEW.tax_rate        := OLD.tax_rate;
  NEW.tax_cents       := OLD.tax_cents;
  NEW.discount_cents  := OLD.discount_cents;
  NEW.total_cents     := OLD.total_cents;
  NEW.notes           := OLD.notes;
  NEW.customer_notes  := OLD.customer_notes;
  NEW.expires_at      := OLD.expires_at;
  NEW.sent_at         := OLD.sent_at;
  NEW.voice_transcript := OLD.voice_transcript;
  NEW.voice_audio_url := OLD.voice_audio_url;
  NEW.voice_confidence := OLD.voice_confidence;
  NEW.created_at      := OLD.created_at;
  -- updated_at is set by the set_updated_at trigger, allow it through

  -- These columns ARE allowed to change for anon:
  --   status       (accept/decline transitions, guarded by RLS WITH CHECK)
  --   viewed_at    (mark-as-viewed on first page load)
  --   accepted_at  (timestamp when customer accepts)
  --   declined_at  (timestamp when customer declines)

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Apply trigger BEFORE UPDATE (runs before set_updated_at)
-- ============================================================================

-- Use a name that sorts before "set_updated_at" to ensure it runs first
CREATE TRIGGER guard_anon_quote_update
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_anon_quote_update();

-- ============================================================================
-- 3. Documentation
-- ============================================================================

COMMENT ON FUNCTION public.guard_anon_quote_update() IS
  'Column guard for anonymous quote updates. Prevents anon users from '
  'modifying any column except status, viewed_at, accepted_at, declined_at. '
  'Authenticated users pass through unmodified.';
