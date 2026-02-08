// ============================================================================
// In-memory sliding window rate limiter (per-process)
// ============================================================================

type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      // Remove entries with no timestamps in the last hour
      entry.timestamps = entry.timestamps.filter(
        (ts) => now - ts < 60 * 60 * 1000,
      );
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
};

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0]!;
    const resetMs = oldestInWindow + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, resetMs),
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    resetMs: windowMs,
  };
}

// ============================================================================
// Pre-configured rate limiters
// ============================================================================

/** AI endpoints: 10 requests/min per business */
export function checkAIRateLimit(businessId: string): RateLimitResult {
  return checkRateLimit(`ai:${businessId}`, 10, 60 * 1000);
}

/** Photo uploads: 20 per minute per user */
export function checkPhotoUploadRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`photo:${userId}`, 20, 60 * 1000);
}

/** Email delivery: 100 per day per business */
export function checkEmailRateLimit(businessId: string): RateLimitResult {
  return checkRateLimit(`email:${businessId}`, 100, 24 * 60 * 60 * 1000);
}
