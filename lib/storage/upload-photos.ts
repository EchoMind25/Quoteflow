"use server";

import { createClient } from "@/lib/supabase/server";
import { compressUploadedImage } from "@/lib/media/server-image";

// ============================================================================
// Types
// ============================================================================

export type UploadedPhoto = {
  storagePath: string;
  publicUrl: string;
  sizeBytes: number;
  originalFilename: string;
  mimeType: string;
};

export type UploadPhotosResult = {
  photos?: UploadedPhoto[];
  error?: string;
};

// ============================================================================
// Upload photos with server-side compression
// ============================================================================

export async function uploadQuotePhotos(
  _prevState: UploadPhotosResult,
  formData: FormData,
): Promise<UploadPhotosResult> {
  try {
    const files = formData.getAll("photos") as File[];
    const businessId = formData.get("business_id") as string;

    if (!businessId) {
      return { error: "Business ID is required." };
    }

    if (files.length === 0) {
      return { error: "No photos provided." };
    }

    if (files.length > 10) {
      return { error: "Maximum 10 photos allowed." };
    }

    const supabase = await createClient();
    const results: UploadedPhoto[] = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        return { error: `${file.name} exceeds 10MB limit.` };
      }

      if (!file.type.startsWith("image/")) {
        return { error: `${file.name} is not an image.` };
      }

      // Compress with sharp (max 1920px, WebP at 85%)
      const arrayBuffer = await file.arrayBuffer();
      const compressed = await compressUploadedImage(arrayBuffer);

      // Generate unique path: {businessId}/{timestamp}-{random}.{ext}
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const ext = compressed.contentType === "image/webp" ? "webp" : "jpg";
      const storagePath = `${businessId}/${timestamp}-${random}.${ext}`;

      const { data, error: uploadError } = await supabase.storage
        .from("quote-photos")
        .upload(storagePath, compressed.buffer, {
          contentType: compressed.contentType,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        // eslint-disable-next-line no-console
        console.error("Photo upload failed:", uploadError.message);
        return { error: `Failed to upload ${file.name}: ${uploadError.message}` };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("quote-photos").getPublicUrl(data.path);

      results.push({
        storagePath: data.path,
        publicUrl,
        sizeBytes: compressed.buffer.length,
        originalFilename: file.name,
        mimeType: compressed.contentType,
      });
    }

    return { photos: results };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Upload photos error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to upload photos.",
    };
  }
}

// ============================================================================
// Save photo records to quote_photos table
// ============================================================================

export async function saveQuotePhotos(
  quoteId: string,
  photos: UploadedPhoto[],
): Promise<{ error?: string }> {
  if (photos.length === 0) return {};

  const supabase = await createClient();

  const rows = photos.map((photo, index) => ({
    quote_id: quoteId,
    storage_path: photo.storagePath,
    original_filename: photo.originalFilename,
    mime_type: photo.mimeType,
    size_bytes: photo.sizeBytes,
    sort_order: index,
  }));

  const { error } = await supabase.from("quote_photos").insert(rows);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to save photo records:", error.message);
    return { error: error.message };
  }

  return {};
}

// ============================================================================
// Delete photos from storage
// ============================================================================

export async function deleteQuotePhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.storage.from("quote-photos").remove(paths);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to delete photos:", error.message);
  }
}
