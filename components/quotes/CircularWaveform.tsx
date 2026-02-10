"use client";

/**
 * Circular waveform visualizer for voice recording
 * Creates a beautiful circular audio visualization with color mapping
 */

import { useEffect, useRef } from "react";
import { getDominantFrequencyRange } from "@/lib/hooks/useAudioAnalyser";

interface CircularWaveformProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
  duration: number;
  maxDuration: number; // In seconds
  size?: number;
  className?: string;
}

export function CircularWaveform({
  analyser,
  isRecording,
  duration,
  maxDuration,
  size = 200,
  className = "",
}: CircularWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const rotationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isRecording || !analyser) {
      // Cancel animation if stopped
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size * 0.3; // Inner radius
    const maxAmplitude = size * 0.15; // How far waves extend

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Color palette based on volume
    const getColorForVolume = (
      volume: number,
      frequencyRange: "low" | "mid" | "high"
    ): string => {
      // Map volume (0-1) to color intensity
      if (frequencyRange === "low") {
        // Cool blue for bass
        return `rgba(59, 130, 246, ${0.6 + volume * 0.4})`;
      } else if (frequencyRange === "high") {
        // Warm orange for treble
        return `rgba(251, 146, 60, ${0.6 + volume * 0.4})`;
      } else {
        // Purple for mid
        return `rgba(168, 85, 247, ${0.6 + volume * 0.4})`;
      }
    };

    const draw = () => {
      if (!isRecording) return;

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume for color mapping
      const averageVolume =
        dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;

      // Get dominant frequency range
      const frequencyRange = getDominantFrequencyRange(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Slowly rotate the waveform
      rotationRef.current += 0.002; // 1 full rotation every ~52 seconds

      // Draw circular waveform
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRef.current);

      // Draw the waveform as a continuous path
      ctx.beginPath();

      const points: { x: number; y: number }[] = [];

      // Sample fewer points for smoother curves
      const sampleSize = 64; // Number of points around the circle
      const step = bufferLength / sampleSize;

      for (let i = 0; i < sampleSize; i++) {
        const dataIndex = Math.floor(i * step);
        const amplitude = (dataArray[dataIndex] ?? 0) / 255;
        const angle = (i / sampleSize) * Math.PI * 2;

        // Calculate point position
        const radius = baseRadius + amplitude * maxAmplitude;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        points.push({ x, y });
      }

      // Draw smooth bezier curves between points
      if (points.length > 0) {
        const firstPoint = points[0];
        if (firstPoint) {
          ctx.moveTo(firstPoint.x, firstPoint.y);
        }

        for (let i = 0; i < points.length; i++) {
          const current = points[i];
          const next = points[(i + 1) % points.length];

          if (current && next) {
            // Calculate control point for smooth curve
            const cpX = (current.x + next.x) / 2;
            const cpY = (current.y + next.y) / 2;

            ctx.quadraticCurveTo(current.x, current.y, cpX, cpY);
          }
        }

        // Close the path
        ctx.closePath();

        // Apply color based on volume and frequency
        const color = getColorForVolume(averageVolume, frequencyRange);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Add glow effect on peaks
        if (averageVolume > 0.5) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Fill with gradient for depth
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
        gradient.addColorStop(
          0,
          color.replace(/[\d.]+\)$/, `${0.1 + averageVolume * 0.2})`)
        );
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      ctx.restore();

      // Draw progress ring (outer circle showing time remaining)
      const progress = duration / maxDuration;
      const progressRadius = size * 0.46;

      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        progressRadius,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2
      );
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Start drawing
    draw();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isRecording, duration, maxDuration, size]);

  // Fallback for low-power devices
  const isLowPowerDevice =
    typeof navigator !== "undefined" &&
    navigator.hardwareConcurrency &&
    navigator.hardwareConcurrency < 4;

  if (isLowPowerDevice && isRecording) {
    // Show static pulse instead of animated waveform
    return (
      <div
        className={`relative ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 rounded-full border-4 border-primary-400 animate-pulse" />
        <div className="absolute inset-4 rounded-full border-2 border-primary-300 opacity-50 animate-pulse animation-delay-150" />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
