"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { scaleUp, duration, ease } from "@/lib/design-system/motion";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// ============================================================================
// Types
// ============================================================================

type AcceptedConfirmationProps = {
  businessName: string;
  isDeclined?: boolean;
};

// ============================================================================
// Component
// ============================================================================

/**
 * Celebration confirmation shown after quote acceptance
 * Features animated checkmark and confetti effect (CSS only)
 */
export function AcceptedConfirmation({
  businessName,
  isDeclined = false,
}: AcceptedConfirmationProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-8 text-center dark:border-green-800 dark:from-green-900/20 dark:to-green-800/20"
      variants={scaleUp}
      initial="initial"
      animate="animate"
      transition={
        reducedMotion
          ? { duration: 0.01 }
          : ease.bounce
      }
    >
      {/* Confetti Particles (skip for reduced motion) */}
      {!isDeclined && !reducedMotion && (
        <div className="confetti-container pointer-events-none absolute inset-0">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="confetti-particle absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
              style={{
                backgroundColor: [
                  "#10b981",
                  "#3b82f6",
                  "#f59e0b",
                  "#ef4444",
                  "#8b5cf6",
                ][i % 5],
              }}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                scale: 0,
              }}
              animate={{
                x: Math.cos((i * 360) / 15) * 150,
                y: Math.sin((i * 360) / 15) * 150 - 50,
                opacity: 0,
                scale: [0, 1, 0.5, 0],
              }}
              transition={{
                duration: 1.5,
                ease: ease.enter,
                delay: 0.2,
              }}
            />
          ))}
        </div>
      )}

      {/* Success Icon */}
      <motion.div
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-white shadow-lg dark:bg-green-600"
        initial={reducedMotion ? { opacity: 0 } : { scale: 0, rotate: -180 }}
        animate={reducedMotion ? { opacity: 1 } : { scale: 1, rotate: 0 }}
        transition={
          reducedMotion
            ? { duration: 0.01 }
            : {
                delay: 0.2,
                duration: 0.6,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }
        }
      >
        <Check className="h-10 w-10" strokeWidth={3} />
      </motion.div>

      {/* Message */}
      <motion.h2
        className="mb-3 text-2xl font-bold text-green-900 dark:text-green-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={
          reducedMotion
            ? { duration: 0.01 }
            : { delay: 0.4, duration: duration.normal }
        }
      >
        {isDeclined ? "Quote Declined" : "Quote Accepted!"}
      </motion.h2>

      <motion.p
        className="text-base text-green-800 dark:text-green-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={
          reducedMotion
            ? { duration: 0.01 }
            : { delay: 0.5, duration: duration.normal }
        }
      >
        {isDeclined ? (
          <>
            Thank you for your consideration. <strong>{businessName}</strong>{" "}
            has been notified.
          </>
        ) : (
          <>
            <strong>{businessName}</strong> has been notified and will be in
            touch shortly to schedule the work.
          </>
        )}
      </motion.p>

      {!isDeclined && (
        <motion.p
          className="mt-4 text-sm text-green-700 dark:text-green-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            reducedMotion
              ? { duration: 0.01 }
              : { delay: 0.7, duration: duration.normal }
          }
        >
          You'll receive a confirmation email shortly.
        </motion.p>
      )}
    </motion.div>
  );
}
