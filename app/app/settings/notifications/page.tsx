import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
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

  return (
    <div className="p-4 sm:p-6">
      <NotificationPreferencesForm businessId={profile?.business_id ?? ""} />
    </div>
  );
}
