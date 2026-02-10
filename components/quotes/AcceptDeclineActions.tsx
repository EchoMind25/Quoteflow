"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import {
  slideUp,
  duration,
  ease,
  hoverScale,
  tapPress,
} from "@/lib/design-system/motion";
import { cn } from "@/lib/utils";
import { RequestRevisionButton } from "@/components/quotes/RequestRevisionButton";

// ============================================================================
// Types
// ============================================================================

type AcceptDeclineActionsProps = {
  quoteId: string;
  isAccepting: boolean;
  isDeclining: boolean;
  isTerminal: boolean;
  acceptError?: string;
  declineError?: string;
  onAccept: () => void;
  onDecline: () => void;
};

// ============================================================================
// Component
// ============================================================================

/**
 * Accept/Decline action buttons for public quotes
 * Fixed at bottom on mobile, sticky on desktop
 * Large touch targets with clear visual hierarchy
 */
export function AcceptDeclineActions({
  quoteId,
  isAccepting,
  isDeclining,
  isTerminal,
  acceptError,
  declineError,
  onAccept,
  onDecline,
}: AcceptDeclineActionsProps) {
  // Don't render if quote is in terminal state
  if (isTerminal) {
    return null;
  }

  const isLoading = isAccepting || isDeclining;

  return (
    <motion.div
      className="actions-container fixed bottom-0 left-0 right-0 z-20 border-t border-neutral-200 bg-white/95 px-4 py-4 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95 print:hidden sm:sticky sm:bottom-4"
      variants={slideUp}
      initial="initial"
      animate="animate"
      transition={{ delay: 0.6, duration: duration.normal, ease: ease.enter }}
    >
      <div className="mx-auto max-w-lg space-y-3">
        {/* Error Messages */}
        <AnimatePresence mode="wait">
          {acceptError && (
            <motion.div
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{acceptError}</span>
            </motion.div>
          )}
          {declineError && (
            <motion.div
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{declineError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Accept Button */}
          <motion.button
            type="button"
            onClick={onAccept}
            disabled={isLoading}
            className={cn(
              "relative flex h-14 flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg font-semibold text-white shadow-lg transition-all",
              "bg-gradient-to-r from-green-600 to-green-500",
              "hover:from-green-700 hover:to-green-600",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900",
            )}
            whileHover={!isLoading ? hoverScale : undefined}
            whileTap={!isLoading ? tapPress : undefined}
          >
            {/* Shimmer Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "linear",
                repeatDelay: 1,
              }}
            />

            {/* Content */}
            <span className="relative z-10 flex items-center gap-2">
              {isAccepting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              <span className="text-base">
                {isAccepting ? "Accepting..." : "Accept Quote"}
              </span>
            </span>
          </motion.button>

          {/* Decline Button */}
          <motion.button
            type="button"
            onClick={onDecline}
            disabled={isLoading}
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-lg border-2 border-neutral-300 bg-white px-6 font-medium text-neutral-700 transition-all",
              "hover:border-neutral-400 hover:bg-neutral-50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2",
              "dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:focus:ring-offset-neutral-900",
            )}
            whileHover={!isLoading ? hoverScale : undefined}
            whileTap={!isLoading ? tapPress : undefined}
          >
            {isDeclining ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <X className="h-5 w-5" />
            )}
            <span className="hidden sm:inline">
              {isDeclining ? "Declining..." : "Decline"}
            </span>
          </motion.button>
        </div>

        {/* Request Revision + Helper Text */}
        <div className="flex items-center justify-between">
          <RequestRevisionButton quoteId={quoteId} />
          <motion.p
            className="text-xs text-neutral-500 dark:text-neutral-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: duration.normal }}
          >
            By accepting, you agree to proceed
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
