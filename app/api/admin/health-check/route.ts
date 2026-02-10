import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

interface CheckResult {
  service_name: string;
  check_type: string;
  is_healthy: boolean;
  response_time_ms: number;
  error_message: string | null;
}

async function checkService(
  name: string,
  checkType: string,
  fn: () => Promise<void>,
): Promise<CheckResult> {
  const start = Date.now();
  try {
    await fn();
    return {
      service_name: name,
      check_type: checkType,
      is_healthy: true,
      response_time_ms: Date.now() - start,
      error_message: null,
    };
  } catch (err) {
    return {
      service_name: name,
      check_type: checkType,
      is_healthy: false,
      response_time_ms: Date.now() - start,
      error_message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function POST() {
  // Verify caller is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceClient = createServiceClient();

  // Run health checks in parallel
  const results = await Promise.all([
    checkService("database", "connectivity", async () => {
      const { error } = await serviceClient
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
    }),
    checkService("supabase", "connectivity", async () => {
      const { error } = await serviceClient.auth.getSession();
      if (error) throw error;
    }),
  ]);

  // Store results
  for (const result of results) {
    await serviceClient.from("health_checks").insert(result);
  }

  return NextResponse.json({ results });
}
