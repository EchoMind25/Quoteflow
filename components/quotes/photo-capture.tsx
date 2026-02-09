"use client";

import { useState, useRef } from "react";
import { Camera, Upload, X, ImageIcon } from "lucide-react";
import { haptics } from "@/lib/utils/haptics";

// ============================================================================
// Types
// ============================================================================

type PhotoCaptureProps = {
  onPhotosChange: (files: File[]) => void;
  maxPhotos?: number;
  maxSizeMB?: number;
};

// ============================================================================
// Component
// ============================================================================

export function PhotoCapture({
  onPhotosChange,
  maxPhotos = 10,
  maxSizeMB = 10,
}: PhotoCaptureProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const atLimit = files.length >= maxPhotos;

  // ---- File validation ----
  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `${file.name} exceeds ${maxSizeMB}MB limit`;
    }
    if (!file.type.startsWith("image/")) {
      return `${file.name} is not an image`;
    }
    return null;
  };

  // ---- File upload handler ----
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    // Reset the input so the same file can be re-selected
    e.target.value = "";

    if (files.length + selectedFiles.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of selectedFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newPreviews = await Promise.all(
      validFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(file);
          }),
      ),
    );

    const updatedFiles = [...files, ...validFiles];
    const updatedPreviews = [...previews, ...newPreviews];

    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onPhotosChange(updatedFiles);
    setError(null);
    haptics.light();
  };

  // ---- Camera handlers ----
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setError(null);
      }
    } catch {
      setError("Camera access denied. Please use file upload instead.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    if (atLimit) {
      setError(`Maximum ${maxPhotos} photos reached`);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }

        const preview = URL.createObjectURL(blob);
        const updatedFiles = [...files, file];
        const updatedPreviews = [...previews, preview];

        setFiles(updatedFiles);
        setPreviews(updatedPreviews);
        onPhotosChange(updatedFiles);
        setError(null);
        haptics.success();
      },
      "image/jpeg",
      0.9,
    );
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  // ---- Remove photo ----
  const removePhoto = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);

    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onPhotosChange(updatedFiles);
    setError(null);
    haptics.medium();
  };

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Action buttons */}
      {!isCameraActive && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={startCamera}
            disabled={atLimit}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera className="h-5 w-5" />
            <span>Take Photo</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={atLimit}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 py-3 transition-colors hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-5 w-5" />
            <span>Upload</span>
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Camera preview */}
      {isCameraActive && (
        <div className="relative overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={atLimit}
              className="h-16 w-16 rounded-full border-4 border-gray-300 bg-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              aria-label="Capture photo"
            />
            <button
              type="button"
              onClick={stopCamera}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform active:scale-95"
              aria-label="Close camera"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Photo previews */}
      {previews.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {previews.map((preview, index) => (
              <div key={preview} className="group relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="h-full w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <p className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
            <ImageIcon className="h-4 w-4" />
            {files.length} of {maxPhotos} photos added
          </p>
        </>
      )}

      {/* Empty state */}
      {previews.length === 0 && !isCameraActive && (
        <div className="rounded-lg border-2 border-dashed border-[hsl(var(--border))] py-12 text-center">
          <ImageIcon className="mx-auto mb-3 h-12 w-12 text-[hsl(var(--muted-foreground))]" />
          <p className="text-[hsl(var(--foreground))]">No photos yet</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Take photos or upload from device
          </p>
        </div>
      )}
    </div>
  );
}
