import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Profile",
};

export default async function BusinessProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    redirect("/app/settings");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", profile.business_id)
    .single();

  if (!business) {
    redirect("/app/settings");
  }

  return (
    <div className="p-4 sm:p-6">
      <BusinessProfileForm business={business} />
    </div>
  );
}
