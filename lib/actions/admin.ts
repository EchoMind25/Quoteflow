"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { logAdminAction } from "@/lib/admin/auth";
import { revalidatePath } from "next/cache";
import type { Json } from "@/types/database";

interface ActionState {
  success?: boolean;
  error?: string;
}

// ============================================
// ERROR MANAGEMENT
// ============================================

export async function resolveError(formData: FormData): Promise<void> {
  const adminId = formData.get("admin_id") as string;
  const errorId = formData.get("error_id") as string;

  const supabase = createServiceClient();

  await supabase
    .from("error_logs")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: adminId,
    })
    .eq("id", errorId);

  await logAdminAction(adminId, "resolved_error", "error_log", errorId);
  revalidatePath("/admin/errors");
}

// ============================================
// API COST TRACKING
// ============================================

export async function trackAPICost(
  provider: "anthropic" | "assemblyai" | "twilio" | "resend",
  operation: string,
  tokenCount?: number,
  costCents?: number,
): Promise<void> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0]!;

  let estimatedCost = costCents;
  if (!estimatedCost && tokenCount) {
    const rates: Record<string, number> = {
      anthropic: 1.5,
      assemblyai: 0.4,
    };
    estimatedCost = Math.ceil(
      (tokenCount / 1000) * (rates[provider] ?? 1) * 100,
    );
  }

  await supabase.rpc("increment_api_cost", {
    p_cost_date: today,
    p_provider: provider,
    p_operation: operation,
    p_request_count: 1,
    p_token_count: tokenCount ?? 0,
    p_cost_cents: estimatedCost ?? 0,
  });
}

// ============================================
// MAINTENANCE MODE
// ============================================

export async function toggleMaintenanceMode(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = formData.get("admin_id") as string;
  const enable = formData.get("enable") === "true";
  const message = formData.get("message") as string;

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("site_settings")
    .update({
      value: enable.toString() as unknown as Json,
      updated_by: adminId,
    })
    .eq("key", "maintenance_mode");

  if (error) return { error: "Failed to update maintenance mode." };

  if (message) {
    await supabase
      .from("site_settings")
      .update({
        value: `"${message}"` as unknown as Json,
        updated_by: adminId,
      })
      .eq("key", "maintenance_message");
  }

  await logAdminAction(
    adminId,
    enable ? "enabled_maintenance" : "disabled_maintenance",
    "system",
    undefined,
    { message },
  );

  revalidatePath("/admin/settings");
  return { success: true };
}

// ============================================
// FEATURE FLAGS
// ============================================

export async function toggleFeatureFlag(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = formData.get("admin_id") as string;
  const flagId = formData.get("flag_id") as string;
  const enabled = formData.get("enabled") === "true";

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("feature_flags")
    .update({
      is_enabled: enabled,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", flagId);

  if (error) return { error: "Failed to update flag." };

  await logAdminAction(adminId, "toggled_feature", "feature_flag", flagId, {
    enabled,
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function updateSiteSetting(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = formData.get("admin_id") as string;
  const key = formData.get("key") as string;
  const value = formData.get("value") as string;

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("site_settings")
    .update({
      value: value as unknown as Json,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  if (error) return { error: "Failed to update setting." };

  await logAdminAction(adminId, "updated_setting", "site_settings", key, {
    value,
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

// ============================================
// INCIDENTS
// ============================================

export async function createIncident(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = formData.get("admin_id") as string;
  const title = formData.get("title") as string;
  const severity = formData.get("severity") as string;
  const components = formData.getAll("components") as string[];
  const message = formData.get("message") as string;

  if (!title || !message) {
    return { error: "Title and message are required." };
  }

  const supabase = createServiceClient();

  const { data: incident, error } = await supabase
    .from("incidents")
    .insert({
      title,
      severity,
      affected_components: components,
      created_by: adminId,
    })
    .select()
    .single();

  if (error || !incident) return { error: "Failed to create incident." };

  await supabase.from("incident_updates").insert({
    incident_id: incident.id,
    status: "investigating",
    message,
    created_by: adminId,
  });

  await logAdminAction(adminId, "created_incident", "incident", incident.id, {
    title,
    severity,
  });

  revalidatePath("/admin/incidents");
  return { success: true };
}

export async function updateIncident(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = formData.get("admin_id") as string;
  const incidentId = formData.get("incident_id") as string;
  const status = formData.get("status") as string;
  const message = formData.get("message") as string;

  if (!message) {
    return { error: "Update message is required." };
  }

  const supabase = createServiceClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  };

  if (status === "identified") {
    updateData.identified_at = new Date().toISOString();
  }
  if (status === "resolved") {
    updateData.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("incidents")
    .update(updateData)
    .eq("id", incidentId);

  if (error) return { error: "Failed to update incident." };

  await supabase.from("incident_updates").insert({
    incident_id: incidentId,
    status,
    message,
    created_by: adminId,
  });

  await logAdminAction(
    adminId,
    "updated_incident",
    "incident",
    incidentId,
    { status },
  );

  revalidatePath("/admin/incidents");
  return { success: true };
}

// ============================================
// SCHEDULED MAINTENANCE
// ============================================

export async function scheduleMaintenance(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = formData.get("admin_id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const components = formData.getAll("components") as string[];

  if (!title || !startTime || !endTime) {
    return { error: "Title, start time, and end time are required." };
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("scheduled_maintenance").insert({
    title,
    description: description || null,
    scheduled_start: startTime,
    scheduled_end: endTime,
    affected_components: components,
    created_by: adminId,
  });

  if (error) return { error: "Failed to schedule maintenance." };

  await logAdminAction(adminId, "scheduled_maintenance", "maintenance", undefined, {
    title,
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

// ============================================
// SUPPORT TICKETS
// ============================================

export async function assignTicket(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = formData.get("admin_id") as string;
  const ticketId = formData.get("ticket_id") as string;

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("support_tickets")
    .update({
      assigned_to: adminId,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) return { error: "Failed to assign ticket." };

  await logAdminAction(adminId, "assigned_ticket", "support_ticket", ticketId);

  revalidatePath("/admin/support");
  return { success: true };
}

export async function updateTicketStatus(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = formData.get("admin_id") as string;
  const ticketId = formData.get("ticket_id") as string;
  const status = formData.get("status") as string;
  const resolutionNotes = formData.get("resolution_notes") as string;

  const supabase = createServiceClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "resolved" || status === "closed") {
    updateData.resolved_at = new Date().toISOString();
    if (resolutionNotes) {
      updateData.resolution_notes = resolutionNotes;
    }
  }

  const { error } = await supabase
    .from("support_tickets")
    .update(updateData)
    .eq("id", ticketId);

  if (error) return { error: "Failed to update ticket." };

  await logAdminAction(
    adminId,
    "updated_ticket_status",
    "support_ticket",
    ticketId,
    { status },
  );

  revalidatePath("/admin/support");
  return { success: true };
}

export async function addSupportMessage(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = formData.get("admin_id") as string;
  const ticketId = formData.get("ticket_id") as string;
  const messageContent = formData.get("message") as string;

  if (!messageContent) {
    return { error: "Message is required." };
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    sender_type: "admin",
    sender_id: adminId,
    message_content: messageContent,
  });

  if (error) return { error: "Failed to send message." };

  await logAdminAction(
    adminId,
    "sent_support_message",
    "support_ticket",
    ticketId,
  );

  revalidatePath("/admin/support");
  return { success: true };
}
