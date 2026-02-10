"use client";

import {
  Pencil,
  Send,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import type { Database } from "@/types/database";

/**
 * StatusBadge Component
 *
 * Redesigned quote status lifecycle with unique visual treatment for each status:
 * - draft: Dashed border (incomplete feeling)
 * - sent: Solid with pulse animation
 * - viewed: Purple/teal gradient with blink animation
 * - accepted: Celebratory green with subtle pulse
 * - declined: Soft red (not aggressive)
 * - expired: Desaturated, faded
 *
 * Separate ConfidenceBadge for AI confidence scores.
 */

type QuoteStatus = Database["public"]["Enums"]["quote_status"];

interface StatusBadgeProps {
  status: QuoteStatus;
  className?: string;
}

interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

// Status configuration
const statusConfig: Record<
  QuoteStatus,
  {
    icon: LucideIcon;
    label: string;
    className: string;
    animation?: string;
  }
> = {
  draft: {
    icon: Pencil,
    label: "Draft",
    className: [
      "border-2 border-dashed border-neutral-300 dark:border-neutral-700",
      "bg-neutral-50 dark:bg-neutral-900",
      "text-neutral-600 dark:text-neutral-400",
    ].join(" "),
  },

  sent: {
    icon: Send,
    label: "Sent",
    className: [
      "bg-primary-500 dark:bg-primary-600",
      "text-white",
      "shadow-elevation-2",
    ].join(" "),
    animation: "animate-pulse-once",
  },

  viewed: {
    icon: Eye,
    label: "Viewed",
    className: [
      "bg-gradient-to-r from-purple-500 to-teal-500",
      "text-white",
      "shadow-elevation-2",
    ].join(" "),
    animation: "animate-blink-once",
  },

  revision_requested: {
    icon: MessageSquare,
    label: "Revision Requested",
    className: [
      "bg-amber-500 dark:bg-amber-600",
      "text-white",
      "shadow-elevation-2",
    ].join(" "),
  },

  accepted: {
    icon: CheckCircle,
    label: "Accepted",
    className: [
      "bg-success-base dark:bg-success-dark",
      "text-white",
      "shadow-elevation-2",
    ].join(" "),
    animation: "animate-pulse-once",
  },

  declined: {
    icon: XCircle,
    label: "Declined",
    className: [
      "bg-danger-base/80 dark:bg-danger-dark/80",
      "text-white",
    ].join(" "),
  },

  expired: {
    icon: Clock,
    label: "Expired",
    className: [
      "grayscale opacity-60",
      "bg-neutral-100 dark:bg-neutral-800",
      "text-neutral-400 dark:text-neutral-500",
      "border border-neutral-300 dark:border-neutral-700",
    ].join(" "),
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={[
        // Base styles
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "text-xs font-medium",
        "transition-all duration-200",
        config.className,
        config.animation || "",
        className,
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </span>
  );
}

/**
 * ConfidenceBadge Component
 *
 * Shows AI confidence score with three-tier color coding:
 * - High (≥85%): Green
 * - Medium (≥60%): Amber
 * - Low (<60%): Red
 */
export function ConfidenceBadge({
  confidence,
  className = "",
}: ConfidenceBadgeProps) {
  // Determine tier
  const tier = confidence >= 0.85 ? "high" : confidence >= 0.6 ? "medium" : "low";

  const tierConfig = {
    high: {
      className: [
        "bg-success-light dark:bg-success-dark/20",
        "text-success-dark dark:text-success-light",
        "border border-success-base/20 dark:border-success-base/30",
      ].join(" "),
      icon: CheckCircle,
    },
    medium: {
      className: [
        "bg-warning-light dark:bg-warning-dark/20",
        "text-warning-dark dark:text-warning-light",
        "border border-warning-base/20 dark:border-warning-base/30",
      ].join(" "),
      icon: AlertTriangle,
    },
    low: {
      className: [
        "bg-danger-light dark:bg-danger-dark/20",
        "text-danger-dark dark:text-danger-light",
        "border border-danger-base/20 dark:border-danger-base/30",
      ].join(" "),
      icon: AlertCircle,
    },
  };

  const config = tierConfig[tier];
  const Icon = config.icon;
  const percentage = Math.round(confidence * 100);

  return (
    <span
      className={[
        // Base styles
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "text-xs font-medium",
        config.className,
        className,
      ].join(" ")}
      title={`AI Confidence: ${percentage}%`}
    >
      <Icon className="h-3 w-3" />
      <span>{percentage}%</span>
    </span>
  );
}

/**
 * Helper component for displaying status with timestamp
 */
interface StatusWithTimeProps {
  status: QuoteStatus;
  timestamp?: string | null;
  className?: string;
}

export function StatusWithTime({
  status,
  timestamp,
  className = "",
}: StatusWithTimeProps) {
  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={["flex items-center gap-2", className].join(" ")}>
      <StatusBadge status={status} />
      {timestamp && (
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {formatTimestamp(timestamp)}
        </span>
      )}
    </div>
  );
}
