"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import {
  submitCustomerMessage,
  type JobActionState,
} from "@/lib/actions/jobs";
import { motion } from "framer-motion";
import { duration, ease } from "@/lib/design-system/motion";

type Props = {
  jobId: string;
};

const initialState: JobActionState = {};

export function CustomerMessageForm({ jobId }: Props) {
  const [state, action, isPending] = useActionState(
    submitCustomerMessage,
    initialState,
  );

  if (state.success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: duration.normal, ease: ease.enter }}
        className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-900/20"
      >
        <p className="font-medium text-green-900 dark:text-green-100">
          Message sent!
        </p>
      </motion.div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="job_id" value={jobId} />

      <textarea
        name="message"
        rows={3}
        required
        placeholder="Send a message to the business..."
        className="w-full rounded-lg border border-neutral-300 p-3 text-sm focus:border-[hsl(var(--primary-500))] focus:ring-2 focus:ring-[hsl(var(--primary-500))]/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
      />

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary-600))] px-4 font-medium text-white hover:bg-[hsl(var(--primary-700))] disabled:opacity-50"
      >
        {isPending ? (
          "Sending..."
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send Message
          </>
        )}
      </button>
    </form>
  );
}
