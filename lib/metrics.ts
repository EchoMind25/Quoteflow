import * as Sentry from "@sentry/nextjs";

// ============================================================================
// Custom performance metrics for QuoteFlow
// ============================================================================

/**
 * Track quote creation time (target: <90s from start to save)
 */
export function trackQuoteCreationStart(): () => void {
  const start = performance.now();
  return () => {
    const durationMs = performance.now() - start;
    const durationSec = durationMs / 1000;

    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.startSpan(
        { name: "quote.creation", op: "ui.action" },
        (span) => {
          Sentry.setMeasurement("quote.creation_time_seconds", durationSec, "second");
          span.end();
        },
      );
    }

    // Dev-mode logging
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
export function trackAIGeneration(result: {
  success: boolean;
  editedBeforeSave: boolean;
  lineItemCount: number;
  confidence: number;
}): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    category: "ai.generation",
    message: result.success ? "AI generation succeeded" : "AI generation failed",
    level: result.success ? "info" : "warning",
    data: {
      success: result.success,
      editedBeforeSave: result.editedBeforeSave,
      lineItemCount: result.lineItemCount,
      confidence: result.confidence,
    },
  });

  if (result.success) {
    Sentry.setMeasurement("ai.confidence_score", result.confidence, "none");
  }
}

/**
 * Track offline sync events
 */
export function trackSyncResult(result: {
  processed: number;
  failed: number;
}): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    category: "sync",
    message: `Sync completed: ${result.processed} processed, ${result.failed} failed`,
    level: result.failed > 0 ? "warning" : "info",
    data: {
      processed: result.processed,
      failed: result.failed,
      fullSuccess: result.failed === 0 && result.processed > 0,
    },
  });
}

/**
 * Track API response time (server-side)
 */
export function trackApiResponseTime(
  endpoint: string,
  durationMs: number,
): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.startSpan(
    { name: `api ${endpoint}`, op: "http.server" },
    (span) => {
      Sentry.setMeasurement("api.response_time_ms", durationMs, "millisecond");
      span.end();
    },
  );
}
