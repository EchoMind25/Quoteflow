import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CustomerPortal } from "@/components/jobs/CustomerPortal";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("quote:quotes(title, quote_number), business:businesses(name)")
    .eq("id", id)
    .single();

  return {
    title: job
      ? `Job #${job.quote?.quote_number} — ${job.business?.name}`
      : "Job Not Found",
  };
}

export default async function PublicJobPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch job with related data
  const { data: job } = await supabase
    .from("jobs")
    .select(
      `
      id, status, preferred_date, preferred_time_start, preferred_time_end,
      scheduled_date, scheduled_time, customer_notes, deposit_amount_cents,
      deposit_paid, created_at, updated_at,
      quote:quotes(id, title, quote_number, total_cents),
      customer:customers(first_name, last_name, email, phone),
      business:businesses(name, logo_url, primary_color, phone, email),
      assigned_to:profiles(first_name, last_name),
      job_updates(id, update_type, old_status, new_status, message, sender_type, eta_minutes, created_at)
    `,
    )
    .eq("id", id)
    .single();

  if (!job) notFound();

  return <CustomerPortal job={job} />;
}
