-- Migration: 0011_rate_limiting.sql
-- Purpose: Server-side rate limiting using Supabase Postgres.
--          Replaces in-memory rate limiter which resets on deploy/restart
--          and doesn't work across multiple server instances.

-- ============================================================================
-- 1. Rate limit buckets table
-- ============================================================================

CREATE TABLE public.rate_limit_buckets (
  key         text    NOT NULL,
  tokens      integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key)
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Indexes
-- ============================================================================

-- Cleanup index: find expired buckets efficiently
CREATE INDEX idx_rate_limit_window_start
  ON public.rate_limit_buckets (window_start);

-- ============================================================================
-- 3. RLS policies
-- ============================================================================

-- No direct client access. All access goes through SECURITY DEFINER function.
-- Deny all operations for both anon and authenticated roles.

-- (RLS is enabled but no policies are created = deny all by default)

-- ============================================================================
-- 4. check_rate_limit() function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max_tokens integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now       timestamptz := now();
  v_window    interval    := make_interval(secs => p_window_seconds);
  v_tokens    integer;
  v_window_start timestamptz;
  v_allowed   boolean;
  v_remaining integer;
  v_reset_at  timestamptz;
BEGIN
  -- Upsert: create or fetch the bucket
  INSERT INTO public.rate_limit_buckets (key, tokens, window_start)
  VALUES (p_key, 0, v_now)
  ON CONFLICT (key) DO UPDATE
    SET
      -- Reset the window if it has expired
      tokens = CASE
        WHEN public.rate_limit_buckets.window_start + v_window < v_now
        THEN 0
        ELSE public.rate_limit_buckets.tokens
      END,
      window_start = CASE
        WHEN public.rate_limit_buckets.window_start + v_window < v_now
        THEN v_now
        ELSE public.rate_limit_buckets.window_start
      END
  RETURNING tokens, window_start
  INTO v_tokens, v_window_start;

  v_reset_at := v_window_start + v_window;

  IF v_tokens >= p_max_tokens THEN
    -- Rate limit exceeded
    v_allowed := false;
    v_remaining := 0;
  ELSE
    -- Consume a token
    UPDATE public.rate_limit_buckets
    SET tokens = v_tokens + 1
    WHERE key = p_key;

    v_allowed := true;
    v_remaining := p_max_tokens - v_tokens - 1;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'reset_at', v_reset_at
  );
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit(text, integer, integer) IS
  'Atomic sliding-window rate limiter. Returns {allowed, remaining, reset_at}. '
  'SECURITY DEFINER so it can be called from any role without direct table access.';

-- ============================================================================
-- 5. Periodic cleanup (optional — run via pg_cron or scheduled function)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_buckets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete buckets whose window expired more than 1 hour ago
  DELETE FROM public.rate_limit_buckets
  WHERE window_start < now() - interval '1 hour';
END;
$$;

COMMENT ON FUNCTION public.cleanup_rate_limit_buckets() IS
  'Removes expired rate limit buckets. Call periodically via pg_cron or similar.';
