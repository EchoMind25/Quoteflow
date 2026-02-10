"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { listContainer, listItem } from "@/lib/design-system/motion";

type ActivityType =
  | "quote.created"
  | "quote.sent"
  | "quote.accepted"
  | "quote.declined"
  | "quote.expired"
  | "customer.created"
  | "customer.updated";

type Activity = {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  resourceId?: string;
  resourceHref?: string;
};

type ActivityStreamProps = {
  activities: Activity[];
  emptyMessage?: string;
};

// ============================================================================
// ACTIVITY METADATA
// ============================================================================

const ACTIVITY_CONFIG: Record<
  ActivityType,
  {
    icon: LucideIcon;
    color: string;
    bgColor: string;
  }
> = {
  "quote.created": {
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950",
  },
  "quote.sent": {
    icon: Send,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-950",
  },
  "quote.accepted": {
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950",
  },
  "quote.declined": {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950",
  },
  "quote.expired": {
    icon: Clock,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
  },
  "customer.created": {
    icon: Users,
    color: "text-brand-600 dark:text-brand-400",
    bgColor: "bg-brand-100 dark:bg-brand-950",
  },
  "customer.updated": {
    icon: Users,
    color: "text-brand-600 dark:text-brand-400",
    bgColor: "bg-brand-100 dark:bg-brand-950",
  },
};

// ============================================================================
// ACTIVITY ITEM
// ============================================================================

function ActivityItem({ activity }: { activity: Activity }) {
  const config = ACTIVITY_CONFIG[activity.type];
  const Icon = config.icon;

  const content = (
    <motion.div
      variants={listItem}
      className={cn(
        "group flex gap-3 rounded-xl p-3 transition-colors",
        activity.resourceHref
          ? "cursor-pointer hover:bg-[hsl(var(--muted))]/50"
          : "",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          config.bgColor,
        )}
      >
        <Icon className={cn("h-5 w-5", config.color)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
          {activity.description}
        </p>
        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
          {formatTimestamp(activity.timestamp)}
        </p>
      </div>

      {/* Hover indicator */}
      {activity.resourceHref && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="flex items-center text-[hsl(var(--muted-foreground))]"
        >
          <svg
            className="h-4 w-4"
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
        </motion.div>
      )}
    </motion.div>
  );

  return activity.resourceHref ? (
    <Link href={activity.resourceHref}>{content}</Link>
  ) : (
    content
  );
}

// ============================================================================
// ACTIVITY STREAM
// ============================================================================

export function ActivityStream({
  activities,
  emptyMessage = "No activity yet",
}: ActivityStreamProps) {
  if (activities.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center rounded-2xl border border-dashed border-[hsl(var(--border))] px-6 py-10 text-center"
      >
        <Clock className="mb-3 h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
        <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
          {emptyMessage}
        </p>
      </motion.div>
    );
  }

  // Group activities by time period
  const grouped = groupActivitiesByTime(activities);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([period, items]) => (
        <div key={period}>
          {/* Time period header */}
          <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            {period}
          </h3>

          {/* Activity items */}
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="visible"
            className="space-y-1"
          >
            {items.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format timestamp relative to now
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
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
}

/**
 * Group activities by time period
 */
function groupActivitiesByTime(
  activities: Activity[],
): Record<string, Activity[]> {
  const now = new Date();
  const groups: Record<string, Activity[]> = {
    "Just now": [],
    "Earlier today": [],
    Yesterday: [],
    "This week": [],
    Earlier: [],
  };

  activities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) {
      groups["Just now"]?.push(activity);
    } else if (diffHours < 24) {
      groups["Earlier today"]?.push(activity);
    } else if (diffDays === 1) {
      groups["Yesterday"]?.push(activity);
    } else if (diffDays < 7) {
      groups["This week"]?.push(activity);
    } else {
      groups["Earlier"]?.push(activity);
    }
  });

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([_, items]) => items.length > 0),
  );
}
