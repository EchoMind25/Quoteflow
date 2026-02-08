/**
 * Haptic feedback utility for PWA.
 * Uses the Vibration API where available, no-ops otherwise.
 */
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

export const haptics = {
  light: () => vibrate(10),
  medium: () => vibrate(25),
  success: () => vibrate([10, 50, 10]),
};
