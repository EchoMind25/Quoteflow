import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export type SignedPhotoUrl = {
  originalPath: string;
  signedUrl: string;
  expiresAt: Date;
};

export type SignedUrlResult = {
  urls: SignedPhotoUrl[];
  errors: string[];
};

// ============================================================================
// Signed URL generation
// ============================================================================

/** Default expiry for signed photo URLs (5 minutes) */
const SIGNED_URL_EXPIRY_SECONDS = 300;

/**
 * Generate time-limited signed URLs for photo access.
 * Uses Supabase Storage's built-in signed URL feature.
 *
 * @param storagePaths - Array of Supabase Storage paths (e.g., "businessId/timestamp-random.webp")
 * @param bucket - Storage bucket name (defaults to "quote-photos")
 * @param expirySeconds - URL validity in seconds (defaults to 300 / 5 minutes)
 * @returns Object with signed URLs and any errors
 */
export async function generateSignedPhotoUrls(
  storagePaths: string[],
  bucket = "quote-photos",
  expirySeconds = SIGNED_URL_EXPIRY_SECONDS,
): Promise<SignedUrlResult> {
  if (storagePaths.length === 0) {
    return { urls: [], errors: [] };
  }

  const supabase = await createClient();
  const urls: SignedPhotoUrl[] = [];
  const errors: string[] = [];
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  // Supabase supports batch signed URL creation
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(storagePaths, expirySeconds);

  if (error) {
    errors.push(`Batch signed URL generation failed: ${error.message}`);
    return { urls, errors };
  }

  if (data) {
    for (const item of data) {
      if (item.error) {
        errors.push(
          `Failed to sign ${item.path ?? "unknown"}: ${item.error}`,
        );
      } else if (item.signedUrl) {
        urls.push({
          originalPath: item.path ?? "",
          signedUrl: item.signedUrl,
          expiresAt,
        });
      }
    }
  }

  return { urls, errors };
}
