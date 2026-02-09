// lib/audit/log.ts
import { createClient } from "@/lib/supabase/server";

interface ActivityLogEntry {
  /** The type of action performed (e.g. "quote.created", "quote.sent") */
  action_type: string;
  /** The type of resource affected (e.g. "quote", "customer") */
  resource_type: string;
  /** The ID of the affected resource */
  resource_id: string;
  /** Human-readable description of the activity */
  description: string;
  /** Optional structured metadata for the activity */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the `activity_logs` table for audit purposes.
 *
 * Automatically captures the current authenticated user and their business context.
 * Fails silently (logs to console) to avoid disrupting the primary operation.
 *
 * @example
 * ```ts
 * await logActivity({
 *   action_type: "quote.sent",
 *   resource_type: "quote",
 *   resource_id: quoteId,
 *   description: "Sent quote via email",
 *   metadata: { delivery_method: "email" },
 * });
 * ```
 */
export async function logActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // eslint-disable-next-line no-console
      console.warn("[audit] No authenticated user — skipping activity log");
      return;
    }

    // Get the user's business_id from their profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      // eslint-disable-next-line no-console
      console.warn("[audit] Could not resolve business_id for user:", user.id);
      return;
    }

    const { error: insertError } = await supabase
      .from("activity_logs")
      .insert({
        user_id: user.id,
        business_id: profile.business_id,
        action_type: entry.action_type,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        description: entry.description,
        metadata: entry.metadata ?? {},
      });

    if (insertError) {
      // eslint-disable-next-line no-console
      console.error("[audit] Failed to insert activity log:", insertError);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[audit] Unexpected error in logActivity:", error);
  }
}
