"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Pause, Play, Trash2, Loader2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type RecordingState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "paused"
  | "processing";

export type VoiceRecorderProps = {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
  maxDurationSeconds?: number;
  disabled?: boolean;
};

// ============================================================================
// Component
// ============================================================================

export function VoiceRecorder({
  onRecordingComplete,
  maxDurationSeconds = 300,
  disabled = false,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);

  // ---- Cleanup ----
  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // ---- Waveform drawing ----
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barCount = 40;
      const barWidth = width / barCount - 2;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] ?? 128;
        const amplitude = Math.abs(value - 128) / 128;
        const barHeight = Math.max(4, amplitude * height);

        ctx.fillStyle = "rgb(var(--color-brand-600))";
        ctx.fillRect(
          i * (barWidth + 2),
          (height - barHeight) / 2,
          barWidth,
          barHeight,
        );
      }
    };

    draw();
  }, []);

  // ---- Timer ----
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(
        pausedElapsedRef.current +
          Math.floor((Date.now() - startTimeRef.current) / 1000),
      );
    }, 200);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ---- Actions ----
  const startRecording = useCallback(async () => {
    setError(null);
    setState("requesting_permission");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Preferred MIME
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        setState("processing");
        const finalMime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const duration = elapsed;
        cleanup();
        setState("idle");
        setElapsed(0);
        pausedElapsedRef.current = 0;
        onRecordingComplete(blob, duration);
      };

      // Web Audio for waveform
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      recorder.start(250); // collect chunks every 250ms
      setState("recording");
      pausedElapsedRef.current = 0;
      startTimer();
      drawWaveform();

      // Auto-stop at max duration
      maxTimerRef.current = setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }
      }, maxDurationSeconds * 1000);
    } catch (err) {
      cleanup();
      setState("idle");

      if (err instanceof DOMException) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setError(
            "Microphone permission denied. Please allow microphone access in your browser settings.",
          );
          return;
        }
        if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          setError(
            "No microphone found. Please connect a microphone and try again.",
          );
          return;
        }
      }
      setError("Failed to start recording. Please try again.");
    }
  }, [
    cleanup,
    drawWaveform,
    elapsed,
    maxDurationSeconds,
    onRecordingComplete,
    startTimer,
  ]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      stopTimer();
      pausedElapsedRef.current = elapsed;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setState("paused");
    }
  }, [elapsed, stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      startTimer();
      drawWaveform();
      setState("recording");
    }
  }, [drawWaveform, startTimer]);

  const stopRecording = useCallback(() => {
    stopTimer();
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, [stopTimer]);

  const discardRecording = useCallback(() => {
    stopTimer();
    // Remove onstop handler so it doesn't fire onRecordingComplete
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }
    cleanup();
    setState("idle");
    setElapsed(0);
    pausedElapsedRef.current = 0;
  }, [cleanup, stopTimer]);

  // ---- Helpers ----
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const maxFormatted = formatTime(maxDurationSeconds);
  const isActive = state === "recording" || state === "paused";

  return (
    <div className="space-y-3">
      {/* Waveform canvas */}
      {isActive && (
        <div className="flex items-center justify-center rounded-lg bg-[hsl(var(--muted))] p-4">
          <canvas
            ref={canvasRef}
            width={280}
            height={60}
            className="w-full max-w-[280px]"
          />
        </div>
      )}

      {/* Timer */}
      {isActive && (
        <p className="text-center text-sm tabular-nums text-[hsl(var(--muted-foreground))]">
          {formatTime(elapsed)} / {maxFormatted}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {state === "idle" && (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
            aria-label="Start recording"
          >
            <Mic className="h-6 w-6" />
          </button>
        )}

        {state === "requesting_permission" && (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {state === "recording" && (
          <>
            <button
              type="button"
              onClick={pauseRecording}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--muted))]"
              aria-label="Pause recording"
            >
              <Pause className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-sm transition-colors hover:bg-red-700"
              aria-label="Stop recording"
            >
              <Square className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={discardRecording}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              aria-label="Discard recording"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}

        {state === "paused" && (
          <>
            <button
              type="button"
              onClick={resumeRecording}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--muted))]"
              aria-label="Resume recording"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-sm transition-colors hover:bg-red-700"
              aria-label="Stop recording"
            >
              <Square className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={discardRecording}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              aria-label="Discard recording"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}

        {state === "processing" && (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-center text-sm text-[hsl(var(--destructive))]">
          {error}
        </p>
      )}

      {/* Hint */}
      {state === "idle" && !error && (
        <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
          Tap to record a voice note (up to {Math.floor(maxDurationSeconds / 60)}{" "}
          min)
        </p>
      )}
    </div>
  );
}
