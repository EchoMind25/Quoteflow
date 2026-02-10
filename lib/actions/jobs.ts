"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ============================================================================
// Types
// ============================================================================

export type JobActionState = {
  success?: boolean;
  error?: string;
};

// ============================================================================
// Submit Schedule Preference (public — no auth required)
// ============================================================================

export async function submitSchedulePreference(
  _prevState: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  try {
    const jobId = formData.get("job_id") as string;
    const preferredDate = formData.get("preferred_date") as string;
    const timeStart = formData.get("time_start") as string;
    const timeEnd = formData.get("time_end") as string;

    if (!jobId || !preferredDate) {
      return { error: "Please select a date." };
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("jobs")
      .update({
        preferred_date: preferredDate,
        preferred_time_start: timeStart || null,
        preferred_time_end: timeEnd || null,
        status: "scheduled",
      })
      .eq("id", jobId)
      .eq("status", "pending_schedule");

    if (error) {
      return { error: "Failed to submit preference." };
    }

    // Add timeline entry
    await supabase.from("job_updates").insert({
      job_id: jobId,
      update_type: "status_change",
      old_status: "pending_schedule",
      new_status: "scheduled",
      message: `Customer preferred date: ${preferredDate}`,
      sender_type: "system",
    });

    return { success: true };
  } catch (err) {
    console.error("Submit schedule preference error:", err);
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Submit Customer Message (public — no auth required)
// ============================================================================

export async function submitCustomerMessage(
  _prevState: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  try {
    const jobId = formData.get("job_id") as string;
    const message = formData.get("message") as string;

    if (!jobId || !message?.trim()) {
      return { error: "Please enter a message." };
    }

    const supabase = createServiceClient();

    // Verify job exists
    const { data: job } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .single();

    if (!job) return { error: "Job not found." };

    await supabase.from("job_updates").insert({
      job_id: jobId,
      update_type: "message",
      message: message.trim(),
      sender_type: "customer",
    });

    return { success: true };
  } catch (err) {
    console.error("Submit customer message error:", err);
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Update Job Status (authenticated — business only)
// ============================================================================

export async function updateJobStatus(
  _prevState: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const jobId = formData.get("job_id") as string;
    const newStatus = formData.get("status") as string;
    const message = formData.get("message") as string;

    // Get current job
    const { data: job } = await supabase
      .from("jobs")
      .select("id, status")
      .eq("id", jobId)
      .single();

    if (!job) return { error: "Job not found." };

    const oldStatus = job.status;

    // Update status
    const { error } = await supabase
      .from("jobs")
      .update({
        status: newStatus as typeof job.status,
        ...(newStatus === "completed"
          ? { completed_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", jobId);

    if (error) return { error: "Failed to update status." };

    // Add timeline entry
    await supabase.from("job_updates").insert({
      job_id: jobId,
      update_type: "status_change",
      old_status: oldStatus,
      new_status: newStatus,
      message: message || null,
      sender_type: "business",
    });

    return { success: true };
  } catch (err) {
    console.error("Update job status error:", err);
    return { error: "An unexpected error occurred." };
  }
}

// ============================================================================
// Send ETA Update (authenticated — business only)
// ============================================================================

export async function sendEtaUpdate(
  _prevState: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const jobId = formData.get("job_id") as string;
    const etaMinutes = parseInt(formData.get("eta_minutes") as string, 10);

    if (!jobId || isNaN(etaMinutes)) {
      return { error: "Job ID and ETA are required." };
    }

    await supabase.from("job_updates").insert({
      job_id: jobId,
      update_type: "eta_update",
      eta_minutes: etaMinutes,
      sender_type: "business",
    });

    return { success: true };
  } catch (err) {
    console.error("Send ETA update error:", err);
    return { error: "An unexpected error occurred." };
  }
}
