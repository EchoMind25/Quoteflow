/**
 * Haptic feedback utilities for mobile devices
 * Provides tactile feedback for user interactions
 * Safely degrades on unsupported browsers
 */

interface HapticPattern {
  pattern: number | number[];
  description: string;
}

type HapticName = "light" | "medium" | "success" | "error" | "recording" | "delete";

const HAPTIC_PATTERNS: Record<HapticName, HapticPattern> = {
  light: {
    pattern: 10,
    description: "Light tap - for button presses, toggles",
  },
  medium: {
    pattern: [10, 50, 10],
    description: "Medium pulse - for confirmations, selections",
  },
  success: {
    pattern: [10, 50, 10, 50, 10],
    description: "Success pattern - for completed actions",
  },
  error: {
    pattern: [50, 100, 50],
    description: "Error pattern - for failed actions, warnings",
  },
  recording: {
    pattern: [15, 30, 15],
    description: "Recording pulse - for voice/photo capture",
  },
  delete: {
    pattern: [30, 50, 30],
    description: "Delete pattern - for removal actions",
  },
} as const;

/**
 * Trigger haptic feedback if supported by the device
 * Respects user's reduced motion preferences
 */
function triggerHaptic(pattern: number | number[]): void {
  // Check if haptics are supported
  if (!navigator.vibrate) {
    return;
  }

  // Respect reduced motion preferences
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail - haptics are nice-to-have
    console.warn("Haptic feedback failed:", error);
  }
}

/**
 * Haptic feedback API
 * Usage: haptic.light(), haptic.success(), etc.
 */
export const haptic = {
  /**
   * Light tap - for button presses, toggles
   */
  light: () => triggerHaptic(HAPTIC_PATTERNS.light.pattern),

  /**
   * Medium pulse - for confirmations, selections
   */
  medium: () => triggerHaptic(HAPTIC_PATTERNS.medium.pattern),

  /**
   * Success pattern - for completed actions
   */
  success: () => triggerHaptic(HAPTIC_PATTERNS.success.pattern),

  /**
   * Error pattern - for failed actions, warnings
   */
  error: () => triggerHaptic(HAPTIC_PATTERNS.error.pattern),

  /**
   * Recording pulse - for voice/photo capture
   */
  recording: () => triggerHaptic(HAPTIC_PATTERNS.recording.pattern),

  /**
   * Delete pattern - for removal actions
   */
  delete: () => triggerHaptic(HAPTIC_PATTERNS.delete.pattern),

  /**
   * Custom vibration pattern
   */
  custom: (pattern: number | number[]) => triggerHaptic(pattern),

  /**
   * Check if haptics are supported
   */
  isSupported: (): boolean => {
    return typeof navigator.vibrate === "function";
  },
} as const;

/**
 * Hook for using haptic feedback in React components
 * Returns the haptic API with memoized functions
 */
export function useHaptic() {
  return haptic;
}
