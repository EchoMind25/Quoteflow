import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { ReviewForm } from "@/components/reviews/ReviewForm";

type Props = {
  params: Promise<{ jobId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jobId } = await params;
  const supabase = createServiceClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("business:businesses(name)")
    .eq("id", jobId)
    .single();

  return {
    title: job?.business
      ? `Review ${job.business.name}`
      : "Leave a Review",
  };
}

export default async function ReviewPage({ params }: Props) {
  const { jobId } = await params;
  const supabase = createServiceClient();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      `
      id, status,
      business:businesses(name, logo_url),
      quote:quotes(title)
    `,
    )
    .eq("id", jobId)
    .eq("status", "completed")
    .single();

  if (!job) notFound();

  // Check if review already exists
  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("job_id", jobId)
    .maybeSingle();

  const hasReview = !!existingReview;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          {job.business?.logo_url && (
            <Image
              src={job.business.logo_url}
              alt=""
              width={180}
              height={48}
              className="mx-auto mb-4 h-12"
            />
          )}
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
            {job.business?.name}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {job.quote?.title}
          </p>
        </div>

        {hasReview ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <p className="font-medium text-neutral-900 dark:text-white">
              Thank you for your review!
            </p>
          </div>
        ) : (
          <ReviewForm
            jobId={jobId}
            businessName={job.business?.name || "this business"}
          />
        )}
      </div>
    </div>
  );
}
