import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed`,
    );
  }

  // Check if user needs a business (new signups)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    // If no business yet, create one from signup metadata
    if (!profile?.business_id) {
      const meta = user.user_metadata;
      const businessName =
        (meta?.business_name as string) || "My Business";
      const industry = (meta?.industry as string) || "general";

      // Create business
      const slug =
        businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        user.id.slice(0, 6);

      const { data: business } = await supabase
        .from("businesses")
        .insert({
          name: businessName,
          slug,
          industry: industry as "hvac" | "plumbing" | "electrical" | "general",
        })
        .select("id")
        .single();

      if (business) {
        // Link profile to business as owner
        await supabase
          .from("profiles")
          .update({
            business_id: business.id,
            role: "owner",
            first_name: (meta?.first_name as string) || "",
            last_name: (meta?.last_name as string) || "",
          })
          .eq("id", user.id);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
