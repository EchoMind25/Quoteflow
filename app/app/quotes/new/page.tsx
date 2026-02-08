import { QuoteCreationWizard } from "@/components/quotes/quote-creation-wizard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Quote",
};

export default async function NewQuotePage() {
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

  let defaultTaxRate = 0;
  let defaultExpiryDays: number | undefined;

  if (profile?.business_id) {
    const { data: business } = await supabase
      .from("businesses")
      .select("default_tax_rate, default_expiry_days")
      .eq("id", profile.business_id)
      .single();

    if (business) {
      defaultTaxRate = business.default_tax_rate;
      defaultExpiryDays = business.default_expiry_days;
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-lg font-bold">New Quote</h1>
      <QuoteCreationWizard
        businessId={profile?.business_id ?? undefined}
        userId={user.id}
        defaultTaxRate={defaultTaxRate}
        defaultExpiryDays={defaultExpiryDays}
      />
    </div>
  );
}
