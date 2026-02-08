"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

// ============================================================================
// Magic-link login
// ============================================================================

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function loginWithMagicLink(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Sign-up with business creation
// ============================================================================

export async function signupWithMagicLink(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const businessName = formData.get("business_name") as string;
  const industry = formData.get("industry") as string;
  const firstName = formData.get("first_name") as string;
  const lastName = formData.get("last_name") as string;

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }
  if (!businessName || businessName.trim().length < 2) {
    return { error: "Business name must be at least 2 characters." };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        first_name: firstName || "",
        last_name: lastName || "",
        business_name: businessName.trim(),
        industry: industry || "general",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Sign out
// ============================================================================

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
