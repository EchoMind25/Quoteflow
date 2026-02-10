"use client";

import { forwardRef, type HTMLAttributes } from "react";

/**
 * Card Component
 *
 * Features:
 * - 3 surface materials: matte (default), glass (translucent), metallic (gradient shine)
 * - 5 elevation levels (0-4)
 * - Lift animation on hover for interactive cards
 * - Selected state with primary border accent
 * - Corner indicator for clickability
 * - Chiseled borders (inset highlight + outset shadow)
 */

type CardSurface = "matte" | "glass" | "metallic";
type CardElevation = 0 | 1 | 2 | 3 | 4;

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: CardSurface;
  elevation?: CardElevation;
  interactive?: boolean;
  selected?: boolean;
  cornerIndicator?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      surface = "matte",
      elevation = 1,
      interactive = false,
      selected = false,
      cornerIndicator = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    // Surface material styles
    const surfaceClasses: Record<CardSurface, string> = {
      matte: [
        "bg-gradient-to-br from-neutral-50 to-neutral-100",
        "dark:from-[hsl(var(--surface-1))] dark:to-[hsl(var(--surface-2))]",
        "border border-neutral-200 dark:border-neutral-800",
        // Chiseled border effect
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(0,0,0,0.05)]",
        "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.3)]",
      ].join(" "),

      glass: [
        "backdrop-blur-xl",
        "bg-white/70 dark:bg-neutral-900/50",
        "border border-white/20 dark:border-white/10",
        // Refraction edge effect
        "shadow-[inset_0_0.5px_0_rgba(255,255,255,0.8),inset_0_-0.5px_0_rgba(0,0,0,0.05)]",
        "dark:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.1),inset_0_-0.5px_0_rgba(0,0,0,0.2)]",
      ].join(" "),

      metallic: [
        "bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600",
        "text-white",
        "border-0",
        // Shine effect on hover (via before pseudo-element in parent)
        "relative overflow-hidden",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        "before:translate-x-[-200%]",
        "before:transition-transform before:duration-700",
        "hover:before:translate-x-[200%]",
      ].join(" "),
    };

    // Elevation shadow classes (from design tokens)
    const elevationClasses: Record<CardElevation, string> = {
      0: "shadow-elevation-0",
      1: "shadow-elevation-1",
      2: "shadow-elevation-2",
      3: "shadow-elevation-3",
      4: "shadow-elevation-4",
    };

    // Interactive state classes
    const interactiveClasses = interactive
      ? [
          "transition-all duration-200 ease-out",
          "hover:scale-[1.01] hover:shadow-elevation-3",
          "active:scale-[0.99]",
          "cursor-pointer",
        ].join(" ")
      : "";

    // Selected state classes
    const selectedClasses = selected
      ? [
          "ring-2 ring-primary-500 ring-offset-2",
          "dark:ring-offset-[hsl(var(--bg-base))]",
        ].join(" ")
      : "";

    return (
      <div
        ref={ref}
        className={[
          // Base styles
          "relative rounded-xl p-4",
          surfaceClasses[surface],
          elevationClasses[elevation],
          interactiveClasses,
          selectedClasses,
          className,
        ].join(" ")}
        {...props}
      >
        {/* Corner indicator for interactive cards */}
        {cornerIndicator && interactive && (
          <div className="absolute top-3 right-3">
            <svg
              className="h-4 w-4 text-neutral-400 dark:text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        )}

        {/* Card content */}
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// Convenience components for card sections
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={["flex flex-col space-y-1.5", className].join(" ")}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className = "", ...props }, ref) => (
  <h3
    ref={ref}
    className={[
      "text-lg font-semibold leading-none tracking-tight",
      className,
    ].join(" ")}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className = "", ...props }, ref) => (
  <p
    ref={ref}
    className={["text-sm text-neutral-600 dark:text-neutral-400", className].join(
      " "
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={["pt-4", className].join(" ")} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={[
        "flex items-center pt-4 border-t border-neutral-200 dark:border-neutral-700",
        className,
      ].join(" ")}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
