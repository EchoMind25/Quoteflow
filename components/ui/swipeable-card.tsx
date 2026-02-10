"use client";

import { useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { cn } from "@/lib/utils";

type SwipeAction = {
  label: string;
  icon?: React.ReactNode;
  color: string;
  onAction: () => void | Promise<void>;
};

type SwipeableCardProps = {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  threshold?: number;
  className?: string;
};

/**
 * Swipeable card with configurable left/right actions
 *
 * Usage:
 * <SwipeableCard
 *   leftAction={{ label: "Archive", color: "red", onAction: handleArchive }}
 *   rightAction={{ label: "Send", color: "green", onAction: handleSend }}
 * >
 *   <QuoteCard quote={quote} />
 * </SwipeableCard>
 */
export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  threshold = 80,
  className,
}: SwipeableCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const x = useMotionValue(0);

  // Background colors based on swipe direction
  const background = useTransform(
    x,
    [-threshold, 0, threshold],
    [
      leftAction?.color || "#ef4444", // Red for left swipe
      "transparent",
      rightAction?.color || "#22c55e", // Green for right swipe
    ],
  );

  // Action opacity based on swipe distance
  const leftActionOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  const rightActionOpacity = useTransform(x, [0, threshold], [0, 1]);

  const handleDragEnd = async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isExecuting) return;

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Left swipe (negative x)
    if (offset < -threshold || velocity < -500) {
      if (leftAction) {
        setIsExecuting(true);

        // Animate card off screen
        await new Promise((resolve) => {
          x.set(-window.innerWidth);
          setTimeout(resolve, 300);
        });

        // Execute action
        await leftAction.onAction();

        // Reset
        x.set(0);
        setIsExecuting(false);
      } else {
        // Spring back if no action defined
        x.set(0);
      }
    }
    // Right swipe (positive x)
    else if (offset > threshold || velocity > 500) {
      if (rightAction) {
        setIsExecuting(true);

        // Animate card off screen
        await new Promise((resolve) => {
          x.set(window.innerWidth);
          setTimeout(resolve, 300);
        });

        // Execute action
        await rightAction.onAction();

        // Reset
        x.set(0);
        setIsExecuting(false);
      } else {
        // Spring back if no action defined
        x.set(0);
      }
    }
    // Spring back
    else {
      x.set(0);
    }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Background actions */}
      <motion.div
        className="absolute inset-0 flex items-center justify-between px-6"
        style={{ background }}
      >
        {/* Left action */}
        {leftAction && (
          <motion.div
            className="flex items-center gap-2 text-white"
            style={{ opacity: leftActionOpacity }}
          >
            {leftAction.icon}
            <span className="font-semibold">{leftAction.label}</span>
          </motion.div>
        )}

        {/* Right action */}
        {rightAction && (
          <motion.div
            className="ml-auto flex items-center gap-2 text-white"
            style={{ opacity: rightActionOpacity }}
          >
            <span className="font-semibold">{rightAction.label}</span>
            {rightAction.icon}
          </motion.div>
        )}
      </motion.div>

      {/* Card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}
