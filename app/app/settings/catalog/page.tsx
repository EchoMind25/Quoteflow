import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { CatalogList } from "@/components/settings/catalog-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Catalog",
};

export default async function ServiceCatalogPage() {
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

  const businessId = profile.business_id;

  const getCatalog = unstable_cache(
    async (bizId: string) => {
      const client = await createClient();
      const { data } = await client
        .from("pricing_catalog")
        .select(
          "id, business_id, title, description, category, unit, unit_price_cents, is_active, created_at, updated_at",
        )
        .eq("business_id", bizId)
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("title", { ascending: true });
      return data ?? [];
    },
    [`catalog-${businessId}`],
    { revalidate: 300, tags: [`catalog-${businessId}`] },
  );

  const items = await getCatalog(businessId);

  return (
    <div className="p-4 sm:p-6">
      <CatalogList items={items} />
    </div>
  );
}
