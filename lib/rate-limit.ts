// ============================================================================
// Supabase-backed rate limiter (persistent, multi-instance safe)
// ============================================================================

import { createServiceClient } from "@/lib/supabase/service";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
};

/**
 * Check rate limit using the Postgres-backed `check_rate_limit` function.
 * Atomic and consistent across all server instances.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_max_tokens: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // If rate limit check fails, allow the request (fail open) but log
    console.warn("Rate limit check failed, allowing request:", error.message);
    return { allowed: true, remaining: 0, resetMs: 0 };
  }

  const result = data as { allowed: boolean; remaining: number; reset_at: string };
  const resetAt = new Date(result.reset_at).getTime();
  const resetMs = Math.max(0, resetAt - Date.now());

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetMs,
  };
}

// ============================================================================
// Pre-configured rate limiters
// ============================================================================

/** AI endpoints: 10 requests/min per business */
export async function checkAIRateLimit(
  businessId: string,
): Promise<RateLimitResult> {
  return checkRateLimit(`ai:${businessId}`, 10, 60);
}

/** Photo uploads: 20 per minute per user */
export async function checkPhotoUploadRateLimit(
  userId: string,
): Promise<RateLimitResult> {
  return checkRateLimit(`photo:${userId}`, 20, 60);
}

/** Email delivery: 100 per day per business */
export async function checkEmailRateLimit(
  businessId: string,
): Promise<RateLimitResult> {
  return checkRateLimit(`email:${businessId}`, 100, 86400);
}
