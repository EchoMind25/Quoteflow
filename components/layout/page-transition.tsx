"use client";

import { useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { duration, ease } from "@/lib/design-system/motion";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// ============================================================================
// SPATIAL NAVIGATION MODEL
// ============================================================================

/**
 * Navigation Model:
 *
 * HOME (Dashboard) is the center
 *
 * ← Quotes are to the LEFT (past work)
 * → Customers are to the RIGHT (relationships)
 * ↓ Settings are BELOW (foundation)
 * ↑ New/Create pages rise from bottom (creation)
 *
 * Transitions reinforce this mental model
 */

type Direction = "left" | "right" | "up" | "down";

const PAGE_ORDER: Record<string, number> = {
  "/app/quotes": -1, // Left of center
  "/app": 0, // Center (home)
  "/app/customers": 1, // Right of center
  "/app/settings": 2, // Below (special)
};

/**
 * Determine transition direction based on from/to routes
 */
const getDirection = (from: string, to: string): Direction => {
  // Settings always slide up from bottom
  if (to === "/app/settings") return "up";
  if (from === "/app/settings") return "down";

  // New/Create pages slide up from bottom
  if (to.includes("/new")) return "up";
  if (from.includes("/new")) return "down";

  // Detail pages slide up
  if (to.match(/\/\d+$/) && !from.match(/\/\d+$/)) return "up";
  if (from.match(/\/\d+$/) && !to.match(/\/\d+$/)) return "down";

  // Horizontal navigation (quotes ↔ home ↔ customers)
  const fromOrder = PAGE_ORDER[from] ?? 0;
  const toOrder = PAGE_ORDER[to] ?? 0;

  return toOrder > fromOrder ? "left" : "right";
};

/**
 * Animation variants for page transitions
 */
const variants = (direction: Direction): Variants => ({
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
// PAGE TRANSITION COMPONENT
// ============================================================================

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string>(pathname);

  // Track previous pathname for direction calculation
  useEffect(() => {
    return () => {
      prevPathnameRef.current = pathname;
    };
  }, [pathname]);

  const direction = getDirection(prevPathnameRef.current, pathname);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants(direction)}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          type: "tween",
          duration: duration.normal,
          ease: ease.default,
        }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// REDUCED MOTION FALLBACK
// ============================================================================

/**
 * Simplified page transition for users who prefer reduced motion
 */
export function PageTransitionReduced({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: duration.fast }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// SMART PAGE TRANSITION (AUTO-DETECTS MOTION PREFERENCE)
// ============================================================================

export function SmartPageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();

  return prefersReducedMotion ? (
    <PageTransitionReduced>{children}</PageTransitionReduced>
  ) : (
    <PageTransition>{children}</PageTransition>
  );
}
