import sharp from "sharp";

// ============================================================================
// Constants
// ============================================================================

const MAX_DIMENSION = 1920;
const THUMBNAIL_SIZE = 300;
const QUALITY = 85;

// ============================================================================
// Compress uploaded photo to WebP (JPEG fallback)
// ============================================================================

export type CompressedImage = {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
};

export async function compressUploadedImage(
  input: Buffer | ArrayBuffer,
): Promise<CompressedImage> {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);

  const image = sharp(buf);
  const metadata = await image.metadata();

  let width = metadata.width ?? MAX_DIMENSION;
  let height = metadata.height ?? MAX_DIMENSION;

  // Scale down if needed
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Try WebP first, fall back to JPEG
  try {
    const result = await sharp(buf)
      .resize(width, height, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      contentType: "image/webp",
      width: result.info.width,
      height: result.info.height,
    };
  } catch {
    // WebP not supported, fall back to JPEG
    const result = await sharp(buf)
      .resize(width, height, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      contentType: "image/jpeg",
      width: result.info.width,
      height: result.info.height,
    };
  }
}

// ============================================================================
// Generate thumbnail (300x300px)
// ============================================================================

export type Thumbnail = {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
};

export async function generateThumbnail(
  input: Buffer | ArrayBuffer,
): Promise<Thumbnail> {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);

  try {
    const result = await sharp(buf)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 75 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      contentType: "image/webp",
      width: result.info.width,
      height: result.info.height,
    };
  } catch {
    const result = await sharp(buf)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({ quality: 75 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: result.data,
      contentType: "image/jpeg",
      width: result.info.width,
      height: result.info.height,
    };
  }
}

// ============================================================================
// Process and upload photo with thumbnail
// ============================================================================

export type ProcessedPhoto = {
  fullPath: string;
  thumbnailPath: string;
  contentType: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export async function processPhoto(
  fileBuffer: Buffer | ArrayBuffer,
  storagePath: string,
  uploadFn: (
    path: string,
    data: Buffer,
    contentType: string,
  ) => Promise<void>,
): Promise<ProcessedPhoto> {
  // Compress full image
  const full = await compressUploadedImage(fileBuffer);
  const ext = full.contentType === "image/webp" ? "webp" : "jpg";
  const fullPath = storagePath.replace(/\.[^.]+$/, `.${ext}`);

  // Generate thumbnail
  const thumb = await generateThumbnail(fileBuffer);
  const thumbExt = thumb.contentType === "image/webp" ? "webp" : "jpg";
  const thumbnailPath = storagePath.replace(
    /\.[^.]+$/,
    `_thumb.${thumbExt}`,
  );

  // Upload both
  await Promise.all([
    uploadFn(fullPath, full.buffer, full.contentType),
    uploadFn(thumbnailPath, thumb.buffer, thumb.contentType),
  ]);

  return {
    fullPath,
    thumbnailPath,
    contentType: full.contentType,
    width: full.width,
    height: full.height,
    sizeBytes: full.buffer.length,
  };
}
