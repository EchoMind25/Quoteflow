import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import crypto from "crypto";
import type { Json } from "@/types/database";

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/app");
  }

  return {
    id: profile.id,
    email: user.email!,
    firstName: profile.first_name,
    lastName: profile.last_name,
  };
}

export async function logAdminAction(
  adminId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, string | number | boolean | null>,
): Promise<void> {
  const headersList = await headers();
  const supabase = createServiceClient();

  await supabase
    .from("admin_audit_logs")
    .insert({
      admin_id: adminId,
      action,
      resource_type: resourceType ?? null,
      resource_id: resourceId ?? null,
      metadata: (metadata ?? {}) as Json,
      ip_address: headersList.get("x-forwarded-for")?.split(",")[0] ?? null,
      user_agent: headersList.get("user-agent") ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("Failed to log admin action:", error.message);
    });
}

export function hashIdentifier(id: string): string {
  return crypto
    .createHash("sha256")
    .update(id + (process.env.IDENTIFIER_SALT ?? ""))
    .digest("hex")
    .substring(0, 16);
}

export function truncateId(id: string): string {
  return `${id.substring(0, 8)}...`;
}
