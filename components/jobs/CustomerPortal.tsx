"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Wrench,
  XCircle,
} from "lucide-react";
import { formatCents } from "@/lib/utils";
import { applyBusinessTheme } from "@/lib/design-system/apply-theme";
import { duration, ease, slideUp } from "@/lib/design-system/motion";
import Image from "next/image";
import { SchedulePicker } from "./SchedulePicker";
import { JobTimeline } from "./JobTimeline";
import { CustomerMessageForm } from "./CustomerMessageForm";
import { DepositPayment } from "./DepositPayment";

// ============================================================================
// Types
// ============================================================================

const STATUS_CONFIG = {
  pending_schedule: {
    label: "Awaiting Your Preferred Time",
    icon: Calendar,
    color: "amber",
    description: "Please select when you'd like us to come.",
  },
  scheduled: {
    label: "Scheduled",
    icon: Clock,
    color: "blue",
    description: "We'll confirm your appointment soon.",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle2,
    color: "green",
    description: "Your appointment is confirmed!",
  },
  in_progress: {
    label: "Technician On Site",
    icon: Wrench,
    color: "purple",
    description: "Work is in progress.",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "green",
    description: "Job completed successfully!",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "red",
    description: "This job has been cancelled.",
  },
} as const;

const COLOR_MAP: Record<string, { border: string; bg: string; iconBg: string; iconText: string }> = {
  amber: { border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50 dark:bg-amber-900/20", iconBg: "bg-amber-500", iconText: "text-white" },
  blue: { border: "border-blue-200 dark:border-blue-800", bg: "bg-blue-50 dark:bg-blue-900/20", iconBg: "bg-blue-500", iconText: "text-white" },
  green: { border: "border-green-200 dark:border-green-800", bg: "bg-green-50 dark:bg-green-900/20", iconBg: "bg-green-500", iconText: "text-white" },
  purple: { border: "border-purple-200 dark:border-purple-800", bg: "bg-purple-50 dark:bg-purple-900/20", iconBg: "bg-purple-500", iconText: "text-white" },
  red: { border: "border-red-200 dark:border-red-800", bg: "bg-red-50 dark:bg-red-900/20", iconBg: "bg-red-500", iconText: "text-white" },
};

type JobData = {
  id: string;
  status: keyof typeof STATUS_CONFIG;
  preferred_date: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  customer_notes: string | null;
  deposit_amount_cents: number | null;
  deposit_paid: boolean;
  created_at: string;
  updated_at: string;
  quote: { id: string; title: string; quote_number: string; total_cents: number } | null;
  customer: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
  business: { name: string; logo_url: string | null; primary_color: string; phone: string | null; email: string | null } | null;
  assigned_to: { first_name: string; last_name: string } | null;
  job_updates: Array<{
    id: string;
    update_type: string;
    old_status: string | null;
    new_status: string | null;
    message: string | null;
    sender_type: string | null;
    eta_minutes: number | null;
    created_at: string;
  }>;
};

type Props = {
  job: JobData;
};

// ============================================================================
// Component
// ============================================================================

export function CustomerPortal({ job }: Props) {
  const statusKey = job.status as keyof typeof STATUS_CONFIG;
  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending_schedule;
  const StatusIcon = status.icon;
  const colors = COLOR_MAP[status.color] ?? COLOR_MAP.blue!;

  useEffect(() => {
    if (job.business?.primary_color) {
      applyBusinessTheme(job.business.primary_color, "general");
    }
  }, [job.business?.primary_color]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-4 py-6 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-4">
            {job.business?.logo_url && (
              <Image
                src={job.business.logo_url}
                alt={job.business.name}
                width={180}
                height={48}
                className="h-12 w-auto"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {job.business?.name}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Job #{job.quote?.quote_number}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.normal, ease: ease.enter }}
          className={`rounded-xl border-2 p-6 ${colors.border} ${colors.bg}`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${colors.iconBg}`}
            >
              <StatusIcon className={`h-6 w-6 ${colors.iconText}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {status.label}
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {status.description}
              </p>
            </div>
          </div>

          {job.scheduled_date && (
            <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Scheduled for
              </p>
              <p className="text-lg font-medium text-neutral-900 dark:text-white">
                {formatDate(job.scheduled_date)}
                {job.scheduled_time && ` at ${formatTime(job.scheduled_time)}`}
              </p>
            </div>
          )}
        </motion.div>

        {/* Schedule Picker (if pending) */}
        {job.status === "pending_schedule" && (
          <motion.div
            variants={slideUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1, duration: duration.normal, ease: ease.enter }}
          >
            <SchedulePicker jobId={job.id} />
          </motion.div>
        )}

        {/* Deposit Payment (if required and not yet paid) */}
        {job.deposit_amount_cents != null && job.deposit_amount_cents > 0 && (
          <DepositPayment
            jobId={job.id}
            depositPaid={job.deposit_paid}
            depositAmountCents={job.deposit_amount_cents}
          />
        )}

        {/* Job Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: duration.normal, ease: ease.enter }}
          className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <h3 className="mb-4 font-semibold text-neutral-900 dark:text-white">
            Job Details
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">
                Service
              </span>
              <span className="font-medium text-neutral-900 dark:text-white">
                {job.quote?.title}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">
                Total
              </span>
              <span className="font-medium text-neutral-900 dark:text-white">
                {job.quote ? formatCents(job.quote.total_cents) : "—"}
              </span>
            </div>
            {job.assigned_to && (
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Technician
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {job.assigned_to.first_name} {job.assigned_to.last_name}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Timeline */}
        {job.job_updates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: duration.normal, ease: ease.enter }}
            className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <h3 className="mb-4 font-semibold text-neutral-900 dark:text-white">
              Updates
            </h3>
            <JobTimeline updates={job.job_updates} />
          </motion.div>
        )}

        {/* Message Business */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: duration.normal, ease: ease.enter }}
          className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <h3 className="mb-4 font-semibold text-neutral-900 dark:text-white">
            Questions?
          </h3>
          <CustomerMessageForm jobId={job.id} />

          <div className="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
            <p>Or contact directly:</p>
            <div className="mt-2 flex gap-4">
              {job.business?.phone && (
                <a
                  href={`tel:${job.business.phone}`}
                  className="text-[hsl(var(--primary-600))] hover:underline"
                >
                  {job.business.phone}
                </a>
              )}
              {job.business?.email && (
                <a
                  href={`mailto:${job.business.email}`}
                  className="text-[hsl(var(--primary-600))] hover:underline"
                >
                  {job.business.email}
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Powered by */}
        <p className="pb-8 text-center text-xs text-neutral-400 dark:text-neutral-600">
          Powered by Quotestream
        </p>
      </main>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours!, 10);
  const amPm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${amPm}`;
}
