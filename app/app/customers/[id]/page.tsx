import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getCustomerStats } from "@/lib/actions/customers";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("first_name, last_name")
    .eq("id", id)
    .single();

  const name = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : "Customer";

  return { title: name || "Customer" };
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !customer) notFound();

  // Fetch quotes for this customer
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, quote_number, title, status, total_cents, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  // Get stats
  const stats = await getCustomerStats(id);

  return (
    <CustomerDetailView
      customer={customer}
      quotes={quotes ?? []}
      stats={stats}
    />
  );
}
