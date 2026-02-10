"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

/**
 * Button Component
 *
 * Features:
 * - 4 variants: primary (gradient), secondary (glass), ghost, danger
 * - 3 sizes: sm, md, lg
 * - 3D press animation (translateY + shadow reduction on active)
 * - Shimmer effect during loading state
 * - Icon support with proper spacing
 * - Respects prefers-reduced-motion
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Variant styles
    const variantClasses: Record<ButtonVariant, string> = {
      primary: [
        "bg-gradient-to-br from-primary-400 to-primary-600",
        "text-white font-medium",
        "shadow-elevation-2",
        "hover:shadow-elevation-3 hover:from-primary-500 hover:to-primary-700",
        "active:translate-y-0.5 active:shadow-elevation-1",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-elevation-2",
        "transition-all duration-200",
        // Shimmer effect container
        "relative overflow-hidden",
      ].join(" "),

      secondary: [
        "backdrop-blur-sm bg-white/70 dark:bg-white/10",
        "border border-primary-200 dark:border-primary-800",
        "text-primary-700 dark:text-primary-300",
        "shadow-elevation-1",
        "hover:border-primary-300 hover:shadow-elevation-2 hover:bg-white/90 dark:hover:bg-white/15",
        "active:translate-y-0.5 active:shadow-sm",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-200",
      ].join(" "),

      ghost: [
        "bg-transparent text-primary-600 dark:text-primary-400",
        "hover:bg-primary-50 dark:hover:bg-primary-950/20",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-200",
        // Underline animation
        "relative",
        "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0",
        "after:bg-primary-500 after:transition-all after:duration-300",
        "hover:after:w-full",
      ].join(" "),

      danger: [
        "bg-gradient-to-br from-danger-base to-danger-dark",
        "text-white font-medium",
        "shadow-elevation-2",
        "hover:shadow-elevation-3 hover:from-danger-dark hover:to-danger-base",
        "active:translate-y-0.5 active:shadow-elevation-1",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-200",
        "relative overflow-hidden",
      ].join(" "),
    };

    // Size styles
    const sizeClasses: Record<ButtonSize, string> = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-4 text-base",
      lg: "h-13 px-6 text-lg",
    };

    // Icon size based on button size
    const iconSize: Record<ButtonSize, string> = {
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          // Base styles
          "inline-flex items-center justify-center gap-2",
          "rounded-lg",
          "font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          "disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...props}
      >
        {/* Shimmer effect for loading (primary and danger variants only) */}
        {loading && (variant === "primary" || variant === "danger") && (
          <span
            className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ backgroundSize: "200% 100%" }}
          />
        )}

        {/* Left icon or loading spinner */}
        {loading ? (
          <Loader2 className={`animate-spin ${iconSize[size]}`} />
        ) : (
          icon &&
          iconPosition === "left" && (
            <span className={iconSize[size]}>{icon}</span>
          )
        )}

        {/* Button text */}
        {children && <span className="relative">{children}</span>}

        {/* Right icon */}
        {!loading && icon && iconPosition === "right" && (
          <span className={iconSize[size]}>{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
