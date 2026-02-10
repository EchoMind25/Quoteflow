"use client";

import { useState } from "react";
import { useActionState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Check } from "lucide-react";
import {
  submitSchedulePreference,
  type JobActionState,
} from "@/lib/actions/jobs";
import { duration, ease } from "@/lib/design-system/motion";
import { cn } from "@/lib/utils";

type Props = {
  jobId: string;
};

const initialState: JobActionState = {};

export function SchedulePicker({ jobId }: Props) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTimeStart, setSelectedTimeStart] = useState<string>("09:00");
  const [selectedTimeEnd, setSelectedTimeEnd] = useState<string>("17:00");
  const [state, action, isPending] = useActionState(
    submitSchedulePreference,
    initialState,
  );

  if (state.success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: duration.normal, ease: ease.enter }}
        className="rounded-xl border-2 border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20"
      >
        <Check className="mx-auto mb-2 h-8 w-8 text-green-600" />
        <p className="font-medium text-green-900 dark:text-green-100">
          Preference submitted!
        </p>
        <p className="text-sm text-green-700 dark:text-green-300">
          We&apos;ll confirm your appointment soon.
        </p>
      </motion.div>
    );
  }

  // Generate next 14 days (skip today)
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return date;
  });

  return (
    <form
      action={action}
      className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900"
    >
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="preferred_date" value={selectedDate} />

      <h3 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
        <Calendar className="h-5 w-5" />
        Select Your Preferred Date
      </h3>

      <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {dates.map((date) => {
          const dateStr = date.toISOString().split("T")[0]!;
          const isSelected = selectedDate === dateStr;
          const dayName = date.toLocaleDateString("en-US", {
            weekday: "short",
          });
          const dayNum = date.getDate();

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              className={cn(
                "rounded-lg p-2 text-center transition-colors",
                isSelected
                  ? "bg-[hsl(var(--primary-600))] text-white"
                  : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700",
              )}
            >
              <div className="text-xs">{dayName}</div>
              <div className="text-lg font-semibold">{dayNum}</div>
            </button>
          );
        })}
      </div>

      <h3 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
        <Clock className="h-5 w-5" />
        Available Time Window
      </h3>

      <div className="mb-6 flex items-center gap-4">
        <div>
          <label className="text-sm text-neutral-600 dark:text-neutral-400">
            From
          </label>
          <input
            type="time"
            name="time_start"
            value={selectedTimeStart}
            onChange={(e) => setSelectedTimeStart(e.target.value)}
            className="block w-full rounded-lg border border-neutral-300 p-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm text-neutral-600 dark:text-neutral-400">
            To
          </label>
          <input
            type="time"
            name="time_end"
            value={selectedTimeEnd}
            onChange={(e) => setSelectedTimeEnd(e.target.value)}
            className="block w-full rounded-lg border border-neutral-300 p-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
          />
        </div>
      </div>

      {state.error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!selectedDate || isPending}
        className="h-12 w-full rounded-lg bg-[hsl(var(--primary-600))] font-medium text-white hover:bg-[hsl(var(--primary-700))] disabled:opacity-50"
      >
        {isPending ? "Submitting..." : "Submit Preference"}
      </button>
    </form>
  );
}
