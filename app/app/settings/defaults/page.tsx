import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { QuoteDefaultsForm } from "@/components/settings/quote-defaults-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quote Defaults",
};

export default async function QuoteDefaultsPage() {
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
    .select(
      "quote_prefix, default_expiry_days, default_tax_rate, default_terms",
    )
    .eq("id", profile.business_id)
    .single();

  if (!business) {
    redirect("/app/settings");
  }

  return (
    <div className="p-4 sm:p-6">
      <QuoteDefaultsForm
        quotePrefix={business.quote_prefix}
        defaultExpiryDays={business.default_expiry_days}
        defaultTaxRate={business.default_tax_rate}
        defaultTerms={business.default_terms}
      />
    </div>
  );
}
