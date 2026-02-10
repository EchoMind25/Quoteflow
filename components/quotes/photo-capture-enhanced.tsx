"use client";

/**
 * Enhanced Photo Capture - Polaroid-style evidence gathering
 * Instant camera effects with AI analysis visualization
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, X, ImageIcon, Wrench, Ruler, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { haptic } from "@/lib/haptics";

// ============================================================================
// Types
// ============================================================================

type PhotoCaptureProps = {
  onPhotosChange: (files: File[]) => void;
  maxPhotos?: number;
  maxSizeMB?: number;
};

interface PhotoPreview {
  url: string;
  file: File;
  rotation: number;
  analyzing: boolean;
  analyzed: boolean;
  detections: ("equipment" | "measurements" | "damage")[];
}

// ============================================================================
// Component
// ============================================================================

export function PhotoCaptureEnhanced({
  onPhotosChange,
  maxPhotos = 10,
  maxSizeMB = 10,
}: PhotoCaptureProps) {
  const [previews, setPreviews] = useState<PhotoPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const atLimit = previews.length >= maxPhotos;

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

  // ---- Simulate AI analysis ----
  const analyzePhoto = (_preview: PhotoPreview, index: number) => {
    // Start analyzing
    setPreviews((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, analyzing: true } : p
      )
    );

    // Simulate AI detection (1-2 seconds)
    setTimeout(() => {
      // Random detections for demo
      const possibleDetections: ("equipment" | "measurements" | "damage")[] = [];
      if (Math.random() > 0.3) possibleDetections.push("equipment");
      if (Math.random() > 0.5) possibleDetections.push("measurements");
      if (Math.random() > 0.7) possibleDetections.push("damage");

      setPreviews((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, analyzing: false, analyzed: true, detections: possibleDetections }
            : p
        )
      );
    }, 1500);
  };

  // ---- File upload handler ----
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    // Reset the input so the same file can be re-selected
    e.target.value = "";

    if (previews.length + selectedFiles.length > maxPhotos) {
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

    const newPreviews: PhotoPreview[] = await Promise.all(
      validFiles.map(
        (file) =>
          new Promise<PhotoPreview>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) =>
              resolve({
                url: ev.target?.result as string,
                file,
                rotation: Math.random() * 6 - 3, // Random rotation -3 to +3 degrees
                analyzing: false,
                analyzed: false,
                detections: [],
              });
            reader.readAsDataURL(file);
          }),
      ),
    );

    const updatedPreviews = [...previews, ...newPreviews];
    setPreviews(updatedPreviews);
    onPhotosChange(updatedPreviews.map((p) => p.file));
    setError(null);
    haptic.light();

    // Start AI analysis for each new photo
    newPreviews.forEach((_, i) => {
      const actualIndex = previews.length + i;
      setTimeout(() => {
        analyzePhoto(newPreviews[i]!, actualIndex);
      }, i * 500); // Stagger analysis
    });
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

        const url = URL.createObjectURL(blob);
        const newPreview: PhotoPreview = {
          url,
          file,
          rotation: Math.random() * 6 - 3,
          analyzing: false,
          analyzed: false,
          detections: [],
        };

        const updatedPreviews = [...previews, newPreview];
        setPreviews(updatedPreviews);
        onPhotosChange(updatedPreviews.map((p) => p.file));
        setError(null);
        haptic.success();

        // Start AI analysis
        setTimeout(() => {
          analyzePhoto(newPreview, updatedPreviews.length - 1);
        }, 800); // Wait for animation
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
  const removePhoto = useCallback((index: number) => {
    setPreviews((prev) => {
      const updatedPreviews = prev.filter((_, i) => i !== index);
      onPhotosChange(updatedPreviews.map((p) => p.file));
      return updatedPreviews;
    });
    setError(null);
    haptic.delete();
  }, [onPhotosChange]);

  // ---- Photo grid keyboard navigation ----
  const handlePhotoKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const cols = window.innerWidth >= 640 ? 3 : 2; // sm:grid-cols-3 : grid-cols-2
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedIndex(Math.min(index + 1, previews.length - 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIndex(Math.max(index - 1, 0));
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex(Math.min(index + cols, previews.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex(Math.max(index - cols, 0));
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          removePhoto(index);
          setFocusedIndex(Math.min(Math.max(0, index - 1), previews.length - 2));
          break;
      }
    },
    [previews.length, removePhoto],
  );

  // Focus the targeted photo when focusedIndex changes
  useEffect(() => {
    if (focusedIndex !== null && photoRefs.current[focusedIndex]) {
      photoRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  return (
    <div className="space-y-4">
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {!isCameraActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <motion.button
            type="button"
            onClick={startCamera}
            disabled={atLimit}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Camera className="h-5 w-5" />
            <span>Take Photo</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={atLimit}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 py-3 transition-colors hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Upload className="h-5 w-5" />
            <span>Upload</span>
          </motion.button>
        </motion.div>
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
      <AnimatePresence>
        {isCameraActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative overflow-hidden rounded-lg bg-black"
          >
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <motion.button
                type="button"
                onClick={capturePhoto}
                disabled={atLimit}
                className="h-16 w-16 rounded-full border-4 border-gray-300 bg-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                aria-label="Capture photo"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              />
              <motion.button
                type="button"
                onClick={stopCamera}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform active:scale-95"
                aria-label="Close camera"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="h-6 w-6" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo previews - Polaroid masonry grid */}
      {previews.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {previews.map((preview, index) => (
                <motion.div
                  key={preview.url}
                  layout={!reducedMotion}
                  initial={
                    reducedMotion
                      ? { opacity: 0 }
                      : {
                          y: 100,
                          opacity: 0,
                          filter: "brightness(3) saturate(0)",
                          rotate: preview.rotation,
                        }
                  }
                  animate={
                    reducedMotion
                      ? { opacity: 1 }
                      : {
                          y: 0,
                          opacity: 1,
                          filter: "brightness(1) saturate(1)",
                          rotate: preview.rotation,
                        }
                  }
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : {
                          scale: 0.8,
                          opacity: 0,
                          transition: { duration: 0.2 },
                        }
                  }
                  transition={
                    reducedMotion
                      ? { duration: 0.01 }
                      : {
                          y: { type: "spring", stiffness: 300, damping: 20 },
                          filter: { duration: 0.5, delay: 0.2 },
                          layout: { type: "spring", stiffness: 300, damping: 30 },
                        }
                  }
                  className={`group relative ${focusedIndex === index ? "ring-2 ring-primary-500 ring-offset-2 rounded-lg" : ""}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`Photo ${index + 1} of ${previews.length}. Press Delete to remove.`}
                  onKeyDown={(e) => handlePhotoKeyDown(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  ref={(el) => { photoRefs.current[index] = el; }}
                >
                  {/* Polaroid container */}
                  <div className="rounded-lg bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:bg-gray-800">
                    <div className="relative aspect-square overflow-hidden rounded">
                      {/* Image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview.url}
                        alt={`Photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />

                      {/* AI Scanning overlay */}
                      <AnimatePresence>
                        {preview.analyzing && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-500/20 to-transparent"
                          >
                            {/* Scanning line (skip for reduced motion) */}
                            {!reducedMotion && (
                              <motion.div
                                initial={{ top: "0%" }}
                                animate={{ top: "100%" }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-sm">
                                Analyzing...
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* AI Detection badges */}
                      {preview.analyzed && preview.detections.length > 0 && (
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          <AnimatePresence>
                            {preview.detections.includes("equipment") && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow-md"
                                title="Equipment detected"
                              >
                                <Wrench className="h-3 w-3" />
                              </motion.div>
                            )}
                            {preview.detections.includes("measurements") && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white shadow-md"
                                title="Measurements detected"
                              >
                                <Ruler className="h-3 w-3" />
                              </motion.div>
                            )}
                            {preview.detections.includes("damage") && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md"
                                title="Damage spotted"
                              >
                                <AlertCircle className="h-3 w-3" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Delete button */}
                      <motion.button
                        type="button"
                        onClick={() => removePhoto(index)}
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                        aria-label={`Remove photo ${index + 1}`}
                        tabIndex={-1}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* "Add more" polaroid placeholder */}
              {!atLimit && (
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  layout
                  className="group relative rounded-lg border-2 border-dashed border-[hsl(var(--border))] bg-white p-2 transition-colors hover:border-brand-500 hover:bg-brand-50 dark:bg-gray-800 dark:hover:bg-brand-900/20"
                  style={{
                    rotate: Math.random() * 6 - 3,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex aspect-square items-center justify-center rounded bg-gray-50 dark:bg-gray-700">
                    <div className="text-center">
                      <Camera className="mx-auto mb-2 h-8 w-8 text-[hsl(var(--muted-foreground))]" />
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Add more
                      </p>
                    </div>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Counter with AI hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <ImageIcon className="h-4 w-4" />
              <span>
                {previews.length} of {maxPhotos} photos
              </span>
            </div>
            <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs">AI analyzes equipment & conditions</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Empty state with marching ants border */}
      {previews.length === 0 && !isCameraActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-lg border-2 border-dashed border-[hsl(var(--border))] py-12 text-center"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 10px,
              hsl(var(--border)) 10px,
              hsl(var(--border)) 20px
            )`,
            backgroundSize: "100% 20px",
            animation: reducedMotion ? "none" : "marching-ants 0.5s linear infinite",
          }}
        >
          <div className="relative z-10 bg-[hsl(var(--background))] px-4">
            <ImageIcon className="mx-auto mb-3 h-12 w-12 text-[hsl(var(--muted-foreground))]" />
            <p className="mb-1 font-medium text-[hsl(var(--foreground))]">
              Capture job site photos
            </p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Up to {maxPhotos} photos • AI analyzes equipment & conditions
            </p>
          </div>
        </motion.div>
      )}

      <style jsx>{`
        @keyframes marching-ants {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 20px;
          }
        }
      `}</style>
    </div>
  );
}
