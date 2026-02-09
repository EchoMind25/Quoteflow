// lib/utils/haptics.ts

/**
 * Haptic feedback utility for PWA.
 * Uses the Vibration API where available, no-ops otherwise.
 */
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export const haptics = {
  /** Light tap — 10ms */
  light: () => vibrate(10),
  /** Medium tap — 20ms */
  medium: () => vibrate(20),
  /** Heavy tap — 50ms */
  heavy: () => vibrate(50),
  /** Success pattern — short-pause-short */
  success: () => vibrate([10, 30, 10]),
  /** Error pattern — long-pause-long-pause-long */
  error: () => vibrate([50, 50, 50]),
};
