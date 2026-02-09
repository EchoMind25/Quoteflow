-- Migration: 0012_fix_rate_limiting.sql
-- Purpose: Fix check_rate_limit() to be fully atomic (single UPSERT).
--
-- Problems in 0011:
--   1. TOCTOU race: UPSERT reads tokens, separate UPDATE increments.
--      Two concurrent callers can both pass the limit check.
--   2. Off-by-one: new buckets INSERT with tokens=0, then UPDATE to 1.
--      RETURNING gives pre-increment value, making the math fragile.
--
-- Fix: single UPSERT that resets expired windows AND consumes a token
-- in one atomic statement. Token count is capped at max+1 to prevent
-- unbounded growth from denied requests.

-- ============================================================================
-- Replace check_rate_limit() — fully atomic version
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max_tokens integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now        timestamptz := clock_timestamp();
  v_window     interval    := make_interval(secs => p_window_seconds);
  v_tokens     integer;
  v_window_start timestamptz;
  v_allowed    boolean;
  v_remaining  integer;
  v_reset_at   timestamptz;
BEGIN
  -- Single atomic upsert: reset expired windows AND consume a token.
  -- New rows start at tokens=1 (first request consumes immediately).
  -- Existing rows: if window expired → reset to 1; otherwise increment
  -- (capped at p_max_tokens + 1 to prevent unbounded growth).
  INSERT INTO public.rate_limit_buckets AS rlb (key, tokens, window_start)
  VALUES (p_key, 1, v_now)
  ON CONFLICT (key) DO UPDATE
    SET
      tokens = CASE
        WHEN rlb.window_start + v_window <= v_now
          THEN 1                                            -- window expired → reset + consume
        ELSE LEAST(rlb.tokens + 1, p_max_tokens + 1)       -- within window → increment (capped)
      END,
      window_start = CASE
        WHEN rlb.window_start + v_window <= v_now
          THEN v_now                                        -- window expired → reset
        ELSE rlb.window_start                               -- within window → keep
      END
  RETURNING tokens, window_start
  INTO v_tokens, v_window_start;

  v_reset_at := v_window_start + v_window;

  -- tokens > max means we hit the cap → request denied
  IF v_tokens > p_max_tokens THEN
    v_allowed   := false;
    v_remaining := 0;
  ELSE
    v_allowed   := true;
    v_remaining := p_max_tokens - v_tokens;
  END IF;

  RETURN jsonb_build_object(
    'allowed',   v_allowed,
    'remaining', v_remaining,
    'reset_at',  v_reset_at
  );
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit(text, integer, integer) IS
  'Atomic fixed-window rate limiter. Single UPSERT consumes a token and '
  'resets expired windows in one statement. No TOCTOU race. '
  'Returns {allowed: bool, remaining: int, reset_at: timestamptz}.';
