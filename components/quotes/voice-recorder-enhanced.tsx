"use client";

/**
 * Enhanced Voice Recorder - The "90-second magic" starts here
 * Circular waveform visualization with floating keyword detection
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Pause, Play, Trash2, Loader2, RotateCcw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CircularWaveform } from "./CircularWaveform";
import { useAudioAnalyser } from "@/lib/hooks/useAudioAnalyser";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { haptic } from "@/lib/haptics";
import { ease } from "@/lib/design-system/motion";

// ============================================================================
// Types
// ============================================================================

type RecordingState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "paused"
  | "processing"
  | "completed";

export type VoiceRecorderProps = {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
  maxDurationSeconds?: number;
  disabled?: boolean;
};

interface FloatingKeyword {
  id: string;
  text: string;
  x: number;
}

// ============================================================================
// Component
// ============================================================================

export function VoiceRecorderEnhanced({
  onRecordingComplete,
  maxDurationSeconds = 300,
  disabled = false,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<FloatingKeyword[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedBlob, setCompletedBlob] = useState<Blob | null>(null);
  const [completedDuration, setCompletedDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keywordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const transcriptBufferRef = useRef<string>("");

  const reducedMotion = useReducedMotion();

  // Web Audio API for visualization
  const { analyser } = useAudioAnalyser(streamRef.current, {
    fftSize: 256,
    smoothingTimeConstant: 0.8,
  });

  // ---- Cleanup ----
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (keywordTimerRef.current) {
      clearInterval(keywordTimerRef.current);
      keywordTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setKeywords([]);
    transcriptBufferRef.current = "";
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ---- Extract keywords (simulated real-time AI understanding) ----
  const extractKeywords = useCallback((text: string): string[] => {
    const keywords: string[] = [];

    // Extract capitalized words (proper nouns, equipment names)
    const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g);
    if (capitalizedWords) {
      keywords.push(...capitalizedWords.slice(0, 2));
    }

    // Extract measurements (numbers with units)
    const measurements = text.match(/\d+\s*(ft|feet|inch|in|meter|m|gallon|gal|ton|degree|°)/gi);
    if (measurements) {
      keywords.push(...measurements.slice(0, 2));
    }

    // Extract equipment-related terms
    const equipmentTerms = text.match(/\b(hvac|ac|furnace|compressor|condenser|evaporator|unit|system|pipe|duct|filter|coil|thermostat|valve|pump)\b/gi);
    if (equipmentTerms) {
      keywords.push(...equipmentTerms.slice(0, 1));
    }

    return keywords.slice(0, 2); // Limit to 2 keywords per extraction
  }, []);

  // ---- Keyword bubble simulation ----
  const spawnKeywordBubbles = useCallback(() => {
    // In production, this would use real-time transcript from AssemblyAI streaming
    // For now, simulate by extracting from mock transcript chunks
    const mockTranscriptChunks = [
      "The HVAC unit needs replacement",
      "Compressor is making loud noise",
      "Ductwork has 3 feet of damage",
      "Thermostat not responding",
      "Condenser coil is frozen",
      "Air filter completely clogged",
    ];

    const randomChunk = mockTranscriptChunks[Math.floor(Math.random() * mockTranscriptChunks.length)];
    if (!randomChunk) return;

    const extractedKeywords = extractKeywords(randomChunk);

    extractedKeywords.forEach((keyword) => {
      const newKeyword: FloatingKeyword = {
        id: `${Date.now()}-${Math.random()}`,
        text: keyword,
        x: Math.random() * 60 - 30, // Random x position around center (-30 to +30)
      };

      setKeywords((prev) => {
        // Keep max 3 visible at once
        const updated = [...prev, newKeyword];
        return updated.slice(-3);
      });

      // Remove keyword after animation completes
      setTimeout(() => {
        setKeywords((prev) => prev.filter((k) => k.id !== newKeyword.id));
      }, 3000);
    });
  }, [extractKeywords]);

  // ---- Timer ----
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(
        pausedElapsedRef.current +
          Math.floor((Date.now() - startTimeRef.current) / 1000),
      );
    }, 200);

    // Spawn keyword bubbles every 2 seconds during recording
    keywordTimerRef.current = setInterval(() => {
      spawnKeywordBubbles();
    }, 2000);
  }, [spawnKeywordBubbles]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (keywordTimerRef.current) {
      clearInterval(keywordTimerRef.current);
      keywordTimerRef.current = null;
    }
  }, []);

  // ---- Actions ----
  const startRecording = useCallback(async () => {
    setError(null);
    setState("requesting_permission");
    haptic.light();

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
        const recordedDuration = elapsed;

        // Stop media stream but keep the blob for playback
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setKeywords([]);

        // Create audio URL for playback review
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setCompletedBlob(blob);
        setCompletedDuration(recordedDuration);
        setState("completed");
      };

      recorder.start(250); // collect chunks every 250ms
      setState("recording");
      pausedElapsedRef.current = 0;
      startTimer();
      haptic.recording();

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
      haptic.error();

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
  }, [cleanup, elapsed, maxDurationSeconds, onRecordingComplete, startTimer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      stopTimer();
      pausedElapsedRef.current = elapsed;
      setState("paused");
      haptic.medium();
    }
  }, [elapsed, stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      startTimer();
      setState("recording");
      haptic.medium();
    }
  }, [startTimer]);

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
      haptic.success();
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
    haptic.delete();
  }, [cleanup, stopTimer]);

  // ---- Helpers ----
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ---- Keyboard handler ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          if (state === "idle") {
            startRecording();
          } else if (state === "recording" || state === "paused") {
            stopRecording();
          }
          break;
        case "p":
        case "P":
          e.preventDefault();
          if (state === "recording") {
            pauseRecording();
          } else if (state === "paused") {
            resumeRecording();
          }
          break;
        case "Escape":
          if (state === "recording" || state === "paused") {
            e.preventDefault();
            discardRecording();
          }
          break;
      }
    },
    [state, startRecording, stopRecording, pauseRecording, resumeRecording, discardRecording],
  );

  const maxFormatted = formatTime(maxDurationSeconds);
  const isActive = state === "recording" || state === "paused";
  const isRecording = state === "recording";

  return (
    <div className="relative space-y-6">
      {/* Main recorder interface */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Idle state - large record button with particles */}
        {state === "idle" && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            className="relative"
          >
            {/* Particle field background (skip for reduced motion) */}
            {!reducedMotion && (
              <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-1 w-1 rounded-full bg-primary-400/30"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -20, 0],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Record button */}
            <motion.button
              type="button"
              onClick={startRecording}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-colors hover:bg-brand-700 disabled:opacity-50"
              aria-label="Start recording. Press Space or Enter to begin."
              whileHover={reducedMotion ? {} : { scale: 1.05 }}
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
              animate={
                reducedMotion
                  ? {}
                  : {
                      boxShadow: [
                        "0 0 20px rgba(var(--color-brand-600), 0.3)",
                        "0 0 40px rgba(var(--color-brand-600), 0.5)",
                        "0 0 20px rgba(var(--color-brand-600), 0.3)",
                      ],
                    }
              }
              transition={reducedMotion ? {} : { duration: 2, repeat: Infinity }}
            >
              <Mic className="h-8 w-8" />
            </motion.button>

            <motion.p
              className="mt-4 text-center text-sm text-[hsl(var(--muted-foreground))]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reducedMotion ? { duration: 0.01 } : { delay: 0.2 }}
            >
              Tap to describe the job
            </motion.p>
          </motion.div>
        )}

        {/* Requesting permission state */}
        {state === "requesting_permission" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-white"
          >
            <Loader2 className="h-8 w-8 animate-spin" />
          </motion.div>
        )}

        {/* Recording/Paused state - circular waveform */}
        {isActive && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
            className="relative"
          >
            {/* Circular waveform (static circle in reduced motion) */}
            {reducedMotion ? (
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-full bg-brand-600/20 ring-4 ring-brand-600/40">
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatTime(elapsed)}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">of {maxFormatted}</p>
                </div>
              </div>
            ) : (
              <>
                <CircularWaveform
                  analyser={analyser}
                  isRecording={isRecording}
                  duration={elapsed}
                  maxDuration={maxDurationSeconds}
                  size={200}
                  className="drop-shadow-lg"
                />

                {/* Timer in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-semibold tabular-nums text-white drop-shadow-md">
                      {formatTime(elapsed)}
                    </p>
                    <p className="text-xs text-white/70">of {maxFormatted}</p>
                  </div>
                </div>

                {/* Floating keyword bubbles */}
                <AnimatePresence mode="popLayout">
                  {keywords.map((keyword) => (
                    <motion.div
                      key={keyword.id}
                      initial={{ opacity: 0, y: 0, scale: 0.8 }}
                      animate={{ opacity: [0, 1, 1, 0], y: -100, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 3, ease: ease.enter }}
                      className="pointer-events-none absolute left-1/2 top-1/2 z-10"
                      style={{ x: keyword.x }}
                    >
                      <div className="rounded-full bg-primary-500/90 px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
                        {keyword.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}

        {/* Processing state */}
        {state === "processing" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              Processing recording...
            </p>
          </motion.div>
        )}

        {/* Completed state - playback review */}
        {state === "completed" && audioUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Hidden audio element */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              ref={audioRef}
              src={audioUrl}
              className="hidden"
              onEnded={() => setIsPlaying(false)}
            />

            {/* Play/pause button */}
            <motion.button
              type="button"
              onClick={() => {
                if (!audioRef.current) return;
                if (isPlaying) {
                  audioRef.current.pause();
                  setIsPlaying(false);
                } else {
                  audioRef.current.play();
                  setIsPlaying(true);
                }
              }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-colors hover:bg-brand-700"
              aria-label={isPlaying ? "Pause playback" : "Play recording"}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="ml-1 h-8 w-8" />
              )}
            </motion.button>

            {/* Duration display */}
            <p className="text-lg font-semibold tabular-nums">
              {formatTime(completedDuration)}
            </p>

            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Review your recording before continuing
            </p>

            {/* Action buttons */}
            <div className="flex w-full gap-3">
              <motion.button
                type="button"
                onClick={() => {
                  if (audioUrl) URL.revokeObjectURL(audioUrl);
                  setAudioUrl(null);
                  setCompletedBlob(null);
                  setCompletedDuration(0);
                  setIsPlaying(false);
                  setElapsed(0);
                  pausedElapsedRef.current = 0;
                  setState("idle");
                  haptic.light();
                }}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] text-sm font-medium transition-colors hover:bg-[hsl(var(--muted))]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RotateCcw className="h-4 w-4" />
                Re-record
              </motion.button>
              <motion.button
                type="button"
                onClick={() => {
                  if (!completedBlob) return;
                  const blob = completedBlob;
                  const dur = completedDuration;

                  // Clean up playback state
                  if (audioUrl) URL.revokeObjectURL(audioUrl);
                  setAudioUrl(null);
                  setCompletedBlob(null);
                  setCompletedDuration(0);
                  setIsPlaying(false);
                  setElapsed(0);
                  pausedElapsedRef.current = 0;
                  setState("idle");

                  haptic.success();
                  onRecordingComplete(blob, dur);
                }}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Check className="h-4 w-4" />
                Use This Recording
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex items-center justify-center gap-3"
          >
            {state === "recording" && (
              <>
                <motion.button
                  type="button"
                  onClick={pauseRecording}
                  onKeyDown={handleKeyDown}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/80 backdrop-blur-sm transition-colors hover:bg-[hsl(var(--muted))]"
                  aria-label="Pause recording (P)"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Pause className="h-5 w-5" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={stopRecording}
                  onKeyDown={handleKeyDown}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700"
                  aria-label="Stop recording (Space)"
                  whileHover={reducedMotion ? {} : { scale: 1.05 }}
                  whileTap={reducedMotion ? {} : { scale: 0.95 }}
                  animate={
                    reducedMotion
                      ? {}
                      : {
                          boxShadow: [
                            "0 0 0 0 rgba(239, 68, 68, 0.4)",
                            "0 0 0 10px rgba(239, 68, 68, 0)",
                          ],
                        }
                  }
                  transition={reducedMotion ? {} : { duration: 1.5, repeat: Infinity }}
                >
                  <Square className="h-6 w-6" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={discardRecording}
                  onKeyDown={handleKeyDown}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/80 text-[hsl(var(--muted-foreground))] backdrop-blur-sm transition-colors hover:bg-[hsl(var(--muted))]"
                  aria-label="Discard recording (Escape)"
                  whileHover={reducedMotion ? {} : { scale: 1.1 }}
                  whileTap={reducedMotion ? {} : { scale: 0.9 }}
                >
                  <Trash2 className="h-5 w-5" />
                </motion.button>
              </>
            )}

            {state === "paused" && (
              <>
                <motion.button
                  type="button"
                  onClick={resumeRecording}
                  onKeyDown={handleKeyDown}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/80 backdrop-blur-sm transition-colors hover:bg-[hsl(var(--muted))]"
                  aria-label="Resume recording (P)"
                  whileHover={reducedMotion ? {} : { scale: 1.1 }}
                  whileTap={reducedMotion ? {} : { scale: 0.9 }}
                >
                  <Play className="h-5 w-5" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={stopRecording}
                  onKeyDown={handleKeyDown}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700"
                  aria-label="Stop recording (Space)"
                  whileHover={reducedMotion ? {} : { scale: 1.05 }}
                  whileTap={reducedMotion ? {} : { scale: 0.95 }}
                >
                  <Square className="h-6 w-6" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={discardRecording}
                  onKeyDown={handleKeyDown}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/80 text-[hsl(var(--muted-foreground))] backdrop-blur-sm transition-colors hover:bg-[hsl(var(--muted))]"
                  aria-label="Discard recording (Escape)"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 className="h-5 w-5" />
                </motion.button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center text-sm text-[hsl(var(--destructive))]"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Keyboard hints for recording state */}
      {isActive && (
        <p className="text-center text-xs text-[hsl(var(--muted-foreground))] hidden sm:block">
          Space: Stop &middot; P: {state === "paused" ? "Resume" : "Pause"} &middot; Esc: Cancel
        </p>
      )}

      {/* Hint */}
      {state === "idle" && !error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-[hsl(var(--muted-foreground))]"
        >
          AI will analyze your voice note in real-time •{" "}
          {Math.floor(maxDurationSeconds / 60)} min max
        </motion.p>
      )}
    </div>
  );
}
