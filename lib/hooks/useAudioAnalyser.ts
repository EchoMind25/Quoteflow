/**
 * Hook for Web Audio API analyser
 * Provides real-time frequency and volume data for visualization
 */

import { useEffect, useRef, useState } from "react";

interface AudioAnalyserData {
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array | null;
  audioContext: AudioContext | null;
  averageVolume: number;
  peakVolume: number;
}

interface UseAudioAnalyserOptions {
  fftSize?: number; // Power of 2 between 32-32768, default 256
  smoothingTimeConstant?: number; // 0-1, default 0.8
  minDecibels?: number; // Default -100
  maxDecibels?: number; // Default -30
}

/**
 * Hook to create and manage Web Audio API analyser for real-time audio visualization
 *
 * @param mediaStream - MediaStream from getUserMedia or MediaRecorder
 * @param options - Web Audio API analyser configuration
 * @returns Audio analysis data updated in real-time
 *
 * @example
 * const { analyser, frequencyData, averageVolume } = useAudioAnalyser(stream, {
 *   fftSize: 256,
 *   smoothingTimeConstant: 0.8
 * });
 */
export function useAudioAnalyser(
  mediaStream: MediaStream | null,
  options: UseAudioAnalyserOptions = {}
): AudioAnalyserData {
  const {
    fftSize = 256,
    smoothingTimeConstant = 0.8,
    minDecibels = -100,
    maxDecibels = -30,
  } = options;

  const [analyserData, setAnalyserData] = useState<AudioAnalyserData>({
    analyser: null,
    frequencyData: null,
    audioContext: null,
    averageVolume: 0,
    peakVolume: 0,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mediaStream) {
      // Cleanup if stream is removed
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
      setAnalyserData({
        analyser: null,
        frequencyData: null,
        audioContext: null,
        averageVolume: 0,
        peakVolume: 0,
      });
      return;
    }

    // Create audio context and analyser
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(mediaStream);

    // Configure analyser
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = smoothingTimeConstant;
    analyser.minDecibels = minDecibels;
    analyser.maxDecibels = maxDecibels;

    // Connect nodes
    source.connect(analyser);

    // Create data array
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Store refs
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;

    // Update state
    setAnalyserData({
      analyser,
      frequencyData: dataArray,
      audioContext,
      averageVolume: 0,
      peakVolume: 0,
    });

    // Analysis loop
    const analyze = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average volume
      const sum = dataArray.reduce((acc, val) => acc + val, 0);
      const average = sum / dataArray.length;

      // Calculate peak volume
      const peak = Math.max(...dataArray);

      setAnalyserData((prev) => ({
        ...prev,
        averageVolume: average / 255, // Normalize to 0-1
        peakVolume: peak / 255, // Normalize to 0-1
      }));

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    // Start analysis
    analyze();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
    };
  }, [mediaStream, fftSize, smoothingTimeConstant, minDecibels, maxDecibels]);

  return analyserData;
}

/**
 * Utility function to calculate volume from frequency data
 * Returns normalized value 0-1
 */
export function calculateVolume(frequencyData: Uint8Array | null): number {
  if (!frequencyData) return 0;

  const sum = frequencyData.reduce((acc, val) => acc + val, 0);
  const average = sum / frequencyData.length;

  return average / 255; // Normalize to 0-1
}

/**
 * Utility function to get dominant frequency range
 * Useful for color mapping (bass = cool, treble = warm)
 */
export function getDominantFrequencyRange(
  frequencyData: Uint8Array | null
): "low" | "mid" | "high" {
  if (!frequencyData) return "mid";

  const third = Math.floor(frequencyData.length / 3);

  const lowSum = frequencyData.slice(0, third).reduce((a, b) => a + b, 0);
  const midSum = frequencyData
    .slice(third, third * 2)
    .reduce((a, b) => a + b, 0);
  const highSum = frequencyData.slice(third * 2).reduce((a, b) => a + b, 0);

  if (lowSum > midSum && lowSum > highSum) return "low";
  if (highSum > lowSum && highSum > midSum) return "high";
  return "mid";
}
