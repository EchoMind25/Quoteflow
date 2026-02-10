"use client";

import { useState } from "react";
import { useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X } from "lucide-react";
import {
  requestQuoteRevision,
  type RevisionRequestState,
} from "@/lib/actions/quotes";
import { duration, ease } from "@/lib/design-system/motion";

type Props = {
  quoteId: string;
};

const initialState: RevisionRequestState = {};

export function RequestRevisionButton({ quoteId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, isPending] = useActionState(
    requestQuoteRevision,
    initialState,
  );

  if (state.success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: duration.normal, ease: ease.enter }}
        className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-800 dark:bg-blue-900/20"
      >
        <p className="font-medium text-blue-900 dark:text-blue-100">
          Revision request sent!
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          The business will review your notes and send an updated quote.
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <MessageSquare className="h-4 w-4" />
        Request Changes
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: duration.normal, ease: ease.enter }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-2xl bg-white p-6 dark:bg-neutral-900 sm:rounded-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Request Changes
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form action={action}>
                <input type="hidden" name="quote_id" value={quoteId} />

                <textarea
                  name="message"
                  rows={4}
                  required
                  placeholder="Describe what you'd like changed (different scope, questions about line items, etc.)"
                  className="w-full rounded-lg border border-neutral-300 p-3 text-sm focus:border-[hsl(var(--primary-500))] focus:ring-2 focus:ring-[hsl(var(--primary-500))]/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                />

                {state.error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {state.error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary-600))] font-medium text-white hover:bg-[hsl(var(--primary-700))] disabled:opacity-50"
                >
                  {isPending ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send to Business
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
