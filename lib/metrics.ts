// ============================================================================
// Custom performance metrics for Quotestream
// ============================================================================

/**
 * Track quote creation time (target: <90s from start to save)
 */
export function trackQuoteCreationStart(): () => void {
  const start = performance.now();
  return () => {
    const durationMs = performance.now() - start;
    const durationSec = durationMs / 1000;

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn(
        `[Metrics] Quote creation: ${durationSec.toFixed(1)}s (target: <90s)`,
      );
    }
  };
}

/**
 * Track AI generation success/failure and accuracy
 */
export function trackAIGeneration(_result: {
  success: boolean;
  editedBeforeSave: boolean;
  lineItemCount: number;
  confidence: number;
}): void {
  // No-op until observability platform is configured
}

/**
 * Track offline sync events
 */
export function trackSyncResult(_result: {
  processed: number;
  failed: number;
}): void {
  // No-op until observability platform is configured
}

/**
 * Track API response time (server-side)
 */
export function trackApiResponseTime(
  _endpoint: string,
  _durationMs: number,
): void {
  // No-op until observability platform is configured
}
