"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { duration, ease } from "@/lib/design-system/motion";

type AnimatedNumberProps = {
  value: number;
  format?: "number" | "currency" | "percent";
  decimals?: number;
  className?: string;
};

/**
 * Animated number component that counts up when value changes
 */
export function AnimatedNumber({
  value,
  format = "number",
  decimals = 0,
  className = "",
}: AnimatedNumberProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const from = prevValueRef.current;
    const to = value;

    // Don't animate if value hasn't changed
    if (from === to) {
      node.textContent = formatValue(to, format, decimals);
      return;
    }

    const controls = animate(from, to, {
      duration: duration.slow,
      ease: ease.default,
      onUpdate: (v) => {
        node.textContent = formatValue(v, format, decimals);
      },
    });

    prevValueRef.current = to;

    return () => controls.stop();
  }, [value, format, decimals]);

  return (
    <span ref={nodeRef} className={className}>
      {formatValue(value, format, decimals)}
    </span>
  );
}

/**
 * Format value based on type
 */
function formatValue(
  value: number,
  format: "number" | "currency" | "percent",
  decimals: number,
): string {
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);

    case "percent":
      return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value / 100);

    case "number":
    default:
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
  }
}
