/**
 * Motion Design System
 *
 * Consistent motion language for Quotestream.
 * All animations should use these tokens for consistency.
 */

import type { Transition, Variants } from "framer-motion";

// ============================================================================
// TIMING
// ============================================================================

export const duration = {
  instant: 0.1, // Micro-feedback (button press, hover)
  fast: 0.2, // Quick transitions (tooltips, dropdowns)
  normal: 0.3, // Standard transitions (page changes, modals)
  slow: 0.5, // Emphasis animations (success states, reveals)
  dramatic: 1, // Hero moments (celebrations, onboarding)
} as const;

// ============================================================================
// EASING
// ============================================================================

export const ease = {
  // Standard motion (default for most animations)
  default: [0.25, 0.1, 0.25, 1] as const,

  // Entering elements (accelerate into view)
  enter: [0, 0, 0.2, 1] as const,

  // Exiting elements (decelerate out of view)
  exit: [0.4, 0, 1, 1] as const,

  // Springy (for fun, playful interactions)
  spring: {
    type: "spring" as const,
    stiffness: 400,
    damping: 25,
  },

  // Bouncy (for celebrations and success states)
  bounce: {
    type: "spring" as const,
    stiffness: 600,
    damping: 15,
  },

  // Gentle (for large elements or background changes)
  gentle: {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
  },
} as const;

// ============================================================================
// STAGGER
// ============================================================================

export const stagger = {
  fast: 0.03, // Rapid-fire items (small list items)
  normal: 0.05, // Standard stagger (cards, stats)
  slow: 0.1, // Dramatic reveal (hero sections)
} as const;

// ============================================================================
// COMMON ANIMATION VARIANTS
// ============================================================================

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const slideDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const slideLeft: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideRight: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const scaleUp: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

// ============================================================================
// PAGE TRANSITIONS
// ============================================================================

type Direction = "left" | "right" | "up" | "down";

export const pageTransition = (direction: Direction): Variants => ({
  enter: {
    x: direction === "left" ? "100%" : direction === "right" ? "-100%" : 0,
    y: direction === "up" ? "100%" : direction === "down" ? "-100%" : 0,
    opacity: 0,
  },
  center: {
    x: 0,
    y: 0,
    opacity: 1,
  },
  exit: {
    x: direction === "left" ? "-100%" : direction === "right" ? "100%" : 0,
    y: direction === "up" ? "-100%" : direction === "down" ? "100%" : 0,
    opacity: 0,
  },
});

// ============================================================================
// LIST ANIMATIONS
// ============================================================================

export const listContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger.normal,
      delayChildren: 0.1,
    },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get motion props with reduced motion support
 * Returns empty animations if user prefers reduced motion
 */
export const getMotionProps = (variants: Variants): Variants => {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return {
      initial: {},
      animate: {},
      exit: {},
    };
  }
  return variants;
};

/**
 * Create a spring transition with custom parameters
 */
export const spring = (
  stiffness = 400,
  damping = 25,
  mass = 1,
): Transition => ({
  type: "spring",
  stiffness,
  damping,
  mass,
});

/**
 * Create a tween transition with custom duration and easing
 */
export const tween = (
  duration: number,
  ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1],
): Transition => ({
  type: "tween",
  duration,
  ease: ease as any,
});

/**
 * Stagger children with custom delay
 */
export const staggerChildren = (delay = stagger.normal): Transition => ({
  staggerChildren: delay,
  delayChildren: 0.1,
});

// ============================================================================
// GESTURE ANIMATIONS
// ============================================================================

export const swipeVariants = {
  center: { x: 0 },
  left: { x: "-100%" },
  right: { x: "100%" },
};

export const dragConstraints = {
  horizontal: { left: -100, right: 100 },
  vertical: { top: -100, bottom: 100 },
};

// ============================================================================
// HOVER & TAP ANIMATIONS
// ============================================================================

export const hoverScale = {
  scale: 1.05,
  transition: { duration: duration.fast, ease: ease.default },
};

export const tapScale = {
  scale: 0.95,
  transition: { duration: duration.instant, ease: ease.default },
};

export const hoverLift = {
  y: -4,
  transition: { duration: duration.fast, ease: ease.default },
};

export const tapPress = {
  scale: 0.98,
  transition: { duration: duration.instant, ease: ease.default },
};
