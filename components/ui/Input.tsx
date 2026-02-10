"use client";

import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

/**
 * Input Component
 *
 * Features:
 * - Floating label that slides up on focus/fill
 * - Bottom border fill animation (left to right)
 * - Shake animation on error
 * - Recessed appearance (elevation-0)
 * - Icon slot on right side
 * - Error state with message
 */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icon,
      helperText,
      className = "",
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(
      !!(value || defaultValue || props.placeholder)
    );

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    const shouldFloat = focused || hasValue;

    return (
      <div className="w-full">
        <div className="relative">
          {/* Floating label */}
          {label && (
            <label
              className={[
                "absolute left-3 pointer-events-none",
                "transition-all duration-200 ease-out",
                shouldFloat
                  ? "top-0 -translate-y-1/2 text-xs bg-[hsl(var(--background))] px-1"
                  : "top-1/2 -translate-y-1/2 text-sm",
                error
                  ? "text-danger-base"
                  : focused
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-neutral-500 dark:text-neutral-400",
              ].join(" ")}
            >
              {label}
            </label>
          )}

          {/* Input field */}
          <input
            ref={ref}
            value={value}
            defaultValue={defaultValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            className={[
              // Base styles
              "w-full h-11 px-3",
              label ? "pt-2" : "",
              icon ? "pr-10" : "",
              // Background and border
              "bg-[hsl(var(--background))]",
              "border rounded-lg",
              error
                ? "border-danger-base animate-shake"
                : "border-neutral-300 dark:border-neutral-700",
              // Shadows
              "shadow-elevation-0",
              // Focus state
              "focus:outline-none focus:ring-2",
              error
                ? "focus:ring-danger-base/20"
                : "focus:ring-primary-500/20 focus:border-primary-500",
              "focus:shadow-elevation-1",
              // Text
              "text-base text-[hsl(var(--foreground))]",
              "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
              // Disabled
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-neutral-900",
              // Transition
              "transition-all duration-200",
              // Bottom border fill animation (via pseudo-element)
              "relative",
              className,
            ].join(" ")}
            {...props}
          />

          {/* Bottom border fill animation */}
          <span
            className={[
              "absolute bottom-0 left-0 h-0.5 transition-all duration-300",
              error ? "bg-danger-base" : "bg-primary-500",
              focused ? "w-full" : "w-0",
            ].join(" ")}
          />

          {/* Icon slot */}
          {icon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
              {icon}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-1.5 text-xs text-danger-base flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </p>
        )}

        {/* Helper text */}
        {!error && helperText && (
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
