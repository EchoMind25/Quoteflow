"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import {
  submitReview,
  type ReviewActionState,
} from "@/lib/actions/reviews";
import { duration, ease } from "@/lib/design-system/motion";

type Props = {
  jobId: string;
  businessName: string;
};

const initialState: ReviewActionState = {};

export function ReviewForm({ jobId, businessName }: Props) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [state, action, isPending] = useActionState(
    submitReview,
    initialState,
  );

  if (state.success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: duration.normal, ease: ease.enter }}
        className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div className="mb-4 text-4xl">&#127881;</div>
        <h2 className="mb-2 text-xl font-bold text-neutral-900 dark:text-white">
          Thank You!
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Your review helps {businessName} and other customers.
        </p>
      </motion.div>
    );
  }

  return (
    <form
      action={action}
      className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900"
    >
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="rating" value={rating} />

      <h2 className="mb-4 text-center text-lg font-semibold text-neutral-900 dark:text-white">
        How was your experience?
      </h2>

      {/* Star Rating */}
      <div className="mb-6 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-transform hover:scale-110"
            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
          >
            <Star
              className={`h-10 w-10 transition-colors ${
                star <= (hoveredRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-neutral-300 dark:text-neutral-600"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Review Text */}
      <textarea
        name="review_text"
        rows={4}
        placeholder="Tell us about your experience (optional)"
        className="w-full rounded-lg border border-neutral-300 p-3 text-sm focus:border-[hsl(var(--primary-500))] focus:ring-2 focus:ring-[hsl(var(--primary-500))]/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
      />

      {state.error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={rating === 0 || isPending}
        className="mt-4 h-12 w-full rounded-lg bg-[hsl(var(--primary-600,220_90%_45%))] font-medium text-white hover:bg-[hsl(var(--primary-700,220_90%_38%))] disabled:opacity-50"
      >
        {isPending ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
