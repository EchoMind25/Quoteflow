"use server";

import { createServiceClient } from "@/lib/supabase/service";

// ============================================================================
// Types
// ============================================================================

export type ReviewActionState = {
  success?: boolean;
  error?: string;
};

// ============================================================================
// Submit Review (public — no auth required)
// ============================================================================

export async function submitReview(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  try {
    const jobId = formData.get("job_id") as string;
    const rating = parseInt(formData.get("rating") as string, 10);
    const reviewText = formData.get("review_text") as string;

    if (!jobId) return { error: "Job ID required." };
    if (!rating || rating < 1 || rating > 5) {
      return { error: "Please select a rating." };
    }

    const supabase = createServiceClient();

    // Get job to get business_id and customer_id
    const { data: job } = await supabase
      .from("jobs")
      .select("business_id, customer_id, status")
      .eq("id", jobId)
      .single();

    if (!job) return { error: "Job not found." };
    if (job.status !== "completed") return { error: "Job must be completed." };

    // Check for existing review
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("job_id", jobId)
      .maybeSingle();

    if (existing) return { error: "You've already reviewed this job." };

    // Create review
    const { error } = await supabase.from("reviews").insert({
      job_id: jobId,
      business_id: job.business_id,
      customer_id: job.customer_id,
      rating,
      review_text: reviewText?.trim() || null,
    });

    if (error) return { error: "Failed to submit review." };

    return { success: true };
  } catch (err) {
    console.error("Submit review error:", err);
    return { error: "An unexpected error occurred." };
  }
}
