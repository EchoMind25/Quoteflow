"use client";

import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import { DarkModeToggle } from "@/components/dashboard/dark-mode-toggle";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

type SmartHeaderProps = {
  businessName: string;
  userName: string;
  children?: React.ReactNode;
};

export function SmartHeader({
  businessName,
  userName,
  children,
}: SmartHeaderProps) {
  const { scrollY } = useScroll();
  const reducedMotion = useReducedMotion();

  // Transform values based on scroll (static when reduced motion)
  const headerHeight = useTransform(scrollY, [0, 100], reducedMotion ? [56, 56] : [56, 48]);
  const titleScale = useTransform(scrollY, [0, 100], reducedMotion ? [1, 1] : [1, 0.9]);
  const titleOpacity = useTransform(scrollY, [0, 100], reducedMotion ? [1, 1] : [1, 0.8]);
  const subtitleOpacity = useTransform(scrollY, [0, 50], reducedMotion ? [1, 1] : [1, 0]);

  return (
    <motion.header
      className="sticky top-0 z-40 border-b border-[hsl(var(--border))]/50 backdrop-blur-xl"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        background:
          "linear-gradient(to bottom, hsl(var(--background))/95, hsl(var(--background))/80)",
        height: headerHeight,
      }}
    >
      <div className="flex h-full items-center justify-between px-4">
        {/* Business & user info */}
        <motion.div
          className="min-w-0 flex-1"
          style={{
            scale: titleScale,
            opacity: titleOpacity,
          }}
        >
          <p className="truncate text-sm font-semibold">{businessName}</p>
          <motion.p
            className="truncate text-xs text-[hsl(var(--muted-foreground))]"
            style={{ opacity: subtitleOpacity }}
          >
            {userName}
          </motion.p>
        </motion.div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {children}
          <DarkModeToggle />
        </div>
      </div>
    </motion.header>
  );
}
