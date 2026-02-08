const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;

/**
 * Compresses an image blob: resizes to max 1920px on longest side, converts to JPEG at 85% quality.
 * Uses OffscreenCanvas when available (modern browsers + SW), falls back to HTMLCanvasElement.
 */
export async function compressImage(blob: Blob): Promise<Blob> {
  // Skip non-image blobs
  if (!blob.type.startsWith("image/")) {
    return blob;
  }

  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  // Calculate target dimensions
  let targetWidth = width;
  let targetHeight = height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    targetWidth = Math.round(width * ratio);
    targetHeight = Math.round(height * ratio);
  }

  // Skip compression if image is already small enough and is JPEG
  if (
    targetWidth === width &&
    targetHeight === height &&
    blob.type === "image/jpeg"
  ) {
    bitmap.close();
    return blob;
  }

  // Try OffscreenCanvas first (works in Service Workers and modern browsers)
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      bitmap.close();
      return canvas.convertToBlob({
        type: "image/jpeg",
        quality: JPEG_QUALITY,
      });
    }
  }

  // Fallback: HTMLCanvasElement (main thread only)
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      bitmap.close();
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error("Canvas toBlob returned null"));
            }
          },
          "image/jpeg",
          JPEG_QUALITY,
        );
      });
    }
  }

  // If neither canvas option is available, return original
  bitmap.close();
  return blob;
}
