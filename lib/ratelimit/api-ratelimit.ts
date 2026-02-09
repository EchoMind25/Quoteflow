// lib/ratelimit/api-ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Upstash Redis-backed rate limiter for API routes.
 *
 * Sliding window: 100 requests per 1 minute per user.
 * Designed to be called from `proxy.ts` for `/api/*` routes.
 *
 * Requires env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // eslint-disable-next-line no-console
    console.warn(
      "[ratelimit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled",
    );
    return null;
  }

  const redis = new Redis({ url, token });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
  });

  return ratelimit;
}

/**
 * Apply rate limiting to an API request.
 *
 * @param request - The incoming Next.js request
 * @param userId - The authenticated user ID (extracted from Supabase session)
 * @returns A 429 response if rate-limited, or `null` if the request should proceed
 */
export async function checkRateLimit(
  request: NextRequest,
  userId: string,
): Promise<NextResponse | null> {
  const limiter = getRatelimit();
  if (!limiter) return null;

  try {
    const { success, limit, remaining, reset } = await limiter.limit(userId);

    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        },
      );
    }

    // Attach rate limit headers to a pass-through response later
    request.headers.set("x-ratelimit-limit", limit.toString());
    request.headers.set("x-ratelimit-remaining", remaining.toString());
    request.headers.set("x-ratelimit-reset", reset.toString());
  } catch (_error) {
    // eslint-disable-next-line no-console
    console.error("[ratelimit] Failed to check rate limit:", _error);
    // Fail open — don't block requests if Redis is down
  }

  return null;
}
