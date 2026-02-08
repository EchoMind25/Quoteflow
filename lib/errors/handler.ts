import * as Sentry from "@sentry/nextjs";

// ============================================================================
// Error classification
// ============================================================================

export type ErrorCategory =
  | "ai_processing"
  | "photo_upload"
  | "network"
  | "auth"
  | "validation"
  | "unknown";

export function classifyError(error: unknown): ErrorCategory {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // AI-related errors
    if (
      msg.includes("anthropic") ||
      msg.includes("claude") ||
      msg.includes("vision") ||
      msg.includes("transcription") ||
      msg.includes("assemblyai") ||
      error.name === "VisionAnalysisError" ||
      error.name === "TranscriptionError"
    ) {
      return "ai_processing";
    }

    // Photo/upload errors
    if (
      msg.includes("upload") ||
      msg.includes("storage") ||
      msg.includes("file size") ||
      msg.includes("mime type") ||
      msg.includes("compress")
    ) {
      return "photo_upload";
    }

    // Network errors
    if (
      msg.includes("fetch") ||
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("econnrefused") ||
      msg.includes("offline") ||
      error.name === "TypeError" && msg.includes("failed to fetch")
    ) {
      return "network";
    }

    // Auth errors
    if (
      msg.includes("auth") ||
      msg.includes("session") ||
      msg.includes("unauthorized") ||
      msg.includes("401")
    ) {
      return "auth";
    }

    // Validation
    if (
      msg.includes("validation") ||
      msg.includes("invalid") ||
      msg.includes("required")
    ) {
      return "validation";
    }
  }

  return "unknown";
}

// ============================================================================
// User-friendly messages per category
// ============================================================================

const USER_MESSAGES: Record<ErrorCategory, string> = {
  ai_processing:
    "AI processing failed. You can try again or enter details manually.",
  photo_upload:
    "Photo upload failed. Try with a smaller image or check your connection.",
  network:
    "Connection issue. Your changes are saved locally and will sync when you're back online.",
  auth: "Your session has expired. Please sign in again.",
  validation: "Please check your input and try again.",
  unknown: "Something went wrong. Please try again.",
};

export function getUserMessage(category: ErrorCategory): string {
  return USER_MESSAGES[category];
}

// ============================================================================
// Error capture (Sentry + console)
// ============================================================================

export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): { category: ErrorCategory; message: string } {
  const category = classifyError(error);
  const message = getUserMessage(category);

  // Always report to Sentry if configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: { error_category: category },
      extra: context,
    });
  }

  // Server-side logging
  if (typeof window === "undefined") {
    // eslint-disable-next-line no-console
    console.error(`[QuoteFlow] ${category}:`, error);
  }

  return { category, message };
}

// ============================================================================
// Sentry user context
// ============================================================================

export function setSentryUser(user: {
  id: string;
  email?: string;
  businessId?: string;
}): void {
  Sentry.setUser({ id: user.id, email: user.email });
  if (user.businessId) {
    Sentry.setTag("business_id", user.businessId);
  }
}

export function clearSentryUser(): void {
  Sentry.setUser(null);
}
