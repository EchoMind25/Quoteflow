"use client";

/**
 * Send Button - Celebratory quote sending experience
 * Paper airplane animation with CSS-only confetti burst
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Check, Loader2 } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { haptic } from "@/lib/haptics";
import { duration, ease } from "@/lib/design-system/motion";

// ============================================================================
// Types
// ============================================================================

interface SendButtonProps {
  onSend: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

type ButtonState = "idle" | "sending" | "success" | "error";

// ============================================================================
// Component
// ============================================================================

export function SendButton({
  onSend,
  disabled = false,
  className = "",
}: SendButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const [showConfetti, setShowConfetti] = useState(false);
  const reducedMotion = useReducedMotion();

  const handleClick = async () => {
    if (state !== "idle" || disabled) return;

    setState("sending");
    haptic.medium();

    try {
      await onSend();

      // Success!
      setState("success");
      setShowConfetti(true);
      haptic.success();

      // Reset after celebration
      setTimeout(() => {
        setShowConfetti(false);
      }, 1000);

      // Keep success state visible for a bit
      setTimeout(() => {
        setState("idle");
      }, 2000);
    } catch (error) {
      setState("error");
      haptic.error();

      // Reset to idle after showing error
      setTimeout(() => {
        setState("idle");
      }, 2000);
    }
  };

  const buttonContent = {
    idle: {
      icon: <Send className="h-5 w-5" />,
      text: "Send Quote",
      bg: "bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600",
    },
    sending: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      text: "Sending...",
      bg: "bg-gradient-to-r from-primary-600 to-primary-500",
    },
    success: {
      icon: <Check className="h-5 w-5" />,
      text: "Sent!",
      bg: "bg-gradient-to-r from-green-600 to-green-500",
    },
    error: {
      icon: <Send className="h-5 w-5" />,
      text: "Failed - Retry?",
      bg: "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600",
    },
  };

  const content = buttonContent[state];

  return (
    <div className={`relative ${className}`}>
      {/* Confetti particles (skip for reduced motion) */}
      {!reducedMotion && (
        <AnimatePresence>
          {showConfetti && (
            <div className="pointer-events-none absolute inset-0 overflow-visible">
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: [
                      "#3b82f6", // blue
                      "#10b981", // green
                      "#f59e0b", // yellow
                      "#ef4444", // red
                      "#8b5cf6", // purple
                    ][i % 5],
                  }}
                  initial={{
                    x: 0,
                    y: 0,
                    scale: 0,
                    opacity: 1,
                  }}
                  animate={{
                    x: Math.cos((i / 15) * Math.PI * 2) * 80,
                    y: Math.sin((i / 15) * Math.PI * 2) * 80,
                    scale: [0, 1, 0.5],
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    ease: ease.enter,
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Button */}
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === "sending"}
        className={`relative w-full overflow-hidden rounded-lg px-6 py-4 font-semibold text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 ${content.bg}`}
        whileHover={
          reducedMotion || (state !== "idle" && state !== "error")
            ? {}
            : { scale: 1.02, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }
        }
        whileTap={
          reducedMotion || (state !== "idle" && state !== "error")
            ? {}
            : { scale: 0.98 }
        }
        animate={
          reducedMotion
            ? {}
            : state === "sending"
              ? { scale: [1, 1.02, 1] }
              : state === "success"
                ? { scale: [1, 1.1, 1] }
                : {}
        }
        transition={
          reducedMotion
            ? { duration: 0.01 }
            : state === "sending"
              ? { duration: 1, repeat: Infinity }
              : { duration: duration.normal }
        }
      >
        {/* Shimmer effect on hover (idle state only, skip for reduced motion) */}
        {state === "idle" && !reducedMotion && (
          <motion.div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{
              x: ["0%", "200%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
            }}
          />
        )}

        {/* Icon & Text */}
        <div className="relative flex items-center justify-center gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: duration.normal }}
            >
              {content.icon}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.span
              key={state}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: duration.fast }}
            >
              {content.text}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Progress bar for sending state */}
        {state === "sending" && (
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-white/30"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        )}
      </motion.button>

      {/* Success message below button */}
      <AnimatePresence>
        {state === "success" && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-center text-sm text-green-600 dark:text-green-400"
          >
            ✓ Quote sent successfully
          </motion.p>
        )}
      </AnimatePresence>

      {/* Error message below button */}
      <AnimatePresence>
        {state === "error" && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-center text-sm text-red-600 dark:text-red-400"
          >
            ✗ Failed to send. Please try again.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
