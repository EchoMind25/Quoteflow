"use client";

import { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";
import { haptics } from "@/lib/utils/haptics";

export function PhotoCapture({
  onPhotosChange,
}: {
  onPhotosChange: (files: File[]) => void;
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);

    // Validate: max 10MB per photo
    const validFiles = selectedFiles.filter((f) => {
      if (f.size > 10 * 1024 * 1024) {
        console.warn(`${f.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });

    // Create previews
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
    haptics.light();
  };

  const removePhoto = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);

    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onPhotosChange(updatedFiles);
    haptics.medium();
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch {
      console.warn("Camera access denied");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

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
        const preview = URL.createObjectURL(blob);

        const updatedFiles = [...files, file];
        const updatedPreviews = [...previews, preview];

        setFiles(updatedFiles);
        setPreviews(updatedPreviews);
        onPhotosChange(updatedFiles);
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

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={startCamera}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-white transition-colors hover:bg-brand-700"
        >
          <Camera className="h-5 w-5" />
          <span>Take Photo</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 py-3 transition-colors hover:bg-[hsl(var(--muted))]"
        >
          <Upload className="h-5 w-5" />
          <span>Upload</span>
        </button>
      </div>

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
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <button
              type="button"
              onClick={capturePhoto}
              className="h-16 w-16 rounded-full bg-white shadow-lg"
              aria-label="Capture photo"
            />
            <button
              type="button"
              onClick={stopCamera}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg"
              aria-label="Close camera"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Photo previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previews.map((preview, index) => (
            <div key={preview} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="h-full w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white"
                aria-label={`Remove photo ${index + 1}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {files.length} photo{files.length !== 1 ? "s" : ""} added (max 10MB
        each)
      </p>
    </div>
  );
}
