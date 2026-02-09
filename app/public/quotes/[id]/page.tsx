import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicQuoteView } from "@/components/quotes/public-quote-view";

type Props = {
  params: Promise<{ id: string }>;
};

// Service-role client bypasses RLS — safe here because we filter by exact
// UUID (secret-link model) and only expose customer-facing columns.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("title, quote_number, status")
    .eq("id", id)
    .in("status", ["sent", "viewed", "accepted", "declined", "expired"])
    .single();

  return {
    title: quote
      ? `Quote #${quote.quote_number} — ${quote.title}`
      : "Quote Not Found",
  };
}

export default async function PublicQuotePage({ params }: Props) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch quote with only displayed columns — restrict to non-draft statuses
  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, business_id, customer_id, status, title, quote_number, subtotal_cents, tax_rate, tax_cents, discount_cents, total_cents, customer_notes, expires_at, viewed_at",
    )
    .eq("id", id)
    .in("status", ["sent", "viewed", "accepted", "declined", "expired"])
    .single();

  if (!quote) {
    notFound();
  }

  // Fetch line items (only displayed columns)
  const { data: lineItems } = await supabase
    .from("quote_line_items")
    .select("id, title, description, quantity, unit, line_total_cents")
    .eq("quote_id", id)
    .order("sort_order");

  // Fetch customer (only displayed columns)
  let customer = null;
  if (quote.customer_id) {
    const { data } = await supabase
      .from("customers")
      .select("id, first_name, last_name")
      .eq("id", quote.customer_id)
      .single();
    customer = data;
  }

  // Fetch business
  const { data: business } = await supabase
    .from("businesses")
    .select("name, logo_url, primary_color")
    .eq("id", quote.business_id)
    .single();

  if (!business) {
    notFound();
  }

  // Mark as viewed (fire-and-forget, uses service role since anon SELECT is removed)
  if (!quote.viewed_at && (quote.status === "sent" || quote.status === "draft")) {
    supabase
      .from("quotes")
      .update({
        viewed_at: new Date().toISOString(),
        status: quote.status === "sent" ? "viewed" : quote.status,
      })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.error("[Public Quote] Mark as viewed failed:", {
            quoteId: id,
            error: error.message,
            code: error.code,
          });
        }
      });
  }

  return (
    <PublicQuoteView
      quote={quote}
      lineItems={lineItems ?? []}
      customer={customer}
      business={business}
    />
  );
}
